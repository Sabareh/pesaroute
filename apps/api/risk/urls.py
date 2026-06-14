from django.urls import path

from risk.views import ScamCheckView

urlpatterns = [
    path("scam-check/", ScamCheckView.as_view(), name="risk-scam-check"),
]
