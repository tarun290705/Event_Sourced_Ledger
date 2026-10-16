from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.accounts.models import Account
from apps.ledger.models import LedgerEntry, LedgerTransaction
from apps.ledger.services import calculate_account_balance, post_transaction

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

