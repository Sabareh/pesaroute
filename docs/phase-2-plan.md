# Phase 2 Plan

## Phase 2 Goals

Phase 2 should turn the MVP into a safer, more reliable trust-and-compliance foundation without expanding into money movement or live financial integrations.

Primary goals:

- Add production-minded auth and private-data permissions.
- Harden rate limiting, audit logging, and error handling.
- Improve product passport governance and review workflows.
- Make consent for future professional review explicit, scoped, revocable, and auditable.
- Preserve offline-friendly mobile flows and clear fallback states.
- Prepare for later professional review without adding booking, payments, or advice execution.

Out of scope for Phase 2:

- M-Pesa, payments, wallets, or checkout.
- Bank, broker, MMF, SACCO, crypto exchange, or custody account linking.
- AI-generated advice or OpenAI calls.
- Real professional booking, scheduling, or payment.
- Investment execution or personalized product recommendations.

## Milestones

### Milestone 1: Security Baseline

- Replace debug-only auth assumptions with a clear local auth path.
- Add rate limiting for scam checks, simulator endpoints, auth endpoints, and write endpoints.
- Review DRF permissions on journal, portfolio, marketplace, and privacy endpoints.
- Confirm sensitive actions write audit events.
- Add tests for unauthorized access and owner-only data access.

### Milestone 2: Private Data Controls

- Make journal and portfolio privacy modes consistent across API and mobile.
- Add explicit data retention and deletion behavior for user-created data.
- Add mobile copy for what stays local, what is sent to the API, and what is never requested.
- Add tests for hidden/range/rounded amount handling.

### Milestone 3: Product Passport Governance

- Add admin/provider workflows for draft, review, published, and archived passport versions.
- Track who changed a passport and when.
- Keep public passport reads cacheable and stable.
- Add tests for version status transitions and published-only public reads.

### Milestone 4: Consent And Professional Review Readiness

- Build `DataGrant` lifecycle APIs for grant, expire, revoke, and access log.
- Define what a professional can see under each grant scope.
- Add user-facing consent review screens before any professional access.
- Keep booking, payment, and professional advice delivery out of this milestone.

### Milestone 5: Reliability And Release Readiness

- Add API error response consistency and mobile retry states.
- Add smoke checks for health, catalog, simulators, scam check, journal, and portfolio.
- Add Docker Compose startup documentation for a clean machine.
- Decide on CI commands and make them match `AGENTS.md`.

## Technical Risks

- Auth and permissions may expose private journal or portfolio rows if owner filters are missed.
- Rate limiting must work consistently across local, Docker, and future deployment environments.
- Generated Next route types can conflict if `next build` and `next typecheck` run concurrently in the same workspace.
- Mobile emulator networking needs `10.0.2.2`; physical devices need a LAN API URL.
- Offline fallback can mask backend failures unless debug screens show source and errors clearly.
- Passport versioning can become hard to reason about if draft and published records are mixed.
- Celery is wired but mostly unused; background jobs should not be introduced without observability.

## Security And Privacy Risks

- Users may paste sensitive investment pitches, phone numbers, or identity details into scam checks.
- Exact amounts in journals or portfolio mirrors are sensitive and should remain optional.
- Temporary Basic Auth is not suitable for production.
- Debug logs must not contain passwords, notes, exact holdings, or auth headers.
- Consent grants must not become permanent broad access.
- Professional verification data can become sensitive personal data.
- CORS and host settings must be tightened for non-local environments.

## Verification Checklist

Before closing a Phase 2 task:

- Run backend tests with `python -m pytest`.
- Run backend lint with `python -m ruff check .`.
- Run backend format check with `python -m black --check .`.
- Run migration checks with `python manage.py makemigrations --check --dry-run` and `python manage.py migrate --check`.
- Run seed command if catalog defaults changed.
- Run web lint, typecheck, and build if web changed.
- Run mobile Expo dependency check, TypeScript check, and simulator tests if mobile changed.
- Verify private endpoints require auth and return only the requesting user's data.
- Verify mobile screens show loading, error, and fallback states for API failures.
- Verify no new payment, account-linking, AI, or financial execution behavior was introduced.
- Update docs when endpoints, commands, env vars, or privacy boundaries change.
