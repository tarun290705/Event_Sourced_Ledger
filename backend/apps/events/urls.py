from django.urls import path
from .views import DomainEventDetailView, DomainEventListView

urlpatterns = [
    path("", DomainEventListView.as_view(), name="event-view"),
    path("<uuid:pk>/", DomainEventDetailView.as_view(), name="event-detail"),
]