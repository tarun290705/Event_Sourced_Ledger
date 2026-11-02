from django.db.models import BigIntegerField, Case, Q, F, Sum, Value, When
from django.db.models.functions import Coalesce
from .models import Account

DEBIT_NORMAL_TYPES = [Account.AccountType.ASSET, Account.AccountType.EXPENSE]

def accounts_with_balance():
    zero = Value(0, output_field=BigIntegerField())
    posted = Q(ledger_entries__transaction__status="POSTED")

    return (
        Account.objects.select_related("owner")
        .annotate(
            debit_total=Coalesce(
                Sum(
                    "ledger_entries__amount_minor_units",
                    filter=posted & Q(ledger_entries__side="DEBIT"),
                ),
                zero,
                output_field=BigIntegerField(),
            ),
            credit_total=Coalesce(
                Sum(
                "ledger_entries__amount_minor_units",
                    filter=posted & Q(ledger_entries__side="CREDIT")
                    ),
                    zero,
                    output_field=BigIntegerField(),
            ),
        )
        .annotate(
            balance_minor_units=Case(
                When(
                    account_type__in=DEBIT_NORMAL_TYPES,
                    then=F("debit_total") - F("credit_total"),
                ),
                default=F("credit_total") - F("debit_total"),
                output_field=BigIntegerField()
            )
        )
    )