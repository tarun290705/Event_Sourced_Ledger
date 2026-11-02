from django.core.exceptions import ValidationError
from django.db import transaction
from apps.accounts.models import Account
from apps.audit.models import AuditLog
from apps.audit.services import record_audit_log

@transaction.atomic
def create_account(*, account_number, name, account_type, currency="INR", owner=None, actor="system"):
    account = Account(
        account_number=account_number,
        name=name,
        account_type=account_type,
        currency=currency,
        owner=owner,
    )
    account.full_clean()
    account.save()

    record_audit_log(
        action=AuditLog.Action.ACCOUNT_CREATED,
        resource_type="ACCOUNT",
        resource_id=account.id,
        actor=actor,
        description="Account created successfully",
        metadata={
            "account_number": account.account_number,
            "name": account.name,
            "account_type": account.account_type,
            "currency": account.currency,
        },
    )

    return account

@transaction.atomic
def change_account_status(*, account_id, new_status, actor="system"):
    valid_statuses = Account.Status.values

    if new_status not in valid_statuses:
        raise ValidationError("Invalid account status")

    account = Account.objects.select_for_update().filter(id=account_id).first()

    if account is None:
        raise ValidationError("Account does not exist")

    old_status = account.status

    if old_status == new_status:
        return account

    if old_status == Account.Status.CLOSED:
        raise ValidationError("A closed account cannot change status")

    if new_status == Account.Status.ACTIVE and old_status != Account.Status.FROZEN:
        raise ValidationError("Only a frozen account can be reactivated")

    if new_status == Account.Status.CLOSED and old_status != Account.Status.FROZEN:
        raise ValidationError("Only frozen account can be closed")

    account.status = new_status
    account.full_clean()
    account.save(update_fields=["status"])

    if new_status == Account.Status.FROZEN:
        action = AuditLog.Action.ACCOUNT_FROZEN
        description = "Account frozen"
    elif new_status == Account.Status.CLOSED:
        action = AuditLog.Action.ACCOUNT_CLOSED
        description = "Account closed"
    else:
        action = AuditLog.Action.ACCOUNT_UPDATED
        description = "Account reactivated"

    record_audit_log(
        action=action,
        resource_type="ACCOUNT",
        resource_id=account.id,
        actor=actor,
        description=description,
        metadata={
            "old_status": old_status,
            "new_status": new_status,
        },
    )

    return account