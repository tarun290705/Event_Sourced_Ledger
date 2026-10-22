
from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.accounts.models import Account
from apps.events.services import record_event
from apps.audit.models import AuditLog
from apps.audit.services import record_audit_log
from .models import LedgerEntry, LedgerTransaction

def calculate_account_balance(account):
    if not isinstance(account, Account):
        account = Account.objects.get(pk=account)

    entries = LedgerEntry.objects.filter(
        account=account,
        transaction__status=LedgerTransaction.Status.POSTED,
    )

    debit_total = (
        entries.filter(side=LedgerEntry.EntrySide.DEBIT)
        .aggregate(total=Sum("amount_minor_units"))["total"]
        or 0
    )

    credit_total = (
        entries.filter(side=LedgerEntry.EntrySide.CREDIT)
        .aggregate(total=Sum("amount_minor_units"))["total"]
        or 0
    )

    if account.account_type in (
        Account.AccountType.ASSET,
        Account.AccountType.EXPENSE,
    ):
        return debit_total - credit_total

    return credit_total - debit_total

def calculate_historical_balance(account, as_of):
    if not isinstance(account, Account):
        account = Account.objects.get(pk=account)

    if as_of is None:
        raise ValidationError("A historical timestamp is required")

    entries = LedgerEntry.objects.filter(
        account=account,
        transaction__status=LedgerTransaction.Status.POSTED,
        transaction__posted_at__lte=as_of,
    )

    totals = entries.aggregate(
        debit_total=Sum(
            "amount_minor_units",
            filter=Q(side=LedgerEntry.EntrySide.DEBIT),
        ),
        credit_total=Sum(
            "amount_minor_units",
            filter=Q(side=LedgerEntry.EntrySide.CREDIT),
        )
    )

    debit_total = totals["debit_total"] or 0
    credit_total = totals["credit_total"] or 0

    if account.account_type in (Account.AccountType.ASSET or Account.AccountType.EXPENSE):
        return debit_total - credit_total

    return credit_total - debit_total

@transaction.atomic
def post_transaction(*, transaction_type, description, entries):
    if not description or not description.strip():
        raise ValidationError("Transaction description is required.")

    if not entries or len(entries) < 2:
        raise ValidationError("At least two ledger entries are required.")

    normalized_entries = []

    for entry in entries:
        try:
            account_id = entry["account_id"]
            side = entry["side"]
            amount = entry["amount_minor_units"]
        except (KeyError, TypeError):
            raise ValidationError(
                "Each entry requires account_id, side, and amount_minor_units."
            )

        if side not in (
            LedgerEntry.EntrySide.DEBIT,
            LedgerEntry.EntrySide.CREDIT,
        ):
            raise ValidationError("Entry side must be DEBIT or CREDIT.")

        if (
            isinstance(amount, bool)
            or not isinstance(amount, int)
            or amount <= 0
            or amount > 9223372036854775807
        ):
            raise ValidationError(
                "Amount must be a positive integer within the supported range."
            )

        normalized_entries.append(
            {
                "account_id": account_id,
                "side": side,
                "amount_minor_units": amount,
            }
        )

    account_ids = sorted(
        {entry["account_id"] for entry in normalized_entries},
        key=str,
    )

    locked_accounts = {}

    for account in (
        Account.objects.select_for_update()
        .filter(pk__in=account_ids)
        .order_by("pk")
    ):
        locked_accounts[account.pk] = account

    if len(locked_accounts) != len(account_ids):
        raise ValidationError("One or more accounts do not exist.")

    accounts_used = [
        locked_accounts[entry["account_id"]]
        for entry in normalized_entries
    ]

    if any(
        account.status != Account.Status.ACTIVE
        for account in accounts_used
    ):
        raise ValidationError("All accounts must be active.")

    if len({account.currency for account in accounts_used}) != 1:
        raise ValidationError("All entries must use the same currency.")

    debit_total = sum(
        entry["amount_minor_units"]
        for entry in normalized_entries
        if entry["side"] == LedgerEntry.EntrySide.DEBIT
    )

    credit_total = sum(
        entry["amount_minor_units"]
        for entry in normalized_entries
        if entry["side"] == LedgerEntry.EntrySide.CREDIT
    )

    if debit_total != credit_total:
        raise ValidationError(
            "Transaction is unbalanced: total debits must equal total credits."
        )

    ledger_transaction = LedgerTransaction.objects.create(
        transaction_type=transaction_type,
        description=description.strip(),
        status=LedgerTransaction.Status.DRAFT,
    )

    LedgerEntry.objects.bulk_create(
        [
            LedgerEntry(
                transaction=ledger_transaction,
                account=locked_accounts[entry["account_id"]],
                side=entry["side"],
                amount_minor_units=entry["amount_minor_units"],
            )
            for entry in normalized_entries
        ]
    )

    ledger_transaction.status = LedgerTransaction.Status.POSTED
    ledger_transaction.posted_at = timezone.now()
    ledger_transaction.save(update_fields=["status", "posted_at"])

    record_event(
        aggregate_type="LEDGER_TRANSACTION",
        aggregate_id=ledger_transaction.id,
        event_type="LedgerTransactionPosted",
        payload={
            "transaction_id": str(ledger_transaction.id),
            "transaction_type": ledger_transaction.transaction_type,
            "description": ledger_transaction.description,
            "posted_at": ledger_transaction.posted_at.isoformat(),
            "entries": [
                {
                    "account_id": str(entry["account_id"]),
                    "side": entry["side"],
                    "amount_minor_units": entry["amount_minor_units"],
                }
                for entry in normalized_entries
            ],
        },
    )

    record_audit_log(
        action=AuditLog.Action.TRANSFER_POSTED,
        resource_type="LEDGER_TRANSACTION",
        resource_id=ledger_transaction.id,
        actor="system",
        description="Ledger transaction posted successfully",
        metadata={
            "transaction_type": ledger_transaction.transaction_type,
            "description": ledger_transaction.description,
            "entry_count": len(normalized_entries,)
        },
    )

    return ledger_transaction
