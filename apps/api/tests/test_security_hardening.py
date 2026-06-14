from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from audit.models import AuditEvent
from marketplace.models import ConsultationRequest, Professional
from portfolio.models import PortfolioItem


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="secure-user", password="test-pass-123")


@pytest.fixture
def other_user(db):
    return get_user_model().objects.create_user(username="secure-other", password="test-pass-123")


@pytest.fixture
def professional_user(db):
    return get_user_model().objects.create_user(username="secure-pro", password="test-pass-123")


@pytest.fixture
def professional(db, professional_user):
    return Professional.objects.create(
        user=professional_user,
        name="Secure Advisor",
        display_name="Secure Advisor",
        verification_status=Professional.VerificationStatus.VERIFIED,
        status=Professional.Status.VERIFIED,
        is_active=True,
    )


def authenticate_with_token(api_client, user):
    token, _created = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


@pytest.mark.django_db
def test_hidden_portfolio_response_does_not_return_or_retain_exact_values(api_client, user):
    item = PortfolioItem.objects.create(
        user=user,
        asset_type="Money Market Funds",
        amount_display_mode=PortfolioItem.AmountDisplayMode.EXACT,
        amount_exact="50000.00",
        liquidity_level=PortfolioItem.LiquidityLevel.HIGH,
        risk_level=PortfolioItem.RiskLevel.LOW,
    )
    authenticate_with_token(api_client, user)

    response = api_client.patch(
        f"/api/portfolio/items/{item.id}/",
        {"amount_display_mode": "hidden"},
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["amount_exact"] is None
    assert payload["amount_range_min"] is None
    assert payload["amount_range_max"] is None
    item.refresh_from_db()
    assert item.amount_exact is None


@pytest.mark.django_db
def test_negative_journal_amount_and_past_review_date_are_rejected(api_client, user):
    authenticate_with_token(api_client, user)
    response = api_client.post(
        "/api/journal/entries/",
        {
            "goal": "Test",
            "decision": "Do not save bad amounts.",
            "amount_display_mode": "range",
            "amount_range_min": "-1.00",
            "amount_range_max": "100.00",
            "review_date": (timezone.localdate() - timedelta(days=1)).isoformat(),
            "visibility": "private",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "amount_range_min" in response.json()


@pytest.mark.django_db
def test_negative_portfolio_amount_is_rejected(api_client, user):
    authenticate_with_token(api_client, user)
    response = api_client.post(
        "/api/portfolio/items/",
        {
            "asset_type": "Treasury Bills",
            "amount_display_mode": "exact",
            "amount_exact": "-100.00",
            "liquidity_level": "medium",
            "risk_level": "low",
            "visibility": "private",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "amount_exact" in response.json()


@pytest.mark.django_db
def test_open_professional_lead_hides_user_question(api_client, user, professional, professional_user):
    lead = ConsultationRequest.objects.create(
        user=user,
        category=ConsultationRequest.Category.GLOBAL_INVESTING,
        amount_display_mode=ConsultationRequest.AmountDisplayMode.HIDDEN,
        user_question="Private details about my family finances",
        topic="Global route",
    )
    authenticate_with_token(api_client, professional_user)

    response = api_client.get("/api/marketplace/professional/leads/")

    assert response.status_code == 200
    payload = response.json()["results"]
    lead_payload = next(item for item in payload if item["id"] == lead.id)
    assert lead_payload["user_question"] == ""
    assert lead_payload["amount_range_min"] is None
    assert lead_payload["amount_range_max"] is None


@pytest.mark.django_db
def test_selected_professional_lead_can_show_question_to_assigned_professional(
    api_client, user, professional, professional_user
):
    lead = ConsultationRequest.objects.create(
        user=user,
        professional=professional,
        selected_professional=professional,
        category=ConsultationRequest.Category.SACCO,
        amount_display_mode=ConsultationRequest.AmountDisplayMode.RANGE,
        amount_range_min="1000.00",
        amount_range_max="5000.00",
        user_question="Can this SACCO fit an emergency fund?",
        topic="SACCO route",
    )
    authenticate_with_token(api_client, professional_user)

    response = api_client.get("/api/marketplace/professional/leads/")

    assert response.status_code == 200
    lead_payload = next(item for item in response.json()["results"] if item["id"] == lead.id)
    assert lead_payload["user_question"] == "Can this SACCO fit an emergency fund?"


@pytest.mark.django_db
def test_data_grant_create_and_revoke_are_audited(api_client, user, professional):
    authenticate_with_token(api_client, user)
    create_response = api_client.post(
        "/api/privacy/data-grants/",
        {
            "grantee_type": "professional",
            "grantee_id": professional.id,
            "scopes": ["consultation_context"],
            "expires_at": (timezone.now() + timedelta(days=7)).isoformat(),
        },
        format="json",
    )
    assert create_response.status_code == 201
    grant_id = create_response.json()["id"]

    revoke_response = api_client.post(f"/api/privacy/data-grants/{grant_id}/revoke/")

    assert revoke_response.status_code == 200
    assert AuditEvent.objects.filter(actor=user, event_type=AuditEvent.EventType.DATA_GRANT_CREATED).exists()
    assert AuditEvent.objects.filter(actor=user, event_type=AuditEvent.EventType.DATA_GRANT_REVOKED).exists()


@pytest.mark.django_db
def test_scam_checker_is_throttled(api_client):
    responses = [
        api_client.post(
            "/api/risk/scam-check/",
            {"text": f"guaranteed return {index}"},
            format="json",
            REMOTE_ADDR="203.0.113.42",
        )
        for index in range(31)
    ]

    assert responses[0].status_code == 201
    assert responses[-1].status_code == 429


@pytest.mark.django_db
def test_scam_check_response_does_not_echo_prompt_text(api_client):
    response = api_client.post(
        "/api/risk/scam-check/",
        {"text": "my private investment pitch with guaranteed return"},
        format="json",
    )

    assert response.status_code == 201
    assert "prompt_text" not in response.json()
