from __future__ import annotations

from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone

from planning.models import InvestmentProduct, ProductRateSnapshot, ProductSimulationRun

DISCLAIMER = (
    "Educational simulation only. PesaRoute helps you compare options; we do not hold your money, "
    "execute investments, recommend products, or promise returns. Speak to a licensed professional."
)

PRODUCT_SIMULATION_DISCLAIMER = (
    "Educational estimate only. PesaRoute does not hold money, execute investments, promise returns, "
    "or give licensed investment advice. Verify current rates, fees, and rules with the provider or regulator."
)


def money(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def simulate_mmf(*, principal: Decimal, annual_rate_percent: Decimal, months: int) -> dict:
    monthly_rate = annual_rate_percent / Decimal("100") / Decimal("12")
    projected_value = principal * ((Decimal("1") + monthly_rate) ** months)
    projected_interest = projected_value - principal
    return {
        "label": "MMF educational simulation",
        "principal": money(principal),
        "annual_rate_percent": str(annual_rate_percent),
        "months": months,
        "projected_interest": money(projected_interest),
        "projected_value": money(projected_value),
        "disclaimer": DISCLAIMER,
    }


def simulate_tbill(*, face_value: Decimal, discount_rate_percent: Decimal, days: int = 91) -> dict:
    discount = face_value * (discount_rate_percent / Decimal("100")) * (Decimal(days) / Decimal("364"))
    purchase_price = face_value - discount
    return {
        "label": "Treasury bill educational simulation",
        "face_value": money(face_value),
        "discount_rate_percent": str(discount_rate_percent),
        "days": days,
        "estimated_discount_interest": money(discount),
        "estimated_purchase_price": money(purchase_price),
        "disclaimer": DISCLAIMER,
    }


def simulate_sacco(*, monthly_deposit: Decimal, months: int, annual_dividend_percent: Decimal) -> dict:
    total_contributions = monthly_deposit * Decimal(months)
    projected_dividend = (
        total_contributions * (annual_dividend_percent / Decimal("100")) * (Decimal(months) / Decimal("12"))
    )
    return {
        "label": "SACCO educational simulation",
        "monthly_deposit": money(monthly_deposit),
        "months": months,
        "total_contributions": money(total_contributions),
        "projected_dividend": money(projected_dividend),
        "projected_total": money(total_contributions + projected_dividend),
        "disclaimer": DISCLAIMER,
    }


def simulate_global_route(*, amount_kes: Decimal, fx_rate: Decimal, transfer_fee_percent: Decimal) -> dict:
    fee = amount_kes * (transfer_fee_percent / Decimal("100"))
    net_kes = amount_kes - fee
    estimated_usd = net_kes / fx_rate
    return {
        "label": "Global investing route educational simulation",
        "amount_kes": money(amount_kes),
        "fx_rate": str(fx_rate),
        "transfer_fee_percent": str(transfer_fee_percent),
        "estimated_fees_kes": money(fee),
        "estimated_usd_before_broker_costs": money(estimated_usd),
        "route_notes": [
            "Check the provider, broker, custody, FX, and tax implications before acting.",
            "This is a comparison route, not investment execution.",
        ],
        "disclaimer": DISCLAIMER,
    }


SCENARIO_RATES: dict[str, dict[str, Decimal]] = {
    InvestmentProduct.ProductType.MONEY_MARKET_FUND: {
        "conservative": Decimal("8.0000"),
        "optimistic": Decimal("12.0000"),
    },
    InvestmentProduct.ProductType.TREASURY_BILL: {
        "conservative": Decimal("9.0000"),
        "optimistic": Decimal("14.0000"),
    },
    InvestmentProduct.ProductType.TREASURY_BOND: {
        "conservative": Decimal("10.0000"),
        "optimistic": Decimal("15.0000"),
    },
    InvestmentProduct.ProductType.SACCO_DEPOSIT: {
        "conservative": Decimal("3.0000"),
        "optimistic": Decimal("7.0000"),
    },
    InvestmentProduct.ProductType.SACCO_SHARE_CAPITAL: {
        "conservative": Decimal("4.0000"),
        "optimistic": Decimal("10.0000"),
    },
    InvestmentProduct.ProductType.FIXED_DEPOSIT: {
        "conservative": Decimal("6.0000"),
        "optimistic": Decimal("11.0000"),
    },
    InvestmentProduct.ProductType.REIT: {
        "conservative": Decimal("2.0000"),
        "optimistic": Decimal("8.0000"),
    },
    InvestmentProduct.ProductType.GLOBAL_ETF_ROUTE: {
        "conservative": Decimal("0.0000"),
        "optimistic": Decimal("7.0000"),
    },
    InvestmentProduct.ProductType.GLOBAL_STOCK_ROUTE: {
        "conservative": Decimal("0.0000"),
        "optimistic": Decimal("7.0000"),
    },
}


def current_rate_snapshot(product: InvestmentProduct) -> ProductRateSnapshot | None:
    return product.rate_snapshots.filter(is_current=True).order_by("-snapshot_date", "-created_at").first()


def stale_rate_warning(product: InvestmentProduct, snapshot: ProductRateSnapshot | None) -> str | None:
    if product.freshness_status == InvestmentProduct.FreshnessStatus.STALE:
        return "Product data is marked stale. Verify current details before relying on this estimate."
    if snapshot and snapshot.snapshot_date < timezone.localdate() - timedelta(days=90):
        return "The selected rate snapshot is older than 90 days. Verify the latest public rate."
    return None


def scenario_rate(product: InvestmentProduct, mode: str) -> Decimal | None:
    defaults = SCENARIO_RATES.get(product.product_type, {})
    return defaults.get(mode)


def resolve_product_rate(
    *,
    product: InvestmentProduct,
    rate_mode: str,
    custom_rate: Decimal | None = None,
) -> tuple[Decimal | None, ProductRateSnapshot | None, str, list[str]]:
    warnings: list[str] = []
    if rate_mode == "user_custom":
        return (
            custom_rate,
            None,
            ProductSimulationRun.AssumedRateSource.MANUAL_USER_INPUT,
            ["Rate is user-entered and not verified by PesaRoute."],
        )

    if rate_mode in {"conservative", "optimistic"}:
        rate = scenario_rate(product, rate_mode)
        if rate is None:
            return (
                None,
                None,
                ProductSimulationRun.AssumedRateSource.RATE_UNAVAILABLE,
                ["Scenario rate is unavailable for this product type. Enter a custom rate to explore assumptions."],
            )
        return (
            rate,
            None,
            ProductSimulationRun.AssumedRateSource.SCENARIO,
            [f"{rate_mode.title()} scenario rate is an educational assumption, not a latest public rate."],
        )

    snapshot = current_rate_snapshot(product)
    if not snapshot:
        return (
            None,
            None,
            ProductSimulationRun.AssumedRateSource.RATE_UNAVAILABLE,
            ["Latest public rate is unavailable. Enter a custom rate only if you can verify it."],
        )
    warning = stale_rate_warning(product, snapshot)
    if warning:
        warnings.append(warning)
    return snapshot.rate_value, snapshot, ProductSimulationRun.AssumedRateSource.LATEST_SNAPSHOT, warnings


def estimate_with_annual_rate(
    *, amount: Decimal, monthly_topup: Decimal, timeline_months: int, annual_rate_percent: Decimal
) -> dict:
    monthly_rate = annual_rate_percent / Decimal("100") / Decimal("12")
    balance = amount
    for _month in range(timeline_months):
        balance *= Decimal("1") + monthly_rate
        balance += monthly_topup
    total_contribution = amount + (monthly_topup * Decimal(timeline_months))
    estimated_growth = balance - total_contribution
    return {
        "estimated_outcome": money(balance),
        "total_contribution": money(total_contribution),
        "estimated_growth": money(estimated_growth),
    }


def product_warning_notes(
    *, product: InvestmentProduct, liquidity_need: str = "", rate_warnings: list[str] | None = None
) -> list[str]:
    warnings = list(rate_warnings or [])
    if product.risk_level in {InvestmentProduct.RiskLevel.HIGH, InvestmentProduct.RiskLevel.VERY_HIGH}:
        warnings.append("Risk level is high. Losses or delays may be possible depending on the route.")
    if product.liquidity_level == InvestmentProduct.LiquidityLevel.LOW and liquidity_need.lower() in {
        "high",
        "emergency",
        "emergency_fund",
    }:
        warnings.append("Liquidity may not fit emergency money. Check withdrawal or exit rules first.")
    if product.minimum_amount:
        warnings.append(f"Minimum amount to verify: {product.currency} {money(product.minimum_amount)}.")
    if product.freshness_status in {
        InvestmentProduct.FreshnessStatus.ACCEPTABLE,
        InvestmentProduct.FreshnessStatus.STALE,
        InvestmentProduct.FreshnessStatus.UNKNOWN,
    }:
        warnings.append("Freshness is not marked fresh. Verify current public data before acting externally.")
    return sorted(set(warnings))


def fee_notes(product: InvestmentProduct) -> list[str]:
    notes = []
    for fee in product.fee_schedules.filter(is_current=True).order_by("fee_type"):
        if fee.fee_value is None:
            notes.append(f"{fee.get_fee_type_display()}: {fee.notes or fee.get_fee_unit_display()}")
        else:
            notes.append(f"{fee.get_fee_type_display()}: {fee.fee_value} {fee.fee_unit}. {fee.notes}".strip())
    return notes


def liquidity_notes(product: InvestmentProduct) -> list[str]:
    return [
        rule.withdrawal_timeline or rule.lock_in_period or rule.early_withdrawal_notes
        for rule in product.liquidity_rules.all()
        if rule.withdrawal_timeline or rule.lock_in_period or rule.early_withdrawal_notes
    ]


def simulate_product(
    *,
    product: InvestmentProduct,
    input_amount: Decimal,
    monthly_topup: Decimal,
    timeline_months: int,
    rate_mode: str,
    custom_rate: Decimal | None = None,
    goal: str = "",
    liquidity_need: str = "",
    user=None,
) -> tuple[ProductSimulationRun, dict]:
    rate, snapshot, source, rate_warnings = resolve_product_rate(
        product=product, rate_mode=rate_mode, custom_rate=custom_rate
    )
    if rate is None:
        estimate = {
            "estimated_outcome": None,
            "total_contribution": money(input_amount + monthly_topup * Decimal(timeline_months)),
            "estimated_growth": None,
        }
    else:
        estimate = estimate_with_annual_rate(
            amount=input_amount,
            monthly_topup=monthly_topup,
            timeline_months=timeline_months,
            annual_rate_percent=rate,
        )

    warnings = product_warning_notes(product=product, liquidity_need=liquidity_need, rate_warnings=rate_warnings)
    output = {
        "product": {"id": product.id, "name": product.name, "slug": product.slug, "product_type": product.product_type},
        "provider": {"id": product.provider_id, "name": product.provider.name if product.provider else ""},
        "category": {"id": product.category_id, "name": product.category.name, "slug": product.category.slug},
        "input_amount": money(input_amount),
        "monthly_topup": money(monthly_topup),
        "timeline_months": timeline_months,
        "rate_used": str(rate) if rate is not None else None,
        "rate_source": source,
        "rate_mode": rate_mode,
        "rate_snapshot_id": snapshot.id if snapshot else None,
        "freshness_status": product.freshness_status,
        "source_confidence": product.source_confidence,
        "fee_notes": fee_notes(product),
        "liquidity_notes": liquidity_notes(product),
        "risk_level": product.risk_level,
        "liquidity_level": product.liquidity_level,
        "beginner_mistakes": product.beginner_mistakes,
        "questions_to_ask": product.questions_to_ask,
        "goal": goal,
        **estimate,
        "warnings": warnings,
        "disclaimer": PRODUCT_SIMULATION_DISCLAIMER,
    }
    run = ProductSimulationRun.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        product=product,
        category=product.category,
        provider=product.provider,
        input_amount=input_amount,
        monthly_topup=monthly_topup,
        timeline_months=timeline_months,
        selected_rate_snapshot=snapshot,
        assumed_rate=rate,
        assumed_rate_source=source,
        output=output,
        warnings=warnings,
        disclaimer=PRODUCT_SIMULATION_DISCLAIMER,
    )
    output["product_simulation_run_id"] = run.id
    return run, output
