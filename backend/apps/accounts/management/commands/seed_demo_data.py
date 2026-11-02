from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.accounts.models import Account
from apps.accounts.services import create_account
from apps.ledger.models import LedgerEntry, LedgerTransaction
from apps.ledger.services import post_transaction
from apps.transfers.services import create_transfer

ACTOR = "seed_demo_data"
CURRENCY = "INR"

CASH_ACCOUNT = {
    "account_number": "SEED-CASH",
    "name": "Cash Reserve",
    "account_type": Account.AccountType.ASSET,
}

# opening balances in paise
CUSTOMER_ACCOUNTS = [
    {"account_number": "SEED-CUST-001", "name": "Customer Account A", "opening": 1_000_000},
    {"account_number": "SEED-CUST-002", "name": "Customer Account B", "opening": 500_000},
    {"account_number": "SEED-CUST-003", "name": "Customer Account C", "opening": 250_000},
]

# (idempotency key, source, destination, amount in paise, description)
SEED_TRANSFERS = [
    ("seed-transfer-001", "SEED-CUST-001", "SEED-CUST-002", 25_000, "Seed transfer A to B"),
    ("seed-transfer-002", "SEED-CUST-002", "SEED-CUST-003", 10_000, "Seed transfer B to C"),
]


class Command(BaseCommand):
    help = "Creates funded demo accounts and a few transfers. Safe to run more than once."

    def add_arguments(self, parser):
        parser.add_argument(
            "--owner",
            help="Username that should own the demo customer accounts (default: no owner)",
        )

    def ensure_account(self, **spec):
        existing = Account.objects.filter(account_number=spec["account_number"]).first()

        if existing is not None:
            return existing, False

        account = create_account(currency=CURRENCY, actor=ACTOR, **spec)
        return account, True

    @transaction.atomic
    def handle(self, *args, **options):
        owner = None

        if options["owner"]:
            owner = get_user_model().objects.filter(username=options["owner"]).first()

            if owner is None:
                raise CommandError(f"User '{options['owner']}' does not exist")

        accounts_created = 0
        accounts_existing = 0
        transfers_created = 0
        transfers_existing = 0

        try:
            cash, created = self.ensure_account(**CASH_ACCOUNT)
            accounts_created += int(created)
            accounts_existing += int(not created)

            customers = {}

            for spec in CUSTOMER_ACCOUNTS:
                account, created = self.ensure_account(
                    account_number=spec["account_number"],
                    name=spec["name"],
                    account_type=Account.AccountType.LIABILITY,
                    owner=owner,
                )
                customers[spec["account_number"]] = account
                accounts_created += int(created)
                accounts_existing += int(not created)

                # Only fund accounts created by this run, so re-running never double-funds
                if created:
                    post_transaction(
                        transaction_type=LedgerTransaction.TransactionType.DEPOSIT,
                        description=f"Seed deposit for {spec['account_number']}",
                        entries=[
                            {
                                "account_id": cash.id,
                                "side": LedgerEntry.EntrySide.DEBIT,
                                "amount_minor_units": spec["opening"],
                            },
                            {
                                "account_id": account.id,
                                "side": LedgerEntry.EntrySide.CREDIT,
                                "amount_minor_units": spec["opening"],
                            },
                        ],
                    )

            for key, source, destination, amount, description in SEED_TRANSFERS:
                transfer = create_transfer(
                    source_account_id=customers[source].id,
                    destination_account_id=customers[destination].id,
                    amount_minor_units=amount,
                    idempotency_key=key,
                    description=description,
                    actor=ACTOR,
                )

                if getattr(transfer, "idempotent_replay", False):
                    transfers_existing += 1
                else:
                    transfers_created += 1

        except DRFValidationError as exc:
            raise CommandError(f"Seeding failed: {exc.detail}")

        self.stdout.write(self.style.SUCCESS(
            f"Accounts: {accounts_created} created, {accounts_existing} existing. "
            f"Transfers: {transfers_created} created, {transfers_existing} existing."
        ))