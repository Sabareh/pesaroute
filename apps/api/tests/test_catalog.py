from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import ProductCategory, ProductPassport, Provider


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def category(db):
    return ProductCategory.objects.create(
        name="Money Market Funds",
        slug="money-market-funds",
        description="Liquid pooled funds for short-term savings.",
        status=ProductCategory.Status.ACTIVE,
    )


@pytest.fixture
def treasury_category(db):
    return ProductCategory.objects.create(
        name="Treasury Bills",
        slug="treasury-bills",
        description="Government securities sold through auctions.",
        status=ProductCategory.Status.ACTIVE,
    )


@pytest.fixture
def provider(db):
    return Provider.objects.create(
        name="Generic regulated provider",
        regulator_category="CMA",
        status=Provider.Status.ACTIVE,
    )


def create_passport(
    *,
    category,
    provider,
    name,
    slug,
    minimum_amount=Decimal("1000.00"),
    liquidity_level=ProductPassport.LiquidityLevel.HIGH,
    risk_level=ProductPassport.RiskLevel.LOW,
    regulator_category="CMA",
    description="Educational product passport.",
    beginner_mistakes=None,
    execution_route_external="Verify with the provider before opening externally.",
    is_sponsored=False,
    status=ProductPassport.Status.PUBLISHED,
):
    return ProductPassport.objects.create(
        category=category,
        provider=provider,
        name=name,
        slug=slug,
        description=description,
        regulator_category=regulator_category,
        minimum_amount=minimum_amount,
        liquidity_level=liquidity_level,
        risk_level=risk_level,
        beginner_mistakes=beginner_mistakes or ["Skipping provider and regulator checks."],
        execution_route_external=execution_route_external,
        is_sponsored=is_sponsored,
        status=status,
    )


@pytest.mark.django_db
def test_product_passport_filters(api_client, category, treasury_category, provider):
    matching = create_passport(
        category=category,
        provider=provider,
        name="Starter MMF",
        slug="starter-mmf",
        minimum_amount=Decimal("500.00"),
        liquidity_level=ProductPassport.LiquidityLevel.HIGH,
        risk_level=ProductPassport.RiskLevel.LOW,
        regulator_category="CMA",
        is_sponsored=False,
    )
    create_passport(
        category=treasury_category,
        provider=provider,
        name="Treasury route",
        slug="treasury-route",
        minimum_amount=Decimal("100000.00"),
        liquidity_level=ProductPassport.LiquidityLevel.MEDIUM,
        risk_level=ProductPassport.RiskLevel.LOW,
        regulator_category="CBK",
        is_sponsored=True,
    )

    response = api_client.get(
        "/api/catalog/product-passports/",
        {
            "category": "money-market-funds",
            "risk_level": "low",
            "liquidity_level": "high",
            "regulator_category": "CMA",
            "minimum_amount_lte": "1000",
            "is_sponsored": "false",
            "status": "published",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert [item["id"] for item in payload["results"]] == [matching.id]
    assert response["Cache-Control"] == "public, max-age=300"


@pytest.mark.django_db
def test_product_passport_searches_name_provider_description_mistakes_and_execution_route(
    api_client, category, provider
):
    searchable = create_passport(
        category=category,
        provider=provider,
        name="Cash ladder MMF",
        slug="cash-ladder-mmf",
        description="Teaches withdrawal buffers and liquidity planning.",
        beginner_mistakes=["Chasing headline yield without checking fees."],
        execution_route_external="Open directly with a licensed provider after verifying documents.",
    )

    search_terms = ["cash ladder", "regulated provider", "withdrawal buffers", "headline yield", "licensed provider"]
    for term in search_terms:
        response = api_client.get("/api/catalog/product-passports/", {"search": term})
        assert response.status_code == 200
        assert [item["id"] for item in response.json()["results"]] == [searchable.id]


@pytest.mark.django_db
def test_product_passport_pagination_and_ordering(api_client, category, provider):
    old_passport = create_passport(
        category=category,
        provider=provider,
        name="Old passport",
        slug="old-passport",
        risk_level=ProductPassport.RiskLevel.HIGH,
    )
    for index in range(21):
        create_passport(
            category=category,
            provider=provider,
            name=f"Passport {index:02d}",
            slug=f"passport-{index:02d}",
            risk_level=ProductPassport.RiskLevel.LOW,
        )
    ProductPassport.objects.filter(id=old_passport.id).update(updated_at=timezone.now() - timedelta(days=2))

    response = api_client.get("/api/catalog/product-passports/", {"ordering": "-updated_at"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 22
    assert payload["next"] is not None
    assert len(payload["results"]) == 20
    assert payload["results"][-1]["name"] != "Old passport"
