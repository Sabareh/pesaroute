import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="amina", password="test-pass-123")


def test_health_check(api_client):
    response = api_client.get("/api/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.django_db
def test_scam_checker_flags_high_risk_phrase(api_client):
    response = api_client.post(
        "/api/risk/scam-check/",
        {"text": "Guaranteed return and double your money. Send deposit now."},
        format="json",
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["risk_score"] >= 60
    assert payload["risk_level"] in {"high", "severe"}
    assert any(flag["phrase"] == "guaranteed return" for flag in payload["flags"])


@pytest.mark.django_db
def test_mmf_simulator(api_client):
    response = api_client.post(
        "/api/planning/simulate/mmf/",
        {"principal": "10000.00", "annual_rate_percent": "12.00", "months": 6},
        format="json",
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["label"] == "MMF educational simulation"
    assert payload["projected_value"] == "10615.20"
    assert "do not hold your money" in payload["disclaimer"]


@pytest.mark.django_db
def test_tbill_simulator(api_client):
    response = api_client.post(
        "/api/planning/simulate/tbill/",
        {"face_value": "100000.00", "discount_rate_percent": "12.00", "days": 91},
        format="json",
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["estimated_discount_interest"] == "3000.00"
    assert payload["estimated_purchase_price"] == "97000.00"


@pytest.mark.django_db
def test_create_journal_entry(api_client, user):
    api_client.force_authenticate(user=user)
    response = api_client.post(
        "/api/journal/entries/",
        {
            "goal": "Emergency fund",
            "decision": "Compare MMFs before moving cash.",
            "amount_display_mode": "range",
            "amount_range_min": "10000.00",
            "amount_range_max": "20000.00",
            "reason": "Need liquidity.",
            "visibility": "private",
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["goal"] == "Emergency fund"


@pytest.mark.django_db
def test_create_portfolio_item_and_summary(api_client, user):
    api_client.force_authenticate(user=user)
    response = api_client.post(
        "/api/portfolio/items/",
        {
            "asset_type": "Money Market Funds",
            "provider_name": "Generic MMF",
            "amount_display_mode": "exact",
            "amount_exact": "15000.00",
            "liquidity_level": "high",
            "risk_level": "low",
            "visibility": "private",
        },
        format="json",
    )
    assert response.status_code == 201

    summary_response = api_client.get("/api/portfolio/summary/")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["total_known_amount"] == "15000.00"
    assert summary["asset_allocation"]["Money Market Funds"] == "15000.00"
