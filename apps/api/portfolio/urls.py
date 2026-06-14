from django.urls import path

from portfolio.views import PortfolioItemDetailView, PortfolioItemListCreateView, PortfolioSummaryView

urlpatterns = [
    path("items/", PortfolioItemListCreateView.as_view(), name="portfolio-items"),
    path("items/<int:pk>/", PortfolioItemDetailView.as_view(), name="portfolio-item-detail"),
    path("summary/", PortfolioSummaryView.as_view(), name="portfolio-summary"),
]
