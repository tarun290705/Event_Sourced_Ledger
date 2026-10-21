from rest_framework import generics
from rest_framework.exceptions import NotFound
from .models import LedgerTransaction
from .serializers import LedgerTransactionSerializer

class LedgerTransactionListView(generics.ListAPIView):
    serializer_class = LedgerTransactionSerializer

    def get_queryset(self):
        return (
            LedgerTransaction.objects
            .filter(status=LedgerTransaction.Status.POSTED)
            .prefetch_related("ledgerentry_set__acount")
            .order_by("-posted_at")
        )

class LedgerTransactionDetailView(generics.RetrieveAPIView):
    serializer_class = LedgerTransactionSerializer
    lookup_field = "id"
    lookup_url_kwarg = "transaction_id"

    def get_queryset(self):
        return (
            LedgerTransaction.objects
            .filter(status=LedgerTransaction.Status.POSTED)
            .prefetch_related("ledgerentry_set__acount")
        )