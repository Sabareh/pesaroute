# Provider-Specific Simulation Engine

Lets a user simulate **estimated growth** for a specific Kenyan product (e.g. "Etica Money Market
Fund", "91-Day Treasury Bill", "Mansa-X Special Fund") and compare products side by side. Everything
is an **educational estimate, not guaranteed** — no rate is ever invented.

- Calculators: `apps/api/planning/simulation_calculators.py` (pure functions).
- Engine (rate resolution, routing, response assembly, comparison): `apps/api/planning/simulation_engine.py`.
- Endpoints: `apps/api/planning/views.py` + `planning/simulation_urls.py`.

## Calculator types

| # | Calculator | Used for | Key formula (educational) |
|---|------------|----------|---------------------------|
| A | `simulate_mmf_fund` | Money market / daily-compounded funds | Monthly contribution loop at an effective monthly rate derived from the chosen compounding frequency; optional management fee subtracted from yield; optional withholding tax applied to **growth only**. |
| B | `simulate_fixed_income` | Fixed income funds / fixed deposits | Same growth loop with lock-in / early-withdrawal warnings. |
| C | `simulate_tbill` | Treasury bills (91/182/364) | `interest = amount × rate% × tenor/364`; maturity value = amount + interest; maturity date if a start date is given. |
| D | `simulate_treasury_bond` | Treasury / infrastructure bonds | `coupon/period = amount × coupon% / frequency`; total coupons over the term; principal returned at par. |
| E | `simulate_sacco` | SACCO deposits / share capital | Estimated deposits + dividend on share capital (editorial rate); indicative loan eligibility = deposits × multiplier. |
| F | `simulate_special_fund` | Mansa-X / special / global routes | Growth loop + currency-risk and source warnings. |
| G | `simulate_scenario_route` | NSE shares, REITs, equity/balanced funds, US ETFs | Scenario rate only (no live prices); assumptions shown explicitly. |

### Compounding

`_effective_monthly_rate(annual%, frequency)`: daily → `(1+r/365)^(365/12)-1`, monthly → `r/12`,
annual → `(1+r)^(1/12)-1`, unknown → monthly (with an assumption note). Monthly contributions are
added at period end.

## Rate modes

`latest_available_rate`, `conservative_scenario`, `neutral_scenario`, `optimistic_scenario`,
`custom_educational_rate`.

Rules (in `resolve_rate`):
- **Latest missing** → mode returns `rate: null`, no fabricated value, and a warning to pick a
  scenario or custom rate. The endpoint reports `estimated_*: null`.
- **Stale** → still usable, but a visible "rate is marked stale / over 90 days old" warning is added.
- **Source confidence labels**: official → "Official source"; provider_reported → "Provider-reported";
  editorial/scenario → "Editorial assumption" / "… scenario (educational assumption, not a live rate)";
  custom → "User custom educational assumption (not verified by PesaRoute)".

## Source & freshness logic

The latest-rate path reads the product's current `ProductRateSnapshot` and surfaces `rate_type`,
`snapshot_date`, `source_url` (from the snapshot's `SourceReference`), `freshness`
(`InvestmentProduct.freshness_status`), and `source_confidence`. Scenario/custom modes mark the
source as editorial/unknown respectively.

## Endpoints

| Method + path | Purpose | Auth |
|---------------|---------|------|
| `POST /api/simulations/product-specific/` | Rich single-product estimate | public |
| `POST /api/simulations/compare-products/` | Compare 2–5 products, **no winner** | public |
| `POST /api/simulations/virtual-portfolios/` · `GET` | Create / list what-if portfolios | auth |
| `GET /api/simulations/virtual-portfolios/{id}/` | Portfolio detail | auth |
| `POST /api/simulations/virtual-portfolios/{id}/positions/` | Add a product allocation | auth |
| `POST /api/simulations/virtual-portfolios/{id}/run/` | Compute an estimated snapshot | auth |
| `POST /api/simulations/{run_id}/save-to-journal/` | Save run privately (amount **range**) | auth |
| `POST /api/simulations/{run_id}/request-professional-review/` | Create consultation (amount **range**) | auth |

`product-specific` response includes: product, provider, category, currency, `rate_used`,
`rate_type`, `rate_mode`, `rate_source`, `rate_source_label`, `source_url`, `snapshot_date`,
`freshness`, `source_confidence`, `total_contributions`, `estimated_gross_value`,
`estimated_net_value`, `estimated_growth` (+ `estimated_interest`/`maturity_value`/`maturity_date`
for T-bills, `estimated_total_coupons` for bonds, `estimated_dividend`/`possible_loan_eligibility`
for SACCO), `fees_notes`, `tax_notes`, `liquidity_notes`, `risk_notes`, `beginner_mistakes`,
`questions_to_ask`, `warnings`, `assumptions`, and the disclaimer.

## Virtual portfolio concept

`VirtualSimulationPortfolio` → `VirtualSimulationPosition` (product + allocation + rate mode) →
`VirtualSimulationSnapshot` (estimated value/contributions/growth). It is an **educational what-if
portfolio** — explicitly *not* real investing, trading, holdings, or orders. There is no buy/sell,
no real money, and users are never ranked by returns. Run output is labelled "Educational what-if
estimate only — not real investing, trading, or returns."

## Warning / disclaimer rules

- Every response carries `ESTIMATE_DISCLAIMER` ("Educational estimate only — not guaranteed …").
- High/very-high risk products add a risk warning. Special/global funds add currency-risk warnings.
  T-bills/bonds add CBK/DhowCSD and secondary-market warnings. SACCO adds guarantor and liquidity
  warnings.
- No "profit" hype, "best", "winner", "recommended", "guaranteed", or "risk-free" wording (guarded
  by tests). Comparison says "Compare assumptions … does not rank or score options for you."
- save-to-journal and request-review default to an **amount range** (±20%), never the exact amount.

## Examples

- **Etica MMF (custom rate):** `product_slug=etica-money-market-fund-kes`, initial 100,000, top-up
  5,000/mo, 12 months, `custom_educational_rate=10`, tax on → gross ≈ 173,355, net ≈ 171,352, growth
  ≈ 13,355, labelled "user custom assumption, not verified".
- **Stanbic MMF (rate unavailable):** `latest_available_rate` with no snapshot → estimated values are
  null + "Latest rate unavailable" warning; switch to a scenario or custom rate to estimate.
- **91-Day Treasury Bill:** `treasury_bill` calculator with tenor 91 → estimated interest + maturity
  value + "verify with CBK/DhowCSD" warning.
- **Mansa-X scenario:** `special_fund` calculator with `neutral_scenario` → growth loop + volatility
  and source warnings (and currency-risk warning for USD).
- **MMF vs T-Bill comparison:** `POST /compare-products/` with both slugs → two rows (rate used,
  estimated value, growth, risk, liquidity, source) and no winner.

## Limitations

- No live rates are seeded yet, so latest-rate mode is unavailable until snapshots are imported via
  the Phase 2.9 product-data pipeline; scenario/custom modes work everywhere.
- Equity/NSE/ETF routes are scenario-only (no live market prices, by design and licensing).
- Tax is a flat ~15% withholding estimate on growth when enabled; it is not tax advice.
- Compounding for contributions uses an effective-monthly approximation, adequate for education.
