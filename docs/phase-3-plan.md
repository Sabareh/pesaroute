# PesaRoute Phase 3 Plan

Date: 2026-06-14

## Phase 3 Goals

- Prepare monetization for the private beta without collecting real money yet.
- Normalize consumer premium plans, one-off guide packs, professional plans, and entitlement checks.
- Prepare a future M-Pesa payment foundation with clear boundaries, callback/webhook safety, and rollback options.
- Add beta admin controls for manually granting and expiring access during supervised testing.
- Keep PesaRoute education-first: no investment execution, no custody, no account linking, and no unlicensed advice.

## Feature Scope

- Consumer subscriptions: `free`, `premium_monthly`, `premium_yearly`.
- Professional subscriptions: `professional_basic`, `professional_pro`.
- One-off guide packs: `global_investing_pack`, `treasury_bills_pack`, `sacco_chama_pack`, `land_due_diligence_literacy_pack`, `diaspora_pack`.
- Entitlement helpers for consumer, pack, and professional access checks.
- Development-only commands for granting premium, granting packs, and expiring subscriptions.
- Documentation for billing setup and private beta operations.
- Future-ready invoice/payment placeholder records without real provider calls.

## Non-Goals

- No M-Pesa integration in this prompt.
- No card payment integration.
- No payouts.
- No provider billing or paid rankings.
- No OpenAI, LLM, or AI assistant.
- No investment execution, bank integration, broker integration, MMF integration, crypto execution, or statement upload.
- No robo-advice or promised returns.

## Payment Architecture

Phase 3 should use a provider-agnostic billing core:

- `Plan` defines the sellable subscription product and included entitlement keys.
- `Subscription` records the user's active, trialing, manual, canceled, or expired plan access.
- `OneOffPurchase` records guide-pack purchases or manual beta grants.
- `Entitlement` records manual overrides or special-case access.
- `Invoice` remains the payment placeholder until a real payment provider is integrated.

Future M-Pesa architecture should add separate payment-intent and callback records instead of mixing provider state into subscriptions directly. The callback handler should validate provider signatures, verify amount/account/reference, apply idempotency, write audit logs, and only then activate the subscription or pack.

## Security Risks

- Fake/manual grants must never be enabled in production by accident.
- Payment callbacks will require strict signature validation, idempotency keys, replay protection, and audit logs.
- Entitlement checks must happen server-side for premium-only API behavior.
- Billing endpoints must avoid logging phone numbers, tokens, exact portfolio values, journal text, or payment credentials.
- Admin commands must be restricted to trusted operators and should leave auditable records through invoices/subscriptions.

## Privacy Risks

- Billing records should not expose journal text, exact portfolio values, or professional sharing scopes.
- Professional plans must not give professionals access to user data without explicit user data grants.
- One-off packs should unlock education content only; they should not imply personalized advice.
- Future M-Pesa data should be limited to payment references and operational metadata, never PINs or statement data.

## Beta Rollout Plan

1. Seed billing plans in local/staging.
2. Use manual grant commands for internal testers.
3. Validate entitlement snapshots in mobile and backend API tests.
4. Invite 10-20 supervised beta users with clear "no real payment collection" copy.
5. Monitor support issues, entitlement mistakes, and privacy confusion.
6. Add real payment provider only after beta access rules, logs, rollback, and support flows are stable.

## Rollback Plan

- Disable premium-only UI prompts and return all users to free learning access.
- Mark manual beta subscriptions as `expired` using `expire_subscription_for_testing`.
- Revoke or deactivate direct manual entitlements where needed.
- Keep invoices/payment placeholders for audit, but do not treat them as money movement records.
- If a future payment callback misbehaves, stop the callback route, freeze new activations, and reconcile subscriptions from provider records manually.

## Verification Checklist

- Backend tests pass.
- Billing seed command creates exactly the normalized plans.
- Free users receive only free/limited entitlement keys.
- Premium users receive unlimited simulations, unlimited scam checks, portfolio mirror, advanced route engine, private journal unlimited, and review priority.
- One-off packs map to separate `*_access` entitlement keys.
- Expired subscriptions no longer grant entitlements.
- Professional Basic and Pro expose only their intended professional feature keys.
- Mobile pricing screen typechecks against the entitlement snapshot.
