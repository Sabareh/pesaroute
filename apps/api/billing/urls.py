from django.urls import path

from billing.views import DevMockPurchaseView, EntitlementSnapshotView, OneOffPackListView, PlanListView

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="billing-plans"),
    path("entitlements/", EntitlementSnapshotView.as_view(), name="billing-entitlements"),
    path("packs/", OneOffPackListView.as_view(), name="billing-packs"),
    path("dev/mock-purchase/", DevMockPurchaseView.as_view(), name="billing-dev-mock-purchase"),
    path("dev/grant-premium/", DevMockPurchaseView.as_view(), name="billing-dev-grant-premium"),
]
