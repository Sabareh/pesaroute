from django.urls import path

from planning.views import (
    CategoryCompareSimulationView,
    CompareProductsSimulationView,
    ProductSimulationView,
    ProductSpecificSimulationView,
    SimulationRequestReviewView,
    SimulationSaveToJournalView,
    VirtualPortfolioAddPositionView,
    VirtualPortfolioDetailView,
    VirtualPortfolioListCreateView,
    VirtualPortfolioRunView,
)

urlpatterns = [
    path("product/", ProductSimulationView.as_view(), name="product-simulation"),
    path("product-specific/", ProductSpecificSimulationView.as_view(), name="product-specific-simulation"),
    path("compare-products/", CompareProductsSimulationView.as_view(), name="compare-products-simulation"),
    path("category-compare/", CategoryCompareSimulationView.as_view(), name="category-compare-simulation"),
    path("virtual-portfolios/", VirtualPortfolioListCreateView.as_view(), name="virtual-portfolios"),
    path("virtual-portfolios/<int:pk>/", VirtualPortfolioDetailView.as_view(), name="virtual-portfolio-detail"),
    path("virtual-portfolios/<int:pk>/positions/", VirtualPortfolioAddPositionView.as_view(), name="virtual-portfolio-positions"),
    path("virtual-portfolios/<int:pk>/run/", VirtualPortfolioRunView.as_view(), name="virtual-portfolio-run"),
    path("<int:run_id>/save-to-journal/", SimulationSaveToJournalView.as_view(), name="simulation-save-to-journal"),
    path("<int:run_id>/request-professional-review/", SimulationRequestReviewView.as_view(), name="simulation-request-review"),
]
