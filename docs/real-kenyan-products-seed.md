# Real Kenyan Investment Products Seed

Seeds real Kenyan investment **providers** and **products** so users can search and simulate
specific products instead of only generic ones. Implemented by
`apps/api/catalog/management/commands/seed_real_kenyan_investment_products.py`.

```bash
python manage.py seed_real_kenyan_investment_products --dry-run    # report only, no writes
python manage.py seed_real_kenyan_investment_products --publish    # write + publish complete records
python manage.py seed_real_kenyan_investment_products --publish --overwrite  # refresh existing records
```

## Safety rules (enforced in code)

- **No invented rates.** A `ProductRateSnapshot` is created **only** when a product spec carries
  explicit `rate` data with a `snapshot_date` + source. None of the current specs do, so every
  product shows **"Latest rate unavailable"** and simulations use a custom educational rate.
- **Idempotent.** Without `--overwrite`, existing records are never modified (manual edits are
  preserved); only missing records are created. Re-running creates nothing new.
- **Incomplete products stay draft.** Products without a confirmed source (e.g. Mansa-X Shariah /
  USD) are kept `draft` even with `--publish`.
- No "best"/"recommended" language. No execution, payments, M-Pesa funding, or credentials. NSE live
  prices are **not** ingested — only the listed-company education route.

## Providers seeded (6)

| Provider | Type (regulator_category) | Source confidence |
|----------|---------------------------|-------------------|
| Etica Capital Ltd | Fund Manager (CMA) | provider_reported |
| Stanbic Asset Management (Stanbic Unit Trust Funds) | Fund Manager / Asset Management (CMA) | provider_reported |
| Standard Investment Bank (Mansa-X) | Investment Bank / Special CIS (CMA) | provider_reported |
| Central Bank of Kenya (DhowCSD) | Government securities platform | official |
| Nairobi Securities Exchange | Securities exchange | official (directory only) |
| Central Depository & Settlement Corporation (CDSC) | Central securities depository | official |

Stanbic Asset Management and Standard Investment Bank are **separate** provider records (they are
different institutions; Mansa-X is SIB's product, not Stanbic's).

## Products seeded (23)

- **Etica (8):** Money Market Fund (KES/USD), Fixed Income Fund (KES/USD), Special Shariah Fund
  (KES/USD), Special Wealth Fund (KES), Special Multi Asset Fund (KES).
- **Stanbic (5):** Money Market Fund, Fixed Income Fund (KES/USD), Balanced Fund, Equity Fund.
- **Standard Investment Bank / Mansa-X (3):** Mansa-X Special Fund (KES) — published; Mansa-X Shariah
  Fund (KES) and Mansa-X USD Fund — **draft / needs_review** (no confirmed standalone source).
- **CBK / DhowCSD (6):** 91-Day, 182-Day, 364-Day Treasury Bill; Treasury Bond; Infrastructure Bond;
  DhowCSD Government Securities Route.
- **NSE (1):** NSE Listed Share Route (education only; no live prices).

Each product also gets a matching `ProductPassport`, fee schedule, and liquidity rule where known.

## Source strategy

Every provider and product is linked to a `SourceReference` backed by a `DataSource`:

- Official regulator/government/exchange sources reuse existing `DataSource` slugs
  (`cbk-government-securities`, `nse-listed-companies`, `cdsc-kenya`).
- Provider pages create provider `DataSource` records (`etica-capital-site`,
  `stanbic-asset-management-site`, `standard-investment-bank-site`) with
  `authority_level = provider_self_reported` and `is_active = False`.

## Source confidence rules

| Situation | `source_confidence` |
|-----------|---------------------|
| CBK/DhowCSD government securities | `official` |
| Provider's own public page (Etica, Stanbic, SIB) | `provider_reported` |
| Editorial education route (NSE share route) | `editorial` |
| No confirmed source (draft Mansa-X variants) | `unknown` |

`freshness_status` is `unknown` for any product without a dated rate snapshot — we do not claim
freshness we cannot back with a timestamped source.

## How to add a new provider

Add a `ProviderSpec` to `SEED_PROVIDERS` in the command with a `SourceSpec` (DataSource slug, name,
type, authority level, title, URL, citation label) and a list of `ProductSpec`s. Re-run with
`--publish` (and `--overwrite` if updating an existing provider).

## How to add a new product

Add a `ProductSpec` (or use the `_fund(...)` helper for CIS funds) to the provider's `products`
list. Set `complete=False` if there is no confirmed source — it will stay draft.

## How to update rates

Rates are **not** part of this seed. Import them through the Phase 2.9 product-data pipeline
(`import_product_rates_csv` → review → `publish_approved_product_updates`) or by adding a `rate`
dict (`rate_value`, `rate_type`, `snapshot_date`, `raw_label`, `confidence`) to a `ProductSpec` and
re-running with `--overwrite`. `maybe_create_rate_snapshot()` then creates a dated, source-linked
`ProductRateSnapshot` and marks any prior snapshot `is_current = False`.

## Why some rates are unavailable

PesaRoute will not display a yield it cannot back with a timestamped source snapshot. Provider
yields change frequently and are not redistributable without verification, so products launch with
"Latest rate unavailable" and let the user run an **educational** simulation with their own rate
assumption. This is honest and avoids implying a current or guaranteed return.

## Legal disclaimer wording

> Educational information only. PesaRoute does not hold money, execute investments, act as a broker
> or fund manager, or promise returns. Verify current rates, fees, and licences with the provider or
> regulator before investing.

## Verification (this run)

- Migrations: none required (no model changes).
- `--dry-run`: providers_created=6, products_created=23, no writes.
- `--publish`: 6 providers, 23 products, 23 passports, 0 rate snapshots.
- Re-run: 0 created, 29 skipped (idempotent).
- Tests: `tests/test_real_kenyan_products.py` (12 tests) pass; full backend suite 158 passed.
- API: `/api/products/` returns real names with `rate: unavailable`, `simulate_enabled: true`,
  no `internal_notes`, and no encoding mojibake.

## Remaining generic products

The earlier `seed_pesaroute` generic products (Generic Money Market Fund, Generic Treasury Bill,
Generic Fixed Deposit, Generic NSE Share, Generic US ETF Route, Generic Land Due Diligence, Generic
Bitcoin Route, Generic SACCO Deposits/Share Capital, Generic REIT) remain published as fallback
education routes for categories where no named real product is seeded yet (SACCO, fixed deposit,
US ETF, land, bitcoin). Real named products now rank alongside them; the list is data-driven so the
UI shows real names automatically.
