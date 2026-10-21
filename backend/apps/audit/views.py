from rest_framework import generics
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.all()
    filterset_fields = ["action", "resource_type", "resource_id"]
    ordering_fields = ["occured_at"]
    ordering = ["-occured_at"]