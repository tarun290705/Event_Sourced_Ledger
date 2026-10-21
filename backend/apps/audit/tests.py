
from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.audit.models import AuditLog
from apps.audit.services import record_audit_log


class RecordAuditLogTests(TestCase):
    def test_creates_audit_log(self):
        log = record_audit_log(
            action=AuditLog.Action.TRANSFER_COMPLETED,
            resource_type="TRANSFER",
            resource_id="transfer-test-001",
            actor="system",
            description="Test transfer audit entry",
            metadata={
                "amount_minor_units": 2500,
                "currency": "INR",
            },
        )

        self.assertEqual(log.action, "TRANSFER_COMPLETED")
        self.assertEqual(log.resource_type, "TRANSFER")
        self.assertEqual(log.resource_id, "transfer-test-001")
        self.assertEqual(log.actor, "system")
        self.assertEqual(
            log.metadata["amount_minor_units"],
            2500,
        )
        self.assertTrue(
            AuditLog.objects.filter(pk=log.pk).exists()
        )

    def test_rejects_invalid_action(self):
        with self.assertRaises(ValidationError):
            record_audit_log(
                action="INVALID_ACTION",
                resource_type="TRANSFER",
                resource_id="transfer-test-002",
            )

    def test_rejects_missing_resource_id(self):
        with self.assertRaises(ValidationError):
            record_audit_log(
                action=AuditLog.Action.TRANSFER_COMPLETED,
                resource_type="TRANSFER",
                resource_id="",
            )

    def test_rejects_non_dictionary_metadata(self):
        with self.assertRaises(ValidationError):
            record_audit_log(
                action=AuditLog.Action.TRANSFER_COMPLETED,
                resource_type="TRANSFER",
                resource_id="transfer-test-003",
                metadata=["invalid"],
            )
