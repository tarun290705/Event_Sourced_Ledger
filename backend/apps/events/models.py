import uuid
from django.db import models
from django.core.exceptions import ValidationError

class DomainEventQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Domain events cannot be updated")

    def delete(self):
        raise ValidationError("Domain events cannot be deleted")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValidationError("Domain events cannot be updated")

class DomainEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aggregate_type = models.CharField(max_length=100)
    aggregate_id = models.UUIDField()
    sequence_number = models.PositiveBigIntegerField()
    event_type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    occured_at = models.DateTimeField(auto_now_add=True)
    objects = DomainEventQuerySet.as_manager()

    class Meta:
        ordering = ["aggregate_type", "aggregate_id", "sequence_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["aggregate_type", "aggregate_id", "sequence_number"], 
                name="unique_aggregate_event_sequence"), 
                models.CheckConstraint(
                    condition=models.Q(sequence_number__gt=0),
                    name="event_sequence_must_be_positive"
                    ),
                ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Existing domain events are immutable")

        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Domain events cannot be deleted")

    def __str__(self):
        return f"{self.aggregate_type}:{self.aggregate_id} #{self.sequence_number} - {self.event_type}"
