from django.core.exceptions import ValidationError
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Account
from .serializers import AccountSerializer
from .services import create_account, change_account_status

class AccountListCreateView(generics.ListCreateAPIView):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            account = create_account(
                account_number=serializer.validated_data["account_number"],
                name=serializer.validated_data["name"],
                account_type=serializer.validated_data["account_type"],
                currency=serializer.validated_data["currency"],
                owner=serializer.validated_data.get("owner"),
                actor="system",
            )
        except ValidationError as exc:
            raise DRFValidationError(exc.message) from exc

        output = self.get_serializer(account)
        return Response(output.data, status=status.HTTP_201_CREATED)

class AccountStatusUpdateView(APIView):
    def patch(self, request, pk):
        new_status = request.data.get("status")

        if not isinstance(new_status, str):
            raise DRFValidationError({"status": "A valid status is required"})

        try:
            account = change_account_status(
                account_id=pk,
                new_status=new_status,
                actor="system",
            )
        except ValidationError as exc:
            raise DRFValidationError(exc.message) from exc

        return Response(AccountSerializer(account).data)