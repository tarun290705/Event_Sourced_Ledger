from rest_framework import serializers
from .models import Account

class AccountSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(
        source="owner.get_username", read_only=True, allow_null=True
    )
    balance_minor_units = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Account
        fields = [
            "id",
            "account_number",
            "owner",
            "owner_username",
            "name",
            "account_type",
            "currency",
            "status",
            "created_at",
            "balance_minor_units",
        ]
        read_only_fields = ["id", "status", "created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user is None or not (user.is_staff or instance.owner_id == user.id):
            data["balance_minor_units"] = None

        return data