from rest_framework import serializers
from .models import LedgerEntry, LedgerTransaction

class LedgerEntrySerializer(serializers.ModelSerializer):
    account_number = serializers.CharField(source="account.account_number", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)

    class Meta:
        model = LedgerEntry
        fields = [
            "id",
            "account",
            "account_number",
            "account_name",
            "side",
            "amount_minor_units",
            "created_at",
        ]
        read_only_fields = fields

class LedgerTransactionSerializer(serializers.ModelSerializer):
    entries = LedgerEntrySerializer(many=True, read_only=True)

    class Meta:
        model = LedgerTransaction
        fields = [
            "id",
            "transaction_type",
            "status",
            "description",
            "created_at",
            "posted_at",
            "entries",
        ]
        read_only_fields = fields

class AccountEntrySerializer(serializers.ModelSerializer):
    transaction_id = serializers.UUIDField(read_only=True)
    transaction_type = serializers.CharField(source="transaction.transaction_type", read_only=True)
    description = serializers.CharField(source="transaction.description", read_only=True)
    posted_at = serializers.DateTimeField(source="transaction.posted_at", read_only=True)

    class Meta:
        model = LedgerEntry
        fields = [
            "id",
            "transaction_id",
            "transaction_type",
            "description",
            "posted_at",
            "side",
            "amount_minor_units",
            "created_at",
        ]
        read_only_fields = fields