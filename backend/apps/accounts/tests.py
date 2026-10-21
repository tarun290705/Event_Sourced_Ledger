
from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.accounts.models import Account
from apps.accounts.services import create_account, change_account_status
from apps.audit.models import AuditLog


class AccountServiceTests(TestCase):
    def create_test_account(self):
        return create_account(
            account_number="TEST-ACC-001",
            name="Test Account",
            account_type=Account.AccountType.LIABILITY,
            currency="INR",
            actor="test-user",
        )

    def test_create_account_records_audit_log(self):
        account = self.create_test_account()

        self.assertEqual(account.status, Account.Status.ACTIVE)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.ACCOUNT_CREATED,
                resource_type="ACCOUNT",
                resource_id=str(account.id),
            ).exists()
        )

    def test_freeze_account_records_audit_log(self):
        account = self.create_test_account()

        change_account_status(
            account_id=account.id,
            new_status=Account.Status.FROZEN,
            actor="test-user",
        )

        account.refresh_from_db()
        self.assertEqual(account.status, Account.Status.FROZEN)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.ACCOUNT_FROZEN,
                resource_id=str(account.id),
            ).exists()
        )

    def test_reactivate_frozen_account(self):
        account = self.create_test_account()

        change_account_status(
            account_id=account.id,
            new_status=Account.Status.FROZEN,
        )
        change_account_status(
            account_id=account.id,
            new_status=Account.Status.ACTIVE,
        )

        account.refresh_from_db()
        self.assertEqual(account.status, Account.Status.ACTIVE)

    def test_close_frozen_account(self):
        account = self.create_test_account()

        change_account_status(
            account_id=account.id,
            new_status=Account.Status.FROZEN,
        )
        change_account_status(
            account_id=account.id,
            new_status=Account.Status.CLOSED,
        )

        account.refresh_from_db()
        self.assertEqual(account.status, Account.Status.CLOSED)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.ACCOUNT_CLOSED,
                resource_id=str(account.id),
            ).exists()
        )

    def test_closed_account_cannot_be_reactivated(self):
        account = self.create_test_account()

        change_account_status(
            account_id=account.id,
            new_status=Account.Status.FROZEN,
        )
        change_account_status(
            account_id=account.id,
            new_status=Account.Status.CLOSED,
        )

        with self.assertRaises(ValidationError):
            change_account_status(
                account_id=account.id,
                new_status=Account.Status.ACTIVE,
            )

    def test_invalid_status_is_rejected(self):
        account = self.create_test_account()

        with self.assertRaises(ValidationError):
            change_account_status(
                account_id=account.id,
                new_status="INVALID",
            )
