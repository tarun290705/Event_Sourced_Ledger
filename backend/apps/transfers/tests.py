
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.accounts.models import Account
from apps.ledger.models import LedgerEntry, LedgerTransaction
from apps.ledger.services import calculate_account_balance, post_transaction
from apps.events.models import DomainEvent
from .models import Transfer
from .services import create_transfer
from rest_framework import status
from rest_framework.test import APITestCase
from django.urls import reverse
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.db import close_old_connections, IntegrityError
from django.test import TransactionTestCase
from unittest.mock import patch

class TransferServiceTests(TestCase):
    def setUp(self):
        self.cash = Account.objects.create(
            account_number="TR-TEST-CASH",
            name="Transfer Test Cash",
            account_type=Account.AccountType.ASSET,
            currency="INR",
        )

        self.alice = Account.objects.create(
            account_number="TR-TEST-ALICE",
            name="Transfer Test Alice",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )

        self.bob = Account.objects.create(
            account_number="TR-TEST-BOB",
            name="Transfer Test Bob",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )

        post_transaction(
            transaction_type=LedgerTransaction.TransactionType.OPENING,
            description="Transfer test opening balance",
            entries=[
                {
                    "account_id": self.cash.id,
                    "side": LedgerEntry.EntrySide.DEBIT,
                    "amount_minor_units": 100000,
                },
                {
                    "account_id": self.alice.id,
                    "side": LedgerEntry.EntrySide.CREDIT,
                    "amount_minor_units": 100000,
                },
            ],
        )

    def test_successful_transfer(self):
        transfer = create_transfer(
            source_account_id=self.alice.id,
            destination_account_id=self.bob.id,
            amount_minor_units=25000,
            idempotency_key="transfer-test-001",
        )

        self.assertEqual(transfer.status, Transfer.Status.COMPLETED)
        self.assertEqual(transfer.currency, "INR")
        self.assertEqual(transfer.amount_minor_units, 25000)
        self.assertEqual(transfer.ledger_transaction.status, LedgerTransaction.Status.POSTED)
        self.assertEqual(transfer.ledger_transaction.entries.count(), 2)
        self.assertEqual(calculate_account_balance(self.alice), 75000)
        self.assertEqual(calculate_account_balance(self.bob), 25000)
        self.assertEqual(Transfer.objects.count(), 1)

    def test_duplicate_request_does_not_transfer_twice(self):
        first_transfer = create_transfer(
            source_account_id=self.alice.id,
            destination_account_id=self.bob.id,
            amount_minor_units=25000,
            idempotency_key="transfer-test-duplicate",
        )

        second_transfer = create_transfer(
            source_account_id=self.alice.id,
            destination_account_id=self.bob.id,
            amount_minor_units=25000,
            idempotency_key="transfer-test-duplicate",
        )

        self.assertEqual(first_transfer.id, second_transfer.id)
        self.assertEqual(Transfer.objects.count(), 1)
        self.assertEqual(calculate_account_balance(self.alice), 75000)
        self.assertEqual(calculate_account_balance(self.bob), 25000)
        self.assertEqual(LedgerTransaction.objects.count(), 2)

    def test_reusing_key_for_different_transfer_is_rejected(self):
        create_transfer(
            source_account_id=self.alice.id,
            destination_account_id=self.bob.id,
            amount_minor_units=25000,
            idempotency_key="transfer-test-conflict",
        )

        with self.assertRaisesMessage(
            ValidationError,
            "Idempotency key was already used",
        ):
            create_transfer(
                source_account_id=self.alice.id,
                destination_account_id=self.bob.id,
                amount_minor_units=30000,
                idempotency_key="transfer-test-conflict",
            )

        self.assertEqual(Transfer.objects.count(), 1)
        self.assertEqual(calculate_account_balance(self.alice), 75000)
        self.assertEqual(calculate_account_balance(self.bob), 25000)

    def test_transfer_rejects_insufficient_funds(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Insufficient funds",
        ):
            create_transfer(
                source_account_id=self.alice.id,
                destination_account_id=self.bob.id,
                amount_minor_units=150000,
                idempotency_key="transfer-insufficient-funds",
            )

        self.assertEqual(Transfer.objects.count(), 0)
        self.assertEqual(calculate_account_balance(self.alice), 100000)
        self.assertEqual(calculate_account_balance(self.bob), 0)


    def test_transfer_rejects_non_liability_accounts(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Transfers are allowed only between liability accounts",
        ):
            create_transfer(
                source_account_id=self.cash.id,
                destination_account_id=self.bob.id,
                amount_minor_units=10000,
                idempotency_key="transfer-invalid-account-type",
            )

        self.assertEqual(Transfer.objects.count(), 0)
        self.assertEqual(calculate_account_balance(self.cash), 100000)
        self.assertEqual(calculate_account_balance(self.bob), 0)

    def test_transfer_failure_rolls_back_ledger_transaction(self):
        initial_transaction_count = LedgerTransaction.objects.count()
        initial_entry_count = LedgerEntry.objects.count()

        with patch(
            "apps.transfers.services.Transfer.objects.create",
            side_effect=RuntimeError("Simulated transfer record failure"),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "Simulated transfer record failure",
            ):
                create_transfer(
                    source_account_id=self.alice.id,
                    destination_account_id=self.bob.id,
                    amount_minor_units=25000,
                    idempotency_key="transfer-rollback-test",
                )

        self.assertEqual(
            Transfer.objects.filter(
                idempotency_key="transfer-rollback-test"
            ).count(),
            0,
        )
        self.assertEqual(
            LedgerTransaction.objects.count(),
            initial_transaction_count,
        )
        self.assertEqual(
            LedgerEntry.objects.count(),
            initial_entry_count,
        )

        self.assertEqual(calculate_account_balance(self.alice), 100000)
        self.assertEqual(calculate_account_balance(self.bob), 0)

    
    def test_successful_transfer_creates_completion_event(self):
        transfer = create_transfer(
            source_account_id=self.alice.id,
            destination_account_id=self.bob.id,
            amount_minor_units=25000,
            idempotency_key="transfer-event-test",
        )

        events = DomainEvent.objects.filter(
            aggregate_type="TRANSFER",
            aggregate_id=transfer.id,
            event_type="TransferCompleted",
        )

        self.assertEqual(events.count(), 1)

        event = events.get()
        self.assertEqual(event.sequence_number, 1)
        self.assertEqual(
            event.payload["transfer_id"],
            str(transfer.id),
        )
        self.assertEqual(
            event.payload["source_account_id"],
            str(self.alice.id),
        )
        self.assertEqual(
            event.payload["destination_account_id"],
            str(self.bob.id),
        )
        self.assertEqual(event.payload["amount_minor_units"], 25000)
        self.assertEqual(event.payload["currency"], self.alice.currency)


    def test_idempotent_retry_does_not_duplicate_event(self):
        first = create_transfer(
            source_account_id=self.alice.id,
            destination_account_id=self.bob.id,
            amount_minor_units=25000,
            idempotency_key="transfer-event-retry-test",
        )

        second = create_transfer(
            source_account_id=self.alice.id,
            destination_account_id=self.bob.id,
            amount_minor_units=25000,
            idempotency_key="transfer-event-retry-test",
        )

        self.assertEqual(first.id, second.id)

        self.assertEqual(
            DomainEvent.objects.filter(
                aggregate_type="TRANSFER",
                aggregate_id=first.id,
                event_type="TransferCompleted",
            ).count(),
            1,
        )


    def test_event_failure_rolls_back_transfer_and_ledger(self):
        initial_transfer_count = Transfer.objects.count()
        initial_transaction_count = LedgerTransaction.objects.count()
        initial_entry_count = LedgerEntry.objects.count()
        initial_event_count = DomainEvent.objects.count()

        with patch(
            "apps.transfers.services.record_event",
            side_effect=RuntimeError("Simulated event failure"),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "Simulated event failure",
            ):
                create_transfer(
                    source_account_id=self.alice.id,
                    destination_account_id=self.bob.id,
                    amount_minor_units=25000,
                    idempotency_key="transfer-event-rollback-test",
                )

        self.assertEqual(Transfer.objects.count(), initial_transfer_count)
        self.assertEqual(
            LedgerTransaction.objects.count(),
            initial_transaction_count,
        )
        self.assertEqual(LedgerEntry.objects.count(), initial_entry_count)
        self.assertEqual(DomainEvent.objects.count(), initial_event_count)

        self.assertEqual(calculate_account_balance(self.alice), 100000)
        self.assertEqual(calculate_account_balance(self.bob), 0)

class TransferAPITests(APITestCase):
    def setUp(self):
        self.cash = Account.objects.create(
            account_number="API-TEST-CASH",
            name="API Test Cash",
            account_type=Account.AccountType.ASSET,
            currency="INR",
        )
        self.alice = Account.objects.create(
            account_number="API-TEST-ALICE",
            name="API Test Alice",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )
        self.bob = Account.objects.create(
            account_number="API-TEST-BOB",
            name="API Test Bob",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )

        post_transaction(
            transaction_type=LedgerTransaction.TransactionType.OPENING,
            description="API test opening balance",
            entries=[
                {
                    "account_id": self.cash.id,
                    "side": LedgerEntry.EntrySide.DEBIT,
                    "amount_minor_units": 100000,
                },
                {
                    "account_id": self.alice.id,
                    "side": LedgerEntry.EntrySide.CREDIT,
                    "amount_minor_units": 100000,
                },
            ],
        )

        self.url = "/api/transfers/"
        self.payload = {
            "source_account_id": str(self.alice.id),
            "destination_account_id": str(self.bob.id),
            "amount_minor_units": 2500,
            "idempotency_key": "api-test-transfer-001",
            "description": "API transfer test",
        }

    def test_successful_transfer_returns_created(self):
        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "COMPLETED")
        self.assertEqual(response.data["amount_minor_units"], 2500)

        self.alice.refresh_from_db()
        self.bob.refresh_from_db()

        self.assertEqual(calculate_account_balance(self.alice), 97500)
        self.assertEqual(calculate_account_balance(self.bob), 2500)

    def test_invalid_uuid_is_rejected(self):
        payload = {
            **self.payload,
            "source_account_id": "not-a-uuid",
        }

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_insufficient_funds_is_rejected(self):
        payload = {
            **self.payload,
            "amount_minor_units": 200000,
            "idempotency_key": "api-test-insufficient-001",
        }

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient funds", str(response.data))
        self.assertEqual(Transfer.objects.count(), 0)
        self.assertEqual(calculate_account_balance(self.alice), 100000)
        self.assertEqual(calculate_account_balance(self.bob), 0)

    def test_same_idempotency_key_returns_existing_transfer(self):
        first = self.client.post(
            self.url,
            self.payload,
            format="json",
        )
        second = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(first.data["ledger_transaction_id"], second.data["ledger_transaction_id"])
        self.assertEqual(Transfer.objects.count(), 1)
        self.assertEqual(calculate_account_balance(self.alice), 97500)
        self.assertEqual(calculate_account_balance(self.bob), 2500)


class ConcurrentTransferTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.cash = Account.objects.create(
            account_number="CONC-TEST-CASH",
            name="Concurrency Test Cash",
            account_type=Account.AccountType.ASSET,
            currency="INR",
        )
        self.alice = Account.objects.create(
            account_number="CONC-TEST-ALICE",
            name="Concurrency Test Alice",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )
        self.bob = Account.objects.create(
            account_number="CONC-TEST-BOB",
            name="Concurrency Test Bob",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )

        post_transaction(
            transaction_type=LedgerTransaction.TransactionType.OPENING,
            description="Concurrency test opening balance",
            entries=[
                {
                    "account_id": self.cash.id,
                    "side": LedgerEntry.EntrySide.DEBIT,
                    "amount_minor_units": 100000,
                },
                {
                    "account_id": self.alice.id,
                    "side": LedgerEntry.EntrySide.CREDIT,
                    "amount_minor_units": 100000,
                },
            ],
        )

    def test_concurrent_requests_with_same_key_create_one_transfer(self):
        barrier = Barrier(2)
        source_id = self.alice.id
        destination_id = self.bob.id

        def submit_transfer():
            close_old_connections()
            try:
                barrier.wait(timeout=10)

                return create_transfer(
                    source_account_id=source_id,
                    destination_account_id=destination_id,
                    amount_minor_units=2500,
                    idempotency_key="concurrent-transfer-test-001",
                )
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(submit_transfer)
            future2 = executor.submit(submit_transfer)

            transfer1 = future1.result(timeout=30)
            transfer2 = future2.result(timeout=30)

        self.assertEqual(transfer1.id, transfer2.id)

        self.assertEqual(
            Transfer.objects.filter(
                idempotency_key="concurrent-transfer-test-001"
            ).count(),
            1,
        )

        self.assertEqual(
            LedgerTransaction.objects.filter(
                transaction_type=LedgerTransaction.TransactionType.TRANSFER
            ).count(),
            1,
        )

        self.assertEqual(calculate_account_balance(self.alice), 97500)
        self.assertEqual(calculate_account_balance(self.bob), 2500)
