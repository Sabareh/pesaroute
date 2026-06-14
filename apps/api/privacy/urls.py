from django.urls import path

from privacy.views import DataAccessLogListView, DataGrantListCreateView, DataGrantRevokeView

urlpatterns = [
    path("data-grants/", DataGrantListCreateView.as_view(), name="privacy-data-grants"),
    path("data-grants/<int:pk>/revoke/", DataGrantRevokeView.as_view(), name="privacy-data-grant-revoke"),
    path("access-logs/", DataAccessLogListView.as_view(), name="privacy-access-logs"),
]
