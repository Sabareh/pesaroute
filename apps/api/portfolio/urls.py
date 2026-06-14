from django.urls import path

from portfolio.views import PortfolioItemListCreateView, PortfolioSummaryView

urlpatterns = [
    path("items/", PortfolioItemListCreateView.as_view(), name="portfolio-items"),
    path("summary/", PortfolioSummaryView.as_view(), name="portfolio-summary"),
]
