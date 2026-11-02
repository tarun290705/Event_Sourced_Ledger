from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Account
from apps.ledger.models import LedgerEntry, LedgerTransaction
from apps.transfers.models import Transfer

ACTIVITY_DAYS = 14


def transactions_for(user):
    queryset = LedgerTransaction.objects.filter(status=LedgerTransaction.Status.POSTED)

    if not user.is_staff:
        owned = LedgerEntry.objects.filter(account__owner=user).values("transaction_id")
        queryset = queryset.filter(id__in=owned)

    return queryset


def transfers_for(user):
    queryset = Transfer.objects.all()

    if not user.is_staff:
        queryset = queryset.filter(
            Q(source_account__owner=user) | Q(destination_account__owner=user)
        )

    return queryset


class DashboardSummaryView(APIView):
    def get(self, request):
        user = request.user
        transactions = transactions_for(user)
        transfers = transfers_for(user)

        today = timezone.localdate()
        start = today - timedelta(days=ACTIVITY_DAYS - 1)

        transaction_rows = (
            transactions.filter(posted_at__date__gte=start)
            .annotate(day=TruncDate("posted_at"))
            .values("day")
            .annotate(total=Count("id"))
            .order_by("day")
        )
        transfer_rows = (
            transfers.filter(created_at__date__gte=start)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Count("id"))
            .order_by("day")
        )

        transactions_by_day = {row["day"]: row["total"] for row in transaction_rows}
        transfers_by_day = {row["day"]: row["total"] for row in transfer_rows}

        activity = []
        for offset in range(ACTIVITY_DAYS):
            day = start + timedelta(days=offset)
            activity.append({
                "date": day.isoformat(),
                "transactions": transactions_by_day.get(day, 0),
                "transfers": transfers_by_day.get(day, 0),
            })

        status_rows = Account.objects.order_by().values("status").annotate(total=Count("id"))
        by_status = {value: 0 for value in Account.Status.values}
        by_status.update({row["status"]: row["total"] for row in status_rows})

        return Response({
            "scope": "all" if user.is_staff else "own",
            "accounts": {"total": sum(by_status.values()), "by_status": by_status},
            "transactions": {"total": transactions.count()},
            "transfers": {"total": transfers.count()},
            "activity": activity,
        })