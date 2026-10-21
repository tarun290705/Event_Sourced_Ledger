from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/transfers/', include("apps.transfers.urls")),
    path('api/audit-logs/', include("apps.audit.urls")),
    path('api/accounts/', include("apps.accounts.urls")),
    path('api/ledger/', include("apps.ledger.urls")),
]
