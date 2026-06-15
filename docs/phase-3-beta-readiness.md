# Phase 3 Beta Readiness

This document tracks whether PesaRoute is ready for a 20-50 user private beta covering monetization, professional review booking, notifications, and beta admin controls.

## What Works

- Consumer billing plans and one-off pack entitlements are modeled.
- Development commands can grant premium, grant packs, and expire subscriptions for testing.
- Payment intents support subscriptions, one-off packs, and professional consultation payments.
- M-Pesa integration is isolated behind a backend adapter.
- Payment callbacks are designed to be idempotent.
- Professional review requests support offers, user acceptance, consultation payment start, and paid status.
- In-app notifications exist for payment success/failure, premium activation, pack unlocks, professional responses, consultation payment, data grant expiry, and journal reminders.
- Beta invite codes, beta-only registration, feature flags, and beta feedback exist.
- Mobile app has checkout, notification inbox, beta support, auth invite code input, and professional offer/payment UI.
- Web professional dashboard shows lead status, offer entry placeholders, and accepted/paid review status examples.

## What Is Incomplete

- Real production M-Pesa credentials and callback URL validation are not configured in this repo.
- No professional payout flow exists.
- No real booking calendar exists.
- Push notifications are not implemented; only in-app notifications are active.
- Beta admin uses Django admin/API foundations rather than a full custom admin UI.
- Waitlist approval is represented by invite-code controls, not a separate waitlist workflow.
- Mobile does not yet automatically hide/show beta invite UI from remote feature flags.

## Payment Test Checklist

- Create premium monthly payment intent.
- Initiate M-Pesa checkout with sandbox or fake adapter.
- Confirm success callback activates premium.
- Confirm duplicate success callback does not double-grant.
- Create one-off pack payment intent.
- Confirm success callback unlocks only the selected pack.
- Create consultation request.
- Professional responds with offer.
- User accepts offer.
- User starts consultation payment.
- Confirm success callback marks consultation as paid.
- Confirm failed callback leaves consultation unpaid.
- Confirm users cannot view another user's payment intent.

## Beta User Checklist

- Free user can use route engine.
- Free user can run a simulator.
- Free user can use scam checker.
- Premium limit/upgrade prompt appears where expected.
- User can register with invite when beta-only mode is enabled.
- User can log in and log out.
- User can create journal entry.
- User can create portfolio item.
- User can see portfolio summary.
- User can request professional review.
- User can choose data sharing scopes.
- User can accept a professional offer.
- User can start consultation payment.
- Notifications appear for relevant events.

## Admin Checklist

- Inspect users and profiles.
- Verify professionals.
- Inspect payment intents and events.
- Inspect subscriptions and purchases.
- Inspect consultation requests, offers, and responses.
- Inspect product passports.
- Inspect audit events.
- Create and revoke beta feature flags.
- Create invite codes and monitor usage.
- Review beta feedback categories.

## Security And Privacy Checklist

- No M-Pesa PIN is collected by PesaRoute.
- No bank password is collected.
- No broker or MMF credentials are collected.
- Daraja credentials are backend-only environment variables.
- Mobile and web do not contain payment secrets.
- Payment callbacks are idempotent.
- Journal and portfolio ownership tests pass.
- Consultation request ownership tests pass.
- Professionals see limited lead context before user selection/grant.
- Exact values stay hidden when amount display mode is hidden or range.
- Data grants can expire or be revoked.
- Logs avoid exact portfolio amounts, private journal text, auth tokens, and raw sensitive callback data.

## Known Risks

- Sandbox/prod M-Pesa behavior still needs real Daraja environment validation.
- Feature flags are simple database-backed controls and are not cached yet.
- Notification scheduling for grant expiry and journal reminders needs a cron/Celery beat job before production.
- Beta admin is powerful; admin access must be limited to trusted operators.
- Consultation payment exists without payout logic, so support must explain that professional payout is not launched yet.

## Go/No-Go Recommendation

Current recommendation: ready for a controlled technical beta with mock or sandbox payments after the full local check suite passes. Not ready for a broad paid beta using production M-Pesa until Daraja sandbox/prod callback validation, admin operating procedures, and support escalation paths are verified end to end.
