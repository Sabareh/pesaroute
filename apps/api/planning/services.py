from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

DISCLAIMER = (
    "Educational simulation only. PesaRoute helps you compare options; we do not hold your money, "
    "execute investments, recommend products, or promise returns. Speak to a licensed professional."
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
