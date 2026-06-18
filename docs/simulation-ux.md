# PesaRoute Simulation UX (Mobile + Web)

This document describes the product-aware simulation experience added in Phase 2.9.3 across the
React Native mobile app and the Next.js web app.

---

## Product boundaries (non-negotiable)

PesaRoute does **not**:

- recommend a specific provider
- call any product "best" or pick a "winner"
- guarantee or promise returns
- execute investments or collect investment money
- ask for credentials/PINs
- replace licensed professionals

Every simulation surface repeats an educational disclaimer and uses neutral, comparison-first language
("Compare before committing money"). Gamification stays in the learning module only — never on return
outcomes.

---

## User flows

### Mobile (Simulate tab)

1. **Categories** — the Simulate tab opens to ten top-level category cards (Money Market Funds, Treasury
   Bills, Treasury Bonds, SACCOs, Fixed Deposits, NSE Stocks, US Stocks/ETFs, REITs, Land, Bitcoin/Crypto
   Risk). Each card shows risk level, liquidity level, product/provider counts, whether latest data exists,
   and an educational disclaimer.
2. **Filters** — "All filters" opens the filter screen (category, currency, risk, liquidity, freshness,
   source confidence, provider name, max minimum amount, has-current-rate).
3. **Product list** — server-filtered product cards with rate, snapshot date, freshness, confidence,
   risk/liquidity badges, minimum amount, a **Simulate** button, and a **Compare** checkbox.
4. **Compare** — select 2–4 products → side-by-side comparison via `GET /api/products/compare/`.
5. **Simulate** — amount, monthly top-up, timeline, rate mode (latest / conservative / optimistic /
   custom), goal, liquidity need → `POST /api/simulations/product/`.
6. **Post-simulation actions** — Save to journal, Compare another product, Request professional review,
   Learn this product (passports). View sources is surfaced inline.

A **Generic educational simulator** button still opens the legacy MMF/T-bill/SACCO/global calculators
(also used by the learning module for lesson-linked practice).

### Web

- `/simulate` — public page: filter sidebar + product grid + client-side 2–4 compare table.
- `/simulate/[productSlug]` — SEO-friendly product page: source, last verified, freshness, confidence,
  sources list, educational disclaimer, and an inline simulation form with results.
- A "Simulate this product" CTA appears on each product card and the nav/home page link to `/simulate`.

---

## Filter logic

Filters map directly to `GET /api/products/` query params:

| UI filter | API param |
|-----------|-----------|
| Category | `product_type` (and `category` slug from category cards) |
| Provider/company | `provider` |
| Currency | `currency` |
| Risk level | `risk_level` |
| Liquidity level | `liquidity_level` |
| Minimum amount | `minimum_amount_lte` |
| Freshness | `freshness_status` (fresh / acceptable / stale / unknown) |
| Source confidence | `source_confidence` (official / provider_reported / editorial / third_party / unknown) |
| Has current rate | `has_current_rate` |

`buildProductQuery()` (mobile) and the `buildQuery()` helper (web) drop empty/false values so blank params
are never sent. The mobile screen falls back to client-side filtering of the already-loaded catalogue if
the filtered API call fails.

---

## Product card fields

- product name
- provider
- category / type
- current rate (if available) + snapshot date
- freshness label (Fresh data / Acceptable age / Data may be stale / Freshness unknown)
- source confidence (Official source / Provider reported / Editorial entry / Third-party data / Source unconfirmed)
- risk badge
- liquidity badge
- minimum amount
- **Simulate** button
- **Compare** checkbox

If the rate is unavailable: the card shows "Latest rate unavailable — simulate with a custom educational
rate." If stale: the card shows "Data may be stale" plus the last-verified date when known.

---

## Compare behavior

- 2–4 products only (`canCompare`, `toggleCompareSelection` caps selection at 4).
- Mobile uses `GET /api/products/compare/`; web builds the table from already-fetched list data.
- Columns: provider, rate used, rate source, freshness, risk, liquidity, minimum amount (mobile compare
  also shows fee notes and questions to ask when present).
- Language: "Compare before committing money." Never "best", "winner", or "recommended".

---

## Simulation result wording

The result is rendered straight from the `POST /api/simulations/product/` response:

- **Estimated value**, total contribution, estimated growth, rate used.
- **Source & freshness** block: `rateSourceNote()` describes where the rate came from, plus freshness,
  confidence, and rate-mode badges.
- **What to watch** (warnings), fee notes, withdrawal & liquidity notes, beginner mistakes, questions to
  ask the provider/professional.
- The server `disclaimer` string is always shown.

Rate-mode rules:

- **Latest snapshot** → shows source + snapshot date.
- **Custom rate** → labelled "User custom educational assumption. Not verified by PesaRoute."
- **Conservative / optimistic** → labelled as an educational assumption, not a live rate.
- **No rate** → never fabricates a number; prompts the user to choose a scenario or custom rate.

---

## Stale data behavior

Stale and missing data are **never hidden**:

- Stale products still appear in lists and category counts; they get a visible "Data may be stale" warning
  and the last-verified date.
- Missing rates show "Latest rate unavailable" and offer a custom educational rate instead of a fake number.
- The simulation result repeats the freshness/source badges so the user always sees how trustworthy the
  underlying data is.

---

## No-advice language rules

- Allowed: "compare", "educational estimate", "verify with the provider", "what to watch".
- Banned: "best", "winner", "recommended", "guaranteed", "risk-free", "you should invest".
- Backend test `test_product_simulation_output_avoids_advice_language` guards the API output.
- All currency outputs are framed as estimates; growth is "estimated growth", not "profit".

---

## Professional review handoff

From a product simulation, "Request professional review":

1. Maps the product type to a consultation category (`consultationCategoryForProductType`).
2. Pre-fills an **amount range** (±20% of the entered amount, rounded to KES thousands) — exact amount is
   **never** shared by default.
3. Pre-fills a question that includes the product, provider, and a source/freshness note.
4. Navigates to the Professionals screen with the request form open. Exact-value sharing stays OFF;
   amount sharing stays range-only; scoped data grants and auto-expiry are unchanged.

The web "Request professional review" link points to the professional dashboard for the consultation flow.

---

## API integration

| Purpose | Endpoint |
|---------|----------|
| Product list + filters | `GET /api/products/` |
| Product detail | `GET /api/products/{slug}/` |
| Compare | `GET /api/products/compare/?product_ids=1,2,3` |
| Product simulation | `POST /api/simulations/product/` |
| Category compare | `POST /api/simulations/category-compare/` |

Graceful fallbacks:

- If the product list API fails on mobile, the screen filters the cached catalogue and offers the generic
  simulator.
- If the product API fails on web, `/simulate` shows a clear "live product data unavailable" card and links
  to product passports — no fake data.
- If the latest rate is missing, both apps allow a custom educational rate.
- If data is stale, both apps show a visible warning rather than hiding the product.

---

## Testing

- **Mobile logic** (`apps/mobile/tests/products.test.ts`, run via `npm run test:logic`): query building,
  filter counting, 2–4 compare rules, freshness/confidence labels, "no fake rate" wording, category
  summaries, and review-category mapping.
- **Mobile types** (`npm run typecheck`).
- **Web** (`npm run typecheck`, `npm run lint`, `npm run build`).
- **Backend** (`pytest`): product filters, compare endpoint, simulation output includes freshness/source,
  no internal notes exposed, stale warnings, missing-rate handling, custom-rate labelling.

---

## Known limitations

- Web compare builds its table from list data (rate, freshness, risk, liquidity, minimum); it does not call
  the compare endpoint for fee notes. Mobile compare uses the compare endpoint.
- Web "Save to journal" / "Request review" are link handoffs (journal + consultation creation require an
  authenticated session that the public web pages do not yet manage); the mobile app performs the full
  journal save and review prefill in-session.
- Category cards use educational default risk/liquidity generalisations until live products exist for that
  category; live product data always overrides them in the list and detail views.
- There is no automated React render test harness in the mobile app (only `tsx --test` logic tests), so UI
  rendering is verified via typecheck + manual review rather than component tests.
