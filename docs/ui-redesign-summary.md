# MaliPrime Liquid UI Redesign Summary

## Goal

The redesign moves PesaRoute away from a colorful prototype look toward a modern, Apple-inspired product surface. The target is premium, calm, readable, and privacy-first.

## What Changed

- Renamed the design direction to MaliPrime Liquid.
- Replaced the previous dark photo-overlay landing hero with a light, centered, Apple-like hero.
- Added a slim dark web nav that works across public and portal pages.
- Updated web and mobile tokens to the shared MaliPrime Liquid palette.
- Softened cards, shadows, badges, and buttons.
- Reduced loud green/blue treatment and heavy typography.
- Kept gradients only as subtle liquid accents.
- Updated the payment status page to be calmer and clearer.
- Added shared web components for future UI work: `AppleLikeNav`, `LiquidHeroSection`, `FeatureCard`, `PricingCard`, `DashboardCard`, and `PortalShell`.
- Added mobile aliases/components for `LiquidHero` and `LiquidPill`.

## Screens Touched

Web:

- Landing page
- Payment status page
- Product passport list
- Product passport detail
- Professional dashboard
- Professional profile
- Professional settings
- Professional consultation context
- Provider dashboard
- Provider product list
- Provider product passport editor

Mobile:

- Shared MaliPrime component tokens and primitives
- Existing screens inherit the calmer card, button, badge, and hero styling

## Product Scope Preserved

No backend business logic, investment execution, account linking, AI, M-Pesa integration changes, or new monetization behavior were added by this UI pass.

## Remaining Design Debt

- Some web portal pages still use dense placeholder content and could benefit from table-focused layouts.
- Mobile screen-by-screen spacing can be refined further after emulator QA.
- The product passport filter form can be upgraded into a more tactile segmented-control UI.
- Professional/provider dashboards should eventually get a consistent sidebar once workflows mature.
