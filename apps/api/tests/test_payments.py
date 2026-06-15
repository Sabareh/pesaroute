import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from billing.models import EntitlementCode, OneOffPackCode, Plan, Subscription
from billing.services import user_has_entitlement
from payments.models import PaymentIntent
from payments.mpesa import MpesaCheckoutResponse


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def disable_payment_test_throttles(settings):
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_CLASSES": [],
    }


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="payment-user", password="test-pass-123")


@pytest.fixture
def other_user(db):
    return get_user_model().objects.create_user(username="other-payment-user", password="test-pass-123")


def authenticate(api_client, user):
    token, _created = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


class FakeMpesaAdapter:
    def initiate_checkout(self, **_kwargs):
        return MpesaCheckoutResponse(
            checkout_request_id="ws_CO_123456789",
            merchant_request_id="mr_123456789",
            response_code="0",
            response_description="Accepted",
        )


def success_callback(checkout_request_id="ws_CO_123456789", merchant_request_id="mr_123456789"):
    return {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": merchant_request_id,
                "CheckoutRequestID": checkout_request_id,
                "ResultCode": 0,
                "ResultDesc": "The service request is processed successfully.",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": 300},
                        {"Name": "MpesaReceiptNumber", "Value": "RCP123456"},
                        {"Name": "TransactionDate", "Value": 20260614120000},
                    ]
                },
            }
        }
    }


def failed_callback(checkout_request_id="ws_CO_123456789", merchant_request_id="mr_123456789"):
    return {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": merchant_request_id,
                "CheckoutRequestID": checkout_request_id,
                "ResultCode": 1032,
                "ResultDesc": "Request cancelled by user.",
            }
        }
    }


@pytest.mark.django_db
def test_create_payment_intent_is_idempotent(api_client, user):
    authenticate(api_client, user)
    payload = {
        "purpose": "subscription",
        "plan_code": Plan.Code.PREMIUM_MONTHLY,
        "phone_number": "0712345678",
        "idempotency_key": "premium-monthly-1",
    }

    first = api_client.post("/api/payments/intents/", payload, format="json")
    second = api_client.post("/api/payments/intents/", payload, format="json")

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    assert PaymentIntent.objects.count() == 1
    assert first.json()["phone_number_masked"] == "25471***678"


@pytest.mark.django_db
def test_initiate_payment_with_mocked_mpesa_adapter(api_client, user, monkeypatch):
    authenticate(api_client, user)
    response = api_client.post(
        "/api/payments/intents/",
        {
            "purpose": "subscription",
            "plan_code": Plan.Code.PREMIUM_MONTHLY,
            "idempotency_key": "initiate-1",
        },
        format="json",
    )
    intent_id = response.json()["id"]
    monkeypatch.setattr("payments.services.get_mpesa_adapter", lambda: FakeMpesaAdapter())

    response = api_client.post(
        f"/api/payments/intents/{intent_id}/initiate/",
        {"phone_number": "0712345678"},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["status"] == PaymentIntent.Status.INITIATED
    assert response.json()["provider_checkout_request_id"] == "ws_CO_123456789"
    assert response.json()["phone_number_masked"] == "25471***678"


@pytest.mark.django_db
def test_callback_success_grants_subscription_entitlement(api_client, user, monkeypatch):
    authenticate(api_client, user)
    intent_response = api_client.post(
        "/api/payments/intents/",
        {
            "purpose": "subscription",
            "plan_code": Plan.Code.PREMIUM_MONTHLY,
            "idempotency_key": "callback-success-1",
        },
        format="json",
    )
    intent_id = intent_response.json()["id"]
    monkeypatch.setattr("payments.services.get_mpesa_adapter", lambda: FakeMpesaAdapter())
    api_client.post(f"/api/payments/intents/{intent_id}/initiate/", {"phone_number": "0712345678"}, format="json")
    api_client.credentials()

    callback_response = api_client.post("/api/payments/mpesa/callback/", success_callback(), format="json")

    assert callback_response.status_code == 200
    intent = PaymentIntent.objects.get(id=intent_id)
    assert intent.status == PaymentIntent.Status.SUCCESSFUL
    assert intent.provider_receipt == "RCP123456"
    assert user_has_entitlement(user, EntitlementCode.PORTFOLIO_MIRROR) is True


@pytest.mark.django_db
def test_callback_success_grants_one_off_pack_entitlement(api_client, user, monkeypatch):
    authenticate(api_client, user)
    intent_response = api_client.post(
        "/api/payments/intents/",
        {
            "purpose": "one_off_pack",
            "pack_code": OneOffPackCode.GLOBAL_INVESTING,
            "idempotency_key": "callback-pack-success-1",
        },
        format="json",
    )
    intent_id = intent_response.json()["id"]
    monkeypatch.setattr("payments.services.get_mpesa_adapter", lambda: FakeMpesaAdapter())
    api_client.post(f"/api/payments/intents/{intent_id}/initiate/", {"phone_number": "0712345678"}, format="json")
    api_client.credentials()

    callback_response = api_client.post("/api/payments/mpesa/callback/", success_callback(), format="json")

    assert callback_response.status_code == 200
    assert user_has_entitlement(user, EntitlementCode.GLOBAL_INVESTING_PACK_ACCESS) is True


@pytest.mark.django_db
def test_duplicate_callback_does_not_double_grant_subscription(api_client, user, monkeypatch):
    authenticate(api_client, user)
    intent_response = api_client.post(
        "/api/payments/intents/",
        {
            "purpose": "subscription",
            "plan_code": Plan.Code.PREMIUM_MONTHLY,
            "idempotency_key": "duplicate-callback-1",
        },
        format="json",
    )
    intent_id = intent_response.json()["id"]
    monkeypatch.setattr("payments.services.get_mpesa_adapter", lambda: FakeMpesaAdapter())
    api_client.post(f"/api/payments/intents/{intent_id}/initiate/", {"phone_number": "0712345678"}, format="json")
    api_client.credentials()

    assert api_client.post("/api/payments/mpesa/callback/", success_callback(), format="json").status_code == 200
    assert api_client.post("/api/payments/mpesa/callback/", success_callback(), format="json").status_code == 200

    assert Subscription.objects.filter(user=user, plan__code=Plan.Code.PREMIUM_MONTHLY).count() == 1


@pytest.mark.django_db
def test_failed_callback_marks_payment_failed(api_client, user, monkeypatch):
    authenticate(api_client, user)
    intent_response = api_client.post(
        "/api/payments/intents/",
        {
            "purpose": "subscription",
            "plan_code": Plan.Code.PREMIUM_MONTHLY,
            "idempotency_key": "callback-failed-1",
        },
        format="json",
    )
    intent_id = intent_response.json()["id"]
    monkeypatch.setattr("payments.services.get_mpesa_adapter", lambda: FakeMpesaAdapter())
    api_client.post(f"/api/payments/intents/{intent_id}/initiate/", {"phone_number": "0712345678"}, format="json")
    api_client.credentials()

    callback_response = api_client.post("/api/payments/mpesa/callback/", failed_callback(), format="json")

    assert callback_response.status_code == 200
    assert PaymentIntent.objects.get(id=intent_id).status == PaymentIntent.Status.FAILED
    assert user_has_entitlement(user, EntitlementCode.PORTFOLIO_MIRROR) is False


@pytest.mark.django_db
def test_user_cannot_access_another_users_payment_intent(api_client, user, other_user):
    authenticate(api_client, user)
    response = api_client.post(
        "/api/payments/intents/",
        {
            "purpose": "one_off_pack",
            "pack_code": "global_investing_pack",
            "idempotency_key": "owner-check-1",
        },
        format="json",
    )
    intent_id = response.json()["id"]

    authenticate(api_client, other_user)
    detail_response = api_client.get(f"/api/payments/intents/{intent_id}/")
    initiate_response = api_client.post(
        f"/api/payments/intents/{intent_id}/initiate/",
        {"phone_number": "0712345678"},
        format="json",
    )

    assert detail_response.status_code == 404
    assert initiate_response.status_code == 404
