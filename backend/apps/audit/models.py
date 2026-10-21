import uuid
from django.core.exceptions import ValidationError
from django.db import models

class AuditLogQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Audit logs cannot be updated")

    def delete(self):
        raise ValidationError("Audit logs cannot be deleted")

    def bulk_update(self, objs, fields, batch_size = None):
        raise ValidationError("Audit logs cannot be bulk-updated")

class AuditLog(models.Model):
    class Action(models.TextChoices):
        ACCOUNT_CREATED = "ACCOUNT_CREATED", "Account Created"
        ACCOUNT_UPDATED = "ACCOUNT_UPDATED", "Account Updated"
        ACCOUNT_FROZEN = "ACCOUNT_FROZEN", "Account Frozen"
        ACCOUNT_CLOSED = "ACCOUNT_CLOSED", "Account Closed"
        TRANSFER_POSTED = "TRANSFER_POSTED", "Transfer Posted"
        TRANSFER_COMPLETED = "TRANSFER_COMPLETED", "Transfer Completed"
        TRANSFER_FAILED = "TRANSFER_FAILED", "Transfer Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.CharField(max_length=255, null=True, blank=True, help_text="User or system process that performed the action")
    action = models.CharField(max_length=50, choices=Action.choices)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    occured_at = models.DateTimeField(auto_now_add=True)
    objects = AuditLogQuerySet.as_manager()

    class Meta:
        ordering = ["occured_at", "id"]
        indexes = [
            models.Index(
                fields=["resource_type", "resource_id"],
                name="audit_resource_idx",
            ),
            models.Index(
                fields=["action", "occured_at"],
                name="audit_action_time_idx",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Existing audit logs are immutable")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit logs cannot be deleted")

    def __str__(self):
        return f"{self.action} - {self.resource_type}: {self.resource_id}"