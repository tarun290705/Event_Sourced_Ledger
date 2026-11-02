from .models import DomainEvent
from apps.transfers.models import Transfer
from apps.accounts.models import Account
from apps.ledger.models import LedgerEntry, LedgerTransaction
from apps.ledger.services import calculate_account_balance

def replay_transfer_projection():
    projection = {}

    events = DomainEvent.objects.filter(aggregate_type="TRANSFER", event_type="TransferCompleted").order_by("occured_at", "id")

    required_fields = {
        "transfer_id",
        "source_account_id",
        "destination_account_id",
        "amount_minor_units",
        "currency",
        "ledger_transaction_id",
    }

    for event in events.iterator():
        payload = event.payload

        if not isinstance(payload, dict):
            raise ValueError(f"Invalid payload for event {event.id}")

        missing_fields = required_fields - payload.keys()

        if missing_fields:
            raise ValueError(f"Event {event.id} is missing fields: {', '.join(sorted(missing_fields))}")

        transfer_id = str(event.aggregate_id)

        if str(payload["transfer_id"]) != transfer_id:
            raise ValueError(f"Transaction ID mismatch in event {event.id}")

        amount = payload["amount_minor_units"]

        if isinstance(amount, bool) or not isinstance(amount, int) or amount <= 0:
            raise ValueError(f"Invalid transfer amount in event {event.id}")

        if transfer_id in projection:
            raise ValueError(f"Duplicate completion event for transfer {transfer_id}")

        projection[transfer_id] = {
            "transfer_id": transfer_id,
            "source_account_id": str(payload["source_account_id"]),
            "destination_account_id": str(payload["destination_account_id"]),
            "amount_minor_units": amount,
            "currency": payload["currency"],
            "ledger_transaction_id": str(payload["ledger_transaction_id"]),
            "status": "COMPLETED",
        }

    return projection

def verify_transfer_projection():
    projection = replay_transfer_projection()

    database_transfers = {
        str(transfer.id): transfer for transfer in Transfer.objects.all()
    }

    replayed_ids = set(projection)
    database_ids = set(database_transfers)

    missing_events = sorted(database_ids - replayed_ids)
    missing_transfers = sorted(replayed_ids - database_ids)
    mismatches = []

    comparable_fields = [
        "source_account_id",
        "destination_account_id",
        "amount_minor_units",
        "currency",
        "ledger_transaction_id",
        "status",
    ]

    uuid_fields = {"source_account_id", "destination_account_id", "ledger_transaction_id"}

    for transfer_id in sorted(replayed_ids & database_ids):
        replayed = projection[transfer_id]
        stored = database_transfers[transfer_id]

        for field in comparable_fields:
            stored_value = getattr(stored, field)

            if field in uuid_fields:
                stored_value = str(stored_value)

            if replayed[field] != stored_value:
                mismatches.append({
                    "transfer_id": transfer_id,
                    "field": field,
                    "replayed_value": replayed[field],
                    "database_value": stored_value,
                })

    return {
        "is_consistent": not (missing_events or missing_transfers or mismatches),
        "missing_events": missing_events,
        "missing_transfers": missing_transfers,
        "mismatches": mismatches,
    }

def replay_account_balances():
    events = DomainEvent.objects.filter(
        aggregate_type="LEDGER_TRANSACTION",
        event_type="LedgerTransactionPosted",
    ).order_by("occured_at", "id")

    account_totals = {}

    for event in events.iterator():
        payload = event.payload

        if not isinstance(payload, dict):
            raise ValueError(f"Invalid payload for event {event.id}")

        entries = payload.get("entries")

        if not isinstance(entries, list) or len(entries) < 2:
            raise ValueError(f"Invalid entries in event {event.id}")

        for entry in entries:
            if not isinstance(entry, dict):
                raise ValueError(f"Invalid entry in event {event.id}")

            account_id = entry.get("account_id")
            side = entry.get("side")
            amount = entry.get("amount_minor_units")

            if not isinstance(account_id, str):
                raise ValueError(f"Invalid account ID in event {event.id}")

            if side not in (LedgerEntry.EntrySide.DEBIT, LedgerEntry.EntrySide.CREDIT):
                raise ValueError(f"Invalid entry side in event {event.id}")

            if isinstance(amount, bool) or not isinstance(amount, int) or amount <= 0:
                raise ValueError(f"Invalid amount in event {event.id}")

            totals = account_totals.setdefault(account_id, {"debit": 0, "credit": 0})
            totals[side.lower()] += amount

    account_ids = set(account_totals)
    accounts = Account.objects.in_bulk(account_ids)
    missing_accounts = account_ids - {str(pk) for pk in accounts}

    if missing_accounts:
        raise ValueError(f"Events refernces missing account: {', '.join(sorted(missing_accounts))}")

    balances = {}

    for account_id, totals in account_totals.items():
        account = accounts[next(pk for pk in accounts if str(pk) == account_id)]
        debit = totals["debit"]
        credit = totals["credit"]

        if account.account_type in (Account.AccountType.ASSET, Account.AccountType.EXPENSE):
            balance = debit - credit
        else:
            balance = credit - debit

        balances[account_id] = balance

    return balances

def verify_account_balance_projection():
    replayed_balances = replay_account_balances()

    live_balances = {
        str(account.id): calculate_account_balance(account) for account in Account.objects.all()
    }

    all_account_ids = set(replayed_balances) | set(live_balances)

    mismatches = []

    for account_id in sorted(all_account_ids):
        replayed_balance = replayed_balances.get(account_id, 0)
        live_balance = live_balances.get(account_id)

        if replayed_balance != live_balance:
            mismatches.append({
                "account_id": account_id,
                "replayed_balance": replayed_balance,
                "live_balance": live_balance,
            })

    return {
        "is_consistent": len(mismatches) == 0,
        "mismatches": mismatches,
    }

def find_posted_transactions_missing_events():
    posted_transactions = LedgerTransaction.objects.filter(status="POSTED").values_list("id", flat=True)
    recorded_transaction_ids = set(DomainEvent.objects.filter(
        aggregate_type="LEDGER_TRANSACTION",
        event_type="LedgerTransactionPosted",
    ).values_list("aggregate_id", flat=True))

    return [
        str(transaction_id) for transaction_id in posted_transactions
        if transaction_id not in recorded_transaction_ids
    ]