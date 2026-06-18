# Land Decision Safety (Phase 2.12)

## Strategic differentiation

A competitor (Serrari Group) already does investment comparison and a Kenya real-estate
**price** dashboard. PesaRoute does **not** compete as another land price-comparison site.

> **Positioning:** Serrari-style platforms help users *compare market data*.
> **PesaRoute helps users make a safe, documented, reviewed land decision *before* they send money.**

The wedge is the moment of maximum risk and maximum value: a Kenyan (or diaspora) buyer
about to pay a land deposit asks *"What should I check before I pay?"* PesaRoute turns that
into a concrete due-diligence workflow, a visible-risk read-out, a private decision journal,
and a scoped handoff to a verified professional — without ever claiming a deal is safe.

## What PesaRoute does NOT do

- Does **not** verify land ownership itself (no title verification API, no registry scraping).
- Does **not** replace a lawyer, surveyor, valuer, or the official land registry.
- Does **not** hold money, collect deposits, run escrow, or execute investments.
- Does **not** promise land appreciation or give legal advice.
- Does **not** guarantee a land deal is safe.

Official ownership/search verification happens through the official land registry
(**Ardhisasa / Ministry of Lands**) and a **qualified advocate** — not through PesaRoute.

## Workflow

1. **Document the opportunity** — `LandOpportunity` captures plot, location, seller type,
   price, deposit, title status, intended use, decision stage. Private by default.
2. **Work the checklist** — a 14-item `LandDueDiligenceItem` checklist is auto-attached.
3. **See visible risk** — the risk engine reads the opportunity + checklist (+ optional
   self-reported signals) and returns a visible-risk level, flags, missing critical items,
   and next steps.
4. **Save reasoning to the private journal** — links a `JournalEntry` to the opportunity.
5. **Request a verified professional** — creates a scoped, auto-expiring `DataGrant` and a
   marketplace `ConsultationRequest`; documents stay private unless explicitly shared.
6. **Compare land vs alternatives** — educational comparison against MMF, T-bill, SACCO,
   REIT, fixed deposit, and a global ETF route.

## Checklist (default template)

`land/services.py::DEFAULT_CHECKLIST` — each item has importance and the professional type
that should verify it:

| Item | Importance | Professional |
| --- | --- | --- |
| Have you seen the title or ownership document? | critical | lawyer |
| Has an official land search been done? | critical | lawyer |
| Does the search result match the seller? | critical | lawyer |
| Are there encumbrances, cautions, charges, or caveats? | critical | lawyer |
| Has a qualified advocate reviewed the transaction? | critical | lawyer |
| Has a surveyor confirmed boundaries? | high | surveyor |
| Have you confirmed access road and physical location? | high | surveyor |
| Have you confirmed land use/zoning/planning constraints? | medium | land agent |
| Have you reviewed the sale agreement? | critical | lawyer |
| Are payment milestones clear? | high | lawyer |
| Is the deposit refundable or protected? | high | lawyer |
| Are company seller documents available (company seller)? | high | lawyer |
| Has the chama/group approved in minutes (group purchase)? | medium | none |
| Has a diaspora buyer avoided sending money before verification? | high | lawyer |

## Risk scoring logic

`land/services.py::score_risk` adds points (and a flag) for each visible risk, then maps the
total to a level. It **never** asserts safety.

| Signal | Flag | Severity | Points |
| --- | --- | --- | --- |
| Title not seen | `no_title_seen` | critical | 3 |
| No official search confirmed | `no_search_done` | critical | 3 |
| Deposit in play before search | `deposit_pressure` | high | 2 |
| Pressure to pay quickly | `deposit_pressure` | high | 2 |
| No advocate review | `no_lawyer` | high | 2 |
| Search/seller mismatch | `seller_mismatch` | critical | 3 |
| Boundaries not confirmed | `unclear_boundaries` | warning | 1 |
| Unrealistic appreciation claim | `unrealistic_appreciation_claim` | warning | 1 |
| Company seller, docs unconfirmed | `unclear_company` | high | 2 |
| Critical items outstanding | `missing_documents` | warning | 1 |
| Diaspora relying only on relative/agent | `diaspora_proxy_risk` | high | 2 |
| Chama lacks recorded minutes | `group_pressure` | high | 2 |

Level mapping: `>=6 → very_high`, `>=3 → high`, `>=1 → medium`, `0 → low`. A brand-new
opportunity (nothing verified) intentionally reads **high visible risk** to push verification.

Output always uses: *"This opportunity has &lt;level&gt; visible risk based on the checklist.
Verify with official sources and qualified professionals."* — never "this land is safe."

## Land vs alternatives (educational)

`land/services.py::compare_land_with_alternatives` (POST `/api/land/compare/`, no login).
Inputs: land price, deposit, holding period, appreciation scenario
(conservative/neutral/optimistic/custom), transaction cost, liquidity need. Land uses
educational appreciation assumptions (3% / 6% / 10%); alternatives use per-type scenario
rates. Output includes liquidity/risk/due-diligence comparisons and the fixed warning:
**"Land appreciation is not guaranteed and land is usually illiquid."**

## Professional review handoff & privacy model

Reviewer types (land layer): `land_lawyer`, `surveyor`, `valuer`, `diaspora_land_adviser`,
`chama_land_adviser`. `POST /api/land/opportunities/{id}/request-professional-review/`:

- **Documents private by default** — only document IDs the user explicitly lists are shared
  (their `visibility` flips to `shared_with_professional`); everything else stays private.
- **Exact amount hidden by default** — `share_amount=false` ⇒ `ConsultationRequest`
  `amount_display_mode=hidden`.
- **Access auto-expires** — a `privacy.DataGrant` is created with `expires_at` (default 14
  days). Scopes are minimal: `consultation_context`, plus `selected_documents` only when the
  user shares documents.
- The marketplace `ConsultationRequest` is created with `category=land_literacy`.

Models: `LandOpportunity`, `LandDueDiligenceItem`, `LandDocumentRecord` (private by default),
`LandRiskFlag`, `LandDecisionJournalLink`. All opportunity-scoped APIs enforce object-level
ownership (a user cannot access another user's opportunity → 404).

## APIs

```
GET    /api/land/opportunities/
POST   /api/land/opportunities/
GET    /api/land/opportunities/{id}/
PATCH  /api/land/opportunities/{id}/
POST   /api/land/opportunities/{id}/checklist/
PATCH  /api/land/checklist-items/{id}/
POST   /api/land/opportunities/{id}/risk-score/
POST   /api/land/opportunities/{id}/save-to-journal/
POST   /api/land/opportunities/{id}/request-professional-review/
POST   /api/land/opportunities/{id}/documents/
GET    /api/land/default-checklist/        (public)
POST   /api/land/compare/                  (public)
```

## Screens & pages

- **Mobile:** `LandDecisionSafetyScreen` (secondary tab "Land") — intro, create opportunity,
  due-diligence checklist, risk flags, documents, compare vs alternatives, save to journal,
  request lawyer/surveyor/professional review.
- **Web:** `/land-decision-safety` (hub), `/land/checklist`, `/land/compare`,
  `/land/before-you-pay` (public educational), `/land/opportunities/{id}` (logged-in).

## Legal disclaimers (shown across the module)

- PesaRoute does not verify land ownership.
- PesaRoute does not provide legal advice.
- PesaRoute does not guarantee land safety or appreciation.
- Always verify through official sources (Ardhisasa / Ministry of Lands) and qualified
  professionals before sending money.

## Future chama / diaspora enhancements

- **Chama:** group opportunities with shared (consent-gated) checklists, recorded votes/minutes
  as a first-class artifact, and a `shared_with_chama` document visibility already in the model.
- **Diaspora:** independent-advocate verification flow, proxy-risk education, and an FX/holding
  view in the comparison. The risk engine already flags `diaspora_proxy_risk` and
  `group_pressure` to seed these journeys.
