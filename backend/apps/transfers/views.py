from django.db.models import Q
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from apps.accounts.models import Account
from .models import Transfer
from .serializers import TransferCreateSerializer, TransferSerializer
from .services import create_transfer

def visible_transfers(user):
    queryset = Transfer.objects.select_related("source_account", "destination_account")

    if not user.is_staff:
        queryset = queryset.filter(
            Q(source_account__owner=user) | Q(destination_account__owner=user)
        )

    return queryset

class TransferListCreateView(generics.ListAPIView):
    serializer_class = TransferSerializer
    filterset_fields = ["status", "source_account", "destination_account", "currency"]
    search_fields = ["idempotency_key", "source_account__account_number", "destination_account__account_number"]
    ordering_fields = ["created_at", "amount_minor_units"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return visible_transfers(self.request.user)

    def post(self, request):
        serializer = TransferCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        if not request.user.is_staff:
            owns_source_account = Account.objects.filter(
                id=data["source_account_id"],
                owner=request.user,
            ).exists()

            if not owns_source_account:
                raise PermissionDenied("You are not authorized to transfer from this account")

        transfer = create_transfer(
            source_account_id=data["source_account_id"],
            destination_account_id=data["destination_account_id"],
            amount_minor_units=data["amount_minor_units"],
            idempotency_key=data["idempotency_key"],
            description=data.get("description", "Account transfer"),
            actor=request.user.get_username(),
        )

        replayed = getattr(transfer, "idempotent_replay", False)

        return Response(
            TransferSerializer(transfer).data,
            status=status.HTTP_200_OK if replayed else status.HTTP_201_CREATED,
        )

class TransferDetailView(generics.RetrieveAPIView):
    serializer_class = TransferSerializer

    def get_queryset(self):
        return visible_transfers(self.request.user)