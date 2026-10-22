from rest_framework import generics
from rest_framework.exceptions import NotFound
from .models import LedgerTransaction
from .serializers import LedgerTransactionSerializer
from django.utils.dateparse import parse_datetime
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from apps.accounts.models import Account
from .services import calculate_historical_balance

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

class HistoricalAccountBalanceView(APIView):
    def get(self, request, account_id):
        timestamp = request.query_params.get("as_of")

        if not timestamp:
            raise ValidationError({"as_of": "This query parameter is required"})

        as_of = parse_datetime(timestamp)

        if as_of is None:
            raise ValidationError({"as_of": "Provide a valid ISO 8601 timestamp"})

        if as_of.utcoffset() is None:
            raise ValidationError({"as_of": "The timestamp must include a timezone"})

        try:
            account = Account.objects.get(pk=account_id)
        except (Account.DoesNotExist, ValueError):
            raise NotFound("Account not found")

        if not request.user.is_staff and account.owner_id != request.user.id:
            raise NotFound("Account not found")

        balance = calculate_historical_balance(account, as_of)

        return Response({
            "account_id": str(account_id),
            "account_number": account.account_number,
            "currency": account.currency,
            "as_of": as_of.isoformat(),
            "balance_minor_units": balance,
        })