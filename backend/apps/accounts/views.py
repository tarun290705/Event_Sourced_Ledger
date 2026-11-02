from django.core.exceptions import ValidationError
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Account
from .selectors import accounts_with_balance
from .serializers import AccountSerializer
from .services import create_account, change_account_status

def to_drf_error(exc):
    if hasattr(exc, "error_dict"):
        return DRFValidationError(exc.message_dict)
    return DRFValidationError(exc.messages)

class AccountListCreateView(generics.ListCreateAPIView):
    serializer_class = AccountSerializer
    filterset_fields = ["status", "account_type", "currency", "owner"]
    search_fields = ["account_number", "name"]
    ordering_fields = ["account_number", "name", "created_at", "balance_minor_units"]
    ordering = ["account_number"]

    def get_queryset(self):
        return accounts_with_balance()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        owner = data.get("owner") if request.user.is_staff else request.user

        try:
            account = create_account(
                account_number=data["account_number"],
                name=data["name"],
                account_type=data["account_type"],
                currency=data.get("currency", Account._meta.get_field("currency").get_default()),
                owner=owner,
                actor=request.user.get_username(),
            )
        except ValidationError as exc:
            raise to_drf_error(exc) from exc

        output = self.get_serializer(accounts_with_balance().get(pk=account.pk))
        return Response(output.data, status=status.HTTP_201_CREATED)

class AccountDetailView(generics.RetrieveAPIView):
    serializer_class = AccountSerializer

    def get_queryset(self):
        return accounts_with_balance()    

class AccountStatusUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        new_status = request.data.get("status")

        if not isinstance(new_status, str):
            raise DRFValidationError({"status": "A valid status is required"})

        try:
            account = change_account_status(
                account_id=pk,
                new_status=new_status,
                actor=request.user.get_username(),
            )
        except ValidationError as exc:
            raise to_drf_error(exc) from exc

        output = AccountSerializer(accounts_with_balance().get(pk=account.pk), context={"request": request})

        return Response(output.data)