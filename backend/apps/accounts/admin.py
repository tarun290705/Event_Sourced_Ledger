from django.contrib import admin
from .models import Account

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = (
        "account_number",
        "name",
        "account_type",
        "currency",
        "status",
    )
    list_filter = ("account_type", "currency", "status")
    search_filter = ("account_number", "name")
