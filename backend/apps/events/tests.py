import uuid
from django.test import TestCase, TransactionTestCase
from .models import DomainEvent
from .services import record_event
from .replay import replay_transfer_projection, verify_transfer_projection, replay_account_balances, verify_account_balance_projection, find_posted_transactions_missing_events
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.db import close_old_connections
from django.core.exceptions import ValidationError
from apps.accounts.models import Account
from apps.ledger.models import LedgerTransaction
from apps.transfers.models import Transfer
from apps.ledger.services import post_transaction, calculate_account_balance
from apps.transfers.services import create_transfer
from unittest.mock import patch

class RecordEventTests(TestCase):
    def setUp(self):
        self.aggregate_id = uuid.uuid4()

    def test_records_first_event_with_sequence_one(self):
        event = record_event(
            aggregate_type="TRANSFER",
            aggregate_id=self.aggregate_id,
            event_type="TransferInitiated",
            payload={"amount_minor_units": 2500},
        )

        self.assertEqual(event.sequence_number, 1)
        self.assertEqual(event.event_type, "TransferInitiated")
        self.assertEqual(event.payload["amount_minor_units"], 2500)

    def test_increments_sequence_for_same_aggregate(self):
        first = record_event(
            aggregate_type="TRANSFER",
            aggregate_id=self.aggregate_id,
            event_type="TransferInitiated",
            payload={},
        )

        second = record_event(
            aggregate_type="TRANSFER",
            aggregate_id=self.aggregate_id,
            event_type="TransferPosted",
            payload={},
        )

        self.assertEqual(first.sequence_number, 1)
        self.assertEqual(second.sequence_number, 2)

    def test_different_aggregates_have_independent_sequences(self):
        other_aggregate_id = uuid.uuid4()

        first = record_event(
            aggregate_type="TRANSFER",
            aggregate_id=self.aggregate_id,
            event_type="TransferInitiated",
            payload={},
        )

        other = record_event(
            aggregate_type="TRANSFER",
            aggregate_id=other_aggregate_id,
            event_type="TransferInitiated",
            payload={},
        )

        self.assertEqual(first.sequence_number, 1)
        self.assertEqual(other.sequence_number, 1)

    def test_rejects_non_dictionary_payload(self):
        with self.assertRaises(Exception):
            record_event(
                aggregate_type="TRANSFER",
                aggregate_id=self.aggregate_id,
                event_type="TransferInitiated",
                payload="not a dictionary",
            )

        self.assertEqual(DomainEvent.objects.count(), 0)


class ConcurrentRecordEventTests(TransactionTestCase):
    def test_concurrent_events_receive_unique_sequences(self):
        aggregate_id = uuid.uuid4()
        barrier = Barrier(2)

        def append_event(event_type):
            close_old_connections()
            try:
                barrier.wait(timeout=10)

                return record_event(
                    aggregate_type="TRANSFER",
                    aggregate_id=aggregate_id,
                    event_type=event_type,
                    payload={},
                )
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(append_event, "TransferInitiated"),
                executor.submit(append_event, "TransferPosted"),
            ]
            events = [future.result(timeout=20) for future in futures]

        sequences = sorted(event.sequence_number for event in events)

        self.assertEqual(sequences, [1, 2])
        self.assertEqual(
            DomainEvent.objects.filter(
                aggregate_type="TRANSFER",
                aggregate_id=aggregate_id,
            ).count(),
            2,
        )


class DomainEventImmutabilityTests(TestCase):
    def setUp(self):
        self.event = record_event(
            aggregate_type="TRANSFER",
            aggregate_id=uuid.uuid4(),
            event_type="TransferInitiated",
            payload={"amount_minor_units": 2500},
        )

    def test_existing_event_cannot_be_updated(self):
        self.event.event_type = "TransferModified"

        with self.assertRaises(ValidationError):
            self.event.save()

    def test_existing_event_cannot_be_deleted(self):
        with self.assertRaises(ValidationError):
            self.event.delete()

        self.assertTrue(
            DomainEvent.objects.filter(pk=self.event.pk).exists()
        )

    def test_queryset_update_is_blocked(self):
        with self.assertRaises(ValidationError):
            DomainEvent.objects.filter(pk=self.event.pk).update(
                event_type="TransferModified"
            )

    def test_queryset_delete_is_blocked(self):
        with self.assertRaises(ValidationError):
            DomainEvent.objects.filter(pk=self.event.pk).delete()

        self.assertTrue(
            DomainEvent.objects.filter(pk=self.event.pk).exists()
        )


class TransferReplayTests(TestCase):
    def setUp(self):
        self.transfer_id = uuid.uuid4()
        self.source_id = uuid.uuid4()
        self.destination_id = uuid.uuid4()
        self.ledger_transaction_id = uuid.uuid4()

    def record_completion(self):
        return record_event(
            aggregate_type="TRANSFER",
            aggregate_id=self.transfer_id,
            event_type="TransferCompleted",
            payload={
                "transfer_id": str(self.transfer_id),
                "source_account_id": str(self.source_id),
                "destination_account_id": str(self.destination_id),
                "amount_minor_units": 2500,
                "currency": "INR",
                "ledger_transaction_id": str(
                    self.ledger_transaction_id
                ),
            },
        )

    def test_replays_completed_transfer(self):
        self.record_completion()

        projection = replay_transfer_projection()

        transfer = projection[str(self.transfer_id)]

        self.assertEqual(transfer["status"], "COMPLETED")
        self.assertEqual(transfer["amount_minor_units"], 2500)
        self.assertEqual(transfer["currency"], "INR")
        self.assertEqual(
            transfer["source_account_id"],
            str(self.source_id),
        )
        self.assertEqual(
            transfer["destination_account_id"],
            str(self.destination_id),
        )

    def test_empty_event_log_returns_empty_projection(self):
        self.assertEqual(replay_transfer_projection(), {})

    def test_replay_does_not_modify_event_log(self):
        event = self.record_completion()

        initial_count = DomainEvent.objects.count()
        initial_event_id = event.id

        replay_transfer_projection()

        self.assertEqual(DomainEvent.objects.count(), initial_count)
        self.assertTrue(
            DomainEvent.objects.filter(pk=initial_event_id).exists()
        )

    def test_invalid_transfer_amount_is_rejected(self):
        record_event(
            aggregate_type="TRANSFER",
            aggregate_id=self.transfer_id,
            event_type="TransferCompleted",
            payload={
                "transfer_id": str(self.transfer_id),
                "source_account_id": str(self.source_id),
                "destination_account_id": str(self.destination_id),
                "amount_minor_units": -2500,
                "currency": "INR",
                "ledger_transaction_id": str(
                    self.ledger_transaction_id
                ),
            },
        )

        with self.assertRaisesRegex(ValueError, "Invalid transfer amount"):
            replay_transfer_projection()

class TransferProjectionConsistencyTests(TestCase):
    def setUp(self):
        self.cash = Account.objects.create(
            account_number="REPLAY-CASH-001",
            name="Replay Cash",
            account_type=Account.AccountType.ASSET,
            currency="INR",
        )
        self.alice = Account.objects.create(
            account_number="REPLAY-ALICE-001",
            name="Replay Alice",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )
        self.bob = Account.objects.create(
            account_number="REPLAY-BOB-001",
            name="Replay Bob",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )

        
        opening_transaction = post_transaction(
            transaction_type=LedgerTransaction.TransactionType.OPENING,
            description="Replay test opening balance",
            entries=[
                {
                    "account_id": self.cash.id,
                    "side": "DEBIT",
                    "amount_minor_units": 10000,
                },
                {
                    "account_id": self.alice.id,
                    "side": "CREDIT",
                    "amount_minor_units": 10000,
                },
            ],
        )

        self.transfer = create_transfer(
            source_account_id=self.alice.id,
            destination_account_id=self.bob.id,
            amount_minor_units=2500,
            idempotency_key="replay-consistency-test",
        )

    def test_replayed_projection_matches_database(self):
        report = verify_transfer_projection()

        self.assertTrue(report["is_consistent"], report)
        self.assertEqual(report["missing_events"], [])
        self.assertEqual(report["missing_transfers"], [])
        self.assertEqual(report["mismatches"], [])

   
    def test_missing_event_is_detected(self):
        missing_event_transaction = post_transaction(
            transaction_type=LedgerTransaction.TransactionType.TRANSFER,
            description="Transfer intentionally missing an event",
            entries=[
                {
                    "account_id": self.alice.id,
                    "side": "DEBIT",
                    "amount_minor_units": 100,
                },
                {
                    "account_id": self.bob.id,
                    "side": "CREDIT",
                    "amount_minor_units": 100,
                },
            ],
        )

        transfer_without_event = Transfer.objects.create(
            source_account=self.alice,
            destination_account=self.bob,
            amount_minor_units=100,
            currency="INR",
            idempotency_key="transfer-without-event",
            ledger_transaction=missing_event_transaction,
            status=Transfer.Status.COMPLETED,
        )

        report = verify_transfer_projection()

        self.assertFalse(report["is_consistent"])
        self.assertIn(
            str(transfer_without_event.id),
            report["missing_events"],
        )

class EmptyAccountBalanceReplayTests(TestCase):
    def test_empty_event_log_returns_empty_balances(self):
        self.assertEqual(replay_account_balances(), {})

class AccountBalanceReplayTests(TestCase):
    def setUp(self):
        self.cash = Account.objects.create(
            account_number="BALANCE-CASH-001",
            name="Replay Cash",
            account_type=Account.AccountType.ASSET,
            currency="INR",
        )
        self.alice = Account.objects.create(
            account_number="BALANCE-ALICE-001",
            name="Replay Alice",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )
        self.bob = Account.objects.create(
            account_number="BALANCE-BOB-001",
            name="Replay Bob",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )

        post_transaction(
            transaction_type=LedgerTransaction.TransactionType.OPENING,
            description="Opening balance",
            entries=[
                {
                    "account_id": self.cash.id,
                    "side": "DEBIT",
                    "amount_minor_units": 10000,
                },
                {
                    "account_id": self.alice.id,
                    "side": "CREDIT",
                    "amount_minor_units": 10000,
                },
            ],
        )

        create_transfer(
            source_account_id=self.alice.id,
            destination_account_id=self.bob.id,
            amount_minor_units=2500,
            idempotency_key="balance-replay-test",
        )

    def test_replays_account_balances_correctly(self):
        balances = replay_account_balances()

        self.assertEqual(balances[str(self.cash.id)], 10000)
        self.assertEqual(balances[str(self.alice.id)], 7500)
        self.assertEqual(balances[str(self.bob.id)], 2500)

    def test_replayed_balances_match_live_ledger(self):
        balances = replay_account_balances()

        self.assertEqual(
            balances[str(self.cash.id)],
            calculate_account_balance(self.cash),
        )
        self.assertEqual(
            balances[str(self.alice.id)],
            calculate_account_balance(self.alice),
        )
        self.assertEqual(
            balances[str(self.bob.id)],
            calculate_account_balance(self.bob),
        )

class AccountBalanceProjectionConsistencyTests(TestCase):
    def setUp(self):
        self.cash = Account.objects.create(
            account_number="CONSISTENCY-CASH-001",
            name="Consistency Cash",
            account_type="ASSET",
        )

        self.alice = Account.objects.create(
            account_number="CONSISTENCY-ALICE-001",
            name="Consistency Alice",
            account_type="LIABILITY",
        )

        post_transaction(
            transaction_type="OPENING",
            description="Consistency test opening balance",
            entries=[
                {
                    "account_id": self.cash.id,
                    "side": "DEBIT",
                    "amount_minor_units": 10000,
                },
                {
                    "account_id": self.alice.id,
                    "side": "CREDIT",
                    "amount_minor_units": 10000,
                },
            ],
        )

    def test_consistent_balances_return_success(self):
        report = verify_account_balance_projection()

        self.assertTrue(report["is_consistent"])
        self.assertEqual(report["mismatches"], [])

    def test_detects_live_ledger_balance_mismatch(self):
        # Create an additional posted transaction without recording
        # its event, simulating a discrepancy between the ledger and event log.
        from apps.ledger.models import LedgerTransaction

        transaction = LedgerTransaction.objects.create(
            transaction_type="DEPOSIT",
            description="Deliberately inconsistent test transaction",
            status="DRAFT",
        )

        transaction.delete()

        with patch("apps.ledger.services.record_event") as mocked_record_event:
            post_transaction(
                transaction_type="OPENING",
                description="Ledger-only transaction",
                entries=[
                    {
                        "account_id": self.cash.id,
                        "side": "DEBIT",
                        "amount_minor_units": 500,
                    },
                    {
                        "account_id": self.alice.id,
                        "side": "CREDIT",
                        "amount_minor_units": 500,
                    },
                ],
            )

        report = verify_account_balance_projection()

        self.assertFalse(report["is_consistent"])
        self.assertEqual(len(report["mismatches"]), 2)

class MissingTransactionEventTests(TestCase):
    def setUp(self):
        self.cash = Account.objects.create(
            account_number="MISSING-EVENT-CASH",
            name="Missing Event Cash",
            account_type="ASSET",
        )
        self.customer = Account.objects.create(
            account_number="MISSING-EVENT-CUSTOMER",
            name="Missing Event Customer",
            account_type="LIABILITY",
        )

    def test_returns_no_missing_transactions_when_events_exist(self):
        post_transaction(
            transaction_type="OPENING",
            description="Opening balance",
            entries=[
                {
                    "account_id": self.cash.id,
                    "side": "DEBIT",
                    "amount_minor_units": 1000,
                },
                {
                    "account_id": self.customer.id,
                    "side": "CREDIT",
                    "amount_minor_units": 1000,
                },
            ],
        )

        self.assertEqual(
            find_posted_transactions_missing_events(),
            [],
        )

    def test_detects_posted_transaction_missing_event(self):
        transaction = LedgerTransaction.objects.create(
            transaction_type="OPENING",
            description="Legacy transaction without event",
            status="POSTED",
            posted_at=__import__("django.utils.timezone", fromlist=["now"]).now(),
        )

        missing_ids = find_posted_transactions_missing_events()

        self.assertIn(str(transaction.id), missing_ids)