from django.urls import path

from catalog.views import ProductCategoryListView, ProductPassportDetailView, ProductPassportListView

urlpatterns = [
    path("categories/", ProductCategoryListView.as_view(), name="catalog-categories"),
    path("product-passports/", ProductPassportListView.as_view(), name="catalog-product-passports"),
    path("product-passports/<int:pk>/", ProductPassportDetailView.as_view(), name="catalog-product-passport-detail"),
]
