# MMF and SACCO comparison strategy (Phase 2.15)

## Competitor mechanics borrowed

From Yield.co.ke and Kenya MMF Calculator we borrowed useful *mechanics*:

- MMF comparison by annual yield, management fee, minimum investment, withdrawal timeline, and M-Pesa availability.
- A net-after-tax return calculator.
- Quick goal scenarios.
- A side-by-side comparison builder.
- SACCO dividend, deposit interest, loan multiplier, minimum shares, and a stability-style score.
- Educational FAQs (daily accrual, withholding tax, fees, highest-yield risk).
- Clear disclaimers and privacy-first browsing.

## What we did NOT copy

- No copying of their branding, UI, copy, exact data, or ranking language.
- No proprietary "stability formula" - our SACCO score is fully transparent and additive.
- No "best fund" / "recommended fund" / "guaranteed return" language.

## Data model

MMF attributes on `planning.InvestmentProduct`: `yield_type` (gross / net_of_management_fee / net_after_tax /
unknown), `management_fee_rate`, `withdrawal_timeline`, `minimum_amount` (minimum investment), `minimum_topup`,
`mpesa_paybill_available`, `mpesa_paybill_number`, `withholding_tax_rate` (default 15). Yield VALUE + date + source
+ confidence come from the current `ProductRateSnapshot` (exposed as `annual_yield`, `yield_snapshot_date`,
`yield_source_url`, `yield_source_confidence`, `yield_freshness`).

SACCO attributes on the same model: `dividend_rate_latest`, `interest_on_deposits_latest`, `loan_multiplier`,
`minimum_shares`, `membership_eligibility`, `sasra_status`, `audited_report_url` (dividend value/date via snapshot).

## MMF finder logic

`run_mmf_finder` takes amount range, goal (emergency fund / school fees / rent deposit / business capital / first
investment / maximum returns / short-term parking), timeline, quick-withdrawal need, minimum-amount preference,
M-Pesa preference, risk comfort. It returns **products to compare**, **why they may fit**, **what to verify**, and
**products to be careful with** (e.g. a "maximum returns" goal warns that highest yield is not always best). Never
"recommended fund" - only "products to compare", "may fit this goal", "verify with provider", "educational only".

## Net-after-tax formula and fee-treatment assumptions

`net_after_tax_mmf` (in `marketplace/product_services.py`), built on `grow()` (daily compounding):

1. `gross_value` = grow(initial, monthly, months, annual_yield, daily).
2. Fee treatment:
   - `net_of_management_fee` -> the published yield already excludes the fee; **do not subtract it again** (`after_fee = gross`).
   - `fee_separate` -> recompute growth at `(yield - management_fee)`; `fee_estimate = gross - after_fee`.
   - `unknown` -> use the yield as-is and attach an assumption warning.
3. Withholding tax (default 15%) applies to **growth only**: `tax = max(0, after_fee - contributions) * wht/100`.
4. `net_value = after_fee - tax`; `effective_annual_return = (net_value/contributions)^(12/months) - 1`.

This guarantees **no double-counting**: the management fee is subtracted at most once, and tax never touches
contributions. Output always shows: *"This is an educational estimate. Actual MMF returns may vary due to daily
accrual, NAV movement, fees, tax, and provider terms."*

## Quick scenarios

Eight presets (Emergency Fund, School Fees, Rent Deposit, Wedding Savings, Business Capital, Land Deposit, First
Salary Savings, Chama Short-Term Parking). Each sets a timeline, liquidity need, default risk comfort, suggested
product categories, and a journal prompt.

## SACCO due-diligence score

Transparent, additive `/100` - ten 10-point sub-scores, each awarded when the corresponding source-linked info is
available: SASRA status, dividend history, interest on deposits, loan-multiplier clarity, minimum-shares clarity,
membership-eligibility clarity, withdrawal-rules clarity, audited report/source, liquidity notes, governance/
documentation. Shown with: *"This score reflects available public/source-linked information. It is not a
recommendation."* (Deliberately not a proprietary stability formula.)

## No-advice wording

Banned in outputs (asserted in tests): best fund, recommended fund, guaranteed return, winner, top product. We use
products to compare, may fit this goal, verify with the provider, and educational estimate. Compare views show
"Compare assumptions before committing money." and never a winner.

## UI behaviour

Web: clean DataCamp-style dashboard - product search, filter chips, compare table, a net-after-tax calculator panel
on each MMF detail, a SACCO due-diligence score panel on each SACCO detail, "How to read this" microeducation
accordions, and source/freshness badges. Mobile: searchable product list, filter chips, product detail with a
net-after-tax / SACCO score panel, compare tray, and journal/watchlist/review CTAs. No competitor UI is copied.

## Source / freshness rules

Cards and details surface freshness (fresh/acceptable/stale) and source confidence (official / provider-reported).
"Latest rate unavailable. Use a custom educational rate." when no current snapshot exists; "Data may be stale.
Verify before committing money." when stale. Yields come only from source-linked snapshots, never invented.

## Remaining data gaps

- Management fee, M-Pesa paybill numbers, minimum top-ups, SACCO dividend/loan-multiplier/minimum-shares are blank
  until populated from source-linked importers; the net-after-tax `fee_separate` path and SACCO score improve as
  these are filled.
- SACCO dividend snapshots and audited-report URLs are not yet seeded for most SACCOs.
- Net-after-tax assumes daily compounding and a flat 15% WHT; real provider terms (tiering, daily NAV) are not modelled.
