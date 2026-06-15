# PesaRoute Payments

Date: 2026-06-14

## Boundary

PesaRoute payments are only for:

- Consumer premium subscriptions.
- One-off paid learning packs.
- Future professional consultation/review fees.

They must never be used for investment execution, investment deposits, broker funding, MMF funding, crypto execution, or provider payouts. PesaRoute must never ask for an M-Pesa PIN, bank password, broker credential, MMF credential, or wallet secret.

## Architecture

- `payments.PaymentIntent` stores the payment purpose, amount, status, masked phone number, provider IDs, receipt, idempotency key, and expiry.
- `payments.PaymentEvent` stores safe operational summaries of intent creation, checkout initiation, callbacks, success/failure, and entitlement application.
- `payments.mpesa.MpesaAdapter` isolates Daraja access-token and STK-push calls behind a replaceable provider adapter.
- `payments.services` owns payment intent creation, initiation, callback handling, idempotency, status transitions, and entitlement application.
- Billing access is still applied through `billing.Subscription`, `billing.OneOffPurchase`, and `billing.Invoice`.

## API Flow

1. Mobile creates an authenticated payment intent:
   - `POST /api/payments/intents/`
2. Mobile initiates M-Pesa STK push:
   - `POST /api/payments/intents/{id}/initiate/`
3. Backend sends STK push through `MpesaAdapter`.
4. Mobile polls:
   - `GET /api/payments/intents/{id}/`
5. Daraja sends callback:
   - `POST /api/payments/mpesa/callback/`
6. Backend marks the intent successful or failed.
7. On success, backend applies the matching entitlement:
   - `premium_monthly` or `premium_yearly` creates a subscription.
   - One-off packs create a completed `OneOffPurchase`.
   - Professional consultation payment is reserved for later booking work.

## Environment Variables

```bash
MPESA_ENVIRONMENT=sandbox
MPESA_MOCK_MODE=true
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=replace-with-daraja-consumer-key
MPESA_CONSUMER_SECRET=replace-with-daraja-consumer-secret
MPESA_BUSINESS_SHORTCODE=replace-with-paybill-or-till
MPESA_PASSKEY=replace-with-daraja-passkey
MPESA_CALLBACK_URL=https://example.com/api/payments/mpesa/callback/
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_ACCOUNT_REFERENCE=PesaRoute
MPESA_INTENT_EXPIRY_MINUTES=15
THROTTLE_PAYMENTS_RATE=60/min
```

All M-Pesa credentials stay server-side. Do not put Daraja consumer secrets, passkeys, certificates, callback secrets, or provider credentials in the mobile or web app.

## Idempotency

- Payment intent creation uses `(user, idempotency_key)` uniqueness.
- Reusing the same key returns the existing intent instead of creating a duplicate.
- M-Pesa callbacks locate intents by checkout or merchant request ID.
- Duplicate success callbacks do not create duplicate subscriptions or purchases because the service exits when an intent is already `successful`.

## Local Testing

Use mock mode locally:

```bash
cd apps/api
python manage.py migrate
python manage.py seed_billing
python -m pytest tests/test_payments.py
```

In mock mode, initiation returns fake provider request IDs. Entitlements unlock only after a callback is posted to the backend; the mobile app must not assume success from STK initiation alone.

## Sandbox Setup Checklist

- Create a Daraja sandbox app.
- Set sandbox consumer key and secret on the backend only.
- Set sandbox shortcode and passkey.
- Expose a public HTTPS callback URL for local tunnel or staging.
- Confirm callback endpoint is reachable.
- Test successful, cancelled, timeout, and duplicate callback cases.
- Confirm no raw phone numbers or payment credentials are logged.

## Production Go-Live Checklist

- Disable `MPESA_MOCK_MODE`.
- Set production Daraja credentials through a secret manager.
- Use HTTPS for all API traffic.
- Validate callback authenticity and provider references.
- Add callback replay protection and operational alerting.
- Add payment reconciliation reports.
- Add refund/support runbooks.
- Confirm CORS/CSRF/hosts are production-specific.
- Confirm no payment flow can be used for investment execution.

## Security Notes

- Store only masked phone numbers on `PaymentIntent`.
- Do not log raw callback payloads in production.
- Do not log phone numbers unnecessarily.
- Do not log M-Pesa credentials or access tokens.
- Payment entitlements are applied only server-side after callback success.
- Mobile/web UI should always say that the user approves the actual M-Pesa prompt on their phone.
