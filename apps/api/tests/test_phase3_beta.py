from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from beta.models import BetaInvite
from marketplace.models import ConsultationOffer, ConsultationRequest, Professional
from notifications.models import Notification
from notifications.services import create_notification
from payments.models import PaymentIntent
from payments.mpesa import MpesaCheckoutResponse


@pytest.fixture(autouse=True)
def disable_phase3_test_throttles(settings):
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_CLASSES": [],
    }


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        username="phase3-user", email="user@example.com", password="test-pass-123"
    )


@pytest.fixture
def other_user(db):
    return get_user_model().objects.create_user(username="phase3-other", password="test-pass-123")


@pytest.fixture
def professional_user(db):
    return get_user_model().objects.create_user(username="phase3-pro", password="test-pass-123")


@pytest.fixture
def professional(db, professional_user):
    return Professional.objects.create(
        user=professional_user,
        name="Phase Three Pro",
        display_name="Phase Three Pro",
        verification_status=Professional.VerificationStatus.VERIFIED,
        status=Professional.Status.VERIFIED,
        is_active=True,
        specialty="Treasury bills/bonds",
    )


def authenticate(api_client, user):
    token, _created = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


class FakeMpesaAdapter:
    def initiate_checkout(self, **_kwargs):
        return MpesaCheckoutResponse(
            checkout_request_id="ws_CO_PHASE3",
            merchant_request_id="mr_PHASE3",
            response_code="0",
            response_description="Accepted",
        )


def callback(result_code=0):
    return {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "mr_PHASE3",
                "CheckoutRequestID": "ws_CO_PHASE3",
                "ResultCode": result_code,
                "ResultDesc": "Processed" if result_code == 0 else "Request cancelled by user.",
                "CallbackMetadata": {"Item": [{"Name": "MpesaReceiptNumber", "Value": "RCPPHASE3"}]},
            }
        }
    }


def create_request(user, professional=None):
    return ConsultationRequest.objects.create(
        user=user,
        selected_professional=professional,
        professional=professional,
        category=ConsultationRequest.Category.TREASURY,
        amount_display_mode=ConsultationRequest.AmountDisplayMode.RANGE,
        amount_range_min="10000.00",
        amount_range_max="50000.00",
        user_question="Can I use money needed soon?",
        topic="Treasury review",
    )


def create_offer(consultation, professional, fee="1500.00"):
    return ConsultationOffer.objects.create(
        consultation_request=consultation,
        professional=professional,
        proposed_fee=fee,
        message="I can review the route and explain tradeoffs.",
        estimated_duration="30 minutes",
        available_slots_text="Weekdays",
    )


@pytest.mark.django_db
def test_user_can_only_accept_own_offer(api_client, user, other_user, professional):
    consultation = create_request(user)
    offer = create_offer(consultation, professional)

    authenticate(api_client, other_user)
    forbidden = api_client.post(f"/api/marketplace/consultation-offers/{offer.id}/accept/")
    assert forbidden.status_code == 404

    authenticate(api_client, user)
    accepted = api_client.post(f"/api/marketplace/consultation-offers/{offer.id}/accept/")

    assert accepted.status_code == 200
    consultation.refresh_from_db()
    offer.refresh_from_db()
    assert offer.status == ConsultationOffer.Status.ACCEPTED
    assert consultation.status == ConsultationRequest.Status.USER_SELECTED_PROFESSIONAL
    assert consultation.selected_professional == professional


@pytest.mark.django_db
def test_unverified_professional_cannot_respond_to_lead(api_client, user, other_user):
    professional_user = other_user
    Professional.objects.create(
        user=professional_user,
        name="Pending Pro",
        display_name="Pending Pro",
        verification_status=Professional.VerificationStatus.PENDING,
        status=Professional.Status.PENDING,
    )
    consultation = create_request(user)

    authenticate(api_client, professional_user)
    response = api_client.post(
        f"/api/marketplace/professional/leads/{consultation.id}/respond/",
        {"response_text": "I can help.", "proposed_fee": "1000.00"},
        format="json",
    )

    assert response.status_code == 403
    assert ConsultationOffer.objects.count() == 0


@pytest.mark.django_db
def test_payment_success_marks_consultation_paid(api_client, user, professional, professional_user, monkeypatch):
    consultation = create_request(user)
    offer = create_offer(consultation, professional)
    authenticate(api_client, user)
    assert api_client.post(f"/api/marketplace/consultation-offers/{offer.id}/accept/").status_code == 200
    intent_response = api_client.post(
        f"/api/marketplace/consultation-requests/{consultation.id}/start-payment/",
        {"phone_number": "0712345678", "idempotency_key": "paid-consultation"},
        format="json",
    )
    assert intent_response.status_code == 201
    intent_id = intent_response.json()["id"]
    monkeypatch.setattr("payments.services.get_mpesa_adapter", lambda: FakeMpesaAdapter())
    assert (
        api_client.post(
            f"/api/payments/intents/{intent_id}/initiate/", {"phone_number": "0712345678"}, format="json"
        ).status_code
        == 200
    )

    api_client.credentials()
    callback_response = api_client.post("/api/payments/mpesa/callback/", callback(), format="json")

    assert callback_response.status_code == 200
    consultation.refresh_from_db()
    assert consultation.status == ConsultationRequest.Status.PAID
    assert consultation.paid_at is not None
    assert Notification.objects.filter(user=user, type=Notification.Type.CONSULTATION_PAID).exists()
    assert Notification.objects.filter(user=professional_user, type=Notification.Type.CONSULTATION_PAID).exists()


@pytest.mark.django_db
def test_failed_payment_does_not_mark_consultation_paid(api_client, user, professional, monkeypatch):
    consultation = create_request(user)
    offer = create_offer(consultation, professional)
    authenticate(api_client, user)
    api_client.post(f"/api/marketplace/consultation-offers/{offer.id}/accept/")
    intent_response = api_client.post(
        f"/api/marketplace/consultation-requests/{consultation.id}/start-payment/",
        {"phone_number": "0712345678", "idempotency_key": "failed-consultation"},
        format="json",
    )
    intent_id = intent_response.json()["id"]
    monkeypatch.setattr("payments.services.get_mpesa_adapter", lambda: FakeMpesaAdapter())
    api_client.post(f"/api/payments/intents/{intent_id}/initiate/", {"phone_number": "0712345678"}, format="json")

    api_client.credentials()
    callback_response = api_client.post("/api/payments/mpesa/callback/", callback(result_code=1032), format="json")

    assert callback_response.status_code == 200
    consultation.refresh_from_db()
    assert consultation.status == ConsultationRequest.Status.AWAITING_PAYMENT
    assert PaymentIntent.objects.get(id=intent_id).status == PaymentIntent.Status.FAILED


@pytest.mark.django_db
def test_notifications_can_be_listed_and_marked_read(api_client, user):
    notification = create_notification(
        user=user,
        type=Notification.Type.PAYMENT_SUCCESSFUL,
        title="Payment confirmed",
        body="Your payment was confirmed.",
    )

    authenticate(api_client, user)
    list_response = api_client.get("/api/notifications/")
    read_response = api_client.post(f"/api/notifications/{notification.id}/read/")

    assert list_response.status_code == 200
    assert list_response.json()["results"][0]["id"] == notification.id
    assert read_response.status_code == 200
    notification.refresh_from_db()
    assert notification.status == Notification.Status.READ
    assert notification.read_at is not None


@pytest.mark.django_db
def test_beta_only_registration_requires_and_consumes_invite(api_client, settings):
    settings.BETA_ONLY_MODE = True
    invite = BetaInvite.objects.create(
        code="BETA-20", email="beta@example.com", max_uses=1, expires_at=timezone.now() + timedelta(days=7)
    )

    missing = api_client.post(
        "/api/accounts/register/",
        {
            "username": "noinvite",
            "email": "noinvite@example.com",
            "password": "strong-test-pass-123",
        },
        format="json",
    )
    registered = api_client.post(
        "/api/accounts/register/",
        {
            "username": "betainvite",
            "email": "beta@example.com",
            "password": "strong-test-pass-123",
            "invite_code": "BETA-20",
        },
        format="json",
    )

    assert missing.status_code == 400
    assert registered.status_code == 201
    invite.refresh_from_db()
    assert invite.used_count == 1
