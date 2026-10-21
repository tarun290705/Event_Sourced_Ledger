from rest_framework import serializers
from .models import Account

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "account_number",
            "owner",
            "name",
            "account_type",
            "currency",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]