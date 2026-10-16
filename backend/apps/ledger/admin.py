from django.contrib import admin
from .models import LedgerEntry, LedgerTransaction

class LedgerEntryInline(admin.TabularInline):
    model = LedgerEntry
    extra = 0
    can_delete = False
    readonly_fields = (
        "account",
        "side",
        "amount_minor_units",
        "created_at",
    )

@admin.register(LedgerTransaction)
class LedgerTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "transaction_type",
        "status",
        "created_at",
        "posted_at",
    )
    list_filter = ("transaction_type", "status")
    readonly_fields = ("created_at", "posted_at")
    inlines = [LedgerEntryInline]

@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = (
        "transaction",
        "account",
        "side",
        "amount_minor_units",
        "created_at",
    )
    list_filter = ("side",)
    readonly_fields = (
        "transaction",
        "account",
        "side",
        "amount_minor_units",
        "created_at",
    )
