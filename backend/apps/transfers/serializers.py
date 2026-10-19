from rest_framework import serializers
from apps.accounts.models import Account

class TransferCreateSerializer(serializers.Serializer):
    source_account_id = serializers.UUIDField()
    destination_account_id = serializers.UUIDField()
    amount_minor_units = serializers.IntegerField(min_value=1)
    idempotency_key = serializers.CharField(max_length=155, trim_whitespace=True)
    description = serializers.CharField(max_length=255, required=False, default="Account transfer", trim_whitespace=True)

    def validate_idempotency_key(self, value):
        if not value:
            raise serializers.ValidationError("Desription cannot be empty")

        return value

    def validate(self, attrs):
        source_id = attrs["source_account_id"]
        destination_id = attrs["destination_account_id"]

        if source_id == destination_id:
            raise serializers.ValidationError({
                "destination_account_id": "Source and destination accounts must be different"
            })

        return attrs