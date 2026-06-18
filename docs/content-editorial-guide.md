# PesaRoute Content Editorial Guide

PesaRoute learning content is Kenya-first financial literacy. It helps users understand routes, risks, documents, liquidity, and questions to ask before money moves.

It is not investment advice, provider ranking, execution guidance, tax advice, legal advice, or a promise of returns.

## Editorial Rules

- Use concrete Kenyan examples with KES ranges, real timelines, and everyday scenarios.
- Explain the route before the product: who regulates it, who provides it, what documents matter, what can delay access, and what can go wrong.
- Use plain English with Swahili-friendly phrasing where it helps comprehension.
- Keep lessons short enough for mobile reading.
- Include a mistake to avoid, an action step, and an education-only disclaimer.
- Use ranges or hidden amounts where exact money values are not necessary.
- Tell users to verify current details with official sources, providers, or licensed professionals.

## Source Requirements

Every published lesson should have at least one of:

- An official public source reference, such as CBK, CMA, SASRA, KRA, NSE, CDSC, Ardhisasa, or another regulator/government source.
- A reviewed PesaRoute editorial label for operational literacy content such as budgeting, journaling, or privacy boundaries.

Do not cite social media, marketing pages, or provider sales copy as the primary source for safety-critical claims.

Official-source snapshots should record retrieval dates and review dates in the backend. If a public source changes, import a new content revision and mark the old copy for review before publishing.

## Banned Language

Avoid wording that sounds like personalized advice, hype, or execution:

- "best investment"
- "recommended allocation"
- "risk-free"
- "buy now"
- "invest here now"
- "guaranteed return"
- "beat the market"
- "trade now"
- "profit from predictions"

You may use phrases like "guaranteed returns are a red flag" when teaching scam defense.

## Content Pack Format

Curated pack files live in:

```text
content/kenya_investment_lessons/
```

Each track file should include:

- `track`
- `course`
- `lessons`
- `quiz_questions`
- `flashcards`
- optional `resources`
- optional `glossary`

Each lesson needs:

- title
- summary
- estimated minutes
- XP reward
- introduction
- 3 to 6 teaching sections
- Kenyan scenario
- mistake to avoid
- action step
- key takeaway
- source note
- sources

## Import Workflow

Validate without writing:

```powershell
cd apps\api
..\..\.venv\Scripts\python.exe manage.py import_learning_content_pack --path content\kenya_investment_lessons --dry-run
```

Publish reviewed content:

```powershell
cd apps\api
..\..\.venv\Scripts\python.exe manage.py import_learning_content_pack --path content\kenya_investment_lessons --publish
```

Overwrite manual edits only after review:

```powershell
cd apps\api
..\..\.venv\Scripts\python.exe manage.py import_learning_content_pack --path content\kenya_investment_lessons --publish --overwrite
```

## Review Checklist

- Lesson does not contain placeholder copy.
- Lesson avoids advice, hype, and provider ranking.
- Lesson has source references or reviewed editorial label.
- Official facts have a review/freshness date.
- The user can understand the next safe learning action.
- The disclaimer is present.
- Mobile reading length is reasonable.

## Privacy And Safety Boundaries

- Do not ask users for M-Pesa PINs, bank passwords, broker credentials, MMF credentials, seed phrases, private keys, or one-time passwords.
- Do not tell users to send money through PesaRoute.
- Do not present simulations as predictions.
- Do not expose journal text, exact amounts, or portfolio values in public/professional views without explicit scoped consent.
