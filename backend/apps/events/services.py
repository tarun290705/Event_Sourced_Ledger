from django.db import transaction, connection
from django.core.exceptions import ValidationError
from .models import DomainEvent

def record_event(*, aggregate_type, aggregate_id, event_type, payload):
    if not isinstance(aggregate_type, str) or not aggregate_type.strip():
        raise ValidationError("Aggregate type is required")

    if not isinstance(event_type, str) or not event_type.strip():
       raise ValidationError("Event type is required")

    if not isinstance(payload, dict):
        raise ValidationError("Payload must be dictionary")

    lock_key = f"domain-event:{aggregate_type}:{aggregate_id}"

    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", [lock_key])

    events = DomainEvent.objects.filter(aggregate_type=aggregate_type, aggregate_id=aggregate_id)

    last_event = events.order_by("-sequence_number").first()

    next_sequence = last_event.sequence_number + 1 if last_event else 1

    return DomainEvent.objects.create(aggregate_type=aggregate_type, aggregate_id=aggregate_id, sequence_number=next_sequence, event_type=event_type, payload=payload)