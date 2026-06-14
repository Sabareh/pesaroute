# PesaRoute Beta Readiness

Last updated: 2026-06-14

## Readiness Summary

PesaRoute is ready for a small, supervised private beta of 10-20 users if the beta is positioned as an education-first test and users are manually supported. It is not ready for public launch or production financial workflows.

The current product can support learning routes, local simulations, scam checks, private journal and portfolio tracking, professional review request foundations, scoped data sharing, and development billing entitlements. It must continue to avoid real money movement, account linking, execution, and personalized investment promises.

## What Works

- Anonymous users can use the route engine without creating an account.
- Anonymous users can run MMF, T-bill, SACCO, and global route simulators.
- Anonymous users can submit scam-check text and receive deterministic red-flag feedback.
- Users can register, log in, and fetch their profile.
- Authenticated users can create journal entries and portfolio items.
- Portfolio summary returns grouped holdings and privacy-aware summary fields.
- Product categories and product passports are available from the backend catalog.
- Product passport API supports filtering, search, ordering, and pagination.
- Professional review request APIs support consumer requests and professional leads.
- Data grants support explicit scopes, expiry, revocation, and access logging foundations.
- Professional consultation context only returns granted scopes.
- Billing and entitlement placeholders support free, premium, professional, and one-off pack states for development testing.
- Seed commands populate catalog and billing setup data.
- Docker Compose starts API, worker, Postgres, and Redis locally; migrations and seed commands run in the API container.

## What Is Incomplete

- No real M-Pesa, card, payout, or payment provider integration.
- Billing is a development/manual placeholder only.
- No AI-backed scam analysis or route generation.
- No bank, broker, MMF, SACCO, or M-Pesa account linking.
- No statement upload or document processing.
- No password reset or email verification flow.
- No biometric app lock yet.
- Delete/export data flows are roadmap items.
- Professional web portal is basic and should be treated as an MVP placeholder.
- Provider sponsorship and ranking workflows are intentionally absent.
- Portfolio and journal sync conflict handling is basic.
- Production deployment configuration still needs final environment, monitoring, and backup setup.

## Known Bugs And Limitations

- Running multiple SQLite write-heavy commands in parallel can produce `database is locked`; run migrations and seed commands sequentially for local development.
- Local API smoke testing creates test users and records in the local development database.
- Mobile has no lint script in `apps/mobile/package.json`.
- Android testing requires a working Android SDK/emulator or physical device and Expo SDK compatibility.
- Rate limits are starter values and should be tuned after observing beta traffic.
- Some web pages are static public MVP pages while the mobile app uses API-backed flows.

## Security And Privacy Limitations

- The app handles sensitive financial planning data and should run only over HTTPS outside local development.
- Exact portfolio values and journal text must not be logged or exposed in professional views.
- Professional access depends on explicit scoped data grants; this needs continued regression testing.
- Admin verification workflows exist as foundations and need operational controls before broad professional onboarding.
- CORS, CSRF, allowed hosts, secure cookies, HSTS, and rate limits must be configured per deployment environment.
- No M-Pesa PINs, bank passwords, broker credentials, or MMF credentials should ever be requested.
- ODPC compliance work remains incomplete, including formal retention, deletion, export, consent records, and incident response processes.

## Manual Test Checklist

- Start backend locally and confirm `/api/health/` responds.
- Seed product catalog and billing plans.
- Open the mobile app in anonymous mode.
- Select an amount range and goal, then confirm the route result appears.
- Run each simulator: MMF, T-bill, SACCO, and global route.
- Paste a suspicious investment pitch into scam checker and confirm red flags appear.
- Register a new user.
- Log out and log back in.
- Create a journal entry using hidden, range, rounded, and exact display modes.
- Create a portfolio item using hidden, range, rounded, and exact display modes.
- Confirm portfolio summary avoids exact totals when hidden or range modes are used.
- Create a professional review request with amount range rather than exact amount.
- Choose data sharing scopes before submitting a review request.
- Revoke an active data grant and confirm professional context access changes.
- Log in as a professional and confirm only allowed lead/request fields are visible.
- Verify professional consultation context shows only granted scopes.
- Grant development premium entitlement and confirm premium placeholder state appears.
- Confirm unsupported network/API states show loading or fallback UI instead of crashing.

## Deployment Checklist

- Set `DJANGO_DEBUG=false`.
- Set a strong `DJANGO_SECRET_KEY`.
- Set `DJANGO_ALLOWED_HOSTS` to the deployed hostnames.
- Set `CORS_ALLOWED_ORIGINS` to deployed web/mobile origins, not wildcard.
- Set `CSRF_TRUSTED_ORIGINS` for deployed HTTPS origins.
- Use PostgreSQL for beta, not SQLite.
- Configure Redis if throttling/cache/session usage requires it.
- Run migrations before serving traffic.
- Run `seed_pesaroute` and `seed_billing`.
- Create an admin/superuser account for operational setup.
- Configure HTTPS, secure cookies, HSTS, and proxy headers.
- Configure backups for the database.
- Configure structured logs without sensitive journal text, exact values, or tokens.
- Configure basic error monitoring and uptime checks.
- Set mobile API base URL for the beta backend.
- Set web API base URL for the beta backend where applicable.
- Confirm no real payment credentials or financial integrations are enabled.
- Prepare manual support and issue intake for beta users.

## Verification Results

- Backend tests: passed.
- Backend lint and format checks: passed.
- Backend migration check and migrate: passed.
- Seed data: passed sequentially for catalog and billing.
- Docker Compose config: passed.
- Docker Compose full startup: passed for Postgres, Redis, API, and worker.
- Docker API health check: passed.
- Mobile typecheck and logic tests: passed.
- Mobile lint: not available.
- Web typecheck, lint, and build: passed.
- API smoke test for core beta flows: passed.

## Next Phase Recommendation

Phase 3 should focus on beta operations, production deployment hardening, and closing privacy/account-management gaps before adding major new product surface.

Recommended priorities:

- Add beta onboarding, consent copy, feedback capture, and support workflows.
- Implement account deletion/export and retention controls.
- Wire the professional portal more completely to authenticated backend APIs.
- Add production observability, backups, and deployment runbooks.
- Expand regression tests around data grants, professional visibility, and hidden amount modes.
- Keep payment integration behind the existing billing skeleton until compliance and operational controls are ready.
