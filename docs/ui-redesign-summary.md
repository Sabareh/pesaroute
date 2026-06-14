# MaliPrime UI Redesign Summary

Last updated: 2026-06-14

## Completed

- Replaced the previous glass-style web hero with a solid MaliPrime landing page.
- Added shared web components in `apps/web/app/components/maliprime.tsx`.
- Added shared mobile components and tokens in `apps/mobile/src/components/maliprime.tsx`.
- Updated web theme tokens and global system font stack.
- Updated the web landing page, product passport pages, and professional placeholder pages.
- Updated the mobile app shell, auth welcome, home, route result, simulators, scam checker, product passports, professionals, pricing, privacy settings, and native Android icon background.
- Refined the mobile Home flow around the Prompt 2 copy: "Before you invest, understand the route.", trust chips, amount selection, goal selection, and clear primary/secondary CTAs.
- Added a "Prefer not to say" amount range for privacy-first routing.
- Redesigned Route Result around a learning path timeline, products to understand, avoid notes, risk/liquidity notes, and next steps.
- Expanded simulator result cards with risk, liquidity, what can go wrong, beginner mistakes, next learning steps, and the educational simulation disclaimer.
- Updated Scam Checker copy to "Before uweke pesa, check red flags." and added calm high-risk guidance plus safer next step copy.
- Improved Journal and Portfolio Mirror cards to show privacy state, amount display mode, hidden/range behavior, and planning-oriented summary language.
- Updated Professional Review filters and consent copy, including "You choose what this professional can see."
- Restructured Privacy Settings into Privacy Mode, Data Sharing, Account Security, Active Sharing, and Delete/Export sections.
- Added keyboard-aware scrolling for mobile forms.
- Removed explicit glassmorphism/backdrop-blur usage from app surfaces.
- Added `docs/design-system.md` with MaliPrime rules for color, type, spacing, radius, shadows, components, accessibility, mobile, iconography, and illustration.

## Design Decisions

- Light mode first with warm off-white background.
- Solid white cards with subtle borders and soft shadows.
- Cobalt blue as the primary action/accent.
- Emerald used only for trust/wealth-positive signals.
- Amber and red reserved for warnings and danger states.
- Ranges and hidden values remain first-class privacy patterns.
- No AI, crypto, casino, or trading-energy visuals.

## Remaining Design Debt

- Health Debug and Privacy Onboarding were palette-normalized but could be more deeply refactored to use the new base components.
- Journal and Portfolio Mirror now have stronger privacy/card language, but their create/edit forms still repeat local input styles that should become shared components.
- Mobile navigation is still a horizontally scrolling tab strip; a future pass could group lower-frequency tools behind a menu.
- The web hero still uses the existing generated workspace image; future brand work may replace it with a product screenshot or custom owned visual.
- Web product passport search/filter remains static on public pages; live search is currently stronger in mobile/API.
- Some repeated mobile form styles should be consolidated into shared field components.
- The professional web portal is still placeholder UI and should later connect to authenticated API data.
- Dedicated standalone simulator detail screens are not split into separate routes yet; they are presented as premium calculator cards within the existing Simulators screen.

## Verification To Run

- `cd apps/mobile && npm run typecheck`
- `cd apps/mobile && npm run test:logic`
- `cd apps/web && npm run typecheck`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`
