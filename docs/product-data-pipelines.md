# PesaRoute Product Data Pipelines

This document describes the safe, auditable data pipeline for importing and publishing investment product facts and rates.

---

## Data Source Hierarchy

All data must be attributed to a source with an explicit confidence level. Sources are ranked:

1. **Official** — regulator / government / exchange (CBK, CMA, SASRA, NSE, RBA, IRA)
2. **Provider-reported** — provider's own public page, factsheet, or calculator
3. **Third-party** — licensed data provider with permission
4. **Editorial** — manual admin entry with source reference URL
5. **Community/user-submitted** — not implemented; would be `unverified_draft` only

The system enforces this via `DataSource.authority_level` and `InvestmentProduct.source_confidence`.

---

## Connector Design

### BaseSourceConnector (`pipelines/base.py`)
General-purpose pipeline connector. Fetches a URL, stores a `RawDataSnapshot`, parses it into `PipelineRecord` objects, and stages them as `SourceRecord` rows for admin review.

### ProductDataConnector (`pipelines/product_connector.py`)
Specialized connector for product rate data. Extends `BaseSourceConnector` with:
- `stage()` — creates `StagedProductUpdate` records
- `publish()` — delegates to `planning.product_pipeline_services.publish_staged_product_update()`
- `run(dry_run=True)` — defaults to dry-run for safety

All product connectors are **inactive by default** (`DataSource.is_active=False`). Activate only after verifying the source, parser, and review workflow.

### Official Source Connectors (`pipelines/connectors/official_sources.py`)
| Slug | Source | Type | Notes |
|------|--------|------|-------|
| `cbk-treasury-bills` | CBK | Snapshot | Weekly. Parse auction results only via manual CSV. |
| `cbk-treasury-bonds` | CBK | Snapshot | Monthly. Bond coupon/yield requires review. |
| `cma-approved-cis` | CMA | License page | Monthly. Fund manager/CIS status only. |
| `cma-fund-managers` | CMA | License page | Monthly. Inactive by default. |
| `cma-investment-advisers` | CMA | License page | Monthly. Inactive by default. |
| `cma-stockbrokers` | CMA | License page | Monthly. Inactive by default. |
| `nse-listed-companies` | NSE | Directory | Weekly. No price data. Permission required for market data. |
| `sasra-regulated-saccos` | SASRA | PDF/CSV | Quarterly. No rate data. License status only. |
| `rba-registered-service-providers` | RBA | PDF | Monthly. Inactive by default. |
| `ira-licensed-entities` | IRA | Manual | Monthly. Inactive by default. |

### Provider Page Connector Stubs (`pipelines/connectors/provider_stubs.py`)
| Slug | Purpose |
|------|---------|
| `provider-page-html` | HTML page with explicit CSS selectors (not configured) |
| `provider-pdf-factsheet` | PDF factsheet (parser_confidence=low always) |
| `provider-calculator-page` | Calculator page (structure may change anytime) |

These stubs are always inactive. To activate: configure selectors for a specific provider, set `DataSource.is_active=True`, and verify the review workflow.

---

## CSV Import Format

### Product Rates CSV (`import_product_rates_csv`)

Used for editorial rate imports. This is the safest ingestion path.

**Required columns:**
| Column | Description | Example |
|--------|-------------|---------|
| `provider_name` | Provider name | `CIC Asset Management` |
| `product_name` | Product name | `CIC Money Market Fund` |
| `product_type` | Django choice value | `money_market_fund` |
| `rate_value` | Numeric rate | `11.85` |
| `snapshot_date` | ISO date | `2026-01-15` |

**Optional columns:**
| Column | Description | Default |
|--------|-------------|---------|
| `currency` | Currency code | `KES` |
| `rate_type` | Rate type | `annual_yield` |
| `rate_period` | Period | `annual` |
| `minimum_amount` | Min investment | empty |
| `withdrawal_timeline` | Withdrawal info | empty |
| `fees_summary` | Fee notes | empty |
| `source_url` | Source page URL | source data_url |
| `source_label` | Citation label | empty |
| `confidence` | Confidence level | source authority_level |
| `notes` | Free-form notes | empty |

**Valid `product_type` values:**
`money_market_fund`, `fixed_income_fund`, `balanced_fund`, `equity_fund`, `treasury_bill`, `treasury_bond`, `infrastructure_bond`, `sacco_deposit`, `sacco_share_capital`, `fixed_deposit`, `nse_equity`, `reit`, `global_stock_route`, `global_etf_route`, `pension_product`, `other`

**Valid `rate_type` values:**
`effective_annual_yield`, `annual_yield`, `gross_yield`, `net_yield`, `t_bill_average_rate`, `t_bill_weighted_average_rate`, `bond_coupon`, `bond_yield`, `dividend_yield`, `fixed_deposit_rate`, `estimated_return`, `unknown`

---

## Management Commands

```bash
# Dry-run CSV import (validates, no DB writes)
python manage.py import_product_rates_csv \
    --source editorial-product-rates \
    --file path/to/rates.csv \
    --dry-run

# Import CSV (creates StagedProductUpdate records for review)
python manage.py import_product_rates_csv \
    --source editorial-product-rates \
    --file path/to/rates.csv

# Import and auto-approve (only for trusted internal curated CSV)
python manage.py import_product_rates_csv \
    --source editorial-product-rates \
    --file path/to/rates.csv \
    --auto-approve

# Approve a specific staged update
python manage.py approve_staged_product_update --id 42

# Publish all approved staged updates
python manage.py publish_approved_product_updates

# Publish approved updates for one source
python manage.py publish_approved_product_updates --source editorial-product-rates

# Dry-run publish (see what would be published)
python manage.py publish_approved_product_updates --dry-run

# Refresh product freshness status
python manage.py refresh_product_freshness

# Run official source pipeline (dry-run by default)
python manage.py run_product_data_pipeline --source cbk-treasury-bills --dry-run

# Run all active product pipelines
python manage.py run_product_data_pipeline --all-active --dry-run
```

---

## Admin Review Workflow

1. A curator imports a rates CSV or a connector runs.
2. `StagedProductUpdate` records are created with `review_status=needs_review`.
3. Admin reviews in Django admin > Planning > Staged Product Updates.
4. Admin uses the "Approve" or "Reject" bulk actions, or reviews each update individually.
5. Admin runs the "Publish approved staged product updates" action, or uses the management command.
6. Publishing creates/updates `InvestmentProduct` and a new `ProductRateSnapshot` (`is_current=True`).
7. Previous snapshots for the same product/rate_type/currency are marked `is_current=False`.
8. `DataChangeEvent` is created for the audit trail.

---

## Freshness Rules

Freshness is computed by `planning.product_pipeline_services.refresh_product_freshness()` based on the age of the latest `ProductRateSnapshot.snapshot_date`.

| Product Type | Stale After | Acceptable Until |
|-------------|-------------|-----------------|
| MMF / fund yields | 7 days | 14 days |
| Fixed income / balanced / equity fund | 14 days | 28 days |
| T-bill auction rate | 14 days | 28 days |
| T-bond / infrastructure bond | 30 days | 60 days |
| NSE equity / REIT | 30 days | 60 days |
| Fixed deposit | 30 days | 60 days |
| SACCO deposit / share capital | 90 days | 180 days |
| Global ETF / stock / pension | 90 days | 180 days |
| Generic / other | 180 days | 360 days |

If no snapshot exists, `freshness_status=unknown`.

---

## Source Confidence Rules

| Situation | Confidence |
|-----------|-----------|
| Official source (CBK, CMA, SASRA, NSE) + successful parse | `official` |
| Provider public page + successful parse | `provider_reported` |
| CSV import by internal admin with source URL | `editorial` or `provider_reported` depending on the source |
| Licensed third-party aggregator with permission | `third_party` |
| Old snapshot | `stale` (freshness, not confidence) |
| Parser confidence below threshold | `requires_review=True` |

---

## NSE Market Price Data Caution

**Do not ingest NSE market prices (share prices, bids, asks, volume, turnover) without a data license.**

The `import_source_csv` utility automatically strips these fields from NSE-sourced CSV rows and creates a `DataQualityIssue` warning. The connector only imports the company directory (name, symbol, ISIN, sector).

To use live NSE market price data commercially, you must obtain a data license from the NSE.

---

## Provider Page Caution

Provider HTML pages and PDF factsheets may:
- Change structure without notice
- Contain errors or outdated figures
- Not reflect current rates (factsheets lag weeks or months)

Provider page connectors are always inactive stubs. Before activating:
1. Verify the page is publicly accessible (not behind login)
2. Verify the terms of use allow scraping
3. Configure explicit CSS selectors per provider
4. Test with dry-run and inspect staged updates before publishing
5. Set `requires_review=True` for all provider page data

---

## Production Scheduling Checklist

Before scheduling a connector in production:

- [ ] Source is verified and listed in `CONNECTOR_CLASSES`
- [ ] `DataSource.is_active=True` for the source
- [ ] `DataSource.data_url` is correct and publicly accessible
- [ ] `DataSource.terms_url` has been reviewed (no scraping prohibition)
- [ ] Dry-run has been tested and staged updates reviewed
- [ ] Admin review workflow is in place (someone will approve before publishing)
- [ ] `refresh_product_freshness` is scheduled after publication
- [ ] `DataQualityIssue` alerts are monitored

Do NOT schedule auto-approve for any provider-page or PDF connector.

---

## How to Add a New Provider Connector

1. Create a new class in `pipelines/connectors/` that extends `ProductDataConnector`.
2. Set `source_slug`, `source_defaults` (with `is_active=False`).
3. Implement `parse()` to return `list[NormalizedProductData]`.
4. Register in `CONNECTOR_CLASSES` in `pipelines/registry.py`.
5. Test with `run(dry_run=True)` and inspect the `DataIngestionRun`.
6. After confirming parsed output, set `is_active=True` in admin.

---

## How to Disable a Connector

1. Set `DataSource.is_active=False` in Django admin.
2. The `run_product_data_pipeline --all-active` command skips inactive sources.
3. Individual `--source slug` runs still work but require the source to be active unless using dry-run.

---

## What Is Safe for Production Now

| Feature | Status | Notes |
|---------|--------|-------|
| Editorial CSV import | ✅ Production-safe | Used for trusted internal curated rates |
| Admin review workflow | ✅ Production-safe | Approve/reject/publish via admin |
| `refresh_product_freshness` | ✅ Production-safe | Read-only; safe to schedule daily |
| `publish_approved_product_updates` | ✅ Production-safe | Only publishes admin-approved records |
| Official CBK/CMA/SASRA/NSE snapshots | ✅ Dry-run safe | Fetch + snapshot only; manual review before publishing |
| Provider HTML/PDF/calculator stubs | ⚠️ Inactive stubs | Requires configuration + terms review before activating |
| Auto-approve for provider-page data | ❌ Not recommended | Always require admin review for provider data |
| NSE market price data | ❌ Restricted | Requires a data license from NSE |
