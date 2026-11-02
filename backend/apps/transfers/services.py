from django.db import connection, transaction, IntegrityError
from rest_framework.exceptions import ValidationError
from apps.accounts.models import Account
from apps.ledger.models import LedgerEntry, LedgerTransaction
from apps.ledger.services import post_transaction, calculate_account_balance
from apps.events.services import record_event
from apps.audit.models import AuditLog
from apps.audit.services import record_audit_log
from .models import Transfer

@transaction.atomic
def create_transfer(*, source_account_id, destination_account_id, amount_minor_units, idempotency_key, description="Account transfer", actor="system"):
    if not isinstance(idempotency_key, str) or not idempotency_key.strip():
        raise ValidationError("Idempotency key is required")

    idempotency_key = idempotency_key.strip()

    if len(idempotency_key) > 255:
        raise ValidationError("Idempotency key cannot exceed 255 characters")

    if isinstance(amount_minor_units, bool) or not isinstance(amount_minor_units, int) or amount_minor_units <= 0 or amount_minor_units > 9223372036854775807:
        raise ValidationError("Amount must be positive integer in paise")

    if source_account_id == destination_account_id:
        raise ValidationError("Source and destination accounts must be different")

    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", [idempotency_key])

    existing = Transfer.objects.filter(idempotency_key=idempotency_key).first()

    if existing:
        if (
            existing.source_account_id != source_account_id
            or existing.destination_account_id != destination_account_id
            or existing.amount_minor_units != amount_minor_units
        ):
            raise ValidationError("Idempotency key was already used for a different transfer")

        existing.idempotent_replay = True
        return existing

    account_ids = sorted([source_account_id, destination_account_id], key=str)

    locked_accounts = {
        account.pk: account
        for account in Account.objects.select_for_update().filter(pk__in=account_ids).order_by("pk")
    }

    if len(locked_accounts) != 2:
        raise ValidationError("Source and destination account does not exist")

    source = locked_accounts[source_account_id]
    destination = locked_accounts[destination_account_id]

    if source.status != Account.Status.ACTIVE or destination.status != Account.Status.ACTIVE:
        raise ValidationError("All accounts must be active")

    if source.currency != destination.currency:
        raise ValidationError("Transfer accounts must use the same currency")

    if source.account_type != Account.AccountType.LIABILITY or destination.account_type != Account.AccountType.LIABILITY:
        raise ValidationError("Transfers are allowed only between liability accounts")

    source_balance = calculate_account_balance(source)

    if source_balance < amount_minor_units:
        raise ValidationError("Insufficient funds")
    
    ledger_transaction = post_transaction(
        transaction_type=LedgerTransaction.TransactionType.TRANSFER,
        description=description,
        entries=[
            {
                "account_id": source.id,
                "side": LedgerEntry.EntrySide.DEBIT,
                "amount_minor_units": amount_minor_units,
            },
            {
                "account_id": destination.id,
                "side": LedgerEntry.EntrySide.CREDIT,
                "amount_minor_units": amount_minor_units,
            },
        ],
    )

    try:
        transfer = Transfer.objects.create(
            source_account=source,
            destination_account=destination,
            amount_minor_units=amount_minor_units,
            currency=source.currency,
            idempotency_key=idempotency_key,
            ledger_transaction=ledger_transaction,
            status=Transfer.Status.COMPLETED,
        )

        record_event(
            aggregate_type="TRANSFER",
            aggregate_id=transfer.id,
            event_type="TransferCompleted",
            payload={
                "transfer_id": str(transfer.id),
                "source_account_id": str(source.id),
                "destination_account_id": str(destination.id),
                "amount_minor_units": amount_minor_units,
                "currency": source.currency,
                "ledger_transaction_id": str(ledger_transaction.id),
            }
        )

        record_audit_log(
            action=AuditLog.Action.TRANSFER_COMPLETED,
            resource_type="TRANSFER",
            resource_id=transfer.id,
            actor=actor,
            description="Transfer completed successfully",
            metadata={
                "source_account_id": str(transfer.source_account_id),
                "destination_account_id": str(transfer.destination_account_id),
                "amount_minor_units": transfer.amount_minor_units,
                "currency": transfer.currency,
                "ledger_transaction_id": str(transfer.ledger_transaction_id),
            },
        )

        return transfer

    except IntegrityError:
        raise