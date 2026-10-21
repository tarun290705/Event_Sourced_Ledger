from django.core.exceptions import ValidationError
from django.db import transaction
from .models import AuditLog

@transaction.atomic
def record_audit_log(*, action, resource_type, resource_id, actor=None, description="", metadata=None):
    if not isinstance(action, str) or not action.strip():
        raise ValidationError("ACtion is required")

    if not isinstance(resource_type, str) or not resource_type.strip():
        raise ValidationError("Resource type is required")

    if resource_id is None or not str(resource_id).strip():
        raise ValidationError("Resource ID is required")

    if not isinstance(description, str):
        raise ValidationError("Description must be a string")

    if metadata is None:
        metada = {}

    if not isinstance(metadata, dict):
        raise ValidationError("Metadata must be a dictionary")

    valid_actions = AuditLog.Action.values
    if action not in valid_actions:
        raise ValidationError("Invalid audit action")

    return AuditLog.objects.create(
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        actor=str(actor) if actor is not None else None,
        description=description,
        metadata=metadata
    )