from rest_framework import serializers
from .models import Transfer

class TransferCreateSerializer(serializers.Serializer):
    source_account_id = serializers.UUIDField()
    destination_account_id = serializers.UUIDField()
    amount_minor_units = serializers.IntegerField(min_value=1)
    idempotency_key = serializers.CharField(max_length=155, trim_whitespace=True)
    description = serializers.CharField(max_length=255, required=False, default="Account transfer", trim_whitespace=True)

    def validate_idempotency_key(self, value):
        if not value:
            raise serializers.ValidationError("Idempotency key cannot be empty")

        return value

    def validate(self, attrs):
        source_id = attrs["source_account_id"]
        destination_id = attrs["destination_account_id"]

        if source_id == destination_id:
            raise serializers.ValidationError({
                "destination_account_id": "Source and destination accounts must be different"
            })

        return attrs

class TransferSerializer(serializers.ModelSerializer):
    source_account_id = serializers.UUIDField(read_only=True)
    destination_account_id = serializers.UUIDField(read_only=True)
    ledger_transaction_id = serializers.UUIDField(read_only=True)
    source_account_number = serializers.CharField(source="source_account.account_number", read_only=True)
    source_account_name = serializers.CharField(source="source_account.name", read_only=True)
    destination_account_number = serializers.CharField(source="destination_account.account_number", read_only=True)
    destination_account_name = serializers.CharField(source="destination_account.name", read_only=True)

    class Meta:
        model = Transfer
        fields = [
            "id",
            "status",
            "source_account_id",
            "source_account_number",
            "source_account_name",
            "destination_account_id",
            "destination_account_number",
            "destination_account_name",
            "amount_minor_units",
            "currency",
            "idempotency_key",
            "ledger_transaction_id",
            "created_at",
        ]
        read_only_fields = fields