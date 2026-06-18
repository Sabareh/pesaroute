from django.urls import path

from planning.views import (
    CategoryCompareSimulationView,
    GlobalRouteSimulationView,
    InvestmentProductDetailView,
    InvestmentProductListView,
    MMFSimulationView,
    ProductCompareView,
    ProductSimulationView,
    SaccoSimulationView,
    TBillSimulationView,
)

urlpatterns = [
    path("simulate/mmf/", MMFSimulationView.as_view(), name="simulate-mmf"),
    path("simulate/tbill/", TBillSimulationView.as_view(), name="simulate-tbill"),
    path("simulate/sacco/", SaccoSimulationView.as_view(), name="simulate-sacco"),
    path("simulate/global-route/", GlobalRouteSimulationView.as_view(), name="simulate-global-route"),
    path("products/", InvestmentProductListView.as_view(), name="products-list"),
    path("products/compare/", ProductCompareView.as_view(), name="products-compare"),
    path("products/<slug:slug>/", InvestmentProductDetailView.as_view(), name="products-detail"),
    path("simulations/product/", ProductSimulationView.as_view(), name="product-simulation"),
    path("simulations/category-compare/", CategoryCompareSimulationView.as_view(), name="category-compare-simulation"),
]
