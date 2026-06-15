from django.urls import path

from marketplace.views import (
    ConsultationContextView,
    ConsultationOfferAcceptView,
    ConsultationPaidStatusView,
    ConsultationPaymentStartView,
    ConsultationRequestCreateView,
    MyConsultationRequestListView,
    ProfessionalConsultationListView,
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
        "consultation-offers/<int:pk>/accept/", ConsultationOfferAcceptView.as_view(), name="marketplace-offer-accept"
    ),
    path(
        "consultation-requests/<int:pk>/start-payment/",
        ConsultationPaymentStartView.as_view(),
        name="marketplace-consultation-start-payment",
    ),
    path(
        "consultation-requests/<int:pk>/paid-status/",
        ConsultationPaidStatusView.as_view(),
        name="marketplace-consultation-paid-status",
    ),
    path(
        "professional/consultations/",
        ProfessionalConsultationListView.as_view(),
        name="marketplace-professional-consultations",
    ),
    path(
        "consultation-requests/<int:pk>/context/",
        ConsultationContextView.as_view(),
        name="marketplace-consultation-context",
    ),
]
