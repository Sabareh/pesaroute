# PesaRoute MaliPrime UI QA

Date: 2026-06-14

## Scope Checked

- Web landing page sections: hero, trust bar, problem, feature grid, categories, professional marketplace, privacy, pricing, and footer disclaimers.
- Product passport catalog and detail pages.
- Professional portal dashboard, lead detail, profile, scoped consultation context, and settings.
- Provider portal dashboard, product list, product passport editor, analytics placeholder, and sponsored education placeholder.
- Shared empty, loading, and error state components.

## Fixes Made

- Reframed the web landing page around the Phase 2.5 product message and exact trust promises.
- Added functional server-rendered filtering/search for the public product passport catalog.
- Added product passport detail sections for documents needed and disclosures.
- Expanded professional portal UI to show limited lead views, verification status, profile/settings entry points, and scoped response copy.
- Added provider portal screens for dashboard, product inventory, and passport editing.
- Kept sponsorship and educational-only warnings visible in provider and public catalog contexts.
- Improved badge alignment when badges include icons.

## Accessibility Notes

- Primary pages use semantic headings, labelled inputs, visible focus styles from shared controls, and text alternatives for the hero image.
- Portal actions use text plus icons rather than icon-only buttons.
- Current beta placeholders should be retested with keyboard-only navigation once forms become interactive.
- Color contrast should be checked again after real brand photography or sponsored labels are introduced.

## Performance Notes

- The landing page uses a single local hero image with Next image optimization.
- Product passport filtering is server-rendered through query params, avoiding a client bundle for catalog search.
- Portal pages are static placeholders and should be lightweight.
- Future analytics, sponsored education, and professional response forms should avoid client-heavy dashboards until real data volume requires it.

## Remaining UI Debt

- Mobile screens have MaliPrime components and basic states from earlier work, but they need a dedicated device-by-device QA pass.
- Professional/provider forms are placeholders and do not submit mutations yet.
- Product passport filters are single-value filters; multi-select can wait until real catalog size requires it.
- Provider analytics and sponsored education are intentionally placeholders.
- Screenshots should be captured after web build verification on desktop and mobile widths.

## Screenshot Checklist

- [ ] Landing page desktop at 1440px.
- [ ] Landing page mobile at 390px.
- [ ] Product passport catalog with default results.
- [ ] Product passport catalog with a search/filter applied.
- [ ] Product passport detail page.
- [ ] Professional dashboard.
- [ ] Professional scoped context view.
- [ ] Provider dashboard.
- [ ] Provider product passport editor.

## Private Beta UI Verdict

The web UI is suitable for private beta review after the automated checks pass. It is clear that PesaRoute is educational, privacy-first, and not an execution/payment app. The largest remaining beta risk is interaction depth: several portal controls are intentionally placeholders until backend workflows are ready.
