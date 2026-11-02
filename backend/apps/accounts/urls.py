from django.urls import path
from .views import AccountListCreateView, AccountStatusUpdateView, AccountDetailView

urlpatterns = [
    path("", AccountListCreateView.as_view(), name="account-list-create"),
    path("<uuid:pk>/", AccountDetailView.as_view(), name="account-detail"),
    path("<uuid:pk>/status/", AccountStatusUpdateView.as_view(), name="account-status-update"),
]