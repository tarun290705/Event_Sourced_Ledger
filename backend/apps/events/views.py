from rest_framework import generics
from rest_framework.permissions import IsAdminUser
from .models import DomainEvent
from .serializers import DomainEventSerializer

class DomainEventListView(generics.ListAPIView):
    serializer_class = DomainEventSerializer
    queryset = DomainEvent.objects.all()
    permission_classes = [IsAdminUser]
    filterset_fields = ["aggregate_type", "aggregate_id", "event_type"]
    ordering_fields = ["occured_at", "sequence_number"]
    ordering = ["-occured_at", "-id"]

class DomainEventDetailView(generics.RetrieveAPIView):
    serializer_class = DomainEventSerializer
    queryset = DomainEvent.objects.all()
    permission_classes = [IsAdminUser]