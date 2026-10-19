import uuid
from django.db import models
from apps.accounts.models import Account
from apps.ledger.models import LedgerTransaction, LedgerEntry

class Transfer(models.Model):
    class Status(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="outgoing_transfers")
    destination_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="incoming_transfers")
    amount_minor_units = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3, default="INR")
    idempotency_key = models.CharField(max_length=255, unique=True)
    ledger_transaction = models.OneToOneField(LedgerTransaction, on_delete=models.PROTECT, related_name="transfer")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.COMPLETED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.CheckConstraint(condition=models.Q(amount_minor_units__gt=0), name="transfer_amount_positive")]

    def __str__(self):
        return f"Transfer {self.id}: {self.amount_minor_units} {self.currency}"