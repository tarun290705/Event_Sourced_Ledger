from rest_framework import generics
from rest_framework.permissions import IsAdminUser
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.all()
    permission_classes = [IsAdminUser]
    filterset_fields = ["action", "resource_type", "resource_id"]
    ordering_fields = ["occured_at"]
    ordering = ["-occured_at"]