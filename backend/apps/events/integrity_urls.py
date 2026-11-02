from django.urls import path
from .integrity_views import (
    MissingEventsView,
    ReplayBalancesView,
    ReplayTransfersView,
    VerifyBalancesView,
    VerifyTransfersView,
)

urlpatterns = [
    path("replay/transfers/", ReplayTransfersView.as_view(), name="integrity-replay-transfers"),
    path("replay/balances/", ReplayBalancesView.as_view(), name="integrity-replay-balances"),
    path("verify/transfers/", VerifyTransfersView.as_view(), name="integrity-verify-transfers"),
    path("verify/balances/", VerifyBalancesView.as_view(), name="integrity-verify-balances"),
    path("missing-events/", MissingEventsView.as_view(), name="integrity-missing-events"),
]