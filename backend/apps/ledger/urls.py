from django.urls import path
from .views import LedgerTransactionDetailView, LedgerTransactionListView, HistoricalAccountBalanceView, AccountEntriesView

urlpatterns = [
    path("transactions/", LedgerTransactionListView.as_view(), name="ledger-transaction-list"),
    path("transactions/<uuid:transaction_id>/", LedgerTransactionDetailView.as_view(), name="ledger-transaction-detail"),
    path("accounts/<uuid:account_id>/historical-balance/", HistoricalAccountBalanceView.as_view(), name="historical-account-balance"),
    path("accounts/<uuid:account_id>/entries/", AccountEntriesView.as_view(), name="account-entries"),
]