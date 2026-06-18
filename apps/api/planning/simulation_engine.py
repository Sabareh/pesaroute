"""
Provider-specific simulation engine: resolves a product's rate (latest / scenario
/ custom), routes to the right calculator, and assembles the API response. Also
powers product comparison. No winners, no recommendations, no faked rates.
"""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from planning import simulation_calculators as calc
from planning.models import InvestmentProduct, ProductRateSnapshot, ProductSimulationRun

ARS = ProductSimulationRun.AssumedRateSource

CONFIDENCE_LABELS = {
    InvestmentProduct.SourceConfidence.OFFICIAL: "Official source",
    InvestmentProduct.SourceConfidence.PROVIDER_REPORTED: "Provider-reported",
    InvestmentProduct.SourceConfidence.EDITORIAL: "Editorial assumption",
    InvestmentProduct.SourceConfidence.THIRD_PARTY: "Third-party data",
    InvestmentProduct.SourceConfidence.UNKNOWN: "Source unconfirmed",
}

DEFAULT_FREQUENCY = {
    InvestmentProduct.ProductType.MONEY_MARKET_FUND: "daily",
    InvestmentProduct.ProductType.FIXED_INCOME_FUND: "daily",
    InvestmentProduct.ProductType.FIXED_DEPOSIT: "monthly",
    InvestmentProduct.ProductType.SPECIAL_FUND: "monthly",
}


def current_snapshot(product: InvestmentProduct) -> ProductRateSnapshot | None:
    return product.rate_snapshots.filter(is_current=True).order_by("-snapshot_date", "-created_at").first()


def resolve_rate(product: InvestmentProduct, rate_mode: str, custom_rate: Decimal | None) -> dict:
    """Resolve the rate + source metadata for a rate mode. rate is None when unavailable."""
    scenario_table = calc.SCENARIO_RATES.get(product.product_type, calc.DEFAULT_SCENARIO)

    if rate_mode == calc.LATEST:
        snapshot = current_snapshot(product)
        if not snapshot:
            return {
                "rate": None, "rate_type": "", "rate_source": ARS.RATE_UNAVAILABLE, "source_url": "",
                "snapshot_date": None, "freshness": product.freshness_status,
                "source_confidence": product.source_confidence, "label": "Latest rate unavailable",
                "snapshot": None,
                "warnings": ["Latest rate unavailable for this product. Pick a scenario or enter a custom educational rate."],
            }
        warnings = []
        if product.freshness_status == InvestmentProduct.FreshnessStatus.STALE:
            warnings.append("This rate is marked stale. Verify the current rate with the source before relying on it.")
        elif snapshot.snapshot_date < timezone.localdate() - timedelta(days=90):
            warnings.append("The latest snapshot is over 90 days old. Verify the current rate.")
        ref = snapshot.source_reference
        return {
            "rate": snapshot.rate_value, "rate_type": snapshot.rate_type, "rate_source": ARS.LATEST_SNAPSHOT,
            "source_url": ref.url if ref else (product.public_url or ""),
            "snapshot_date": snapshot.snapshot_date.isoformat(), "freshness": product.freshness_status,
            "source_confidence": snapshot.confidence or product.source_confidence,
            "label": CONFIDENCE_LABELS.get(snapshot.confidence or product.source_confidence, "Source"),
            "snapshot": snapshot, "warnings": warnings,
        }

    if rate_mode in (calc.CONSERVATIVE, calc.NEUTRAL, calc.OPTIMISTIC):
        tier = rate_mode.split("_")[0]
        rate = scenario_table.get(tier, calc.DEFAULT_SCENARIO[tier])
        return {
            "rate": rate, "rate_type": "scenario", "rate_source": ARS.SCENARIO, "source_url": "",
            "snapshot_date": None, "freshness": "n/a", "source_confidence": InvestmentProduct.SourceConfidence.EDITORIAL,
            "label": f"{tier.capitalize()} scenario (educational assumption, not a live rate)",
            "snapshot": None, "warnings": [f"{tier.capitalize()} scenario is an educational assumption, not a forecast."],
        }

    # custom
    return {
        "rate": custom_rate, "rate_type": "custom", "rate_source": ARS.MANUAL_USER_INPUT, "source_url": "",
        "snapshot_date": None, "freshness": "n/a", "source_confidence": InvestmentProduct.SourceConfidence.UNKNOWN,
        "label": "User custom educational assumption (not verified by PesaRoute)",
        "snapshot": None, "warnings": ["Rate is user-entered and not verified by PesaRoute."],
    }


def _fees(product: InvestmentProduct) -> tuple[list[str], Decimal | None]:
    notes: list[str] = []
    management_fee = None
    for fee in product.fee_schedules.filter(is_current=True):
        if fee.fee_value is None:
            notes.append(f"{fee.get_fee_type_display()}: {fee.notes or fee.get_fee_unit_display()}")
        else:
            notes.append(f"{fee.get_fee_type_display()}: {fee.fee_value} {fee.fee_unit}. {fee.notes}".strip())
        if fee.fee_type == fee.FeeType.MANAGEMENT_FEE and fee.fee_value is not None and fee.fee_unit == fee.FeeUnit.PERCENT:
            management_fee = fee.fee_value
    return notes, management_fee


def _liquidity_notes(product: InvestmentProduct) -> list[str]:
    notes = []
    for rule in product.liquidity_rules.all():
        for value in (rule.withdrawal_timeline, rule.lock_in_period, rule.early_withdrawal_notes):
            if value:
                notes.append(value)
    return notes


def _tenor_days(product: InvestmentProduct, override: int | None) -> int:
    if override:
        return override
    rule = product.liquidity_rules.exclude(maturity_period_days=None).first()
    if rule and rule.maturity_period_days:
        return rule.maturity_period_days
    for tenor in (364, 182, 91):
        if str(tenor) in product.name:
            return tenor
    return 91


def run_product_specific(product, params: dict, user=None) -> tuple[ProductSimulationRun, dict]:
    rate_meta = resolve_rate(product, params["rate_mode"], params.get("custom_rate"))
    rate = rate_meta["rate"]
    initial = params["initial_amount"]
    topup = params.get("monthly_topup") or Decimal("0")
    months = params["timeline_months"]
    include_fees = params.get("include_fees", True)
    include_tax = params.get("include_tax_estimate", False)
    frequency = params.get("compounding_frequency") or DEFAULT_FREQUENCY.get(product.product_type, "monthly")

    fee_notes, management_fee = _fees(product)
    liquidity_notes = _liquidity_notes(product)
    warnings = list(rate_meta["warnings"])
    ptype = product.product_type

    if rate is None:
        # Honest no-rate path: report contributions only, no fabricated growth.
        total = initial + topup * months
        result = {
            "total_contributions": calc.money(total), "estimated_gross_value": None, "estimated_net_value": None,
            "estimated_growth": None, "assumptions": ["No rate applied — latest rate unavailable."], "warnings": [],
        }
    elif ptype in (InvestmentProduct.ProductType.TREASURY_BILL,):
        result = calc.simulate_tbill(amount=initial, tenor_days=_tenor_days(product, params.get("tenor_days")),
                                     annualized_rate=rate)
    elif ptype in (InvestmentProduct.ProductType.TREASURY_BOND, InvestmentProduct.ProductType.INFRASTRUCTURE_BOND):
        result = calc.simulate_treasury_bond(amount=initial, coupon_rate=rate,
                                             years_to_maturity=params.get("years_to_maturity") or 10)
    elif ptype in (InvestmentProduct.ProductType.SACCO_DEPOSIT, InvestmentProduct.ProductType.SACCO_SHARE_CAPITAL):
        result = calc.simulate_sacco(monthly_deposit=topup, existing_deposits=initial, share_capital=initial,
                                     expected_dividend_rate=rate, timeline_months=months)
    elif ptype in (InvestmentProduct.ProductType.FIXED_DEPOSIT,):
        result = calc.simulate_fixed_income(amount=initial, timeline_months=months, annual_rate=rate,
                                            compounding_frequency=frequency, monthly_topup=topup,
                                            lock_in_period=next((r.lock_in_period for r in product.liquidity_rules.all() if r.lock_in_period), ""))
    elif ptype in (InvestmentProduct.ProductType.NSE_EQUITY, InvestmentProduct.ProductType.REIT,
                   InvestmentProduct.ProductType.EQUITY_FUND, InvestmentProduct.ProductType.BALANCED_FUND):
        result = calc.simulate_scenario_route(amount=initial, monthly_topup=topup, timeline_months=months,
                                              scenario_rate=rate, scenario_label=rate_meta["label"], currency=product.currency)
    elif ptype in (InvestmentProduct.ProductType.SPECIAL_FUND, InvestmentProduct.ProductType.GLOBAL_ETF_ROUTE,
                   InvestmentProduct.ProductType.GLOBAL_STOCK_ROUTE, InvestmentProduct.ProductType.BITCOIN_ROUTE):
        result = calc.simulate_special_fund(amount=initial, monthly_topup=topup, timeline_months=months,
                                            expected_return_rate=rate, currency=product.currency, compounding_frequency=frequency)
    else:
        result = calc.simulate_mmf_fund(initial_amount=initial, monthly_topup=topup, timeline_months=months,
                                        annual_rate=rate, compounding_frequency=frequency, management_fee=management_fee,
                                        withholding_tax_rate=Decimal("15") if include_tax else None,
                                        include_fees=include_fees, include_tax_estimate=include_tax, currency=product.currency)

    warnings.extend(result.get("warnings", []))
    if product.risk_level in (InvestmentProduct.RiskLevel.HIGH, InvestmentProduct.RiskLevel.VERY_HIGH):
        warnings.append("Risk level is high; losses or delays are possible depending on the route.")

    output = {
        "product": {"id": product.id, "name": product.name, "slug": product.slug, "product_type": product.product_type},
        "provider": {"id": product.provider_id, "name": product.provider.name if product.provider else ""},
        "category": {"id": product.category_id, "name": product.category.name, "slug": product.category.slug},
        "currency": product.currency,
        "rate_used": str(rate) if rate is not None else None,
        "rate_type": rate_meta["rate_type"],
        "rate_mode": params["rate_mode"],
        "rate_source": rate_meta["rate_source"],
        "rate_source_label": rate_meta["label"],
        "source_url": rate_meta["source_url"],
        "snapshot_date": rate_meta["snapshot_date"],
        "freshness": rate_meta["freshness"],
        "source_confidence": rate_meta["source_confidence"],
        "total_contributions": result.get("total_contributions"),
        "estimated_gross_value": result.get("estimated_gross_value"),
        "estimated_net_value": result.get("estimated_net_value"),
        "estimated_growth": result.get("estimated_growth"),
        "estimated_interest": result.get("estimated_interest"),
        "estimated_maturity_value": result.get("estimated_maturity_value"),
        "maturity_date": result.get("maturity_date"),
        "estimated_dividend": result.get("estimated_dividend"),
        "possible_loan_eligibility": result.get("possible_loan_eligibility"),
        "estimated_total_coupons": result.get("estimated_total_coupons"),
        "fees_notes": fee_notes,
        "tax_notes": ["Withholding tax of ~15% may apply to interest; verify current treatment."] if include_tax else [],
        "liquidity_notes": liquidity_notes,
        "risk_notes": [f"Risk level: {product.get_risk_level_display()}.", f"Liquidity level: {product.get_liquidity_level_display()}."],
        "beginner_mistakes": product.beginner_mistakes,
        "questions_to_ask": product.questions_to_ask,
        "warnings": sorted(set(warnings)),
        "assumptions": result.get("assumptions", []),
        "calculator": result.get("calculator", "generic"),
        "disclaimer": calc.ESTIMATE_DISCLAIMER,
    }

    run = ProductSimulationRun.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        product=product, category=product.category, provider=product.provider,
        input_amount=initial, monthly_topup=topup, timeline_months=months,
        selected_rate_snapshot=rate_meta["snapshot"],
        assumed_rate=rate, assumed_rate_source=rate_meta["rate_source"],
        output=output, warnings=output["warnings"], disclaimer=calc.ESTIMATE_DISCLAIMER,
    )
    output["product_simulation_run_id"] = run.id
    return run, output


def run_compare(products, params: dict, custom_rates: dict | None = None, user=None) -> dict:
    """Compare 2-5 products. No winner is ever declared."""
    rows = []
    for product in products:
        product_params = dict(params)
        if custom_rates and product.slug in custom_rates:
            product_params["custom_rate"] = Decimal(str(custom_rates[product.slug]))
        _run, output = run_product_specific(product, product_params, user=user)
        rows.append({
            "product": output["product"],
            "provider": output["provider"]["name"],
            "rate_used": output["rate_used"],
            "rate_source": output["rate_source"],
            "rate_source_label": output["rate_source_label"],
            "estimated_value": output.get("estimated_maturity_value") or output.get("estimated_gross_value"),
            "estimated_growth": output["estimated_growth"],
            "risk": product.risk_level,
            "liquidity": product.liquidity_level,
            "freshness": output["freshness"],
            "source_confidence": output["source_confidence"],
            "warnings": output["warnings"],
        })
    return {
        "comparison_note": "Compare assumptions side by side. PesaRoute does not rank or score options for you.",
        "rows": rows,
        "disclaimer": calc.ESTIMATE_DISCLAIMER,
    }
