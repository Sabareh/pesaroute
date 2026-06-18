"""Tests for the provider-specific simulation engine, comparison, and virtual portfolios."""
from __future__ import annotations

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import ProductCategory, Provider
from planning.models import InvestmentProduct, ProductRateSnapshot, VirtualSimulationPortfolio

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="learner", password="pw12345!")


@pytest.fixture
def category(db):
    return ProductCategory.objects.create(name="Money Market Funds", slug="money-market-funds")


@pytest.fixture
def provider(db):
    return Provider.objects.create(name="Etica Capital Ltd", slug="etica-capital-ltd")


def make_product(category, provider, *, name, slug, ptype=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
                 currency=InvestmentProduct.Currency.KES, freshness=InvestmentProduct.FreshnessStatus.UNKNOWN,
                 risk=InvestmentProduct.RiskLevel.LOW, liquidity=InvestmentProduct.LiquidityLevel.HIGH):
    return InvestmentProduct.objects.create(
        name=name, slug=slug, category=category, provider=provider, product_type=ptype, currency=currency,
        risk_level=risk, liquidity_level=liquidity, freshness_status=freshness,
        published_status=InvestmentProduct.PublishedStatus.PUBLISHED,
        beginner_mistakes=["Choosing by headline yield only"], questions_to_ask=["Is the yield net of fees?"],
        internal_notes="should never appear in API",
    )


@pytest.mark.django_db
def test_etica_simulation_uses_latest_snapshot(api_client, category, provider):
    product = make_product(category, provider, name="Etica Money Market Fund (KES)", slug="etica-money-market-fund-kes",
                           freshness=InvestmentProduct.FreshnessStatus.FRESH)
    ProductRateSnapshot.objects.create(
        product=product, snapshot_date=timezone.localdate(), rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("11.5000"), is_current=True, confidence=InvestmentProduct.SourceConfidence.PROVIDER_REPORTED,
    )
    response = api_client.post("/api/simulations/product-specific/", {
        "product_slug": product.slug, "initial_amount": "100000.00", "monthly_topup": "0.00",
        "timeline_months": 12, "rate_mode": "latest_available_rate",
    }, format="json")
    assert response.status_code == 201
    payload = response.json()
    assert payload["rate_used"] == "11.5000"
    assert payload["rate_source"] == "latest_snapshot"
    assert payload["snapshot_date"] is not None
    assert payload["estimated_gross_value"] is not None
    assert "internal_notes" not in payload


@pytest.mark.django_db
def test_stanbic_simulation_rate_unavailable_then_custom(api_client, category):
    stanbic = Provider.objects.create(name="Stanbic Asset Management", slug="stanbic-asset-management")
    product = make_product(category, stanbic, name="Stanbic Money Market Fund", slug="stanbic-money-market-fund")

    # Latest unavailable -> warning, no fabricated value.
    r1 = api_client.post("/api/simulations/product-specific/", {
        "product_slug": product.slug, "initial_amount": "50000.00", "timeline_months": 12,
        "rate_mode": "latest_available_rate",
    }, format="json")
    assert r1.status_code == 201
    p1 = r1.json()
    assert p1["rate_used"] is None
    assert p1["estimated_gross_value"] is None
    assert any("unavailable" in w.lower() for w in p1["warnings"])

    # Custom educational rate -> produces an estimate, clearly labelled.
    r2 = api_client.post("/api/simulations/product-specific/", {
        "product_slug": product.slug, "initial_amount": "50000.00", "timeline_months": 12,
        "rate_mode": "custom_educational_rate", "custom_rate": "10.0000",
    }, format="json")
    assert r2.status_code == 201
    p2 = r2.json()
    assert p2["rate_source"] == "manual_user_input"
    assert p2["estimated_gross_value"] is not None
    assert any("user-entered" in w.lower() or "not verified" in w.lower() for w in p2["warnings"])


@pytest.mark.django_db
def test_treasury_bill_simulation_uses_tenor(api_client, category):
    cbk = Provider.objects.create(name="Central Bank of Kenya (DhowCSD)", slug="cbk-dhowcsd")
    tcat = ProductCategory.objects.create(name="Treasury Bills", slug="treasury-bills")
    product = make_product(tcat, cbk, name="91-Day Treasury Bill", slug="91-day-treasury-bill",
                           ptype=InvestmentProduct.ProductType.TREASURY_BILL, risk=InvestmentProduct.RiskLevel.LOW,
                           liquidity=InvestmentProduct.LiquidityLevel.MEDIUM)
    response = api_client.post("/api/simulations/product-specific/", {
        "product_slug": product.slug, "initial_amount": "100000.00", "timeline_months": 3,
        "rate_mode": "neutral_scenario",
    }, format="json")
    assert response.status_code == 201
    payload = response.json()
    assert payload["calculator"] == "treasury_bill"
    assert payload["estimated_interest"] is not None
    assert any("CBK" in w or "DhowCSD" in w for w in payload["warnings"])


@pytest.mark.django_db
def test_stale_rate_produces_warning(api_client, category, provider):
    product = make_product(category, provider, name="Etica Fixed Income Fund", slug="etica-fixed-income-fund",
                           ptype=InvestmentProduct.ProductType.FIXED_INCOME_FUND,
                           freshness=InvestmentProduct.FreshnessStatus.STALE)
    ProductRateSnapshot.objects.create(
        product=product, snapshot_date=timezone.localdate(), rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("12.0000"), is_current=True, confidence=InvestmentProduct.SourceConfidence.PROVIDER_REPORTED,
    )
    response = api_client.post("/api/simulations/product-specific/", {
        "product_slug": product.slug, "initial_amount": "100000.00", "timeline_months": 12,
        "rate_mode": "latest_available_rate",
    }, format="json")
    assert response.status_code == 201
    assert any("stale" in w.lower() for w in response.json()["warnings"])


@pytest.mark.django_db
def test_compare_products_has_no_winner(api_client, category):
    p1 = make_product(category, Provider.objects.create(name="Etica", slug="etica"),
                      name="Etica MMF", slug="etica-mmf")
    tcat = ProductCategory.objects.create(name="Treasury Bills", slug="treasury-bills")
    p2 = make_product(tcat, Provider.objects.create(name="CBK", slug="cbk"),
                      name="91-Day Treasury Bill", slug="91-day-treasury-bill",
                      ptype=InvestmentProduct.ProductType.TREASURY_BILL)
    response = api_client.post("/api/simulations/compare-products/", {
        "product_slugs": [p1.slug, p2.slug], "initial_amount": "100000.00", "timeline_months": 12,
        "rate_mode": "neutral_scenario",
    }, format="json")
    assert response.status_code == 201
    payload = response.json()
    assert len(payload["rows"]) == 2
    body = str(payload).lower()
    for banned in ["winner", "best option", "recommended"]:
        assert banned not in body


@pytest.mark.django_db
def test_virtual_portfolio_add_multiple_and_run(api_client, user, category):
    api_client.force_authenticate(user)
    p1 = make_product(category, Provider.objects.create(name="Etica", slug="etica"), name="Etica MMF", slug="etica-mmf")
    p2 = make_product(category, Provider.objects.create(name="Stanbic", slug="stanbic"), name="Stanbic MMF", slug="stanbic-mmf")

    create = api_client.post("/api/simulations/virtual-portfolios/", {"name": "What-if", "starting_virtual_cash": "200000.00"}, format="json")
    assert create.status_code == 201
    portfolio_id = create.json()["id"]

    for product in (p1, p2):
        add = api_client.post(f"/api/simulations/virtual-portfolios/{portfolio_id}/positions/", {
            "product_slug": product.slug, "virtual_amount_allocated": "100000.00",
            "rate_mode": "neutral_scenario", "timeline_months": 12,
        }, format="json")
        assert add.status_code == 201
    assert VirtualSimulationPortfolio.objects.get(pk=portfolio_id).positions.count() == 2

    run = api_client.post(f"/api/simulations/virtual-portfolios/{portfolio_id}/run/", {}, format="json")
    assert run.status_code == 201
    run_payload = run.json()
    assert len(run_payload["rows"]) == 2
    assert "educational" in run_payload["label"].lower()
    # The label must frame this as NOT real trading.
    assert "not real" in run_payload["label"].lower()


@pytest.mark.django_db
def test_save_to_journal_includes_product_provider_source(api_client, user, category, provider):
    api_client.force_authenticate(user)
    product = make_product(category, provider, name="Etica MMF", slug="etica-mmf", freshness=InvestmentProduct.FreshnessStatus.FRESH)
    ProductRateSnapshot.objects.create(
        product=product, snapshot_date=timezone.localdate(), rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("11.0000"), is_current=True, confidence=InvestmentProduct.SourceConfidence.PROVIDER_REPORTED,
    )
    sim = api_client.post("/api/simulations/product-specific/", {
        "product_slug": product.slug, "initial_amount": "100000.00", "timeline_months": 12,
        "rate_mode": "latest_available_rate",
    }, format="json")
    run_id = sim.json()["product_simulation_run_id"]

    save = api_client.post(f"/api/simulations/{run_id}/save-to-journal/", {}, format="json")
    assert save.status_code == 201
    assert save.json()["amount_display_mode"] == "range"

    from journal.models import JournalEntry

    entry = JournalEntry.objects.get(pk=save.json()["journal_entry_id"])
    assert "Etica" in entry.decision
    assert "freshness" in entry.reason.lower()
    assert entry.amount_exact is None  # exact amount not stored
    assert entry.amount_range_min is not None


@pytest.mark.django_db
def test_request_review_defaults_to_amount_range(api_client, user, category, provider):
    api_client.force_authenticate(user)
    product = make_product(category, provider, name="Etica MMF", slug="etica-mmf")
    sim = api_client.post("/api/simulations/product-specific/", {
        "product_slug": product.slug, "initial_amount": "100000.00", "timeline_months": 12,
        "rate_mode": "custom_educational_rate", "custom_rate": "10.0000",
    }, format="json")
    run_id = sim.json()["product_simulation_run_id"]

    review = api_client.post(f"/api/simulations/{run_id}/request-professional-review/", {}, format="json")
    assert review.status_code == 201
    assert review.json()["amount_display_mode"] == "range"

    from marketplace.models import ConsultationRequest

    consultation = ConsultationRequest.objects.get(pk=review.json()["consultation_request_id"])
    assert consultation.amount_display_mode == ConsultationRequest.AmountDisplayMode.RANGE
    assert consultation.amount_range_min is not None


@pytest.mark.django_db
def test_no_advice_language_in_product_specific(api_client, category, provider):
    product = make_product(category, provider, name="Etica MMF", slug="etica-mmf")
    response = api_client.post("/api/simulations/product-specific/", {
        "product_slug": product.slug, "initial_amount": "100000.00", "timeline_months": 12,
        "rate_mode": "conservative_scenario",
    }, format="json")
    body = str(response.json()).lower()
    for banned in ["guaranteed returns", "best investment", "recommended investment", "risk-free", "you should invest"]:
        assert banned not in body
