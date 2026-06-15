# Private Beta Operations

PesaRoute private beta is intended for a small controlled group that can test learning, route discovery, simulators, private journal and portfolio storage, paid packs, subscriptions, and professional review booking without any investment execution.

## Product Boundaries

- PesaRoute does not hold user investment money.
- PesaRoute does not execute investments.
- PesaRoute does not ask for M-Pesa PINs, bank passwords, broker credentials, MMF credentials, or SACCO account passwords.
- M-Pesa payments are only for PesaRoute subscriptions, learning packs, and professional review booking fees.
- Professional review is scoped education/review support, not platform-provided investment advice or guaranteed returns.

## Invite Process

1. Create invite codes in Django admin or the beta admin API.
2. Share one invite code per beta tester group.
3. Enable `BETA_ONLY_MODE=true` only when registrations should require an invite.
4. Ask testers to register with the invite code, preferred language, user type, and privacy mode enabled.
5. Track invite usage from `BetaInvite.used_count`.

Recommended invite batches:

- Internal team: 5 codes.
- Friendly testers: 10-20 codes.
- Professional testers: 3-5 codes.
- Provider/admin testers: 2-3 codes.

## Test User Process

Each beta test user should verify:

- Anonymous route engine works.
- Anonymous simulator works.
- Anonymous scam checker works.
- Registration and login work.
- Journal entry creation works.
- Portfolio item creation works.
- Portfolio summary does not reveal hidden values.
- Professional review request can be submitted.
- Data sharing scopes are explicit before review.
- Notifications appear after payment or professional response.

## Payment Testing

Use sandbox or mocked M-Pesa only until production Daraja credentials are approved.

Checklist:

- `MPESA_ENVIRONMENT=sandbox` for sandbox testing.
- Daraja credentials are set only on the backend.
- Mobile app never contains M-Pesa consumer secret, passkey, callback secret, or shortcode secrets.
- Payment intent creates successfully.
- STK push initiation handles network/provider failure safely.
- Successful callback unlocks the entitlement once.
- Duplicate callback does not double-grant entitlement.
- Failed callback does not unlock premium, packs, or consultation status.
- Phone numbers are masked in stored payment intent records.

## Feedback Collection

Beta feedback categories:

- Payment issue.
- Privacy question.
- Professional review issue.
- Bug report.
- General feedback.

Support should avoid requesting private journal text, exact portfolio amounts, M-Pesa PINs, bank passwords, broker credentials, or screenshots containing sensitive data.

## Support Process

1. Triage `BetaFeedback` daily.
2. Check `AuditEvent` for auth, data sharing, journal, portfolio, and payment lifecycle events.
3. Check `PaymentIntent` status before asking the user to retry payment.
4. For privacy concerns, inspect data grants and access logs before contacting professionals.
5. Resolve urgent payment or privacy issues before inviting more testers.

## Admin Checklist

- Admin can inspect users and user profiles.
- Admin can inspect professionals and verification status.
- Admin can inspect payment intents and payment events.
- Admin can inspect subscriptions and one-off purchases.
- Admin can inspect consultation requests and offers.
- Admin can inspect product passports.
- Admin can inspect audit events.
- Admin can manage beta invites and feature flags.

## Rollback Plan

If beta issues affect payments or privacy:

1. Disable `payments_enabled`.
2. Disable `professional_marketplace_enabled` if professional review data sharing is affected.
3. Keep free learning, simulators, and scam checker available if safe.
4. Stop issuing new beta invites.
5. Review payment events, audit logs, data grants, and access logs.
6. Notify affected beta testers with a concise status update.
7. Patch, retest, and reopen only after callback idempotency and permission tests pass.

## Go-Live Gates

- Backend tests pass.
- Mobile typecheck passes.
- Web typecheck, lint, and build pass.
- Migrations apply cleanly.
- Seed data works.
- Payment callback idempotency is verified.
- Professional access is scoped by explicit grants.
- No production wildcard CORS.
- No secrets in mobile or web bundles.
