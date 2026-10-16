import uuid
from django.conf import settings
from django.db import models

class Account(models.Model):
    class AccountType(models.TextChoices):
        ASSET = "ASSET", "Asset"
        LIABILITY = "LIABILITY", "Liability"
        EQUITY = "EQUITY", "Equity"
        INCOME = "INCOME", "Income"
        EXPENSE = "EXPENSE", "Expense"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        FROZEN = "FROZEN", "Frozen"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account_number = models.CharField(max_length=30, unique=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="ledger_accounts", null=True, blank=True)
    name = models.CharField(max_length=100)
    account_type = models.CharField(max_length=10, choices=AccountType.choices)
    currency = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["account_number"]
        constraints = [models.CheckConstraint(condition=models.Q(currency__regex=r"^[A-Z]{3}$"), name="account_currency_three_uppercase_letters")]

    def __str__(self):
        return f"{self.account_number} - {self.name}"
