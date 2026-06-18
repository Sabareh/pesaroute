"""Tests for source-linked, dated rate snapshot seeding (no invented rates)."""

from __future__ import annotations

import pytest
from django.core.management import call_command

from planning.models import InvestmentProduct, ProductRateSnapshot


@pytest.fixture
def seeded_with_rates(db):
    call_command("import_kenya_product_catalog", "--publish")
    call_command("seed_product_rates")


def test_mmf_gets_source_linked_dated_rate(seeded_with_rates):
    cytonn = InvestmentProduct.objects.filter(
        name__icontains="Cytonn", product_type="money_market_fund", currency="KES"
    ).first()
    assert cytonn is not None
    snap = cytonn.rate_snapshots.filter(is_current=True).first()
    assert snap is not None
    assert float(snap.rate_value) == pytest.approx(12.00, abs=0.001)
    assert str(snap.snapshot_date) == "2026-06-17"
    assert snap.source_reference is not None  # cited
    assert snap.rate_type == ProductRateSnapshot.RateType.EFFECTIVE_ANNUAL_YIELD


def test_treasury_bills_get_official_rate(seeded_with_rates):
    tbill = InvestmentProduct.objects.filter(name__icontains="91-Day Treasury Bill").first()
    snap = tbill.rate_snapshots.filter(is_current=True).first()
    assert snap is not None
    assert snap.confidence == InvestmentProduct.SourceConfidence.OFFICIAL
    assert float(snap.rate_value) == pytest.approx(8.7067, abs=0.0001)


def test_usd_variant_not_given_kes_rate(seeded_with_rates):
    # The MMF table is KES; USD variants must not inherit a KES yield.
    usd = InvestmentProduct.objects.filter(name__icontains="Cytonn", currency="USD").first()
    if usd:
        assert not usd.rate_snapshots.filter(is_current=True).exists()


def test_unlisted_products_have_no_invented_rate(seeded_with_rates):
    # A balanced fund is not in the rates fixture, so it must stay rate-less.
    balanced = InvestmentProduct.objects.filter(product_type="balanced_fund").first()
    assert balanced is not None
    assert not balanced.rate_snapshots.filter(is_current=True).exists()


def test_rate_seed_is_idempotent(db):
    call_command("import_kenya_product_catalog", "--publish")
    call_command("seed_product_rates")
    first = ProductRateSnapshot.objects.filter(is_current=True).count()
    call_command("seed_product_rates")
    assert ProductRateSnapshot.objects.filter(is_current=True).count() == first


def test_seeded_product_marked_fresh(seeded_with_rates):
    cytonn = InvestmentProduct.objects.filter(
        name__icontains="Cytonn", product_type="money_market_fund", currency="KES"
    ).first()
    cytonn.refresh_from_db()
    assert cytonn.freshness_status == InvestmentProduct.FreshnessStatus.FRESH


def test_api_exposes_current_rate(seeded_with_rates, client):
    cytonn = InvestmentProduct.objects.filter(
        name__icontains="Cytonn", product_type="money_market_fund", currency="KES"
    ).first()
    response = client.get(f"/api/products/{cytonn.slug}/")
    assert response.status_code == 200
    assert response.json()["current_rate"] is not None
