# Simulator User Experience (Investopedia-inspired, PesaRoute-adapted)

The PesaRoute simulator lets users research real Kenyan products, run provider-specific
**educational estimates**, compare them, and build a **what-if** portfolio — borrowing useful
mechanics from research/simulator tools while staying an education product.

## Mechanics borrowed (and adapted)

| Generic mechanic | PesaRoute adaptation |
|------------------|----------------------|
| Onboarding tour | First-run modal: "Practise before using real money", source/freshness, journal, professional review. |
| Research / search | Product search + screener over real Kenyan providers/products. |
| Screener filters | Provider, type, currency, risk, liquidity, minimum amount, latest-rate, freshness, source confidence. |
| Watchlist / compare | Select 2–5 products → side-by-side comparison ("compare assumptions", no winner). |
| Virtual cash portfolio | **What-if portfolio**: allocate *virtual* money across products, run an estimated outcome. |
| Simulation history | Each run is persisted (`ProductSimulationRun`) and can be saved to the journal. |
| Learning near simulation | "Related learning" links from results to `/learn`. |

## What we intentionally did NOT copy

- No branding, assets, advertising, or trading UI. No "buy/sell", "trade", "orders", or "win".
- No real money, no execution, no brokerage, no live order book.
- No leaderboards or ranking by returns. No "best"/"recommended"/"winner" language.
- Virtual portfolio is always labelled "a learning portfolio, not real money".

## Product search flow

`/simulate` (web) and the Simulate tab (mobile) load published products from `GET /api/products/`.
Filters map to query params (`product_type`, `risk_level`, `liquidity_level`, `currency`,
`freshness_status`, `source_confidence`, `has_current_rate`, `provider`, `minimum_amount_lte`,
`search`). Real provider products are shown **first**; generic educational routes sort last so they
never dominate. Cards show provider, type, currency, latest rate (or "Latest rate unavailable — use
a custom educational rate"), rate date, source confidence, freshness, minimum, risk/liquidity badges,
and Simulate / Compare CTAs.

## Provider-specific simulation flow

`/simulate/products/{slug}` → product detail (summary, latest rate + source, minimum, fees/withdrawal,
risk/liquidity, sources, last verified) + the simulation panel:

- Inputs: initial amount, monthly top-up, timeline, **rate mode** (latest available / conservative /
  neutral / optimistic / custom educational), include-fees & estimate-tax toggles, goal.
- Calls `POST /api/simulations/product-specific/`.
- Result: estimated value (not guaranteed), total contributions, estimated growth, net-after-fees/tax,
  rate used + source label + freshness + snapshot date + source link, assumptions, fee/tax/liquidity/
  risk notes, beginner mistakes, questions to ask, warnings, disclaimer.
- Post-result actions: **Save to journal**, **Request professional review** (both via run-id
  endpoints, both default to an amount **range**), **Add to a what-if portfolio**, **Compare another**,
  **Related learning**.

Verified live: Etica MMF (no live rate) with the neutral scenario → KES 55,258 estimated value,
KES 5,258 estimated growth at 10%, labelled "Neutral scenario (educational assumption, not a live
rate)".

## Comparison flow

`POST /api/simulations/compare-products/` (2–5 products) returns rows (product, provider, rate used,
estimated value/growth, risk, liquidity, source/freshness, warnings) and a fixed note: *"Compare
assumptions side by side. PesaRoute does not rank or score options for you."* No winner is shown.

## Virtual (what-if) portfolio flow

`/simulate/virtual-portfolio` (web): sign in → create a portfolio (virtual cash, goal) → add products
with an allocation + rate mode + timeline → **run** → estimated portfolio value, contributions, and
growth, with per-product rows. Backed by `virtual-portfolios/`, `/positions/`, `/run/`. Every screen
states it is "a learning portfolio, not real money".

## Journal & professional review integration

- **Save to journal** (`POST /api/simulations/{run_id}/save-to-journal/`): private entry titled for
  the product, amount stored as a **range** (never exact), reason captures product, provider, rate
  mode, source date, freshness, and reflection prompts.
- **Request review** (`POST /api/simulations/{run_id}/request-professional-review/`): consultation
  with category mapped from product type, amount **range** by default (exact amount not shared),
  question carrying product/provider/source/freshness context.

## No-advice wording rules

- "Estimated growth" / "educational estimate", never "profit" without "estimated, not guaranteed".
- Banned: "best", "winner", "recommended", "guaranteed returns", "risk-free", "start trading", "buy".
- Every result and comparison carries the educational disclaimer.

## Missing / stale data behaviour

- **Missing rate:** the latest-rate mode is disabled with "Latest rate unavailable — use a custom
  educational rate"; the user picks a scenario or custom rate. No fabricated value is shown, and the
  card still feels helpful (verify-rate, learn-this-product links).
- **Stale rate:** still usable, but a visible "data may be stale / verify before committing money"
  warning appears.
- **Confidence:** official / provider-reported / editorial labels are shown on the source panel.

## Encoding

The earlier `Â·`/`â€¢`/`â€"`/curly-quote mojibake in the mobile screens was repaired to proper
`·`/`•` and ASCII dashes/quotes; the web uses Unicode `·`/`•`/`—` correctly. Verified clean.

## Screens changed (this phase)

- **Web:** `app/simulate/layout.tsx` (AuthProvider), `app/simulate/[productSlug]/SimulationForm.tsx`
  (rewired to `/product-specific/` with 5 rate modes, fee/tax toggles, rich results, save/review
  actions), `app/simulate/virtual-portfolio/page.tsx` (new), `app/simulate/SimulateIntro.tsx` (new
  first-run modal + portfolio CTA), `app/simulate/SimulateBrowser.tsx` (real-first ordering),
  `app/lib/api.ts` (product-specific, compare-products, virtual-portfolio, save-to-journal,
  request-review clients).
- **Mobile:** `src/screens/ProductSimulationScreen.tsx` rewired to `/product-specific/` (5 rate modes,
  fee/tax toggles, rich result panel: estimated value/growth/net, source label, freshness, snapshot
  date, assumptions, fee/tax/liquidity/risk notes, beginner mistakes, questions, disclaimer), a
  **what-if portfolio** sub-view (create → allocate → run), and a dismissible **onboarding tour** on
  the Simulate home. `src/api/client.ts` + `src/types.ts` carry the engine client methods/types and a
  `ProductSpecificResult` type. Post-result actions: save to journal, add to what-if portfolio,
  compare another, request professional review (range-only), learn this product.

## Remaining data / UX gaps

- **No live rates seeded**, so latest-rate mode is unavailable until snapshots are imported (Phase 2.9
  pipeline). Scenario/custom modes work everywhere.
- **Mobile what-if portfolio requires sign-in** (the virtual endpoints are auth-only) and the Simulate
  tab cannot trigger sign-in directly — it points users to the Profile tab. Wiring an in-place
  sign-in prompt is a small follow-up.
- **Mobile onboarding tour** is in-memory (shows once per app launch); it is not yet persisted via
  AsyncStorage, so it can reappear after a cold start.
- Web `/simulate/products/{slug}` is served by the existing `/simulate/{slug}` route; a literal
  `/products/` path segment was not added (same page, different URL).

## Encoding note (this phase)

Repaired additional mobile mojibake found during live testing: back-arrows (`â†` → `←`) and the
compare checkmark (`âœ“` → `✓`). A full sweep of `apps/mobile/src` now finds **zero** mojibake
sequences, verified on the emulator (real product names + `·` separators render cleanly).
