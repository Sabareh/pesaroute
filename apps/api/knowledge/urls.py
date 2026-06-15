from django.urls import path

from knowledge import views

urlpatterns = [
    path("regulators/", views.RegulatorListView.as_view(), name="knowledge-regulator-list"),
    path("product-categories/", views.InvestmentProductCategoryListView.as_view(), name="knowledge-category-list"),
    path("providers/", views.InvestmentProviderListView.as_view(), name="knowledge-provider-list"),
    path("providers/<slug:slug>/", views.InvestmentProviderDetailView.as_view(), name="knowledge-provider-detail"),
    path("listed-companies/", views.ListedCompanyListView.as_view(), name="knowledge-listed-company-list"),
    path("saccos/", views.SaccoEntityListView.as_view(), name="knowledge-sacco-list"),
    path(
        "government-securities/recent/",
        views.GovernmentSecurityRecentListView.as_view(),
        name="knowledge-government-security-recent-list",
    ),
    path("sources/<int:pk>/", views.PublicDataSourceDetailView.as_view(), name="knowledge-source-detail"),
]
