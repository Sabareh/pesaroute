# PesaRoute Seed Data

## Purpose

`seed_kenya_investment_knowledge` creates a curated starter knowledge base for Kenyan investment education. It is meant to make the MVP useful in private beta without claiming the catalog is complete, current, ranked, or personalised.

The seed is educational only. PesaRoute does not hold money, execute investments, promise returns, request M-Pesa PINs, request bank passwords, request broker credentials, or replace a licensed professional.

## What It Seeds

- Official/public source records and source references.
- Regulators: CMA, CBK, NSE, CDSC, SASRA, RBA, IRA, and KRA.
- Catalog and knowledge product categories.
- Generic product passports for MMFs, Treasury bills, Treasury bonds, SACCOs, chamas, NSE shares, US ETFs, REITs, land due diligence, crypto risk, fixed deposits, and pension products.
- Source-linked official platform/provider placeholders such as DhowCSD, NSE, and CDSC.
- A small source-linked sample of NSE listed companies for testing display and data shape, not a complete live market-data feed.
- Government-security tenor references, not live auction results.
- Learning tracks, lessons, quizzes, flashcards, checklists, glossary entries, route-card records, and scam-red-flag reference records.

## Public Source Strategy

The command stores source URLs and paraphrases educational summaries. It does not aggressively scrape, redistribute restricted market data, or claim live completeness.

Curated source families:

- CMA licensee/market-player register: `https://licensees.cma.or.ke/`
- CBK government securities education/reference pages: `https://www.centralbank.go.ke/securities/`
- DhowCSD portal: `https://dhowcsd.centralbank.go.ke/`
- NSE listed companies and market data services: `https://www.nse.co.ke/listed-companies/`
- SASRA licensed/authorised SACCO list pages: `https://www.sasra.go.ke/licensed-dt-saccos/`
- RBA registered service-provider pages: `https://www.rba.go.ke/registered-fund-managers/`
- IRA entities registry: `https://ira.go.ke/entities-registry/`
- CDSC public website: `https://cdsckenya.com/`
- KRA tax education pages: `https://www.kra.go.ke/`

## Run Commands

From `apps/api`:

```powershell
..\..\.venv\Scripts\python.exe manage.py seed_kenya_investment_knowledge --dry-run
..\..\.venv\Scripts\python.exe manage.py seed_kenya_investment_knowledge
```

Optional safe reset for seed-owned demo records:

```powershell
..\..\.venv\Scripts\python.exe manage.py seed_kenya_investment_knowledge --reset-safe-demo-data
```

## Idempotency

The command is designed to be idempotent. Running it twice should create records on the first run and zero new records on the second run.

It uses stable slugs and source-record keys. Product passports created by the command carry the `seed_kenya_investment_knowledge` marker in `editorial_notes` so seed-owned catalog records can be reset without deleting unrelated manual data.

## Adding New Curated Content

Use this order:

1. Add or verify a `DataSource`.
2. Add a `SourceReference`.
3. Add or update the educational category/passport/lesson.
4. Attach source references where the model supports it.
5. Keep wording educational and avoid recommendations.
6. Run the seed command twice and confirm the second run creates zero new records.
7. Add a test if the new content category matters to app behavior.

## Wording Rules

Use:

- "Educational information only."
- "Compare before committing money."
- "Verify with provider/regulator."
- "Speak to a licensed professional where needed."
- "Use ranges if you do not want to enter exact amounts."

Avoid:

- "Best investment."
- "Recommended allocation."
- "Guaranteed return."
- "Risk-free."
- "Trade now."
- "Invest here."

## Future Live Pipelines

Future ingestion should be separate from this seed command:

- Respect robots.txt and website terms.
- Prefer official APIs, downloads, or manual admin review.
- Store raw snapshots only when legally and operationally appropriate.
- Mark parsed records as `needs_review` before publishing.
- Do not expose paid/restricted market data unless licensed.
