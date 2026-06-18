"""Tests for the marketplace decision layer + MMF/SACCO comparison (Phase 2.13 + 2.15)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from catalog.models import ProductCategory, Provider
from marketplace.models import WatchedProduct
from marketplace.product_services import BANNED_ADVICE_PHRASES
from planning.models import InvestmentProduct, ProductRateSnapshot

User = get_user_model()
P = InvestmentProduct


@pytest.fixture
def catalog(db):
    mmf_cat = ProductCategory.objects.create(name="Money Market Funds", slug="money-market-funds")
    sacco_cat = ProductCategory.objects.create(name="SACCOs", slug="saccos")
    land_cat = ProductCategory.objects.create(name="Land", slug="land")
    prov = Provider.objects.create(name="Acme Asset Managers", slug="acme")

    def mmf(name, slug, yield_value, mpesa=True, minimum=1000, fresh="fresh", yield_type="net_of_management_fee"):
        p = P.objects.create(
            name=name,
            slug=slug,
            category=mmf_cat,
            provider=prov,
            product_type=P.ProductType.MONEY_MARKET_FUND,
            currency=P.Currency.KES,
            minimum_amount=Decimal(minimum),
            mpesa_paybill_available=mpesa,
            mpesa_paybill_number="123456",
            yield_type=yield_type,
            management_fee_rate=Decimal("2.0"),
            withholding_tax_rate=Decimal("15"),
            withdrawal_timeline="T+1",
            liquidity_level=P.LiquidityLevel.HIGH,
            risk_level=P.RiskLevel.LOW,
            freshness_status=fresh,
            source_confidence=P.SourceConfidence.PROVIDER_REPORTED,
            published_status=P.PublishedStatus.PUBLISHED,
            internal_notes="SECRET internal note",
        )
        if yield_value is not None:
            ProductRateSnapshot.objects.create(
                product=p,
                snapshot_date=date(2026, 6, 17),
                rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
                rate_value=Decimal(str(yield_value)),
                is_current=True,
                confidence=P.SourceConfidence.PROVIDER_REPORTED,
            )
        return p

    a = mmf("Acme Money Market Fund", "acme-mmf", "12.00", mpesa=True, minimum=1000)
    b = mmf("Bravo Money Market Fund", "bravo-mmf", "9.50", mpesa=False, minimum=5000)
    stale = mmf("Stale Money Market Fund", "stale-mmf", "8.00", fresh="stale")

    sacco = P.objects.create(
        name="Acme SACCO",
        slug="acme-sacco",
        category=sacco_cat,
        provider=prov,
        product_type=P.ProductType.SACCO_DEPOSIT,
        currency=P.Currency.KES,
        dividend_rate_latest=Decimal("10.0"),
        interest_on_deposits_latest=Decimal("8.0"),
        loan_multiplier=Decimal("3.0"),
        minimum_shares=Decimal("5000"),
        membership_eligibility="Open to teachers in the county.",
        sasra_status="SASRA-licensed (verify)",
        withdrawal_timeline="60 days notice",
        liquidity_level=P.LiquidityLevel.LOW,
        risk_level=P.RiskLevel.MEDIUM,
        regulator_category="SASRA-regulated SACCO",
        published_status=P.PublishedStatus.PUBLISHED,
        internal_notes="SECRET",
    )
    land = P.objects.create(
        name="Land Due Diligence Route",
        slug="land-route",
        category=land_cat,
        provider=prov,
        product_type=P.ProductType.LAND_DUE_DILIGENCE,
        currency=P.Currency.KES,
        published_status=P.PublishedStatus.PUBLISHED,
    )
    return {"a": a, "b": b, "stale": stale, "sacco": sacco, "land": land}


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def auth_client(db):
    user = User.objects.create_user(username="shopper", password="pw-12345")
    c = APIClient()
    c.force_authenticate(user=user)
    return c, user


def _no_banned(text: str):
    low = text.lower()
    for phrase in BANNED_ADVICE_PHRASES:
        assert phrase not in low, f"Banned advice phrase present: {phrase}"


# --- Finder -----------------------------------------------------------------


def test_product_finder_returns_learning_path_and_options(catalog, client):
    r = client.post("/api/marketplace/finder/", {"goal": "first_investment"}, format="json")
    assert r.status_code == 200
    body = r.json()
    assert body["products_to_understand"]
    assert "options_to_compare" in body
    assert body["learning_path"]
    assert body["professional_to_consult"]
    _no_banned(r.content.decode())


def test_product_finder_no_advice_wording(catalog, client):
    for goal in ["emergency_fund", "first_investment", "retirement", "global_exposure", "diaspora_investing"]:
        r = client.post("/api/marketplace/finder/", {"goal": goal}, format="json")
        _no_banned(r.content.decode())
        assert "recommended" not in r.content.decode().lower()


def test_finder_land_goal_routes_to_land_safety(catalog, client):
    r = client.post("/api/marketplace/finder/", {"goal": "land_deposit"}, format="json")
    assert r.json()["route_to_land_safety"] is True


def test_finder_risk_averse_moves_volatile_to_may_not_fit(catalog, client):
    r = client.post(
        "/api/marketplace/finder/",
        {"goal": "retirement", "value_drop_comfort": "not_comfortable", "timeline": "under_3_months"},
        format="json",
    )
    avoid_types = {x["product_type"] for x in r.json()["may_not_fit_this_goal"]}
    assert "equity_fund" in avoid_types


def test_mmf_finder_returns_products_to_compare_not_recommendations(catalog, client):
    r = client.post("/api/marketplace/mmf-finder/", {"goal": "emergency_fund"}, format="json")
    assert r.status_code == 200
    body = r.json()
    assert "products_to_compare" in body
    assert "why_they_may_fit" in body
    assert body["what_to_verify"]
    _no_banned(r.content.decode())


def test_mmf_finder_mpesa_filter(catalog, client):
    r = client.post("/api/marketplace/mmf-finder/", {"mpesa_preference": True}, format="json")
    slugs = {p["slug"] for p in r.json()["products_to_compare"]}
    assert "acme-mmf" in slugs and "bravo-mmf" not in slugs


# --- Filters & sort ---------------------------------------------------------


def test_product_filter_by_type(catalog, client):
    r = client.get("/api/marketplace/products/", {"product_type": "money_market_fund"})
    results = r.json()["results"]
    assert all(p["product_type"] == "money_market_fund" for p in results)


def test_product_filter_mpesa_and_minimum(catalog, client):
    r = client.get("/api/marketplace/products/", {"mpesa": "true", "minimum_amount_lte": "2000"})
    slugs = {p["slug"] for p in r.json()["results"]}
    assert "acme-mmf" in slugs and "bravo-mmf" not in slugs


def test_sort_by_yield_desc(catalog, client):
    r = client.get("/api/marketplace/products/", {"product_type": "money_market_fund", "sort": "yield"})
    yields = [p["annual_yield"] for p in r.json()["results"] if p["annual_yield"]]
    assert yields == sorted(yields, key=lambda v: float(v), reverse=True)


def test_card_includes_source_freshness_confidence(catalog, client):
    r = client.get("/api/marketplace/products/", {"product_type": "money_market_fund"})
    card = next(p for p in r.json()["results"] if p["slug"] == "acme-mmf")
    assert card["freshness_status"] == "fresh"
    assert card["source_confidence"]
    assert card["yield_source_confidence"]
    assert card["current_rate"] and card["current_rate"]["snapshot_date"]
    assert card["mpesa_paybill_available"] is True


def test_public_api_hides_internal_notes(catalog, client):
    list_body = client.get("/api/marketplace/products/").content.decode()
    detail_body = client.get("/api/marketplace/products/acme-mmf/").content.decode()
    assert "internal_notes" not in list_body
    assert "SECRET" not in list_body
    assert "internal_notes" not in detail_body
    assert "SECRET" not in detail_body


# --- Compare ----------------------------------------------------------------


def test_compare_returns_no_winner(catalog, client):
    r = client.get("/api/marketplace/products/compare/", {"slugs": "acme-mmf,bravo-mmf"})
    body = r.json()
    assert body["comparison_note"] == "Compare assumptions before committing money."
    assert len(body["rows"]) == 2
    text = r.content.decode().lower()
    assert "winner" not in text and "best fund" not in text
    _no_banned(text)


def test_compare_mmf_net_after_tax_when_amount_given(catalog, client):
    r = client.get("/api/marketplace/products/compare/", {"slugs": "acme-mmf", "amount": "100000"})
    row = r.json()["rows"][0]
    assert row["net_after_tax_estimate"] is not None
    assert row["questions_to_ask"] is not None


# --- Net-after-tax ----------------------------------------------------------


def test_net_after_tax_no_double_count_when_net_of_fee(client, db):
    r = client.post(
        "/api/marketplace/net-after-tax/",
        {
            "initial_amount": "100000",
            "timeline_months": 12,
            "annual_yield": "12",
            "yield_treatment": "net_of_management_fee",
            "management_fee": "2",
            "withholding_tax_rate": "15",
        },
        format="json",
    )
    body = r.json()
    # Fee already in the published yield -> not subtracted again.
    assert body["fee_considered"] is False
    assert Decimal(body["fee_estimate"]) == Decimal("0.00")


def test_net_after_tax_subtracts_fee_when_separate(client, db):
    r = client.post(
        "/api/marketplace/net-after-tax/",
        {
            "initial_amount": "100000",
            "timeline_months": 12,
            "annual_yield": "12",
            "yield_treatment": "fee_separate",
            "management_fee": "2",
            "withholding_tax_rate": "15",
        },
        format="json",
    )
    body = r.json()
    assert body["fee_considered"] is True
    assert Decimal(body["fee_estimate"]) > 0


def test_net_after_tax_applies_15_percent_wht(client, db):
    r = client.post(
        "/api/marketplace/net-after-tax/",
        {
            "initial_amount": "100000",
            "timeline_months": 12,
            "annual_yield": "12",
            "yield_treatment": "net_of_management_fee",
            "withholding_tax_rate": "15",
        },
        format="json",
    )
    body = r.json()
    gross_growth = Decimal(body["gross_estimate"]) - Decimal(body["total_contributions"])
    assert float(body["tax_estimate"]) == pytest.approx(float(gross_growth) * 0.15, rel=0.02)


def test_net_after_tax_unknown_treatment_warns(client, db):
    r = client.post(
        "/api/marketplace/net-after-tax/",
        {"initial_amount": "100000", "timeline_months": 12, "annual_yield": "12", "yield_treatment": "unknown"},
        format="json",
    )
    assert any("unknown" in w.lower() for w in r.json()["warnings"])


# --- Quick scenarios --------------------------------------------------------


def test_quick_scenarios_populate_assumptions(catalog, client):
    r = client.get("/api/marketplace/quick-scenarios/")
    scenarios = r.json()["scenarios"]
    assert len(scenarios) == 8
    for s in scenarios:
        assert s["timeline_months"] and s["liquidity_need"] and s["risk_comfort"]
        assert s["categories"] and s["journal_prompt"]


# --- SACCO score ------------------------------------------------------------


def test_sacco_score_transparent_sub_scores(catalog, client):
    r = client.get("/api/marketplace/products/acme-sacco/sacco-score/")
    body = r.json()
    assert body["max_score"] == 100
    assert len(body["sub_scores"]) == 10
    assert body["score"] == sum(s["points"] for s in body["sub_scores"])
    assert "not a recommendation" in body["note"].lower()


def test_sacco_card_includes_due_diligence_score(catalog, client):
    r = client.get("/api/marketplace/products/", {"product_type": "sacco_deposit"})
    card = next(p for p in r.json()["results"] if p["slug"] == "acme-sacco")
    assert card["sacco_due_diligence_score"] is not None
    assert card["dividend_rate_latest"] == "10.000"


# --- Watchlist --------------------------------------------------------------


def test_watchlist_create_list_delete(catalog, auth_client):
    c, _ = auth_client
    created = c.post("/api/marketplace/watchlist/", {"product_slug": "acme-mmf", "note": "watching"}, format="json")
    assert created.status_code == 201
    watch_id = created.json()["id"]
    listed = c.get("/api/marketplace/watchlist/")
    assert any(w["product"]["slug"] == "acme-mmf" for w in listed.json()["results"])
    deleted = c.delete(f"/api/marketplace/watchlist/{watch_id}/")
    assert deleted.status_code == 204
    assert c.get("/api/marketplace/watchlist/").json()["count"] == 0


def test_watchlist_requires_auth(catalog, client):
    assert client.get("/api/marketplace/watchlist/").status_code in (401, 403)


# --- Personal brief ---------------------------------------------------------


def test_personal_brief_includes_watched_and_stale(catalog, auth_client):
    c, user = auth_client
    WatchedProduct.objects.create(user=user, product=catalog["stale"], last_seen_rate_value=Decimal("8.0"))
    r = c.get("/api/marketplace/personal-brief/")
    body = r.json()
    assert any(w["product_slug"] == "stale-mmf" for w in body["products_you_are_watching"])
    assert any(s["product_slug"] == "stale-mmf" for s in body["data_that_is_stale"])


# --- Intelligence -----------------------------------------------------------


def test_intelligence_lists_stale_with_warning(catalog, client):
    r = client.get("/api/marketplace/intelligence/")
    body = r.json()
    assert any(p["slug"] == "stale-mmf" for p in body["stale_data_warnings"])
    assert "new_rate_snapshots" in body and "mmf_fund_updates" in body


# --- Land cross-link --------------------------------------------------------


def test_land_category_routes_to_land_decision_safety(catalog, client):
    r = client.get("/api/marketplace/products/", {"product_type": "land_due_diligence"})
    body = r.json()
    assert "land_notice" in body
    assert body["land_notice"]["url"] == "/land-decision-safety"


# --- Review + journal -------------------------------------------------------


def test_request_review_defaults_to_range_sharing(catalog, auth_client):
    c, _ = auth_client
    r = c.post(
        "/api/marketplace/products/acme-mmf/request-review/",
        {"question": "Is this fund right for an emergency fund?", "goal": "emergency_fund"},
        format="json",
    )
    assert r.status_code == 201
    body = r.json()
    assert body["amount_display_mode"] == "range"
    assert body["exact_values_shared"] is False
    assert body["portfolio_summary_shared"] is False
    assert body["access_expires_at"]


def test_save_to_journal_includes_assumptions(catalog, auth_client):
    c, _ = auth_client
    r = c.post("/api/marketplace/products/acme-mmf/save-to-journal/", {"note": "Considering."}, format="json")
    assert r.status_code == 201
    body = r.json()
    assert body["assumptions"]
    from journal.models import JournalEntry

    entry = JournalEntry.objects.get(id=body["journal_entry_id"])
    assert "Assumptions:" in entry.decision


# --- No-advice sweep across generated outputs -------------------------------


def test_no_best_or_recommended_wording_anywhere(catalog, client):
    bodies = [
        client.get("/api/marketplace/products/").content.decode(),
        client.get("/api/marketplace/products/compare/", {"slugs": "acme-mmf,bravo-mmf"}).content.decode(),
        client.get("/api/marketplace/intelligence/").content.decode(),
        client.post("/api/marketplace/finder/", {"goal": "first_investment"}, format="json").content.decode(),
        client.post("/api/marketplace/mmf-finder/", {"goal": "maximum_returns"}, format="json").content.decode(),
        client.get("/api/marketplace/quick-scenarios/").content.decode(),
    ]
    for body in bodies:
        low = body.lower()
        assert "best investment" not in low
        assert "best fund" not in low
        assert "recommended investment" not in low
        assert "recommended fund" not in low
