from django.urls import path

from marketplace.product_views import (
    MarketplaceCompareView,
    MarketplaceFinderView,
    MarketplaceIntelligenceView,
    MarketplaceMmfFinderView,
    MarketplaceNetAfterTaxView,
    MarketplacePersonalBriefView,
    MarketplaceProductDetailView,
    MarketplaceProductListView,
    MarketplaceQuickScenariosView,
    MarketplaceRequestReviewView,
    MarketplaceSaccoScoreView,
    MarketplaceSaveToJournalView,
    MarketplaceWatchlistItemView,
    MarketplaceWatchlistView,
)
from marketplace.views import (
    ConsultationContextView,
    ConsultationOfferAcceptView,
    ConsultationPaidStatusView,
    ConsultationPaymentStartView,
    ConsultationRequestCreateView,
    MyConsultationRequestListView,
    ProfessionalConsultationListView,
    ProfessionalDetailView,
    ProfessionalLeadListView,
    ProfessionalLeadRespondView,
    ProfessionalListView,
    ProfessionalVerifyView,
)

urlpatterns = [
    # --- Marketplace decision layer (Phase 2.13 + 2.15). Specific paths first. ---
    path("products/", MarketplaceProductListView.as_view(), name="marketplace-products"),
    path("products/compare/", MarketplaceCompareView.as_view(), name="marketplace-products-compare"),
    path("finder/", MarketplaceFinderView.as_view(), name="marketplace-finder"),
    path("mmf-finder/", MarketplaceMmfFinderView.as_view(), name="marketplace-mmf-finder"),
    path("net-after-tax/", MarketplaceNetAfterTaxView.as_view(), name="marketplace-net-after-tax"),
    path("quick-scenarios/", MarketplaceQuickScenariosView.as_view(), name="marketplace-quick-scenarios"),
    path("intelligence/", MarketplaceIntelligenceView.as_view(), name="marketplace-intelligence"),
    path("watchlist/", MarketplaceWatchlistView.as_view(), name="marketplace-watchlist"),
    path("watchlist/<int:pk>/", MarketplaceWatchlistItemView.as_view(), name="marketplace-watchlist-item"),
    path("personal-brief/", MarketplacePersonalBriefView.as_view(), name="marketplace-personal-brief"),
    path("products/<slug:slug>/", MarketplaceProductDetailView.as_view(), name="marketplace-product-detail"),
    path("products/<slug:slug>/sacco-score/", MarketplaceSaccoScoreView.as_view(), name="marketplace-sacco-score"),
    path(
        "products/<slug:slug>/save-to-journal/",
        MarketplaceSaveToJournalView.as_view(),
        name="marketplace-save-to-journal",
    ),
    path(
        "products/<slug:slug>/request-review/",
        MarketplaceRequestReviewView.as_view(),
        name="marketplace-request-review",
    ),
    path("professionals/", ProfessionalListView.as_view(), name="marketplace-professionals"),
    path("professionals/<int:pk>/", ProfessionalDetailView.as_view(), name="marketplace-professional-detail"),
    path("professionals/<int:pk>/verify/", ProfessionalVerifyView.as_view(), name="marketplace-professional-verify"),
    path("consultation-requests/", ConsultationRequestCreateView.as_view(), name="marketplace-consultation-requests"),
    path(
        "my-consultation-requests/",
        MyConsultationRequestListView.as_view(),
        name="marketplace-my-consultation-requests",
    ),
    path("professional/leads/", ProfessionalLeadListView.as_view(), name="marketplace-professional-leads"),
    path(
        "professional/leads/<int:pk>/respond/",
        ProfessionalLeadRespondView.as_view(),
        name="marketplace-professional-lead-respond",
    ),
    path(
        "consultation-offers/<int:pk>/accept/", ConsultationOfferAcceptView.as_view(), name="marketplace-offer-accept"
    ),
    path(
        "consultation-requests/<int:pk>/start-payment/",
        ConsultationPaymentStartView.as_view(),
        name="marketplace-consultation-start-payment",
    ),
    path(
        "consultation-requests/<int:pk>/paid-status/",
        ConsultationPaidStatusView.as_view(),
        name="marketplace-consultation-paid-status",
    ),
    path(
        "professional/consultations/",
        ProfessionalConsultationListView.as_view(),
        name="marketplace-professional-consultations",
    ),
    path(
        "consultation-requests/<int:pk>/context/",
        ConsultationContextView.as_view(),
        name="marketplace-consultation-context",
    ),
]
