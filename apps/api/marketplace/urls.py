from django.urls import path

from marketplace.views import ConsultationRequestCreateView

urlpatterns = [
    path("consultation-requests/", ConsultationRequestCreateView.as_view(), name="marketplace-consultation-requests"),
]
