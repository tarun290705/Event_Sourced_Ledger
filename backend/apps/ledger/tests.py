from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.accounts.models import Account
from apps.ledger.models import LedgerEntry, LedgerTransaction
from apps.ledger.services import calculate_account_balance, post_transaction, calculate_historical_balance
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

class LedgerPostingTests(TestCase):
    def setUp(self):
        self.cash = Account.objects.create(account_number="TEST-CASH", name="Test Cash Account", account_type=Account.AccountType.ASSET, currency="INR")
        self.alice = Account.objects.create(account_number="TEST-ALICE", name="Test Alice Deposit", account_type=Account.AccountType.LIABILITY, currency="INR")

    def test_balanced_transaction_is_posted(self):
        ledger_transaction = post_transaction(
            transaction_type=LedgerTransaction.TransactionType.OPENING, 
            description="Automated test opening deposit", 
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

        self.assertEqual(
            ledger_transaction.status,
            LedgerTransaction.Status.POSTED,
        )
        self.assertIsNotNone(ledger_transaction.posted_at)
        self.assertEqual(ledger_transaction.entries.count(), 2)
        self.assertEqual(calculate_account_balance(self.cash), 100000)
        self.assertEqual(calculate_account_balance(self.alice), 100000)
        self.assertEqual(ledger_transaction.entries.filter(side=LedgerEntry.EntrySide.DEBIT).count(), 1,)
        self.assertEqual(ledger_transaction.entries.filter(side=LedgerEntry.EntrySide.CREDIT).count(), 1,)

    def test_unbalanced_transaction_is_rejected(self):
        initial_transaction_count = LedgerTransaction.objects.count()
        initial_entry_count = LedgerEntry.objects.count()

        with self.assertRaisesMessage(Exception, "Transaction is unbalanced"):
            post_transaction(
                transaction_type=LedgerTransaction.TransactionType.TRANSFER,
                description="Automated test unbalanced transaction",
                entries=[
                    {
                        "account_id": self.cash.id,
                        "side": LedgerEntry.EntrySide.DEBIT,
                        "amount_minor_units": 100000,
                    },
                    {
                        "account_id": self.alice.id,
                        "side": LedgerEntry.EntrySide.CREDIT,
                        "amount_minor_units": 9000,
                    },
                ],
            )

        self.assertEqual(LedgerTransaction.objects.count(), initial_transaction_count)
        self.assertEqual(LedgerEntry.objects.count(), initial_entry_count)

    def test_frozen_account_transaction_is_rejected(self):
        self.alice.status = Account.Status.FROZEN
        self.alice.save(update_fields=["status"])

        initial_transaction_count = LedgerTransaction.objects.count()
        initial_entry_count = LedgerEntry.objects.count()

        with self.assertRaisesMessage(ValidationError, "All accounts must be active"):
            post_transaction(
                transaction_type=LedgerTransaction.TransactionType.TRANSFER,
                description="Automated test frozen account",
                entries=[
                    {
                        "account_id": self.cash.id,
                        "side": LedgerEntry.EntrySide.DEBIT,
                        "amount_minor_units": 5000,
                    },
                    {
                        "account_id": self.alice.id,
                        "side": LedgerEntry.EntrySide.CREDIT,
                        "amount_minor_units": 5000,
                    },
                ],
            )

        self.assertEqual(LedgerTransaction.objects.count(), initial_transaction_count)
        self.assertEqual(LedgerEntry.objects.count(), initial_entry_count)

class HistoricalBalanceTests(TestCase):
    def setUp(self):
        self.cash = Account.objects.create(
            account_number="HIST-CASH",
            name="Historical Cash",
            account_type=Account.AccountType.ASSET,
            currency="INR",
        )
        self.alice = Account.objects.create(
            account_number="HIST-ALICE",
            name="Historical Alice",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
        )

    def post_opening_transaction(self, amount):
        return post_transaction(
            transaction_type=LedgerTransaction.TransactionType.OPENING,
            description="Historical balance test transaction",
            entries=[
                {
                    "account_id": self.cash.id,
                    "side": LedgerEntry.EntrySide.DEBIT,
                    "amount_minor_units": amount,
                },
                {
                    "account_id": self.alice.id,
                    "side": LedgerEntry.EntrySide.CREDIT,
                    "amount_minor_units": amount,
                },
            ],
        )

    def test_historical_balance_excludes_later_transactions(self):
        first_transaction = self.post_opening_transaction(10000)

        as_of = first_transaction.posted_at

        second_transaction = self.post_opening_transaction(5000)

        self.assertGreater(second_transaction.posted_at, as_of)

        self.assertEqual(
            calculate_historical_balance(self.alice, as_of),
            10000,
        )

        self.assertEqual(calculate_account_balance(self.alice), 15000)

    def test_historical_balance_includes_transactions_posted_by_timestamp(self):
        ledger_transaction = self.post_opening_transaction(7000)

        as_of = ledger_transaction.posted_at + timedelta(seconds=1)

        self.assertEqual(
            calculate_historical_balance(self.alice, as_of),
            7000,
        )

    def test_historical_balance_is_zero_before_any_transactions(self):
        as_of = timezone.now() - timedelta(days=1)

        self.assertEqual(
            calculate_historical_balance(self.alice, as_of),
            0,
        )

    def test_historical_balance_accepts_account_id(self):
        ledger_transaction = self.post_opening_transaction(3000)

        as_of = ledger_transaction.posted_at + timedelta(seconds=1)

        self.assertEqual(
            calculate_historical_balance(self.alice.id, as_of),
            3000,
        )

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Account
from apps.ledger.services import post_transaction


class HistoricalBalanceAPITests(APITestCase):
    def setUp(self):
        User = get_user_model()

        self.user = User.objects.create_user(
            username="alice",
            password="testpassword123",
        )
        self.other_user = User.objects.create_user(
            username="bob",
            password="testpassword123",
        )

        self.account = Account.objects.create(
            account_number="HIST-API-001",
            name="Alice Account",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
            owner=self.user,
        )

        self.other_account = Account.objects.create(
            account_number="HIST-API-002",
            name="Bob Account",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
            owner=self.other_user,
        )

        self.client.force_authenticate(user=self.user)

        self.url = reverse(
            "historical-account-balance",
            kwargs={"account_id": self.account.id},
        )

    def test_owner_can_access_historical_balance(self):
        as_of = timezone.now().isoformat()

        response = self.client.get(
            self.url,
            {"as_of": as_of},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["account_id"],
            str(self.account.id),
        )
        self.assertIn("balance_minor_units", response.data)

    def test_user_cannot_access_another_users_account(self):
        url = reverse(
            "historical-account-balance",
            kwargs={"account_id": self.other_account.id},
        )

        response = self.client.get(
            url,
            {"as_of": timezone.now().isoformat()},
        )

        self.assertEqual(response.status_code, 404)

    def test_missing_timestamp_returns_400(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 400)

    def test_invalid_timestamp_returns_400(self):
        response = self.client.get(
            self.url,
            {"as_of": "not-a-timestamp"},
        )

        self.assertEqual(response.status_code, 400)

    def test_timestamp_without_timezone_returns_400(self):
        response = self.client.get(
            self.url,
            {"as_of": "2026-10-22T12:00:00"},
        )

        self.assertEqual(response.status_code, 400)