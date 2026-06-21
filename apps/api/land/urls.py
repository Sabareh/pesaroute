from django.urls import path

from land.views import (
    LandChecklistItemUpdateView,
    LandChecklistView,
    LandCompareView,
    LandCountyMarketListView,
    LandDefaultChecklistView,
    LandDocumentCreateView,
    LandOpportunityDetailView,
    LandOpportunityListCreateView,
    LandRequestReviewView,
    LandRiskScoreView,
    LandSaveToJournalView,
)

urlpatterns = [
    path("opportunities/", LandOpportunityListCreateView.as_view(), name="land-opportunities"),
    path("opportunities/<int:pk>/", LandOpportunityDetailView.as_view(), name="land-opportunity-detail"),
    path("opportunities/<int:pk>/checklist/", LandChecklistView.as_view(), name="land-checklist"),
    path("opportunities/<int:pk>/risk-score/", LandRiskScoreView.as_view(), name="land-risk-score"),
    path("opportunities/<int:pk>/save-to-journal/", LandSaveToJournalView.as_view(), name="land-save-to-journal"),
    path(
        "opportunities/<int:pk>/request-professional-review/",
        LandRequestReviewView.as_view(),
        name="land-request-review",
    ),
    path("opportunities/<int:pk>/documents/", LandDocumentCreateView.as_view(), name="land-documents"),
    path("checklist-items/<int:pk>/", LandChecklistItemUpdateView.as_view(), name="land-checklist-item"),
    path("default-checklist/", LandDefaultChecklistView.as_view(), name="land-default-checklist"),
    path("compare/", LandCompareView.as_view(), name="land-compare"),
    path("county-market/", LandCountyMarketListView.as_view(), name="land-county-market"),
]
