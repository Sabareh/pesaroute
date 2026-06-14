from django.urls import path

from marketplace.views import ConsultationContextView, ConsultationRequestCreateView

urlpatterns = [
    path("consultation-requests/", ConsultationRequestCreateView.as_view(), name="marketplace-consultation-requests"),
    path(
        "consultation-requests/<int:pk>/context/",
        ConsultationContextView.as_view(),
        name="marketplace-consultation-context",
    ),
]
