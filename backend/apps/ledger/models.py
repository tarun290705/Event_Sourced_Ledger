import uuid
from django.db import models
from django.db.models import Q

class LedgerTransaction(models.Model):
    class TransactionType(models.TextChoices):
        OPENING = "OPENING", "Opening"
        DEPOSIT = "DEPOSIT", "Deposit"
        WITHDRAWAL = "WITHDRAWAL", "Withdrawal"
        TRANSFER = "TRANSFER", "Transfer"
        REVERSAL = "REVERSAL", "Reversal"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [models.CheckConstraint(condition=(Q(status="DRAFT", posted_at__isnull=True) | Q(status="POSTED", posted_at__isnull=False)), name="ledger_tx_status_posted_at_constraint")]

    def __str__(self):
        return f"{self.transaction_type} - {self.id}"

class LedgerEntry(models.Model):
    class EntrySide(models.TextChoices):
        DEBIT = "DEBIT", "Debit"
        CREDIT = "CREDIT", "Credit"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(LedgerTransaction, on_delete=models.PROTECT, related_name="entries")
    account = models.ForeignKey("accounts.Account", on_delete=models.PROTECT, related_name="ledger_entries")
    side = models.CharField(max_length=6, choices=EntrySide.choices)
    amount_minor_units = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [models.CheckConstraint(condition=Q(amount_minor_units__gt=0), name="ledger_entry_amount_positive")]

    def __str__(self):
        return (
            f"{self.side} {self.amount_minor_units} "
            f"on {self.account.account_number}"
        )