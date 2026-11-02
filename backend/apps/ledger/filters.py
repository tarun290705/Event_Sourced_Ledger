import django_filters
from .models import LedgerTransaction

class LedgerTransactionFilter(django_filters.FilterSet):
    account = django_filters.UUIDFilter(field_name="entries__account", distinct=True)
    posted_after = django_filters.IsoDateTimeFilter(field_name="posted_at", lookup_expr="gte")
    posted_before = django_filters.IsoDateTimeFilter(field_name="posted_at", lookup_expr="lte")

    class Meta:
        model = LedgerTransaction
        fields = ["transaction_type"]