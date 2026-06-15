# Kenya Investment Knowledge Base

PesaRoute uses a structured Kenya Investment Knowledge Base to power learning tracks, product passports, route discovery, simulators, scam checks, provider/professional context, and future scheduled data pipelines.

This is a data architecture foundation only. It does not scrape aggressively, redistribute restricted market data, execute investments, or recommend products.

## Data Architecture

The backend has a `knowledge` app with four layers:

1. Source tracking
   - `DataSource`
   - `DataIngestionRun`
   - `RawDataSnapshot`
   - `SourceRecord`
   - `SourceReference`
   - `DataQualityIssue`

2. Normalized reference data
   - `Regulator`
   - `InvestmentProductCategory`
   - `InvestmentProvider`
   - `RegulatedEntityStatus`
   - `GovernmentSecurityReference`
   - `ListedCompany`
   - `SaccoEntity`

3. Catalog integration
   - Existing `Provider` and `ProductPassport` records can now link to `SourceReference`.
   - Existing catalog records now carry `last_verified_at`, `data_freshness`, `verification_status`, regulator fields, public source URL, and internal editorial notes.

4. API surfaces
   - Internal/admin APIs for sources, ingestion runs, records, and data-quality issues.
   - Public read-only APIs for regulators, product categories, providers, listed companies, SACCOs, government securities, and source citations.

## Source Hierarchy

Authority levels:

- `official`: regulator, exchange, or government source.
- `provider_self_reported`: provider website, product page, brochure, or public disclosure.
- `editorial`: internal PesaRoute notes and manual review.
- `third_party`: sources that are useful but not primary authority.

Public UX should prefer official sources where available and label provider/editorial content clearly.

## Supported Source Categories

Current architecture supports:

- CMA: licensees, fund managers, approved CIS, advisers, stockbrokers, REIT managers, intermediaries.
- CBK: treasury bills/bonds, DhowCSD references, auction schedules, auction results.
- NSE: listed companies, security categories, official market data service references.
- SASRA: deposit-taking and non-withdrawable deposit-taking SACCO status.
- RBA: fund managers, custodians, pension service providers, education references.
- IRA: insurers, brokers, intermediaries, retirement/insurance-adjacent education references.
- Manual curated sources: provider websites, public PDFs, circulars, educational pages, editorial notes.

## Freshness Labels

Catalog providers and product passports use:

- `fresh`: recently checked and no known issue.
- `acceptable`: usable, but not newly checked.
- `stale`: needs review before being shown as current.
- `unknown`: not verified yet.

Public copy should say:

- “Last verified”
- “Source”
- “Educational information only”
- “Verify with the provider/regulator before committing money”

Avoid:

- “best provider”
- “guaranteed return”
- “recommended investment”
- “safe investment”
- “approved by us”

## Review Workflow

1. Create or update a `DataSource`.
2. Run a manual or scheduled ingestion later.
3. Store raw snapshots only when terms and storage policy allow it.
4. Upsert `SourceRecord` rows by `source + source_record_key`.
5. Normalize into domain models.
6. Attach `SourceReference` records to product categories, providers, product passports, or learning references.
7. Mark records `needs_review` when confidence is not sufficient.
8. Publish only after source and editorial checks are complete.

## Data Quality Workflow

Use `DataQualityIssue` for:

- missing fields
- invalid formats
- duplicates
- stale records
- conflicting sources
- parse failures
- permission warnings
- other review notes

Issues can be resolved through:

`POST /api/admin/data-quality-issues/{id}/resolve/`

## What Not To Scrape

Do not scrape or redistribute:

- NSE real-time or delayed market prices without explicit permission.
- Licensed market data feeds without a commercial data agreement.
- Pages whose terms prohibit automated collection.
- Provider portals that require authentication.
- User financial accounts, bank pages, broker pages, MMF portals, M-Pesa statements, or private documents.

For NSE data, store only official references and metadata unless permissions are explicitly handled.

## Regulatory Disclaimers

The knowledge base is educational infrastructure. PesaRoute does not:

- hold user investment money
- execute investments
- act as a broker
- act as a fund manager
- ask for M-Pesa PINs
- ask for bank passwords
- ask for broker credentials
- promise returns
- give unlicensed investment advice

Users should verify information with the provider or regulator before committing money and speak to a licensed professional when needed.
