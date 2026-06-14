from django.urls import path

from marketplace.views import (
    ConsultationContextView,
    ConsultationRequestCreateView,
    MyConsultationRequestListView,
    ProfessionalDetailView,
    ProfessionalLeadListView,
    ProfessionalLeadRespondView,
    ProfessionalListView,
    ProfessionalVerifyView,
)

urlpatterns = [
    path("professionals/", ProfessionalListView.as_view(), name="marketplace-professionals"),
    path("professionals/<int:pk>/", ProfessionalDetailView.as_view(), name="marketplace-professional-detail"),
    path("professionals/<int:pk>/verify/", ProfessionalVerifyView.as_view(), name="marketplace-professional-verify"),
    path("consultation-requests/", ConsultationRequestCreateView.as_view(), name="marketplace-consultation-requests"),
    path(
        "my-consultation-requests/",
        MyConsultationRequestListView.as_view(),
        name="marketplace-my-consultation-requests",
    ),
    path("professional/leads/", ProfessionalLeadListView.as_view(), name="marketplace-professional-leads"),
    path(
        "professional/leads/<int:pk>/respond/",
        ProfessionalLeadRespondView.as_view(),
        name="marketplace-professional-lead-respond",
    ),
    path(
        "consultation-requests/<int:pk>/context/",
        ConsultationContextView.as_view(),
        name="marketplace-consultation-context",
    ),
]
