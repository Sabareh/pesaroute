# Product-Aware Simulation

## Purpose

PesaRoute simulations compare educational routes by product, provider, data freshness, source confidence, fees, and liquidity. They do not execute investments, hold money, recommend products, or promise returns.

## Data Model

- `InvestmentProduct`: simulation-ready product or route. It links to a catalog category, optional provider, product type, currency, risk, liquidity, minimum amount, public source URL, freshness status, and source confidence.
- `ProductRateSnapshot`: dated public or editorial rate/yield record. Only records marked `is_current=true` are used as latest snapshots.
- `ProductFeeSchedule`: current fee assumptions and notes.
- `ProductLiquidityRule`: withdrawal timeline, lock-in, maturity, and early-withdrawal notes.
- `SimulationProfile`: reusable goal/timeline/risk profile for later personalization.
- `ProductSimulationRun`: immutable record of a product-aware simulation request and output.

## Rate Snapshot Logic

`rate_mode=latest_snapshot` uses the latest `ProductRateSnapshot` where `is_current=true`. If none exists, the API returns `rate_source=rate_unavailable`, no estimated outcome, and a warning. PesaRoute does not invent a latest rate.

`rate_mode=user_custom` uses the user-entered `custom_rate` and marks the output as `manual_user_input`.

`rate_mode=conservative` or `optimistic` uses an editorial scenario assumption where configured. It is marked as `scenario`, not latest public data.

## Freshness Logic

Products carry `freshness_status`: `fresh`, `acceptable`, `stale`, or `unknown`. A current rate snapshot older than 90 days also creates a freshness warning. The UI should show freshness beside any rate-driven estimate.

## Fee And Liquidity Assumptions

Fee schedules and liquidity rules are returned with product details and simulation output. They are plain-language checks, not execution terms. Users should verify fees, withdrawal timelines, lock-ins, and maturity dates with providers or official sources.

## Filtering API

```http
GET /api/products/?category=money-market-funds&risk_level=low&liquidity_level=high
GET /api/products/?provider=generic-regulated-provider&has_current_rate=true
GET /api/products/?product_type=treasury_bill&currency=KES&freshness_status=fresh
```

Supported filters include `category`, `provider`, `product_type`, `currency`, `risk_level`, `liquidity_level`, `minimum_amount_lte`, `regulator`, `regulator_category`, `license_status`, `freshness_status`, `source_confidence`, `has_current_rate`, and `search`.

## Detail And Compare APIs

```http
GET /api/products/generic-money-market-fund/
GET /api/products/compare/?product_ids=1,2,3
```

Detail returns the product, provider, category, current rate snapshot if available, latest 10 previous snapshots, current fees, liquidity rules, sources, last verification, and an educational disclaimer.

Compare returns side-by-side risk, liquidity, minimum amount, current rate, fees, freshness, source confidence, documents needed, and questions to ask.

## Simulation APIs

```http
POST /api/simulations/product/
{
  "product_slug": "generic-money-market-fund",
  "input_amount": "10000.00",
  "monthly_topup": "1000.00",
  "timeline_months": 12,
  "rate_mode": "latest_snapshot"
}
```

```http
POST /api/simulations/category-compare/
{
  "amount": "10000.00",
  "monthly_topup": "0.00",
  "timeline_months": 12,
  "category": "money-market-funds",
  "liquidity_need": "high"
}
```

Simulation output includes estimated outcome where a valid rate exists, total contribution, estimated growth, rate used, rate source, freshness warning, fee notes, liquidity warning, risk warning, beginner mistakes, questions to ask, and an educational disclaimer.

## What "Latest Data" Means

Latest data means a stored `ProductRateSnapshot` marked `is_current=true`, created from an approved manual or source-linked workflow. It does not mean PesaRoute scraped live data at request time.

## Source Confidence Rules

- `official`: public regulator, government, exchange, or official source.
- `provider_reported`: provider-published material.
- `editorial`: PesaRoute educational assumption or generic explainer.
- `third_party`: non-official third-party source.
- `unknown`: source confidence is not established.

## Warnings And Disclaimers

Every product simulation should preserve the education-only boundary:

- no money held
- no investment execution
- no promised returns
- no product recommendation
- verify current rates and terms with official/provider sources
- speak to a licensed professional where needed

## Do Not Ingest Without Review

Do not ingest live NSE prices, broker data, bank data, MMF account data, SACCO member data, M-Pesa statements, crypto exchange balances, or user financial account credentials. Any future automated source ingestion must pass through the reviewed snapshot workflow before publishing.
