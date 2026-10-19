from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from apps.accounts.models import Account
from .serializers import TransferCreateSerializer
from .services import create_transfer

class TransferCreateView(APIView):
    def post(self, request):
        serializer = TransferCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        transfer = create_transfer(
            source_account_id=data["source_account_id"],
            destination_account_id=data["destination_account_id"],
            amount_minor_units=data["amount_minor_units"],
            idempotency_key=data["idempotency_key"],
            description=data.get("description", "Account transfer"),
        )

        return Response(
            {
                "id": str(transfer.id),
                "status": transfer.status,
                "source_account_id": str(transfer.source_account_id),
                "destination_account_id": str(transfer.destination_account_id),
                "amount_minor_units": transfer.amount_minor_units,
                "currency": transfer.currency,
                "idempotency_key": transfer.idempotency_key,
                "ledger_transaction_id": str(transfer.ledger_transaction_id),
                "created_at": transfer.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )