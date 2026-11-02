from django.utils.dateparse import parse_datetime
from rest_framework import generics
from rest_framework.exceptions import NotFound, ValidationError
from .models import LedgerTransaction, LedgerEntry
from .serializers import LedgerTransactionSerializer, AccountEntrySerializer
from .filters import LedgerTransactionFilter
from django.utils.dateparse import parse_datetime
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.models import Account
from .services import calculate_historical_balance

def visible_transaction(user):
    queryset = LedgerTransaction.objects.filter(
        status=LedgerTransaction.Status.POSTED
    ).prefetch_related("entries__account")

    if not user.is_staff:
        queryset = queryset.filter(entries__account__owner=user).distinct()

    return queryset

class LedgerTransactionListView(generics.ListAPIView):
    serializer_class = LedgerTransactionSerializer
    filetrset_class = LedgerTransactionFilter
    search_fields = ["description"]
    ordering_fields = ["posted_at", "created_at"]
    ordering = ["-posted_at", "-id"]

    def get_queryset(self):
        return visible_transaction(self.request.user)

class LedgerTransactionDetailView(generics.RetrieveAPIView):
    serializer_class = LedgerTransactionSerializer
    lookup_field = "id"
    lookup_url_kwarg = "transaction_id"

    def get_queryset(self):
        return visible_transaction(self.request.user)

class AccountEntriesView(generics.ListAPIView):
    serializer_class = AccountEntrySerializer
    filterset_fields = ["side"]
    ordering_fields = ["amount_minor_units", "created_at"]
    ordering = ["-transaction__posted_at", "-created_at", "-id"]

    def get_queryset(self):
        user = self.request.user
        account = Account.objects.filter(pk=self.kwargs["account_id"]).first()

        if account is None or (not user.is_staff and account.owner_id != user.id):
            raise NotFound("Account not found")

        return LedgerEntry.objects.filter(account=account, transaction__status=LedgerTransaction.Status.POSTED).select_related("transaction")

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