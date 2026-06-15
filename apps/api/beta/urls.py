from django.urls import path

from beta.views import (
    AdminBetaInviteListCreateView,
    AdminFeatureFlagListView,
    BetaFeedbackCreateView,
    BetaInviteValidateView,
    FeatureFlagView,
)

urlpatterns = [
    path("flags/", FeatureFlagView.as_view(), name="beta-flags"),
    path("feedback/", BetaFeedbackCreateView.as_view(), name="beta-feedback"),
    path("invites/validate/", BetaInviteValidateView.as_view(), name="beta-invite-validate"),
    path("admin/invites/", AdminBetaInviteListCreateView.as_view(), name="beta-admin-invites"),
    path("admin/feature-flags/", AdminFeatureFlagListView.as_view(), name="beta-admin-feature-flags"),
]
