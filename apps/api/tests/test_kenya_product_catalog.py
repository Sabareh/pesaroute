"""Tests for the comprehensive Kenya investment product catalog importer (Phase 2.11)."""

from __future__ import annotations

from pathlib import Path

import pytest
from django.conf import settings
from django.core.management import call_command
from rest_framework.test import APIClient

from catalog.models import ProductPassport, Provider
from planning.catalog_import import (
    base_name,
    import_catalog,
    infer_currency,
    infer_product_type,
)
from planning.models import (
    InvestmentProduct,
    ProductRateSnapshot,
    StagedInvestmentProduct,
)

FIXTURE_DIR = Path(settings.BASE_DIR) / "content" / "catalog" / "kenya_products"
CIS_FIXTURE = FIXTURE_DIR / "cma_cis_fallback.yaml"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def imported(db):
    return import_catalog(str(FIXTURE_DIR), dry_run=False, publish=True)


# --- inference unit tests ------------------------------------------------------


@pytest.mark.parametrize(
    "name,expected",
    [
        ("Britam Money Market Fund", InvestmentProduct.ProductType.MONEY_MARKET_FUND),
        ("NCBA Fixed Income Fund", InvestmentProduct.ProductType.FIXED_INCOME_FUND),
        ("Sanlam Bond Fund", InvestmentProduct.ProductType.BOND_FUND),
        ("CIC Balanced Fund", InvestmentProduct.ProductType.BALANCED_FUND),
        ("Old Mutual Equity Fund", InvestmentProduct.ProductType.EQUITY_FUND),
        ("Etica Shariah Fund", InvestmentProduct.ProductType.SHARIAH_FUND),
        ("GenCap Iman Fund", InvestmentProduct.ProductType.SHARIAH_FUND),
        ("Cytonn Multi Asset Fund", InvestmentProduct.ProductType.MULTI_ASSET_FUND),
        ("Some Alternative Investment Fund", InvestmentProduct.ProductType.ALTERNATIVE_INVESTMENT_FUND),
        ("Acorn I-REIT", InvestmentProduct.ProductType.REIT),
        ("Enhanced Yield Fund", InvestmentProduct.ProductType.ENHANCED_YIELD_FUND),
        ("Wealth Fund", InvestmentProduct.ProductType.WEALTH_FUND),
        ("Special Fund", InvestmentProduct.ProductType.SPECIAL_FUND),
        ("Totally Unclear Thing", InvestmentProduct.ProductType.OTHER),
    ],
)
def test_infer_product_type(name, expected):
    ptype, _confidence = infer_product_type(name)
    assert ptype == expected


def test_infer_product_type_uncertain_is_low_confidence():
    _ptype, confidence = infer_product_type("Mystery Vehicle")
    assert confidence == StagedInvestmentProduct.ParserConfidence.LOW


@pytest.mark.parametrize(
    "name,expected",
    [
        ("Britam Money Market Fund (USD)", InvestmentProduct.Currency.USD),
        ("ICEA Lion Dollar Fund", InvestmentProduct.Currency.USD),
        ("Some GBP Fund", InvestmentProduct.Currency.GBP),
        ("Plain KES Fund", InvestmentProduct.Currency.KES),
        ("Britam Money Market Fund", InvestmentProduct.Currency.KES),
    ],
)
def test_infer_currency(name, expected):
    assert infer_currency(name) == expected


def test_base_name_strips_currency():
    assert base_name("Britam Money Market Fund (USD)") == base_name("Britam Money Market Fund (KES)")


# --- importer behaviour --------------------------------------------------------


def test_importer_parses_at_least_100_products(db):
    batch = import_catalog(str(FIXTURE_DIR), dry_run=True, publish=False)
    assert batch.records_seen >= 100


def test_fallback_yaml_creates_products(imported):
    assert InvestmentProduct.objects.count() >= 100


@pytest.mark.parametrize(
    "needle",
    ["Britam", "NCBA", "CIC", "ICEA", "Old Mutual", "Etica", "Stanbic", "Cytonn"],
)
def test_expected_provider_products_exist(imported, needle):
    exists = (
        Provider.objects.filter(name__icontains=needle).exists()
        or InvestmentProduct.objects.filter(name__icontains=needle).exists()
    )
    assert exists, f"Expected catalog content for {needle}"


def test_standard_investment_is_distinct_from_stanbic(imported):
    sib = Provider.objects.filter(name__icontains="Standard Investment").first()
    stanbic = Provider.objects.filter(name__icontains="Stanbic").first()
    assert sib is not None and stanbic is not None
    assert sib.id != stanbic.id


def test_cbk_treasury_bill_and_dhowcsd_exist(imported):
    assert InvestmentProduct.objects.filter(product_type=InvestmentProduct.ProductType.TREASURY_BILL).exists()
    assert InvestmentProduct.objects.filter(name__icontains="DhowCSD").exists()
    assert Provider.objects.filter(name__icontains="Central Bank of Kenya").exists()


def test_nse_and_sacco_routes_exist(imported):
    assert InvestmentProduct.objects.filter(product_type=InvestmentProduct.ProductType.NSE_SHARE_ROUTE).exists()
    assert InvestmentProduct.objects.filter(product_type=InvestmentProduct.ProductType.SACCO_DEPOSIT).exists()


def test_no_invented_rates(imported):
    assert ProductRateSnapshot.objects.count() == 0
    for product in InvestmentProduct.objects.all():
        assert product.freshness_status == InvestmentProduct.FreshnessStatus.UNKNOWN


def test_uncertain_products_stay_draft_without_publish(db):
    import_catalog(str(FIXTURE_DIR), dry_run=False, publish=False)
    assert not InvestmentProduct.objects.filter(published_status=InvestmentProduct.PublishedStatus.PUBLISHED).exists()


def test_possible_duplicates_flagged_not_merged(imported):
    # USD/KES currency variants of the same fund should be flagged, never auto-merged.
    assert StagedInvestmentProduct.objects.filter(
        review_status=StagedInvestmentProduct.ReviewStatus.NEEDS_REVIEW
    ).exists()


def test_import_is_idempotent(db):
    first = import_catalog(str(FIXTURE_DIR), dry_run=False, publish=True)
    second = import_catalog(str(FIXTURE_DIR), dry_run=False, publish=True)
    assert first.products_created > 0
    assert second.products_created == 0


def test_disclaimer_applied(imported):
    product = InvestmentProduct.objects.first()
    assert "does not hold money" in product.internal_notes


# --- purge command -------------------------------------------------------------


def test_purge_removes_generic_products(db):
    from catalog.models import ProductCategory

    category = ProductCategory.objects.create(name="Money Market Funds", slug="money-market-funds")
    provider = Provider.objects.create(name="Generic educational provider", slug="generic-educational-provider")
    InvestmentProduct.objects.create(
        name="Generic Money Market Fund",
        slug="generic-money-market-fund",
        category=category,
        provider=provider,
        product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
    )
    ProductPassport.objects.create(
        name="Generic MMF",
        slug="generic-mmf",
        category=category,
        provider=provider,
        liquidity_level=ProductPassport.LiquidityLevel.HIGH,
        risk_level=ProductPassport.RiskLevel.LOW,
    )
    call_command("purge_generic_products", "--apply")
    assert not InvestmentProduct.objects.filter(name__istartswith="Generic").exists()
    assert not ProductPassport.objects.filter(name__istartswith="Generic").exists()
    assert not Provider.objects.filter(name__icontains="Generic").exists()


# --- public API ----------------------------------------------------------------


def test_public_api_lists_published_products(imported, api_client):
    response = api_client.get("/api/products/")
    assert response.status_code == 200
    data = response.json()
    results = data["results"] if isinstance(data, dict) and "results" in data else data
    assert len(results) > 0


def test_public_api_hides_internal_notes(imported, api_client):
    product = InvestmentProduct.objects.filter(published_status=InvestmentProduct.PublishedStatus.PUBLISHED).first()
    response = api_client.get(f"/api/products/{product.slug}/")
    assert response.status_code == 200
    assert "internal_notes" not in response.json()


def test_search_by_provider_name_works(imported, api_client):
    response = api_client.get("/api/products/", {"search": "Britam"})
    assert response.status_code == 200
    data = response.json()
    results = data["results"] if isinstance(data, dict) and "results" in data else data
    assert any("britam" in r["name"].lower() for r in results)


def test_no_mojibake_in_product_cards(imported, api_client):
    response = api_client.get("/api/products/")
    body = response.content.decode("utf-8")
    for mojibake in ["Â·", "â€", "Ã©", "Â "]:
        assert mojibake not in body


# --- management commands run ---------------------------------------------------


def test_completeness_report_runs(imported):
    call_command("report_kenya_product_catalog_completeness")


def test_import_command_dry_run_runs(db):
    call_command("import_kenya_product_catalog", "--dry-run")
    assert InvestmentProduct.objects.count() == 0
