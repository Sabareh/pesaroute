from django.urls import path

from payments.views import (
    MpesaCallbackView,
    PaymentIntentCreateView,
    PaymentIntentDetailView,
    PaymentIntentInitiateView,
)

urlpatterns = [
    path("intents/", PaymentIntentCreateView.as_view(), name="payment-intent-create"),
    path("intents/<int:pk>/", PaymentIntentDetailView.as_view(), name="payment-intent-detail"),
    path("intents/<int:pk>/initiate/", PaymentIntentInitiateView.as_view(), name="payment-intent-initiate"),
    path("mpesa/callback/", MpesaCallbackView.as_view(), name="mpesa-callback"),
]
