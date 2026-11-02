from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Account
from .replay import (
    find_posted_transactions_missing_events,
    replay_account_balances,
    replay_transfer_projection,
    verify_account_balance_projection,
    verify_transfer_projection,
)


def account_labels(account_ids):
    accounts = Account.objects.filter(pk__in=list(account_ids))
    return {
        str(account.pk): {
            "account_number": account.account_number,
            "currency": account.currency,
        }
        for account in accounts
    }


class IntegrityCheckView(APIView):
    """Base class: POST runs a read-only check; corrupt event data becomes a 422."""
    permission_classes = [IsAdminUser]

    def run(self):
        raise NotImplementedError

    def post(self, request):
        try:
            result = self.run()
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=422)
        except DjangoValidationError as exc:
            return Response({"detail": "; ".join(exc.messages)}, status=422)

        result["checked_at"] = timezone.now().isoformat()
        return Response(result)


class ReplayTransfersView(IntegrityCheckView):
    def run(self):
        projection = replay_transfer_projection()
        transfers = [projection[key] for key in sorted(projection)]
        return {"count": len(transfers), "transfers": transfers}


class ReplayBalancesView(IntegrityCheckView):
    def run(self):
        balances = replay_account_balances()
        labels = account_labels(balances)

        items = [
            {
                "account_id": account_id,
                "account_number": labels.get(account_id, {}).get("account_number"),
                "currency": labels.get(account_id, {}).get("currency"),
                "balance_minor_units": balances[account_id],
            }
            for account_id in sorted(balances)
        ]
        return {"count": len(items), "balances": items}


class VerifyTransfersView(IntegrityCheckView):
    def run(self):
        return verify_transfer_projection()


class VerifyBalancesView(IntegrityCheckView):
    def run(self):
        result = verify_account_balance_projection()
        labels = account_labels(item["account_id"] for item in result["mismatches"])

        for item in result["mismatches"]:
            label = labels.get(item["account_id"], {})
            item["account_number"] = label.get("account_number")
            item["currency"] = label.get("currency")

        return result


class MissingEventsView(IntegrityCheckView):
    def run(self):
        transaction_ids = find_posted_transactions_missing_events()
        return {
            "is_consistent": not transaction_ids,
            "count": len(transaction_ids),
            "transaction_ids": transaction_ids,
        }