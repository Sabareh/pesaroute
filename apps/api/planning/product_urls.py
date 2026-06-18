from django.urls import path

from planning.views import InvestmentProductDetailView, InvestmentProductListView, ProductCompareView

urlpatterns = [
    path("", InvestmentProductListView.as_view(), name="products-list"),
    path("compare/", ProductCompareView.as_view(), name="products-compare"),
    path("<slug:slug>/", InvestmentProductDetailView.as_view(), name="products-detail"),
]
