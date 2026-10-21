from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "actor", "action", "resource_type", "resource_id", "description", "metadata", "occured_at"]
        read_only_fields = fields