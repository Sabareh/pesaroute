from __future__ import annotations

from decimal import Decimal

from portfolio.models import PortfolioItem

LIQUIDITY_WEIGHTS = {"high": 3, "medium": 2, "low": 1, "locked": 0}
RISK_ORDER = {"low": 1, "moderate": 2, "high": 3, "very_high": 4}


def build_portfolio_summary(items) -> dict:
    exact_items = [
        item
        for item in items
        if item.amount_display_mode == PortfolioItem.AmountDisplayMode.EXACT and item.amount_exact
    ]
    total_known = sum((item.amount_exact for item in exact_items), Decimal("0.00"))
    allocation: dict[str, Decimal] = {}
    for item in exact_items:
        allocation[item.asset_type] = allocation.get(item.asset_type, Decimal("0.00")) + item.amount_exact

    liquidity_values = [LIQUIDITY_WEIGHTS.get(item.liquidity_level, 0) for item in items]
    liquidity_score = round(sum(liquidity_values) / len(liquidity_values), 2) if liquidity_values else None
    highest_risk = max((RISK_ORDER.get(item.risk_level, 0) for item in items), default=0)
    risk_note = "No portfolio items yet."
    if highest_risk >= 4:
        risk_note = (
            "Some mirrored holdings are marked very high risk; review concentration and liquidity before adding more."
        )
    elif highest_risk >= 3:
        risk_note = "Some mirrored holdings are high risk; compare safer options and document your reasons."
    elif items:
        risk_note = "No high-risk concentration detected from the mirrored items."

    return {
        "total_known_amount": str(total_known.quantize(Decimal("0.01"))) if exact_items else None,
        "asset_allocation": {asset: str(amount.quantize(Decimal("0.01"))) for asset, amount in allocation.items()},
        "liquidity_score": liquidity_score,
        "risk_concentration_note": risk_note,
        "items_count": len(items),
    }
