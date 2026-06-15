from django.urls import path

from knowledge import views

urlpatterns = [
    path("data-sources/", views.DataSourceListCreateView.as_view(), name="admin-data-source-list-create"),
    path("ingestion-runs/", views.DataIngestionRunListView.as_view(), name="admin-ingestion-run-list"),
    path("data-quality-issues/", views.DataQualityIssueListView.as_view(), name="admin-data-quality-issue-list"),
    path("data-change-events/", views.DataChangeEventListView.as_view(), name="admin-data-change-event-list"),
    path(
        "data-quality-issues/<int:pk>/resolve/",
        views.DataQualityIssueResolveView.as_view(),
        name="admin-data-quality-issue-resolve",
    ),
    path("source-records/", views.SourceRecordListView.as_view(), name="admin-source-record-list"),
    path(
        "source-records/<int:pk>/approve/", views.SourceRecordApproveView.as_view(), name="admin-source-record-approve"
    ),
    path("source-records/<int:pk>/reject/", views.SourceRecordRejectView.as_view(), name="admin-source-record-reject"),
    path(
        "source-records/<int:pk>/publish/", views.SourceRecordPublishView.as_view(), name="admin-source-record-publish"
    ),
]
