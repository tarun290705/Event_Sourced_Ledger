from django.urls import path
from .views import LedgerTransactionDetailView, LedgerTransactionListView

urlpatterns = [
    path("transactions/", LedgerTransactionListView.as_view(), name="ledger-transaction-list"),
    path("transactions/<uuid:transaction_id>/", LedgerTransactionDetailView.as_view(), name="ledger-transaction-detail"),
]