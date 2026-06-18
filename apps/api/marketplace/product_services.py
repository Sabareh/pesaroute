"""Marketplace decision-layer services (Phase 2.13 + 2.15).

Everything here is educational and uses no-advice language. We never say "best",
"recommended investment", "winner", or "guaranteed return". We say "products to
understand", "options to compare", "may not fit this goal", and "speak to a licensed
professional". Yields/returns are estimates only.
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from planning.models import InvestmentProduct, ProductRateSnapshot

PT = InvestmentProduct.ProductType

EDU_DISCLAIMER = (
    "Educational information only. PesaRoute does not hold money, execute investments, recommend "
    "providers, or promise returns. Verify details with the provider, regulator, and a licensed "
    "professional before committing money."
)

MMF_ESTIMATE_DISCLAIMER = (
    "This is an educational estimate. Actual MMF returns may vary due to daily accrual, NAV "
    "movement, fees, tax, and provider terms."
)

# Banned phrases we assert against in tests - kept here as the single source of truth.
BANNED_ADVICE_PHRASES = [
    "best product",
    "best fund",
    "best investment",
    "recommended investment",
    "recommended fund",
    "guaranteed return",
    "winner",
    "top product",
]


# --- Goal fit (Phase 2.13 Product Finder) -----------------------------------

GOAL_FIT: dict[str, dict] = {
    "emergency_fund": {
        "understand": [PT.MONEY_MARKET_FUND, PT.FIXED_DEPOSIT],
        "compare": [PT.MONEY_MARKET_FUND],
        "avoid": [PT.LAND_DUE_DILIGENCE, PT.EQUITY_FUND, PT.BITCOIN_CRYPTO_RISK_ROUTE, PT.GLOBAL_STOCK_ROUTE],
        "learning_path": [{"slug": "money-foundations", "title": "Money foundations"}],
        "simulations": ["MMF net-after-tax estimate"],
        "professional": "A licensed financial professional (optional for an emergency fund)",
    },
    "first_investment": {
        "understand": [PT.MONEY_MARKET_FUND, PT.TREASURY_BILL, PT.SACCO_DEPOSIT],
        "compare": [PT.MONEY_MARKET_FUND],
        "avoid": [PT.BITCOIN_CRYPTO_RISK_ROUTE, PT.LAND_DUE_DILIGENCE],
        "learning_path": [{"slug": "money-foundations", "title": "Money foundations"}],
        "simulations": ["MMF net-after-tax estimate", "Treasury bill estimate"],
        "professional": "A licensed financial professional",
    },
    "school_fees": {
        "understand": [PT.MONEY_MARKET_FUND, PT.FIXED_DEPOSIT, PT.TREASURY_BILL],
        "compare": [PT.MONEY_MARKET_FUND],
        "avoid": [PT.EQUITY_FUND, PT.BITCOIN_CRYPTO_RISK_ROUTE, PT.LAND_DUE_DILIGENCE],
        "learning_path": [{"slug": "money-foundations", "title": "Money foundations"}],
        "simulations": ["MMF net-after-tax estimate"],
        "professional": "A licensed financial professional",
    },
    "land_deposit": {
        "understand": [PT.LAND_DUE_DILIGENCE],
        "compare": [PT.LAND_DUE_DILIGENCE, PT.MONEY_MARKET_FUND, PT.TREASURY_BILL, PT.SACCO_DEPOSIT, PT.REIT],
        "avoid": [],
        "learning_path": [{"slug": "land-decision-safety", "title": "Land Decision Safety"}],
        "simulations": ["Land vs alternatives comparison"],
        "professional": "A land lawyer and a licensed surveyor",
        "route_to_land_safety": True,
    },
    "business": {
        "understand": [PT.MONEY_MARKET_FUND, PT.FIXED_DEPOSIT, PT.TREASURY_BILL],
        "compare": [PT.MONEY_MARKET_FUND],
        "avoid": [PT.BITCOIN_CRYPTO_RISK_ROUTE],
        "learning_path": [{"slug": "money-foundations", "title": "Money foundations"}],
        "simulations": ["MMF net-after-tax estimate"],
        "professional": "A licensed financial professional",
    },
    "retirement": {
        "understand": [PT.PENSION_PRODUCT, PT.BALANCED_FUND, PT.EQUITY_FUND, PT.MONEY_MARKET_FUND],
        "compare": [PT.PENSION_PRODUCT, PT.BALANCED_FUND],
        "avoid": [PT.BITCOIN_CRYPTO_RISK_ROUTE],
        "learning_path": [{"slug": "money-foundations", "title": "Money foundations"}],
        "simulations": ["Long-horizon balanced estimate"],
        "professional": "A licensed financial planner",
    },
    "chama_sacco": {
        "understand": [PT.SACCO_DEPOSIT, PT.SACCO_SHARE_CAPITAL, PT.MONEY_MARKET_FUND],
        "compare": [PT.SACCO_DEPOSIT],
        "avoid": [PT.BITCOIN_CRYPTO_RISK_ROUTE],
        "learning_path": [{"slug": "money-foundations", "title": "Money foundations"}],
        "simulations": ["SACCO dividend/deposit estimate"],
        "professional": "A SACCO or cooperative adviser",
    },
    "global_exposure": {
        "understand": [PT.GLOBAL_ETF_ROUTE, PT.GLOBAL_STOCK_ROUTE],
        "compare": [PT.GLOBAL_ETF_ROUTE],
        "avoid": [],
        "learning_path": [{"slug": "money-foundations", "title": "Money foundations"}],
        "simulations": ["Global route scenario estimate"],
        "professional": "A licensed financial professional (mind FX, custody, and tax)",
    },
    "diaspora_investing": {
        "understand": [PT.MONEY_MARKET_FUND, PT.GLOBAL_ETF_ROUTE, PT.TREASURY_BILL],
        "compare": [PT.MONEY_MARKET_FUND, PT.GLOBAL_ETF_ROUTE],
        "avoid": [PT.LAND_DUE_DILIGENCE],
        "learning_path": [{"slug": "money-foundations", "title": "Money foundations"}],
        "simulations": ["MMF net-after-tax estimate"],
        "professional": "A diaspora investment adviser",
    },
}

# Volatile types removed when the user is risk-averse or has a short horizon.
VOLATILE_TYPES = {
    PT.EQUITY_FUND,
    PT.BALANCED_FUND,
    PT.GLOBAL_STOCK_ROUTE,
    PT.GLOBAL_ETF_ROUTE,
    PT.BITCOIN_CRYPTO_RISK_ROUTE,
}
SHORT_TIMELINES = {"under_3_months", "3_12_months"}


def _published(types, limit=6, currency=None):
    qs = InvestmentProduct.objects.filter(
        published_status=InvestmentProduct.PublishedStatus.PUBLISHED, product_type__in=list(types)
    )
    if currency and currency != "both":
        qs = qs.filter(currency=currency.upper())
    return list(qs.select_related("provider", "category").order_by("name")[:limit])


def _type_label(ptype: str) -> str:
    return dict(PT.choices).get(ptype, ptype.replace("_", " "))


def run_product_finder(
    *,
    amount_range="",
    goal="first_investment",
    timeline="",
    quick_withdrawal="",
    value_drop_comfort="",
    currency_pref="",
    investing_context="",
) -> dict:
    """Phase 2.13 Product Finder Wizard. Returns learning paths + options, never advice."""
    fit = GOAL_FIT.get(goal, GOAL_FIT["first_investment"])
    understand = list(fit["understand"])
    compare = list(fit["compare"])
    avoid = list(fit["avoid"])

    risk_averse = value_drop_comfort in {"not_comfortable", "i_do_not_know"}
    short_horizon = timeline in SHORT_TIMELINES
    needs_liquidity = quick_withdrawal == "very_important"

    extra_avoid = []
    if (risk_averse or short_horizon or needs_liquidity) and goal != "land_deposit":
        # Move volatile types into "may not fit" for cautious / short-horizon users.
        understand = [t for t in understand if t not in VOLATILE_TYPES]
        compare = [t for t in compare if t not in VOLATILE_TYPES] or [PT.MONEY_MARKET_FUND]
        extra_avoid = [t for t in VOLATILE_TYPES if t in set(fit["understand"]) or t in set(fit["compare"])]

    avoid = list(dict.fromkeys(avoid + extra_avoid))
    products = _published(compare, limit=6, currency=currency_pref)

    professional = fit["professional"]
    if value_drop_comfort == "i_do_not_know":
        professional = "Speak to a licensed professional to clarify your risk comfort"

    notes = []
    if investing_context == "with_a_chama":
        notes.append("For a chama, record the group decision in minutes before committing money.")
    if investing_context == "as_diaspora":
        notes.append("As a diaspora investor, verify everything independently before sending money.")
    if currency_pref == "usd":
        notes.append("USD products carry currency and platform considerations; verify custody and fees.")

    return {
        "goal": goal,
        "products_to_understand": [{"product_type": t, "label": _type_label(t)} for t in understand],
        "options_to_compare": [
            {
                "slug": p.slug,
                "name": p.name,
                "provider": p.provider.name if p.provider else None,
                "product_type": p.product_type,
                "currency": p.currency,
            }
            for p in products
        ],
        "may_not_fit_this_goal": [{"product_type": t, "label": _type_label(t)} for t in avoid],
        "learning_path": fit["learning_path"],
        "simulations_to_run": fit["simulations"],
        "professional_to_consult": professional,
        "route_to_land_safety": fit.get("route_to_land_safety", False),
        "notes": notes,
        "disclaimer": EDU_DISCLAIMER,
    }


# --- MMF Finder (Phase 2.15 PART B) -----------------------------------------

MMF_GOAL_NOTES = {
    "emergency_fund": "Liquidity and stability usually matter more than the highest headline yield.",
    "school_fees": "Match the withdrawal timeline to when fees are due.",
    "rent_deposit": "Short parking; quick withdrawal and a low minimum usually matter.",
    "business_capital": "Consider how quickly you may need the money back.",
    "first_investment": "A low minimum and clear withdrawal timeline help when starting out.",
    "maximum_returns": "Highest yield is not always best - check fees, tax, and withdrawal terms.",
    "short_term_parking": "Daily liquidity and a low minimum usually matter most.",
}


def run_mmf_finder(
    *,
    amount_range="",
    goal="first_investment",
    timeline="",
    need_quick_withdrawal=False,
    minimum_amount_preference=None,
    mpesa_preference=False,
    risk_comfort="",
) -> dict:
    qs = InvestmentProduct.objects.filter(
        published_status=InvestmentProduct.PublishedStatus.PUBLISHED, product_type=PT.MONEY_MARKET_FUND
    )
    if mpesa_preference:
        qs = qs.filter(mpesa_paybill_available=True)
    if minimum_amount_preference:
        qs = qs.filter(minimum_amount__lte=Decimal(str(minimum_amount_preference)))
    products = list(qs.select_related("provider").order_by("name")[:8])

    careful = []
    if goal == "maximum_returns":
        careful.append(
            "Chasing the highest yield can mean higher fees, less liquidity, or weaker disclosure. "
            "Compare net-after-tax, not headline yield."
        )
    if need_quick_withdrawal:
        careful.append("If you need money quickly, verify the withdrawal timeline (often T+1 to T+3).")

    return {
        "goal": goal,
        "products_to_compare": [
            {
                "slug": p.slug,
                "name": p.name,
                "provider": p.provider.name if p.provider else None,
                "currency": p.currency,
                "minimum_amount": str(p.minimum_amount) if p.minimum_amount else None,
                "mpesa_paybill_available": p.mpesa_paybill_available,
            }
            for p in products
        ],
        "why_they_may_fit": MMF_GOAL_NOTES.get(goal, "Money market funds are generally lower-risk and liquid."),
        "what_to_verify": [
            "The latest yield, its date, and whether it is gross or net of fees",
            "The management fee and whether withholding tax (15%) applies",
            "The minimum investment, minimum top-up, and withdrawal timeline",
            "Whether M-Pesa deposit is available and the official paybill",
        ],
        "products_to_be_careful_with": careful,
        "disclaimer": EDU_DISCLAIMER,
    }


# --- Net-after-tax MMF calculator (Phase 2.15 PART C) ------------------------


def _q2(value) -> str:
    return str(Decimal(str(value)).quantize(Decimal("0.01")))


def net_after_tax_mmf(
    *,
    initial_amount,
    monthly_contribution=0,
    timeline_months=12,
    annual_yield,
    yield_treatment="unknown",
    management_fee=0,
    withholding_tax_rate=15,
) -> dict:
    """Transparent MMF net-after-tax estimate with NO fee double-counting.

    yield_treatment:
      - "net_of_management_fee": published yield already excludes the fee -> do NOT subtract again.
      - "fee_separate": subtract the management fee from the yield.
      - "unknown": use the yield as-is and warn.
    Withholding tax (default 15%) applies to growth only, never to contributions.
    """
    from planning.simulation_calculators import grow

    initial = float(initial_amount)
    monthly = float(monthly_contribution or 0)
    months = max(0, int(timeline_months))
    gross_rate = float(annual_yield)
    fee = float(management_fee or 0)
    wht = float(withholding_tax_rate or 0)

    assumptions = [f"Daily compounding assumed at {gross_rate}% per year.", MMF_ESTIMATE_DISCLAIMER]
    warnings = []

    gross_value, contributions = grow(initial, monthly, months, gross_rate, "daily")

    fee_considered = False
    if yield_treatment == "fee_separate" and fee > 0:
        after_fee_value, _ = grow(initial, monthly, months, gross_rate - fee, "daily")
        fee_considered = True
        assumptions.append(f"Management fee of {fee}% per year subtracted from the yield.")
    elif yield_treatment == "net_of_management_fee":
        after_fee_value = gross_value
        assumptions.append("Published yield is already net of the management fee; fee not subtracted again.")
    else:
        after_fee_value = gross_value
        warnings.append("Fee treatment is unknown; the yield was used as-is. Verify with the provider.")

    fee_estimate = gross_value - after_fee_value
    growth_after_fee = after_fee_value - contributions
    tax_estimate = max(0.0, growth_after_fee) * (wht / 100.0)
    net_value = after_fee_value - tax_estimate
    assumptions.append(f"Withholding tax of {wht}% applied to estimated growth only.")

    net_growth = net_value - contributions
    effective_annual = 0.0
    if months > 0 and contributions > 0 and net_value > 0:
        effective_annual = ((net_value / contributions) ** (12.0 / months) - 1) * 100

    return {
        "initial_amount": _q2(initial),
        "monthly_contribution": _q2(monthly),
        "timeline_months": months,
        "annual_yield": gross_rate,
        "yield_treatment": yield_treatment,
        "management_fee": fee,
        "withholding_tax_rate": wht,
        "total_contributions": _q2(contributions),
        "gross_estimate": _q2(gross_value),
        "fee_estimate": _q2(fee_estimate),
        "tax_estimate": _q2(tax_estimate),
        "net_estimated_return": _q2(net_growth),
        "net_estimated_total_value": _q2(net_value),
        "effective_annual_return": _q2(effective_annual),
        "fee_considered": fee_considered,
        "assumptions": assumptions,
        "warnings": warnings,
        "disclaimer": MMF_ESTIMATE_DISCLAIMER,
    }


# --- SACCO due-diligence score (Phase 2.15 PART F) --------------------------


def sacco_due_diligence_score(product: InvestmentProduct) -> dict:
    """Transparent /100 score from available source-linked info. NOT a recommendation."""
    has_dividend = (
        product.dividend_rate_latest is not None
        or product.rate_snapshots.filter(rate_type=ProductRateSnapshot.RateType.DIVIDEND_YIELD).exists()
    )
    has_interest = product.interest_on_deposits_latest is not None
    sub_scores = [
        {
            "key": "sasra_status_available",
            "label": "SASRA status available",
            "points": 10 if (product.sasra_status or product.regulator_category) else 0,
        },
        {
            "key": "dividend_history_available",
            "label": "Dividend history available",
            "points": 10 if has_dividend else 0,
        },
        {
            "key": "interest_on_deposits_available",
            "label": "Interest on deposits available",
            "points": 10 if has_interest else 0,
        },
        {
            "key": "loan_multiplier_clarity",
            "label": "Loan multiplier clarity",
            "points": 10 if product.loan_multiplier is not None else 0,
        },
        {
            "key": "minimum_shares_clarity",
            "label": "Minimum shares clarity",
            "points": 10 if product.minimum_shares is not None else 0,
        },
        {
            "key": "membership_eligibility_clarity",
            "label": "Membership eligibility clarity",
            "points": 10 if product.membership_eligibility else 0,
        },
        {
            "key": "withdrawal_rules_clarity",
            "label": "Withdrawal rules clarity",
            "points": 10 if (product.withdrawal_timeline or product.minimum_amount_notes) else 0,
        },
        {
            "key": "audited_report_available",
            "label": "Audited report / source available",
            "points": 10 if (product.audited_report_url or product.source_references.exists()) else 0,
        },
        {
            "key": "liquidity_notes_available",
            "label": "Liquidity notes available",
            "points": 10 if product.liquidity_level != InvestmentProduct.LiquidityLevel.UNKNOWN else 0,
        },
        {
            "key": "governance_documentation_clarity",
            "label": "Governance/documentation clarity",
            "points": 10 if (product.regulator_category or product.license_status) else 0,
        },
    ]
    total = sum(s["points"] for s in sub_scores)
    return {
        "product_slug": product.slug,
        "score": total,
        "max_score": 100,
        "sub_scores": sub_scores,
        "note": "This score reflects available public/source-linked information. It is not a recommendation.",
        "disclaimer": EDU_DISCLAIMER,
    }


# --- Quick scenarios (Phase 2.15 PART D) ------------------------------------

QUICK_SCENARIOS = [
    {
        "key": "emergency_fund",
        "label": "Emergency Fund",
        "timeline_months": 6,
        "liquidity_need": "very_important",
        "risk_comfort": "not_comfortable",
        "categories": ["Money Market Funds", "Fixed Deposits"],
        "journal_prompt": "How many months of expenses am I protecting, and can I withdraw quickly?",
    },
    {
        "key": "school_fees",
        "label": "School Fees",
        "timeline_months": 9,
        "liquidity_need": "very_important",
        "risk_comfort": "not_comfortable",
        "categories": ["Money Market Funds", "Treasury Bills"],
        "journal_prompt": "When are the fees due, and will the money be available in time?",
    },
    {
        "key": "rent_deposit",
        "label": "Rent Deposit",
        "timeline_months": 3,
        "liquidity_need": "very_important",
        "risk_comfort": "not_comfortable",
        "categories": ["Money Market Funds"],
        "journal_prompt": "Is this short-term parking, and is daily liquidity available?",
    },
    {
        "key": "wedding_savings",
        "label": "Wedding Savings",
        "timeline_months": 12,
        "liquidity_need": "somewhat_important",
        "risk_comfort": "somewhat_comfortable",
        "categories": ["Money Market Funds", "Fixed Deposits"],
        "journal_prompt": "What is my target date and how much do I need to set aside monthly?",
    },
    {
        "key": "business_capital",
        "label": "Business Capital",
        "timeline_months": 6,
        "liquidity_need": "very_important",
        "risk_comfort": "not_comfortable",
        "categories": ["Money Market Funds", "Treasury Bills"],
        "journal_prompt": "How quickly might I need this working capital back?",
    },
    {
        "key": "land_deposit",
        "label": "Land Deposit",
        "timeline_months": 12,
        "liquidity_need": "somewhat_important",
        "risk_comfort": "somewhat_comfortable",
        "categories": ["Money Market Funds", "Treasury Bills"],
        "journal_prompt": "Have I completed the Land Decision Safety checklist before paying?",
    },
    {
        "key": "first_salary_savings",
        "label": "First Salary Savings",
        "timeline_months": 12,
        "liquidity_need": "somewhat_important",
        "risk_comfort": "not_comfortable",
        "categories": ["Money Market Funds", "SACCOs"],
        "journal_prompt": "What habit am I building, and what is my monthly contribution?",
    },
    {
        "key": "chama_short_term_parking",
        "label": "Chama Short-Term Parking",
        "timeline_months": 6,
        "liquidity_need": "very_important",
        "risk_comfort": "not_comfortable",
        "categories": ["Money Market Funds"],
        "journal_prompt": "Has the chama agreed in minutes where to park the funds?",
    },
]


# --- Personal Money Brief (Phase 2.13 PART H) -------------------------------


def build_personal_brief(user) -> dict:
    from journal.models import JournalEntry
    from marketplace.models import WatchedProduct
    from planning.models import ProductSimulationRun

    watched = list(WatchedProduct.objects.filter(user=user).select_related("product", "product__provider"))
    watching, changed, stale = [], [], []
    for w in watched:
        product = w.product
        current = product.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
        current_rate = str(current.rate_value) if current else None
        entry = {
            "product_slug": product.slug,
            "name": product.name,
            "provider": product.provider.name if product.provider else None,
            "current_rate": current_rate,
            "last_seen_rate": str(w.last_seen_rate_value) if w.last_seen_rate_value is not None else None,
            "freshness_status": product.freshness_status,
        }
        watching.append(entry)
        if current and w.last_seen_rate_value is not None and current.rate_value != w.last_seen_rate_value:
            changed.append({**entry, "change": "rate updated since you saved it"})
        if product.freshness_status == InvestmentProduct.FreshnessStatus.STALE:
            stale.append({**entry, "warning": "Data may be stale. Verify before committing money."})

    runs = list(ProductSimulationRun.objects.filter(user=user).select_related("product").order_by("-created_at")[:5])
    simulations_to_rerun = [
        {
            "product_slug": r.product.slug if r.product else None,
            "name": r.product.name if r.product else "Category simulation",
            "created_at": r.created_at.date().isoformat(),
        }
        for r in runs
    ]

    cutoff = timezone.now() - timedelta(days=30)
    old_entries = list(JournalEntry.objects.filter(user=user, created_at__lt=cutoff).order_by("-created_at")[:5])
    journal_to_review = [
        {
            "id": e.id,
            "goal": e.goal,
            "created_at": e.created_at.date().isoformat(),
            "prompt": "Has anything changed since you wrote this decision?",
        }
        for e in old_entries
    ]

    lessons_to_continue = []
    try:
        from learning.models import LessonProgress  # type: ignore

        in_progress = LessonProgress.objects.filter(user=user).exclude(status="completed").order_by("-updated_at")[:5]
        lessons_to_continue = [
            {"lesson": str(p.lesson) if getattr(p, "lesson", None) else "Lesson"} for p in in_progress
        ]
    except Exception:
        lessons_to_continue = []

    suggestions = []
    if stale:
        suggestions.append("Some watched products have stale data - verify with the provider or a professional.")
    if changed:
        suggestions.append("A watched product's rate changed - rerun your simulation before deciding.")

    return {
        "products_you_are_watching": watching,
        "data_that_changed": changed,
        "data_that_is_stale": stale,
        "lessons_to_continue": lessons_to_continue,
        "simulations_to_rerun": simulations_to_rerun,
        "journal_decisions_to_review": journal_to_review,
        "professional_review_suggestions": suggestions,
        "disclaimer": EDU_DISCLAIMER,
    }


# --- Market intelligence, clean (Phase 2.13 PART I) -------------------------


def build_intelligence() -> dict:
    published = InvestmentProduct.objects.filter(published_status=InvestmentProduct.PublishedStatus.PUBLISHED)

    def _row(p):
        current = p.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
        return {
            "slug": p.slug,
            "name": p.name,
            "product_type": p.product_type,
            "provider": p.provider.name if p.provider else None,
            "freshness_status": p.freshness_status,
            "source_confidence": p.source_confidence,
            "current_rate": str(current.rate_value) if current else None,
            "snapshot_date": current.snapshot_date.isoformat() if current else None,
        }

    latest_updated = [_row(p) for p in published.select_related("provider").order_by("-updated_at")[:8]]
    recent_snaps = (
        ProductRateSnapshot.objects.filter(is_current=True).select_related("product").order_by("-snapshot_date")[:8]
    )
    new_rate_snapshots = [
        {
            "slug": s.product.slug,
            "name": s.product.name,
            "rate_value": str(s.rate_value),
            "rate_type": s.rate_type,
            "snapshot_date": s.snapshot_date.isoformat(),
        }
        for s in recent_snaps
    ]
    stale = [
        _row(p)
        for p in published.filter(freshness_status=InvestmentProduct.FreshnessStatus.STALE).select_related("provider")[
            :8
        ]
    ]
    treasury = [
        _row(p)
        for p in published.filter(
            product_type__in=[PT.TREASURY_BILL, PT.TREASURY_BOND, PT.INFRASTRUCTURE_BOND]
        ).select_related("provider")[:6]
    ]
    mmf = [
        _row(p)
        for p in published.filter(product_type=PT.MONEY_MARKET_FUND)
        .select_related("provider")
        .order_by("-updated_at")[:6]
    ]

    return {
        "latest_updated_products": latest_updated,
        "new_rate_snapshots": new_rate_snapshots,
        "stale_data_warnings": stale,
        "government_securities_updates": treasury,
        "mmf_fund_updates": mmf,
        "educational_articles": [
            {"title": "Why highest yield is not always best", "slug": "money-foundations"},
            {"title": "How withholding tax affects MMF returns", "slug": "money-foundations"},
        ],
        "disclaimer": EDU_DISCLAIMER,
    }
