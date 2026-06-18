"""Tests for reseeded free-tier education passports and dev test accounts."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

from billing.models import EntitlementCode
from billing.services import get_entitlement_codes
from catalog.models import ProductPassport, Provider
from planning.catalog_import import _phrase_in


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def seeded(db):
    # Education passports reference real route providers, so import the catalog first.
    call_command("import_kenya_product_catalog", "--publish")
    call_command("seed_education_passports", "--publish")


# --- alias matching regression -------------------------------------------------


def test_short_alias_does_not_match_inside_a_word():
    # "rba" must NOT match inside "lofty corban unit trust scheme".
    assert _phrase_in("rba", "lofty corban unit trust scheme") is False
    # but a real whole-word alias still matches.
    assert _phrase_in("etica", "etica capital ltd") is True
    assert _phrase_in("standard investment bank", "standard investment bank mansa x") is True


def test_rba_pension_provider_not_merged_into_lofty_corban(db):
    call_command("import_kenya_product_catalog", "--publish")
    assert Provider.objects.filter(name__icontains="RBA").exists()
    from planning.models import InvestmentProduct

    for product in InvestmentProduct.objects.filter(product_type="pension_product"):
        assert "corban" not in (product.provider.name.lower() if product.provider else "")


# --- education passports --------------------------------------------------------


def test_seed_creates_twelve_free_tier_passports(seeded):
    free = ProductPassport.objects.filter(audience=ProductPassport.Audience.FREE)
    assert free.count() == 12


def test_education_passports_are_not_generic(seeded):
    assert not ProductPassport.objects.filter(name__icontains="generic").exists()
    assert not Provider.objects.filter(name__icontains="generic").exists()


def test_category_level_passport_has_no_provider(seeded):
    mmf = ProductPassport.objects.get(slug="money-market-fund-education-route")
    assert mmf.provider is None  # no endorsement of a single commercial fund


def test_route_passports_use_real_providers(seeded):
    tbill = ProductPassport.objects.get(slug="treasury-bill-via-dhowcsd-education-route")
    assert tbill.provider is not None
    assert "Central Bank of Kenya" in tbill.provider.name


def test_seed_education_passports_idempotent(db):
    call_command("import_kenya_product_catalog", "--publish")
    call_command("seed_education_passports", "--publish")
    count = ProductPassport.objects.count()
    call_command("seed_education_passports", "--publish")
    assert ProductPassport.objects.count() == count


def test_audience_filter_via_api(seeded, api_client):
    response = api_client.get("/api/catalog/product-passports/", {"audience": "free"})
    assert response.status_code == 200
    data = response.json()
    results = data["results"] if isinstance(data, dict) and "results" in data else data
    assert len(results) == 12
    assert all(r["audience"] == "free" for r in results)


def test_free_passports_visible_without_auth(seeded, api_client):
    # Free-tier content stays visible to everyone (anonymous included).
    response = api_client.get("/api/catalog/product-passports/")
    assert response.status_code == 200
    data = response.json()
    results = data["results"] if isinstance(data, dict) and "results" in data else data
    assert any(r["audience"] == "free" for r in results)


# --- dev test accounts ----------------------------------------------------------


def test_seed_test_accounts_creates_premium_and_free(db):
    call_command("seed_test_accounts", "--days", "30")
    User = get_user_model()
    premium = User.objects.get(username="premium.tester")
    free = User.objects.get(username="free.tester")

    premium_codes = get_entitlement_codes(premium)
    assert EntitlementCode.PREMIUM_LEARNING in premium_codes
    assert EntitlementCode.UNLIMITED_SIMULATIONS in premium_codes

    free_codes = get_entitlement_codes(free)
    assert EntitlementCode.PREMIUM_LEARNING not in free_codes
    assert EntitlementCode.CORE_LEARNING in free_codes


def test_premium_tester_can_log_in(db, api_client):
    call_command("seed_test_accounts")
    response = api_client.post(
        "/api/accounts/login/",
        {"username": "premium.tester", "password": "PesaRoutePremium#2026"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json().get("token")


def test_seed_test_accounts_idempotent(db):
    call_command("seed_test_accounts")
    call_command("seed_test_accounts")
    assert get_user_model().objects.filter(username="premium.tester").count() == 1
