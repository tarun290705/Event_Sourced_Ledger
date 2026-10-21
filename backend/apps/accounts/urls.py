from django.urls import path
from .views import AccountListCreateView, AccountStatusUpdateView

urlpatterns = [
    path("", AccountListCreateView.as_view(), name="account-list-create"),
    path("<uuid:pk>/status/", AccountStatusUpdateView.as_view(), name="account-status-update"),
]