import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from billing.models import EntitlementCode, OneOffPackCode, Plan
from billing.services import (
    entitlement_snapshot,
    expire_dev_subscriptions,
    grant_dev_pack,
    grant_dev_subscription,
    has_entitlement,
    has_pack_access,
    professional_has_plan_feature,
    require_entitlement,
    seed_default_plans,
    user_has_entitlement,
)
from marketplace.models import Professional


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="billing-user", password="test-pass-123")


@pytest.fixture
def professional_user(db):
    return get_user_model().objects.create_user(username="billing-pro", password="test-pass-123")


def authenticate_with_token(api_client, user):
    token, _created = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


@pytest.mark.django_db
def test_free_user_has_limited_entitlements(user):
    snapshot = entitlement_snapshot(user)

    assert EntitlementCode.CORE_LEARNING in snapshot["entitlements"]
    assert EntitlementCode.LIMITED_SIMULATIONS in snapshot["entitlements"]
    assert EntitlementCode.LIMITED_SCAM_CHECKS in snapshot["entitlements"]
    assert snapshot["features"]["unlimited_simulations"] is False
    assert snapshot["features"]["portfolio_mirror"] is False


@pytest.mark.django_db
def test_premium_user_has_premium_entitlements(user):
    grant_dev_subscription(user, plan_code=Plan.Code.PREMIUM_MONTHLY)

    assert has_entitlement(user, EntitlementCode.UNLIMITED_SIMULATIONS) is True
    assert has_entitlement(user, EntitlementCode.UNLIMITED_SCAM_CHECKS) is True
    assert has_entitlement(user, EntitlementCode.PORTFOLIO_MIRROR) is True
    assert has_entitlement(user, EntitlementCode.ADVANCED_ROUTE_ENGINE) is True
    assert has_entitlement(user, EntitlementCode.PRIVATE_JOURNAL_UNLIMITED) is True
    assert user_has_entitlement(user, EntitlementCode.PROFESSIONAL_REVIEW_PRIORITY) is True
    require_entitlement(user, EntitlementCode.PORTFOLIO_MIRROR)


@pytest.mark.django_db
def test_one_off_purchase_unlocks_pack(user):
    grant_dev_pack(user, OneOffPackCode.GLOBAL_INVESTING)

    snapshot = entitlement_snapshot(user)
    assert EntitlementCode.GLOBAL_INVESTING_PACK_ACCESS in snapshot["entitlements"]
    assert snapshot["packs"][OneOffPackCode.GLOBAL_INVESTING] is True
    assert snapshot["packs"][OneOffPackCode.TREASURY_BILLS] is False
    assert has_pack_access(user, OneOffPackCode.GLOBAL_INVESTING) is True
    assert has_pack_access(user, OneOffPackCode.TREASURY_BILLS) is False


@pytest.mark.django_db
def test_expired_subscription_removes_premium_entitlements(user):
    grant_dev_subscription(user, plan_code=Plan.Code.PREMIUM_MONTHLY)
    assert user_has_entitlement(user, EntitlementCode.PORTFOLIO_MIRROR) is True

    expire_dev_subscriptions(user, plan_code=Plan.Code.PREMIUM_MONTHLY)

    assert user_has_entitlement(user, EntitlementCode.PORTFOLIO_MIRROR) is False
    with pytest.raises(PermissionDenied):
        require_entitlement(user, EntitlementCode.PORTFOLIO_MIRROR)


@pytest.mark.django_db
def test_professional_basic_and_pro_feature_access(professional_user):
    professional = Professional.objects.create(user=professional_user, display_name="Billing Pro")
    grant_dev_subscription(professional_user, plan_code=Plan.Code.PROFESSIONAL_BASIC)

    assert professional_has_plan_feature(professional, EntitlementCode.PROFESSIONAL_PROFILE_PUBLIC) is True
    assert professional_has_plan_feature(professional, EntitlementCode.PROFESSIONAL_LEAD_INBOX) is True
    assert professional_has_plan_feature(professional, EntitlementCode.PROFESSIONAL_CLIENT_NOTES) is False

    expire_dev_subscriptions(professional_user, plan_code=Plan.Code.PROFESSIONAL_BASIC)
    grant_dev_subscription(professional_user, plan_code=Plan.Code.PROFESSIONAL_PRO)

    assert professional_has_plan_feature(professional, EntitlementCode.PROFESSIONAL_PROFILE_PUBLIC) is True
    assert professional_has_plan_feature(professional, EntitlementCode.PROFESSIONAL_LEAD_INBOX) is True
    assert professional_has_plan_feature(professional, EntitlementCode.PROFESSIONAL_CLIENT_NOTES) is True


@pytest.mark.django_db
def test_billing_plans_endpoint_seeds_default_plans(api_client):
    response = api_client.get("/api/billing/plans/")

    assert response.status_code == 200
    codes = {item["code"] for item in response.json()["results"]}
    assert Plan.Code.FREE in codes
    assert Plan.Code.PREMIUM_MONTHLY in codes
    assert Plan.Code.PROFESSIONAL_PRO in codes
    assert Plan.objects.count() == 5


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_dev_mock_purchase_grants_premium_for_authenticated_user(api_client, user):
    seed_default_plans()
    authenticate_with_token(api_client, user)

    response = api_client.post(
        "/api/billing/dev/mock-purchase/",
        {"kind": "subscription", "plan_code": "premium_monthly", "days": 30},
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["entitlements"]["features"]["portfolio_mirror"] is True
