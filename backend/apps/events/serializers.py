from rest_framework import serializers
from .models import DomainEvent

class DomainEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DomainEvent
        fields = [
            "id",
            "aggregate_type",
            "aggregate_id",
            "sequence_number",
            "event_type",
            "payload",
            "occured_at",
        ]
        read_only_fields = fields