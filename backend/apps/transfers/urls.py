from django.urls import path
from .views import TransferDetailView, TransferListCreateView

urlpatterns = [
    path("", TransferListCreateView.as_view(), name="transfer-list-create"),
    path("<uuid:pk>/", TransferDetailView.as_view(), name="transfer-detail"),
]