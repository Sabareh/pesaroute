from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import ProductCategory, Provider
from planning.models import (
    InvestmentProduct,
    ProductFeeSchedule,
    ProductLiquidityRule,
    ProductRateSnapshot,
    ProductSimulationRun,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def category(db):
    return ProductCategory.objects.create(name="Money Market Funds", slug="money-market-funds")


@pytest.fixture
def treasury_category(db):
    return ProductCategory.objects.create(name="Treasury Bills", slug="treasury-bills")


@pytest.fixture
def provider(db):
    return Provider.objects.create(name="Generic regulated provider", slug="generic-regulated-provider")


def create_product(
    *,
    category,
    provider,
    name="Starter MMF",
    slug="starter-mmf",
    product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
    minimum_amount=Decimal("1000.00"),
    risk_level=InvestmentProduct.RiskLevel.LOW,
    liquidity_level=InvestmentProduct.LiquidityLevel.HIGH,
    freshness_status=InvestmentProduct.FreshnessStatus.FRESH,
    source_confidence=InvestmentProduct.SourceConfidence.OFFICIAL,
    published_status=InvestmentProduct.PublishedStatus.PUBLISHED,
):
    product = InvestmentProduct.objects.create(
        category=category,
        provider=provider,
        name=name,
        slug=slug,
        product_type=product_type,
        currency=InvestmentProduct.Currency.KES,
        regulator="CMA",
        regulator_category="Collective Investment Scheme",
        license_status="Verified in test fixture",
        minimum_amount=minimum_amount,
        liquidity_level=liquidity_level,
        risk_level=risk_level,
        typical_use_cases=["Emergency fund learning"],
        not_ideal_for=["Instant cash needs"],
        documents_needed=["National ID", "KRA PIN"],
        beginner_mistakes=["Choosing by headline yield only"],
        questions_to_ask=["How long do withdrawals take?"],
        public_url="https://example.com/product",
        published_status=published_status,
        last_verified_at=timezone.now(),
        freshness_status=freshness_status,
        source_confidence=source_confidence,
        internal_notes="Do not expose this in public API.",
    )
    ProductFeeSchedule.objects.create(
        product=product,
        fee_type=ProductFeeSchedule.FeeType.MANAGEMENT_FEE,
        fee_unit=ProductFeeSchedule.FeeUnit.VARIES,
        notes="Fees vary; verify with source.",
        is_current=True,
    )
    ProductLiquidityRule.objects.create(
        product=product,
        withdrawal_timeline="One to three business days.",
        liquidity_level=liquidity_level,
    )
    return product


@pytest.mark.django_db
def test_product_filter_by_category_provider_risk_and_liquidity(api_client, category, treasury_category, provider):
    matching = create_product(category=category, provider=provider)
    create_product(
        category=treasury_category,
        provider=provider,
        name="Treasury bill route",
        slug="treasury-bill-route",
        product_type=InvestmentProduct.ProductType.TREASURY_BILL,
        liquidity_level=InvestmentProduct.LiquidityLevel.MEDIUM,
    )

    response = api_client.get(
        "/api/products/",
        {
            "category": "money-market-funds",
            "provider": "generic-regulated-provider",
            "risk_level": "low",
            "liquidity_level": "high",
            "minimum_amount_lte": "1000",
            "source_confidence": "official",
        },
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["results"]] == [matching.id]


@pytest.mark.django_db
def test_product_filter_has_current_rate(api_client, category, provider):
    with_rate = create_product(category=category, provider=provider, name="With rate", slug="with-rate")
    without_rate = create_product(category=category, provider=provider, name="Without rate", slug="without-rate")
    ProductRateSnapshot.objects.create(
        product=with_rate,
        snapshot_date=timezone.localdate(),
        rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("10.0000"),
        is_current=True,
        confidence=InvestmentProduct.SourceConfidence.OFFICIAL,
    )

    response = api_client.get("/api/products/", {"has_current_rate": "true"})

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["results"]}
    assert with_rate.id in ids
    assert without_rate.id not in ids


@pytest.mark.django_db
def test_product_detail_excludes_internal_notes(api_client, category, provider):
    product = create_product(category=category, provider=provider)

    response = api_client.get(f"/api/products/{product.slug}/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["slug"] == product.slug
    assert "internal_notes" not in payload
    assert payload["educational_disclaimer"].startswith("Educational information only")


@pytest.mark.django_db
def test_compare_endpoint_returns_side_by_side_fields(api_client, category, treasury_category, provider):
    first = create_product(category=category, provider=provider)
    second = create_product(
        category=treasury_category,
        provider=provider,
        name="Treasury comparison",
        slug="treasury-comparison",
        product_type=InvestmentProduct.ProductType.TREASURY_BILL,
        liquidity_level=InvestmentProduct.LiquidityLevel.MEDIUM,
    )

    response = api_client.get("/api/products/compare/", {"product_ids": f"{first.id},{second.id}"})

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["results"]) == 2
    assert {"risk_level", "liquidity_level", "minimum_amount", "fees", "freshness_status"}.issubset(
        payload["results"][0]
    )


@pytest.mark.django_db
def test_product_simulation_uses_latest_current_rate_snapshot(api_client, category, provider):
    product = create_product(category=category, provider=provider)
    snapshot = ProductRateSnapshot.objects.create(
        product=product,
        snapshot_date=timezone.localdate(),
        rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("12.0000"),
        is_current=True,
        confidence=InvestmentProduct.SourceConfidence.OFFICIAL,
    )

    response = api_client.post(
        "/api/simulations/product/",
        {
            "product_slug": product.slug,
            "input_amount": "10000.00",
            "monthly_topup": "0.00",
            "timeline_months": 6,
            "rate_mode": "latest_snapshot",
        },
        format="json",
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["rate_source"] == ProductSimulationRun.AssumedRateSource.LATEST_SNAPSHOT
    assert payload["rate_snapshot_id"] == snapshot.id
    assert payload["estimated_outcome"] is not None


@pytest.mark.django_db
def test_product_simulation_warns_when_rate_is_stale(api_client, category, provider):
    product = create_product(
        category=category,
        provider=provider,
        freshness_status=InvestmentProduct.FreshnessStatus.STALE,
    )
    ProductRateSnapshot.objects.create(
        product=product,
        snapshot_date=timezone.localdate() - timedelta(days=120),
        rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("8.0000"),
        is_current=True,
        confidence=InvestmentProduct.SourceConfidence.OFFICIAL,
    )

    response = api_client.post(
        "/api/simulations/product/",
        {
            "product_id": product.id,
            "input_amount": "10000.00",
            "timeline_months": 12,
            "rate_mode": "latest_snapshot",
        },
        format="json",
    )

    assert response.status_code == 201
    assert any("stale" in warning.lower() or "older than 90 days" in warning for warning in response.json()["warnings"])


@pytest.mark.django_db
def test_product_simulation_works_when_no_rate_exists(api_client, category, provider):
    product = create_product(category=category, provider=provider)

    response = api_client.post(
        "/api/simulations/product/",
        {
            "product_slug": product.slug,
            "input_amount": "10000.00",
            "timeline_months": 12,
            "rate_mode": "latest_snapshot",
        },
        format="json",
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["rate_source"] == ProductSimulationRun.AssumedRateSource.RATE_UNAVAILABLE
    assert payload["estimated_outcome"] is None
    assert any("Latest public rate is unavailable" in warning for warning in payload["warnings"])


@pytest.mark.django_db
def test_user_custom_rate_is_clearly_marked(api_client, category, provider):
    product = create_product(category=category, provider=provider)

    response = api_client.post(
        "/api/simulations/product/",
        {
            "product_slug": product.slug,
            "input_amount": "10000.00",
            "timeline_months": 12,
            "rate_mode": "user_custom",
            "custom_rate": "9.5000",
        },
        format="json",
    )

    payload = response.json()
    assert response.status_code == 201
    assert payload["rate_mode"] == "user_custom"
    assert payload["rate_source"] == ProductSimulationRun.AssumedRateSource.MANUAL_USER_INPUT
    assert any("user-entered" in warning for warning in payload["warnings"])


@pytest.mark.django_db
def test_category_compare_returns_multiple_options(api_client, category, provider):
    create_product(category=category, provider=provider, name="Option A", slug="option-a")
    create_product(category=category, provider=provider, name="Option B", slug="option-b")

    response = api_client.post(
        "/api/simulations/category-compare/",
        {"amount": "10000.00", "timeline_months": 12, "category": "money-market-funds"},
        format="json",
    )

    assert response.status_code == 201
    assert len(response.json()["results"]) == 2


@pytest.mark.django_db
def test_old_mmf_simulator_endpoint_still_works(api_client):
    response = api_client.post(
        "/api/planning/simulate/mmf/",
        {"principal": "10000.00", "annual_rate_percent": "12.00", "months": 6},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["label"] == "MMF educational simulation"


@pytest.mark.django_db
def test_product_simulation_output_includes_freshness_and_source(api_client, category, provider):
    product = create_product(category=category, provider=provider)
    ProductRateSnapshot.objects.create(
        product=product,
        snapshot_date=timezone.localdate(),
        rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("11.0000"),
        is_current=True,
        confidence=InvestmentProduct.SourceConfidence.OFFICIAL,
    )

    response = api_client.post(
        "/api/simulations/product/",
        {
            "product_slug": product.slug,
            "input_amount": "10000.00",
            "timeline_months": 12,
            "rate_mode": "latest_snapshot",
        },
        format="json",
    )

    assert response.status_code == 201
    payload = response.json()
    # Source/freshness must always travel with the simulation output.
    assert payload["freshness_status"] == InvestmentProduct.FreshnessStatus.FRESH
    assert payload["source_confidence"] == InvestmentProduct.SourceConfidence.OFFICIAL
    assert "rate_source" in payload
    assert "rate_snapshot_id" in payload
    # Internal notes must never be exposed via the simulation output.
    assert "internal_notes" not in payload
    assert "internal_notes" not in str(payload.get("product", {}))


@pytest.mark.django_db
def test_product_simulation_output_avoids_advice_language(api_client, category, provider):
    product = create_product(category=category, provider=provider)

    response = api_client.post(
        "/api/simulations/product/",
        {
            "product_slug": product.slug,
            "input_amount": "10000.00",
            "timeline_months": 12,
            "rate_mode": "conservative",
        },
        format="json",
    )

    output = str(response.json()).lower()
    assert response.status_code == 201
    for banned_phrase in ["recommended investment", "best investment", "guaranteed returns", "risk-free"]:
        assert banned_phrase not in output
