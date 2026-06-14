from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import UserProfile
from audit.models import AuditEvent
from journal.models import JournalEntry
from marketplace.models import ConsultationRequest, Professional
from portfolio.models import PortfolioItem
from privacy.models import DataAccessLog, DataGrant
from privacy.services import can_professional_access


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="amina", password="test-pass-123")


@pytest.fixture
def other_user(db):
    return get_user_model().objects.create_user(username="otieno", password="test-pass-123")


@pytest.fixture
def professional_user(db):
    return get_user_model().objects.create_user(username="advisor", password="test-pass-123")


@pytest.fixture
def professional(db, professional_user):
    return Professional.objects.create(
        user=professional_user, display_name="Advisor One", status=Professional.Status.VERIFIED
    )


def authenticate_with_token(api_client, user):
    token, _created = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


def test_health_check(api_client):
    response = api_client.get("/api/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.django_db
def test_register_returns_token_and_profile_role(api_client):
    response = api_client.post(
        "/api/accounts/register/",
        {
            "username": "wambui",
            "email": "wambui@example.com",
            "password": "strong-test-pass-123",
            "role": "professional",
            "preferred_language": "sw",
            "user_type": "first_jobber",
            "approximate_investment_range": "KES 20k-100k",
        },
        format="json",
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["token"]
    assert payload["user"]["profile"]["role"] == "professional"
    assert payload["user"]["profile"]["preferred_language"] == "sw"
    assert payload["user"]["profile"]["privacy_mode_enabled"] is True
    assert AuditEvent.objects.filter(event_type=AuditEvent.EventType.USER_REGISTERED).exists()


@pytest.mark.django_db
def test_login_returns_token_and_records_audit_event(api_client, user):
    response = api_client.post(
        "/api/accounts/login/",
        {"username": "amina", "password": "test-pass-123"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["token"]
    assert AuditEvent.objects.filter(actor=user, event_type=AuditEvent.EventType.USER_LOGGED_IN).exists()


@pytest.mark.django_db
def test_role_field_exists_and_admin_role_works_for_superuser(db):
    admin = get_user_model().objects.create_superuser(username="admin", password="test-pass-123")
    profile = UserProfile.objects.get(user=admin)
    assert profile.role == UserProfile.Role.ADMIN
    assert profile.preferred_language == UserProfile.PreferredLanguage.ENGLISH
    assert profile.user_type == UserProfile.UserType.OTHER
    assert profile.privacy_mode_enabled is True


@pytest.mark.django_db
def test_authenticated_user_can_update_profile_privacy_preferences(api_client, user):
    authenticate_with_token(api_client, user)
    response = api_client.patch(
        "/api/accounts/me/",
        {
            "preferred_language": "sw",
            "user_type": "chama_member",
            "approximate_investment_range": "KES 100k-500k",
            "privacy_mode_enabled": False,
        },
        format="json",
    )
    assert response.status_code == 200
    profile = response.json()["profile"]
    assert profile["preferred_language"] == "sw"
    assert profile["user_type"] == "chama_member"
    assert profile["approximate_investment_range"] == "KES 100k-500k"
    assert profile["privacy_mode_enabled"] is False


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
    authenticate_with_token(api_client, user)
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
    assert AuditEvent.objects.filter(actor=user, event_type=AuditEvent.EventType.JOURNAL_CREATED).exists()


@pytest.mark.django_db
def test_unauthenticated_user_cannot_access_private_journal(api_client):
    response = api_client.get("/api/journal/entries/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_user_cannot_see_other_users_journal_entries(api_client, user, other_user):
    JournalEntry.objects.create(
        user=other_user,
        goal="Private goal",
        decision="This should stay private.",
        amount_display_mode=JournalEntry.AmountDisplayMode.HIDDEN,
    )
    authenticate_with_token(api_client, user)
    response = api_client.get("/api/journal/entries/")
    assert response.status_code == 200
    assert response.json()["results"] == []


@pytest.mark.django_db
def test_user_can_update_and_delete_own_journal_entry(api_client, user):
    entry = JournalEntry.objects.create(
        user=user,
        goal="Old goal",
        decision="Old decision",
        amount_display_mode=JournalEntry.AmountDisplayMode.HIDDEN,
    )
    authenticate_with_token(api_client, user)
    response = api_client.patch(
        f"/api/journal/entries/{entry.id}/",
        {"goal": "Updated goal", "decision": "Updated decision"},
        format="json",
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["goal"] == "Updated goal"
    assert payload["version"] == 2

    delete_response = api_client.delete(f"/api/journal/entries/{entry.id}/")
    assert delete_response.status_code == 204
    assert not JournalEntry.objects.filter(id=entry.id).exists()


@pytest.mark.django_db
def test_user_cannot_update_or_delete_other_users_journal_entry(api_client, user, other_user):
    entry = JournalEntry.objects.create(
        user=other_user,
        goal="Private goal",
        decision="Private decision",
        amount_display_mode=JournalEntry.AmountDisplayMode.HIDDEN,
    )
    authenticate_with_token(api_client, user)
    patch_response = api_client.patch(
        f"/api/journal/entries/{entry.id}/",
        {"goal": "Attempted update"},
        format="json",
    )
    delete_response = api_client.delete(f"/api/journal/entries/{entry.id}/")
    entry.refresh_from_db()
    assert patch_response.status_code == 404
    assert delete_response.status_code == 404
    assert entry.goal == "Private goal"


@pytest.mark.django_db
def test_create_portfolio_item_and_summary(api_client, user):
    authenticate_with_token(api_client, user)
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
    assert AuditEvent.objects.filter(actor=user, event_type=AuditEvent.EventType.PORTFOLIO_ITEM_CREATED).exists()


@pytest.mark.django_db
def test_user_cannot_see_other_users_portfolio_items(api_client, user, other_user):
    PortfolioItem.objects.create(
        user=other_user,
        asset_type="Money Market Funds",
        amount_display_mode=PortfolioItem.AmountDisplayMode.HIDDEN,
        liquidity_level=PortfolioItem.LiquidityLevel.HIGH,
        risk_level=PortfolioItem.RiskLevel.LOW,
    )
    authenticate_with_token(api_client, user)
    response = api_client.get("/api/portfolio/items/")
    assert response.status_code == 200
    assert response.json()["results"] == []


@pytest.mark.django_db
def test_user_can_update_and_delete_own_portfolio_item(api_client, user):
    item = PortfolioItem.objects.create(
        user=user,
        asset_type="Old asset",
        amount_display_mode=PortfolioItem.AmountDisplayMode.HIDDEN,
        liquidity_level=PortfolioItem.LiquidityLevel.HIGH,
        risk_level=PortfolioItem.RiskLevel.LOW,
    )
    authenticate_with_token(api_client, user)
    response = api_client.patch(
        f"/api/portfolio/items/{item.id}/",
        {"asset_type": "Treasury Bills", "provider_name": "CBK"},
        format="json",
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["asset_type"] == "Treasury Bills"
    assert payload["provider_name"] == "CBK"
    assert payload["version"] == 2

    delete_response = api_client.delete(f"/api/portfolio/items/{item.id}/")
    assert delete_response.status_code == 204
    assert not PortfolioItem.objects.filter(id=item.id).exists()


@pytest.mark.django_db
def test_user_cannot_update_or_delete_other_users_portfolio_item(api_client, user, other_user):
    item = PortfolioItem.objects.create(
        user=other_user,
        asset_type="Private asset",
        amount_display_mode=PortfolioItem.AmountDisplayMode.HIDDEN,
        liquidity_level=PortfolioItem.LiquidityLevel.HIGH,
        risk_level=PortfolioItem.RiskLevel.LOW,
    )
    authenticate_with_token(api_client, user)
    patch_response = api_client.patch(
        f"/api/portfolio/items/{item.id}/",
        {"asset_type": "Attempted update"},
        format="json",
    )
    delete_response = api_client.delete(f"/api/portfolio/items/{item.id}/")
    item.refresh_from_db()
    assert patch_response.status_code == 404
    assert delete_response.status_code == 404
    assert item.asset_type == "Private asset"


@pytest.mark.django_db
def test_authenticated_user_can_create_portfolio_item(api_client, user):
    authenticate_with_token(api_client, user)
    response = api_client.post(
        "/api/portfolio/items/",
        {
            "asset_type": "Treasury Bills",
            "amount_display_mode": "hidden",
            "liquidity_level": "medium",
            "risk_level": "low",
            "visibility": "private",
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["asset_type"] == "Treasury Bills"


@pytest.mark.django_db
def test_privacy_data_grants_require_authentication(api_client):
    response = api_client.get("/api/privacy/data-grants/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_data_grant_can_be_created_by_owner(api_client, user, professional):
    authenticate_with_token(api_client, user)
    response = api_client.post(
        "/api/privacy/data-grants/",
        {
            "grantee_type": "professional",
            "grantee_id": professional.id,
            "scopes": ["consultation_context", "portfolio_summary"],
            "expires_at": (timezone.now() + timedelta(days=7)).isoformat(),
        },
        format="json",
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["grantee_type"] == "professional"
    assert payload["grantee_id"] == professional.id
    assert payload["scopes"] == ["consultation_context", "portfolio_summary"]
    assert payload["status"] == DataGrant.Status.ACTIVE


@pytest.mark.django_db
def test_data_grant_expires(user, professional):
    grant = DataGrant.objects.create(
        user=user,
        professional=professional,
        grantee_type=DataGrant.GranteeType.PROFESSIONAL,
        grantee_id=professional.id,
        scopes=[DataGrant.Scope.CONSULTATION_CONTEXT],
        starts_at=timezone.now() - timedelta(days=8),
        expires_at=timezone.now() - timedelta(days=1),
    )
    assert grant.status == DataGrant.Status.ACTIVE
    assert can_professional_access(user, professional, DataGrant.Scope.CONSULTATION_CONTEXT) is False


@pytest.mark.django_db
def test_data_grant_can_be_revoked(api_client, user, professional):
    grant = DataGrant.objects.create(
        user=user,
        professional=professional,
        grantee_type=DataGrant.GranteeType.PROFESSIONAL,
        grantee_id=professional.id,
        scopes=[DataGrant.Scope.CONSULTATION_CONTEXT],
        starts_at=timezone.now(),
        expires_at=timezone.now() + timedelta(days=7),
    )
    authenticate_with_token(api_client, user)
    response = api_client.post(f"/api/privacy/data-grants/{grant.id}/revoke/")
    assert response.status_code == 200
    grant.refresh_from_db()
    assert grant.status == DataGrant.Status.REVOKED
    assert grant.revoked_at is not None
    assert can_professional_access(user, professional, DataGrant.Scope.CONSULTATION_CONTEXT) is False


@pytest.mark.django_db
def test_professional_cannot_view_consultation_context_without_grant(api_client, user, professional, professional_user):
    consultation = ConsultationRequest.objects.create(
        user=user,
        professional=professional,
        topic="Review my first T-bill plan",
        notes="Can I use money needed next month?",
    )
    authenticate_with_token(api_client, professional_user)
    response = api_client.get(f"/api/marketplace/consultation-requests/{consultation.id}/context/")
    assert response.status_code == 403
    assert DataAccessLog.objects.count() == 0


@pytest.mark.django_db
def test_professional_can_view_only_granted_scopes_and_access_is_logged(
    api_client, user, professional, professional_user
):
    consultation = ConsultationRequest.objects.create(
        user=user,
        professional=professional,
        topic="Review portfolio liquidity",
        notes="I want a second opinion.",
    )
    PortfolioItem.objects.create(
        user=user,
        asset_type="Money Market Funds",
        provider_name="Generic MMF",
        amount_display_mode=PortfolioItem.AmountDisplayMode.EXACT,
        amount_exact="25000.00",
        liquidity_level=PortfolioItem.LiquidityLevel.HIGH,
        risk_level=PortfolioItem.RiskLevel.LOW,
    )
    JournalEntry.objects.create(
        user=user,
        goal="Private decision",
        decision="Keep this journal scoped.",
        amount_display_mode=JournalEntry.AmountDisplayMode.HIDDEN,
    )
    grant = DataGrant.objects.create(
        user=user,
        professional=professional,
        grantee_type=DataGrant.GranteeType.PROFESSIONAL,
        grantee_id=professional.id,
        scopes=[DataGrant.Scope.CONSULTATION_CONTEXT, DataGrant.Scope.PORTFOLIO_SUMMARY],
        starts_at=timezone.now(),
        expires_at=timezone.now() + timedelta(days=14),
    )

    authenticate_with_token(api_client, professional_user)
    response = api_client.get(f"/api/marketplace/consultation-requests/{consultation.id}/context/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["consultation"]["topic"] == "Review portfolio liquidity"
    assert payload["allowed_scopes"] == ["portfolio_summary", "consultation_context"]
    assert payload["portfolio_summary"]["items_count"] == 1
    assert "contact_info" not in payload
    assert "portfolio_exact_values" not in payload
    assert "journal_entries" not in payload
    assert DataAccessLog.objects.filter(
        user=user,
        professional=professional,
        data_grant=grant,
        action="view_consultation_context",
        scope=DataGrant.Scope.CONSULTATION_CONTEXT,
    ).exists()
