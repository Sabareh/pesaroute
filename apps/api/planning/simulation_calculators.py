"""
Provider-specific simulation calculators.

Pure functions that produce *educational estimates only*. Nothing here promises a
return: every result is "estimated, not guaranteed", and a rate is never invented
(a missing rate yields a warning, not a fabricated number).

Calculators: MMF/fund (A), fixed income / fixed deposit (B), Treasury bill (C),
Treasury bond (D), SACCO (E), special/global fund (F), scenario equity route (G).
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from planning.models import InvestmentProduct, ProductRateSnapshot

ESTIMATE_DISCLAIMER = (
    "Educational estimate only — not guaranteed. PesaRoute does not hold money, execute investments, "
    "promise returns, or give licensed advice. Verify current rates, fees, and rules with the provider or regulator."
)

# Rate modes
LATEST = "latest_available_rate"
CONSERVATIVE = "conservative_scenario"
NEUTRAL = "neutral_scenario"
OPTIMISTIC = "optimistic_scenario"
CUSTOM = "custom_educational_rate"
RATE_MODES = [LATEST, CONSERVATIVE, NEUTRAL, OPTIMISTIC, CUSTOM]

# Educational scenario assumptions per product type (annual %). These are
# illustrative ranges for learning, NOT forecasts or recommendations.
SCENARIO_RATES: dict[str, dict[str, Decimal]] = {
    InvestmentProduct.ProductType.MONEY_MARKET_FUND: {"conservative": Decimal("8"), "neutral": Decimal("10"), "optimistic": Decimal("13")},
    InvestmentProduct.ProductType.FIXED_INCOME_FUND: {"conservative": Decimal("9"), "neutral": Decimal("11"), "optimistic": Decimal("14")},
    InvestmentProduct.ProductType.BALANCED_FUND: {"conservative": Decimal("6"), "neutral": Decimal("10"), "optimistic": Decimal("15")},
    InvestmentProduct.ProductType.EQUITY_FUND: {"conservative": Decimal("0"), "neutral": Decimal("8"), "optimistic": Decimal("18")},
    InvestmentProduct.ProductType.SPECIAL_FUND: {"conservative": Decimal("5"), "neutral": Decimal("12"), "optimistic": Decimal("20")},
    InvestmentProduct.ProductType.TREASURY_BILL: {"conservative": Decimal("9"), "neutral": Decimal("12"), "optimistic": Decimal("16")},
    InvestmentProduct.ProductType.TREASURY_BOND: {"conservative": Decimal("10"), "neutral": Decimal("13"), "optimistic": Decimal("16")},
    InvestmentProduct.ProductType.INFRASTRUCTURE_BOND: {"conservative": Decimal("10"), "neutral": Decimal("13"), "optimistic": Decimal("16")},
    InvestmentProduct.ProductType.FIXED_DEPOSIT: {"conservative": Decimal("6"), "neutral": Decimal("9"), "optimistic": Decimal("12")},
    InvestmentProduct.ProductType.SACCO_DEPOSIT: {"conservative": Decimal("3"), "neutral": Decimal("6"), "optimistic": Decimal("9")},
    InvestmentProduct.ProductType.SACCO_SHARE_CAPITAL: {"conservative": Decimal("4"), "neutral": Decimal("8"), "optimistic": Decimal("12")},
    InvestmentProduct.ProductType.NSE_EQUITY: {"conservative": Decimal("0"), "neutral": Decimal("8"), "optimistic": Decimal("18")},
    InvestmentProduct.ProductType.REIT: {"conservative": Decimal("2"), "neutral": Decimal("7"), "optimistic": Decimal("12")},
    InvestmentProduct.ProductType.GLOBAL_ETF_ROUTE: {"conservative": Decimal("0"), "neutral": Decimal("7"), "optimistic": Decimal("12")},
    InvestmentProduct.ProductType.GLOBAL_STOCK_ROUTE: {"conservative": Decimal("0"), "neutral": Decimal("8"), "optimistic": Decimal("18")},
    InvestmentProduct.ProductType.BITCOIN_ROUTE: {"conservative": Decimal("-20"), "neutral": Decimal("0"), "optimistic": Decimal("40")},
}

DEFAULT_SCENARIO = {"conservative": Decimal("4"), "neutral": Decimal("8"), "optimistic": Decimal("12")}


def money(value) -> str:
    return str(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _effective_monthly_rate(annual_pct: float, frequency: str) -> float:
    r = annual_pct / 100.0
    if frequency == "daily":
        return (1 + r / 365) ** (365 / 12) - 1
    if frequency == "annual":
        return (1 + r) ** (1 / 12) - 1 if r > -1 else -1 + 1e-9
    # monthly or unknown -> simple monthly
    return r / 12


def grow(initial: float, monthly_topup: float, months: int, annual_pct: float, frequency: str) -> tuple[float, float]:
    """Return (gross_value, total_contributions) via a monthly contribution loop."""
    monthly_rate = _effective_monthly_rate(annual_pct, frequency)
    balance = initial
    for _ in range(max(0, months)):
        balance = balance * (1 + monthly_rate) + monthly_topup
    total_contributions = initial + monthly_topup * max(0, months)
    return balance, total_contributions


# ---- A. Money market / daily-compounded fund -------------------------------

def simulate_mmf_fund(*, initial_amount, monthly_topup, timeline_months, annual_rate, compounding_frequency="daily",
                      management_fee=None, withholding_tax_rate=None, withdrawal_timeline="", include_fees=True,
                      include_tax_estimate=False, currency="KES"):
    rate = float(annual_rate)
    assumptions = [f"{compounding_frequency.capitalize()} compounding assumed at {rate}% per year."]
    warnings: list[str] = []

    gross_value, total_contributions = grow(float(initial_amount), float(monthly_topup), timeline_months, rate, compounding_frequency)
    estimated_net_value = None
    fees_considered = False
    taxes_considered = False

    net_rate = rate
    if include_fees and management_fee is not None:
        net_rate = rate - float(management_fee)
        fees_considered = True
        assumptions.append(f"Management fee of {management_fee}% per year subtracted from the assumed yield.")
    net_value, _ = grow(float(initial_amount), float(monthly_topup), timeline_months, net_rate, compounding_frequency)

    if include_tax_estimate and withholding_tax_rate is not None:
        taxes_considered = True
        growth_before_tax = net_value - total_contributions
        net_value = total_contributions + growth_before_tax * (1 - float(withholding_tax_rate) / 100.0)
        assumptions.append(f"Withholding tax of {withholding_tax_rate}% applied to estimated growth only.")

    if fees_considered or taxes_considered:
        estimated_net_value = money(net_value)

    if compounding_frequency == "unknown":
        warnings.append("Compounding frequency is unknown; a monthly assumption was used.")
    if withdrawal_timeline:
        warnings.append(f"Withdrawals: {withdrawal_timeline}")

    return {
        "calculator": "money_market_fund",
        "total_contributions": money(total_contributions),
        "estimated_gross_value": money(gross_value),
        "estimated_net_value": estimated_net_value,
        "estimated_growth": money(gross_value - total_contributions),
        "fees_considered": fees_considered,
        "taxes_considered": taxes_considered,
        "assumptions": assumptions,
        "warnings": warnings,
    }


# ---- B. Fixed income / fixed deposit ---------------------------------------

def simulate_fixed_income(*, amount, timeline_months, annual_rate, compounding_frequency="monthly",
                          lock_in_period="", early_withdrawal_notes="", monthly_topup=0, currency="KES"):
    rate = float(annual_rate)
    gross_value, total_contributions = grow(float(amount), float(monthly_topup), timeline_months, rate, compounding_frequency)
    warnings = ["Estimated, not guaranteed."]
    if lock_in_period:
        warnings.append(f"Lock-in period: {lock_in_period}. Money may be inaccessible until then.")
    if early_withdrawal_notes:
        warnings.append(f"Early withdrawal: {early_withdrawal_notes}")
    return {
        "calculator": "fixed_income",
        "total_contributions": money(total_contributions),
        "estimated_gross_value": money(gross_value),
        "estimated_net_value": None,
        "estimated_growth": money(gross_value - total_contributions),
        "assumptions": [f"{compounding_frequency.capitalize()} compounding at {rate}% per year."],
        "warnings": warnings,
    }


# ---- C. Treasury bill ------------------------------------------------------

def simulate_tbill(*, amount, tenor_days, annualized_rate, start_date: date | None = None):
    amount_f = float(amount)
    rate = float(annualized_rate)
    interest = amount_f * (rate / 100.0) * (tenor_days / 364.0)
    maturity_value = amount_f + interest
    maturity_date = (start_date + timedelta(days=tenor_days)).isoformat() if start_date else None
    return {
        "calculator": "treasury_bill",
        "tenor_days": tenor_days,
        "total_contributions": money(amount_f),
        "estimated_interest": money(interest),
        "estimated_maturity_value": money(maturity_value),
        "estimated_gross_value": money(maturity_value),
        "estimated_growth": money(interest),
        "maturity_date": maturity_date,
        "assumptions": [
            f"Simple discount interest over {tenor_days} days at {rate}% annualized (365/364-day convention).",
            "Auction rates vary; this uses your selected/assumed rate.",
        ],
        "warnings": [
            "Estimated, not guaranteed. Verify the current auction rate with CBK/DhowCSD.",
            "If you need cash before maturity, selling on the secondary market may give a different value.",
        ],
    }


# ---- D. Treasury bond ------------------------------------------------------

def simulate_treasury_bond(*, amount, coupon_rate, years_to_maturity, coupon_frequency=2):
    amount_f = float(amount)
    coupon = float(coupon_rate)
    periods = max(1, int(coupon_frequency))
    coupon_per_period = amount_f * (coupon / 100.0) / periods
    total_periods = periods * float(years_to_maturity)
    total_coupons = coupon_per_period * total_periods
    return {
        "calculator": "treasury_bond",
        "estimated_coupon_income_per_year": money(amount_f * coupon / 100.0),
        "estimated_total_coupons": money(total_coupons),
        "maturity_principal": money(amount_f),
        "estimated_gross_value": money(amount_f + total_coupons),
        "estimated_growth": money(total_coupons),
        "total_contributions": money(amount_f),
        "assumptions": [
            f"Coupon {coupon}% per year paid {periods}x/year over {years_to_maturity} years; principal returned at par.",
        ],
        "warnings": [
            "Estimated, not guaranteed.",
            "Interest-rate risk: bond prices move opposite to yields if sold before maturity.",
            "Secondary-market sale value depends on market conditions.",
        ],
    }


# ---- E. SACCO --------------------------------------------------------------

def simulate_sacco(*, monthly_deposit, existing_deposits=0, share_capital=0, expected_dividend_rate=Decimal("6"),
                   loan_multiplier=Decimal("3"), timeline_months=12):
    monthly = float(monthly_deposit)
    existing = float(existing_deposits)
    shares = float(share_capital)
    div_rate = float(expected_dividend_rate)
    estimated_deposits = existing + monthly * max(0, timeline_months)
    estimated_dividend = shares * (div_rate / 100.0) * (max(0, timeline_months) / 12.0)
    possible_loan = estimated_deposits * float(loan_multiplier)
    return {
        "calculator": "sacco",
        "estimated_deposits": money(estimated_deposits),
        "estimated_dividend": money(estimated_dividend),
        "possible_loan_eligibility": money(possible_loan),
        "estimated_gross_value": money(estimated_deposits + estimated_dividend),
        "estimated_growth": money(estimated_dividend),
        "total_contributions": money(estimated_deposits),
        "assumptions": [
            f"Dividend assumed at {expected_dividend_rate}% per year on share capital (editorial assumption).",
            f"Loan eligibility assumed at {loan_multiplier}x deposits (varies by SACCO).",
        ],
        "warnings": [
            "Estimated, not guaranteed. Dividend rates are set by the SACCO each year.",
            "Guarantor risk: guaranteeing loans can put your deposits at risk.",
            "Liquidity: withdrawals may need notice or member exit; share capital is often locked.",
        ],
    }


# ---- F. Special / global fund (Mansa-X, global routes) ---------------------

def simulate_special_fund(*, amount, monthly_topup, timeline_months, expected_return_rate, currency="KES",
                          fx_assumption=None, compounding_frequency="monthly"):
    rate = float(expected_return_rate)
    gross_value, total_contributions = grow(float(amount), float(monthly_topup), timeline_months, rate, compounding_frequency)
    warnings = [
        "Estimated, not guaranteed. Special/alternative funds can be volatile and may lose value.",
        "Verify the latest reported return and strategy directly with the provider.",
    ]
    assumptions = [f"Assumed {rate}% per year with {compounding_frequency} compounding."]
    if currency not in ("KES", "UNKNOWN"):
        warnings.append(f"Currency risk: returns are in {currency}; the KES value can move with the exchange rate.")
    if fx_assumption:
        assumptions.append(f"FX assumption: {fx_assumption}.")
    return {
        "calculator": "special_fund",
        "total_contributions": money(total_contributions),
        "estimated_gross_value": money(gross_value),
        "estimated_net_value": None,
        "estimated_growth": money(gross_value - total_contributions),
        "assumptions": assumptions,
        "warnings": warnings,
    }


# ---- G. Scenario equity / NSE / US ETF route -------------------------------

def simulate_scenario_route(*, amount, monthly_topup, timeline_months, scenario_rate, scenario_label, currency="KES",
                            compounding_frequency="annual"):
    rate = float(scenario_rate)
    gross_value, total_contributions = grow(float(amount), float(monthly_topup), timeline_months, rate, compounding_frequency)
    return {
        "calculator": "scenario_route",
        "total_contributions": money(total_contributions),
        "estimated_gross_value": money(gross_value),
        "estimated_net_value": None,
        "estimated_growth": money(gross_value - total_contributions),
        "assumptions": [
            f"{scenario_label}: {rate}% per year, illustrative only. No live market prices are used.",
            "Equity-style returns are not smooth; real outcomes vary a lot year to year.",
        ],
        "warnings": [
            "Estimated, not guaranteed. This is a scenario for learning, not a forecast.",
            "Live NSE/US prices are not shown here. Trade only via a licensed broker.",
        ],
    }
