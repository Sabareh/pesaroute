# Comprehensive Kenya investment product catalog (Phase 2.11)

A source-linked catalog of Kenyan investment products — CMA-approved collective
investment schemes (CIS), CBK/DhowCSD government securities, and named education
routes (NSE, SACCO, pension, insurance, fixed deposit, global investing, land,
crypto). It powers search, simulations, passports, comparison, and professional
review with freshness and source-confidence labels.

> **Disclaimer (shown everywhere):** Educational information only. PesaRoute does
> not hold money, execute investments, recommend providers, or promise returns.
> Verify details with the provider, regulator, and licensed professionals before
> committing money.

## What this is — and is not

- **Is:** a curated, idempotent, source-referenced list of products with inferred
  type/currency, risk/liquidity labels, and "latest rate unavailable" until a
  source-linked rate snapshot exists.
- **Is not:** a price feed, a broker, a money mover, or a ranking. No rates are
  invented. No restricted NSE prices are ingested. No product is labelled "best".
  Possible duplicates are flagged for human review, never auto-merged.

## Data model

| Model | Purpose |
| --- | --- |
| `catalog.Provider` | Fund manager / bank / exchange / etc. `provider_type`, `source_confidence`, `verification_status`, `published_status`. |
| `planning.InvestmentProduct` | A product/route. Expanded `product_type` choices, `currency`, `tags`, `source_confidence`, `freshness_status`. |
| `planning.ProductCatalogImportBatch` | One import run: counts of providers/products created/updated and flagged-for-review. |
| `planning.StagedInvestmentProduct` | A row that needs human review (ambiguous type or possible duplicate). Never auto-published. |
| `knowledge.DataSource` / `SourceReference` | The official/editorial source each provider and product cites. |

## Fixtures (source of truth)

Located in `apps/api/content/catalog/kenya_products/`:

- `cma_cis_fallback.yaml` — ~60 CMA-approved schemes and their funds. Products are
  listed **by name only**; type and currency are *inferred* (see below). This is the
  canonical fallback verification list for the CMA CIS page.
- `government_securities.yaml` — CBK/DhowCSD T-Bills, T-Bonds, infrastructure bonds.
- `routes_and_education_products.yaml` — NSE/CDSC, SACCO, pension/RBA, insurance/IRA,
  fixed deposit, global (Hisa/Ndovu/IBKR), land, and crypto **education routes**.

### Type inference (from fund name)

First substring match wins (`planning/catalog_import.py::TYPE_RULES`):

`money market → MMF`, `enhanced yield`, `multi asset`, `alternative investment fund/hedge`,
`reit`, `infrastructure/treasury bond`, `treasury bill`, `shariah/sharia/iman/mabruk → shariah`,
`bond`, `fixed income`, `balanced`, `equit* → equity`, `wealth`, `special`, else `other` (low
confidence → flagged for review).

### Currency inference

`USD/Dollar → USD`, `GBP → GBP`, `EUR/Euro → EUR`, otherwise `KES`.

### Duplicate detection (never auto-merge)

Provider resolution reuses an existing provider when the name or a curated alias
(e.g. Britam/British-American, ICEA/ICEA Lion, Standard Investment/Mansa-X,
Stanbic, Genghis/GenCap, GulfCap/GCIB) matches an existing record. Currency variants
of the same fund (KES vs USD) and cross-provider name collisions are flagged as
`StagedInvestmentProduct(review_status=needs_review)` — they are **not** merged.

## Commands

```bash
# Import the whole catalog (idempotent). Dry-run first, then publish.
python manage.py import_kenya_product_catalog --path content/catalog/kenya_products --dry-run
python manage.py import_kenya_product_catalog --path content/catalog/kenya_products --publish

# Refresh just the CMA CIS products from the canonical fixture.
python manage.py refresh_cma_cis_products --dry-run
python manage.py refresh_cma_cis_products --publish-approved
python manage.py refresh_cma_cis_products --live --dry-run   # also try the live CMA connector (stages for review)

# Remove generic placeholder products/passports/providers everywhere.
python manage.py purge_generic_products --dry-run
python manage.py purge_generic_products --apply

# Coverage / freshness / review-backlog report.
python manage.py report_kenya_product_catalog_completeness
```

## Connector

`pipelines/connectors/official_sources.py::CmaApprovedCollectiveInvestmentSchemesConnector`
(slug `cma-approved-collective-investment-schemes`) parses the live CMA CIS page,
extracts plausible fund names, infers type/currency, and **stages** each row for
review. The fallback YAML remains the source of truth; the connector only augments
it and never auto-approves or publishes rates.

## Scheduling (daily, off-peak, in Docker)

Refresh runs on **Celery Beat** in East Africa Time (`CELERY_TIMEZONE=Africa/Nairobi`).
Schedule (`config/settings.py::CELERY_BEAT_SCHEDULE`):

| Task | Time (EAT) | What |
| --- | --- | --- |
| `pipelines.tasks.refresh_kenya_product_catalog` | 02:30 | Re-import all fixtures (publish). |
| `pipelines.tasks.refresh_cma_cis_products` | 03:00 | Re-import CIS fixture (publish). |
| `pipelines.tasks.scan_catalog_freshness` | 04:00 | Re-label product freshness from rate-snapshot age. |

`docker-compose.yml` runs three backend services for this: `api`, `worker`
(executes tasks), and `beat` (the scheduler). Start them with:

```bash
docker compose up -d postgres redis api worker beat
```

All tasks are idempotent and source-linked. They never invent rates; a product
shows "latest rate unavailable" until a source-linked snapshot exists.

### Production alternative: Airflow

For a larger production deployment you can drive the same management commands from
an Airflow DAG (one task per `refresh_*`/`scan_*` command, daily off-peak schedule,
retries + alerting). Celery Beat is used here because it is already part of the
stack, requires no extra infrastructure, and is verifiable in this repo. Airflow is
documented as the scale-out option, not a hard dependency.

## Tests

`apps/api/tests/test_kenya_product_catalog.py` covers: type/currency inference,
≥100 products parsed, expected providers present (Britam/NCBA/CIC/ICEA/Old
Mutual/Etica/Stanbic/Cytonn), Standard Investment ≠ Stanbic, CBK T-Bill + DhowCSD,
NSE/SACCO routes, no invented rates, draft-without-publish, duplicate flagging,
idempotency, disclaimer applied, generic purge, public API hides `internal_notes`,
search by provider/product name, no mojibake, and that the report/commands run.
