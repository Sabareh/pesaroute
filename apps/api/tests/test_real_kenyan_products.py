"""Tests for the real Kenyan investment products seed command."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from catalog.management.commands.seed_real_kenyan_investment_products import (
    maybe_create_rate_snapshot,
    run_seed,
)
from catalog.models import ProductCategory, Provider
from planning.models import InvestmentProduct, ProductRateSnapshot


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_seed_creates_etica_provider():
    run_seed(dry_run=False, publish=True)
    assert Provider.objects.filter(name="Etica Capital Ltd").exists()


@pytest.mark.django_db
def test_seed_creates_etica_money_market_fund_kes():
    run_seed(dry_run=False, publish=True)
    product = InvestmentProduct.objects.filter(slug="etica-money-market-fund-kes").first()
    assert product is not None
    assert product.name == "Etica Money Market Fund (KES)"
    assert product.product_type == InvestmentProduct.ProductType.MONEY_MARKET_FUND
    assert product.currency == InvestmentProduct.Currency.KES
    assert product.published_status == InvestmentProduct.PublishedStatus.PUBLISHED


@pytest.mark.django_db
def test_seed_creates_stanbic_money_market_fund():
    run_seed(dry_run=False, publish=True)
    assert InvestmentProduct.objects.filter(slug="stanbic-money-market-fund").exists()


@pytest.mark.django_db
def test_sib_mansax_is_separate_from_stanbic():
    run_seed(dry_run=False, publish=True)
    sib = Provider.objects.filter(name="Standard Investment Bank (Mansa-X)").first()
    stanbic = Provider.objects.filter(name__icontains="Stanbic").first()
    assert sib is not None
    assert stanbic is not None
    assert sib.id != stanbic.id
    mansa = InvestmentProduct.objects.filter(slug="mansa-x-special-fund-kes").first()
    assert mansa is not None
    assert mansa.provider_id == sib.id


@pytest.mark.django_db
def test_incomplete_mansax_products_stay_draft_even_with_publish():
    run_seed(dry_run=False, publish=True)
    shariah = InvestmentProduct.objects.filter(slug="mansa-x-shariah-fund-kes").first()
    assert shariah is not None
    assert shariah.published_status == InvestmentProduct.PublishedStatus.DRAFT


@pytest.mark.django_db
def test_dry_run_writes_nothing():
    counts = run_seed(dry_run=True, publish=True)
    assert counts.providers_created > 0  # reported
    assert Provider.objects.filter(name="Etica Capital Ltd").count() == 0
    assert InvestmentProduct.objects.count() == 0


@pytest.mark.django_db
def test_rate_snapshots_not_created_without_source_data():
    run_seed(dry_run=False, publish=True)
    # No seed spec carries dated rate data, so no current rate exists.
    assert ProductRateSnapshot.objects.count() == 0


@pytest.mark.django_db
def test_rate_snapshot_helper_creates_only_with_source_data():
    category = ProductCategory.objects.create(name="Money Market Funds", slug="money-market-funds")
    provider = Provider.objects.create(name="Test Provider", slug="test-provider")
    product = InvestmentProduct.objects.create(
        name="Rated Fund", slug="rated-fund", category=category, provider=provider,
        product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND, currency=InvestmentProduct.Currency.KES,
    )
    assert maybe_create_rate_snapshot(product, None, None, None) is None
    snapshot = maybe_create_rate_snapshot(
        product,
        {"rate_value": "11.5", "rate_type": ProductRateSnapshot.RateType.ANNUAL_YIELD, "snapshot_date": date(2026, 1, 15), "raw_label": "11.5% p.a."},
        None,
        None,
    )
    assert snapshot is not None
    assert snapshot.is_current is True
    assert snapshot.rate_value == Decimal("11.5")


@pytest.mark.django_db
def test_product_without_rate_shows_unavailable_via_api(api_client):
    run_seed(dry_run=False, publish=True)
    response = api_client.get("/api/products/etica-money-market-fund-kes/")
    assert response.status_code == 200
    assert response.json()["current_rate"] is None


@pytest.mark.django_db
def test_public_api_hides_internal_notes(api_client):
    run_seed(dry_run=False, publish=True)
    response = api_client.get("/api/products/etica-money-market-fund-kes/")
    assert response.status_code == 200
    payload = response.json()
    assert "internal_notes" not in payload
    assert payload["simulate_enabled"] is True
    assert payload["compare_enabled"] is True


@pytest.mark.django_db
def test_no_malformed_encoding_in_product_cards(api_client):
    run_seed(dry_run=False, publish=True)
    response = api_client.get("/api/products/")
    assert response.status_code == 200
    body = response.content.decode("utf-8")
    for mojibake in ["Â·", "â€", "Ã©", "Â "]:
        assert mojibake not in body


@pytest.mark.django_db
def test_seed_is_idempotent():
    first = run_seed(dry_run=False, publish=True)
    second = run_seed(dry_run=False, publish=True)
    assert first.products_created > 0
    assert second.products_created == 0
    assert second.providers_created == 0
