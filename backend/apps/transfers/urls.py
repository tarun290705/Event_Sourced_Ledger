from django.urls import path
from .views import TransferCreateView

urlpatterns = [
    path("", TransferCreateView.as_view(), name="transfer-create"),
]