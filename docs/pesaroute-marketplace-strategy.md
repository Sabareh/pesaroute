# PesaRoute Marketplace strategy (Phase 2.13)

## Competitor mechanics borrowed

From reviewing Serrari Group's marketplace, we borrowed the *mechanics* that genuinely help users:

- Broad Kenyan product coverage, search and filtering, category facets.
- Sort by yield / minimum / freshness / recency.
- Product cards, compare actions, product detail pages.
- Source / freshness / confidence labelling.
- A lightweight market-intelligence surface.
- Calm, clearly-labelled upgrade/CTA prompts.

## What we intentionally did NOT copy

- No purple-heavy, dark, cluttered UI - PesaRoute uses the clean MaliPrime / DataCamp-style
  dashboard (clean cards, serious fintech tone, mobile-first).
- No "best product", "winner", or "top product" language; no hidden paid rankings.
- No aggressive ads, no huge subscription sidebars, no market-ticker overload, no trading/casino visuals.
- No hype claims or promised returns.

## Positioning

> Serrari = market intelligence and product comparison.
> **PesaRoute = guided learning, simulation, journaling, and professional-reviewed decisions.**

The marketplace is a **decision layer**: Search -> Filter -> Compare -> Simulate -> Learn ->
Save to journal -> Request professional review.

## Architecture

Backend (`apps/api/marketplace/`):
- `product_services.py` - finder, MMF finder, net-after-tax, SACCO score, quick scenarios, personal brief, intelligence, goal/user-type fit.
- `product_serializers.py` - card + detail + watchlist serializers (internal_notes never exposed; derived yield/source/freshness fields).
- `product_views.py` + `urls.py` - the `/api/marketplace/*` endpoints.
- `WatchedProduct` model (with a rate snapshot captured at watch time for change detection).
- MMF/SACCO attribute fields live on `planning.InvestmentProduct`; rate VALUES stay in `ProductRateSnapshot`.

Web (`apps/web/app/marketplace/`): `/marketplace` hub, `/marketplace/products` (search/filter/sort + cards),
`/marketplace/products/[slug]` (detail + actions), `/marketplace/compare`, `/marketplace/finder`,
`/marketplace/watchlist`, `/marketplace/brief`. Shared `_components.tsx` (cards, freshness/source badges,
microeducation, no-advice note).

Mobile (`apps/mobile/src/screens/MarketplaceScreen.tsx`, "Market" tab): home + finder, product search/filter,
detail (net-after-tax / SACCO score + actions), compare tray, watchlist, personal brief.

## Endpoints

```
GET  /api/marketplace/products/            (filters + sort, AllowAny; adds land_notice on land filter)
GET  /api/marketplace/products/{slug}/
GET  /api/marketplace/products/compare/    (2-5 products, no winner)
POST /api/marketplace/finder/              (Product Finder Wizard)
POST /api/marketplace/mmf-finder/          (MMF finder)
POST /api/marketplace/net-after-tax/       (MMF net-after-tax)
GET  /api/marketplace/products/{slug}/sacco-score/
GET  /api/marketplace/quick-scenarios/
GET  /api/marketplace/intelligence/
GET/POST /api/marketplace/watchlist/  ;  DELETE /api/marketplace/watchlist/{id}/
GET  /api/marketplace/personal-brief/
POST /api/marketplace/products/{slug}/save-to-journal/
POST /api/marketplace/products/{slug}/request-review/
```

## Product finder logic

Seven questions (amount, goal, timeline, quick-withdrawal, value-drop comfort, currency, investing context).
A `GOAL_FIT` map gives, per goal: product types to understand, options to compare, types that may not fit,
a learning path, simulations to run, and the professional to consult. Cautious / short-horizon / high-liquidity
answers move volatile types (equity, balanced, global, crypto) into "may not fit". Output language is strictly
**"products to understand" / "options to compare" / "may not fit this goal" / "speak to a licensed professional"** -
never "recommended investment". The `land_deposit` goal sets `route_to_land_safety` and points to Land Decision Safety.

## Compare tray behaviour

2-5 products, side by side, fields = provider/product/category/currency/rate+source/freshness/minimum/
liquidity/risk/fees/withdrawal/questions-to-ask (+ net-after-tax when an amount is given). The response carries
`comparison_note = "Compare assumptions before committing money."` and **never** a winner/best/recommendation.

## Watchlist behaviour

Authenticated users watch products. We snapshot the rate at watch time, then surface "rate changed since you
saved it" and "data may be stale". Notification hooks (stale, new snapshot, source changed, 30/60/90-day review)
are derived from the snapshot + freshness; the brief surfaces them.

## Personal brief behaviour

Built from the user's watchlist, saved simulations, and journal: products you are watching, data that changed,
data that is stale, simulations to rerun, journal decisions to review, lessons to continue, and professional-review
suggestions. Personal and actionable - no market-news clutter.

## Professional review handoff

From any product: "Request professional review" creates a scoped, auto-expiring `privacy.DataGrant` and a
marketplace `ConsultationRequest`. Defaults: **amount as a range (not exact), exact values OFF, portfolio summary
OFF**, journal note optional, access expires. The request carries the product(s), simulation assumptions, a
source/freshness warning, the user question, goal, and timeline.

## Land differentiation

Viewing the land category returns a `land_notice`: "Land price comparison is not enough" + complete a Before
Deposit Checklist, compare land with MMF/T-bill/SACCO/REIT, request lawyer/surveyor review, save to journal -
linking to the Land Decision Safety module. We never ship only a land price table.

## No-advice language rules

Banned in generated output (asserted in tests): "best product/fund/investment", "recommended investment/fund",
"guaranteed return", "winner", "top product". Allowed framing: products to understand, options to compare, may not
fit this goal, verify with the provider/regulator, speak to a licensed professional, educational estimate.

## Source / freshness rules

Every card and detail shows freshness (fresh/acceptable/stale - "Data may be stale. Verify before committing
money.") and source confidence ("Official source" / "Provider-reported"). When no current rate exists: "Latest rate
unavailable. Use a custom educational rate." Rate values come only from source-linked `ProductRateSnapshot`s.

## UI principles

Clean top nav (Marketplace link added), structured filters, crisp typography, clear CTAs, strong empty states,
source/freshness badges, calm upgrade prompts. No purple clutter, ads, ticker overload, or trading visuals.

## Remaining work

- Wire real notification delivery for watchlist events (model hooks exist; delivery via the notifications app is TODO).
- Populate MMF/SACCO attribute fields (management fee, M-Pesa paybill, dividend/loan multiplier) from source-linked
  importers; today many are blank until seeded.
- Optional: persist saved comparisons; add a dedicated `/marketplace/intelligence` page (data is already exposed).
