# Mobile API Notes

The Expo mobile app uses a small typed API client in `apps/mobile/src/api/client.ts`.

## Base URL

The client reads the API base URL in this order:

1. `EXPO_PUBLIC_API_BASE_URL`
2. `expo.extra.apiBaseUrl` from `apps/mobile/app.json`
3. `http://localhost:8000`

For Android emulator testing, `localhost` is automatically rewritten to `10.0.2.2`. For a physical Android device, set `EXPO_PUBLIC_API_BASE_URL` to the computer's LAN URL, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:8000 npm run android
```

## Public Endpoints

Used by Home and API Debug:

- `GET /api/health/`
- `GET /api/catalog/categories/`
- `GET /api/catalog/product-passports/`

If catalog requests fail, the app falls back to cached in-memory data, then bundled mock catalog data.

Product passport discovery supports these query parameters:

- `category`: category slug or exact category name
- `risk_level`: `low`, `moderate`, `high`, or `very_high`
- `liquidity_level`: `high`, `medium`, `low`, or `locked`
- `regulator_category`: exact regulator category match, case-insensitive
- `minimum_amount_lte`: maximum minimum amount
- `is_sponsored`: `true` or `false`
- `status`: public clients should use `published`; non-published statuses are not exposed publicly
- `search`: searches product name, provider name, description, beginner mistakes, and execution route
- `ordering`: `updated_at`, `-updated_at`, `category`, `-category`, `risk_level`, or `-risk_level`

Published catalog responses set cache-friendly `Cache-Control` headers. Redis or CDN caching should be added before
the public catalog becomes large or frequently requested.

## Authentication

The API uses Django users with DRF token authentication.

- `POST /api/accounts/register/`
- `POST /api/accounts/login/`
- `GET /api/accounts/me/`
- `PATCH /api/accounts/me/`

Register and login return:

```json
{
  "token": "token-value",
  "user": {
    "id": 1,
    "username": "amina",
    "profile": {
      "role": "consumer",
      "preferred_language": "en",
      "user_type": "other",
      "approximate_investment_range": "",
      "privacy_mode_enabled": true
    }
  }
}
```

Private mobile requests should send:

```text
Authorization: Token <token>
```

Roles are `consumer`, `professional`, `provider`, and `admin`. Self-registration may create `consumer`, `professional`, or `provider`; admin is reserved for staff/superuser accounts.

## Planning Simulators

Used by the Simulators screen. Local calculations always remain available offline.

- `POST /api/planning/simulate/mmf/`
- `POST /api/planning/simulate/tbill/`
- `POST /api/planning/simulate/sacco/`
- `POST /api/planning/simulate/global-route/`

If any simulator API request fails, the screen keeps showing local educational calculations and displays a non-blocking error.

## Scam Checker

Used by Scam Checker:

- `POST /api/risk/scam-check/`

If the API is unavailable, the app uses the local deterministic red-flag checker with the same core phrases.

## Private MVP Writes

Used by Journal and Portfolio Mirror after the mobile app registers or logs in and stores a DRF token securely. The mobile app writes to local storage first, keeps a local sync queue, and retries backend writes on login, app open, network return, or manual sync.

- `POST /api/journal/entries/`
- `GET /api/journal/entries/`
- `PATCH /api/journal/entries/{id}/`
- `DELETE /api/journal/entries/{id}/`
- `POST /api/portfolio/items/`
- `GET /api/portfolio/items/`
- `PATCH /api/portfolio/items/{id}/`
- `DELETE /api/portfolio/items/{id}/`
- `GET /api/portfolio/summary/`
- `POST /api/marketplace/consultation-requests/`
- `GET /api/privacy/data-grants/`
- `POST /api/privacy/data-grants/`
- `POST /api/privacy/data-grants/{id}/revoke/`
- `GET /api/privacy/access-logs/`

Professional context access:

- `GET /api/marketplace/consultation-requests/{id}/context/`

This endpoint is for the authenticated professional assigned to the consultation request. It returns only fields allowed by an active, unrevoked, unexpired data grant. `consultation_context` is required before any context is returned. Exact portfolio values are withheld unless `portfolio_exact_values` is granted.

Professional review MVP:

- `GET /api/marketplace/professionals/`
- `GET /api/marketplace/professionals/{id}/`
- `POST /api/marketplace/consultation-requests/`
- `GET /api/marketplace/my-consultation-requests/`
- `GET /api/marketplace/professional/leads/`
- `POST /api/marketplace/professional/leads/{id}/respond/`

Consumers only see their own requests. Professionals see open leads plus leads selected for their own professional profile. Lead responses do not expose contact info, journal notes, or exact values unless the user has granted those scopes separately.

If no credentials are set, entries remain local-only. If a backend write fails, the app keeps the local item and shows an error state.

## Billing Skeleton

Billing is development-only in this milestone. No M-Pesa, card, payout, booking-fee, provider billing, or ad/sponsored
listing integration is connected.

- `GET /api/billing/plans/`
- `GET /api/billing/packs/`
- `GET /api/billing/entitlements/`
- `POST /api/billing/dev/mock-purchase/`

`POST /api/billing/dev/mock-purchase/` requires authentication and only works while `DJANGO_DEBUG=true`. It grants fake
subscription or guide-pack state for local testing and creates placeholder invoice records with no money collected.

Real payment integrations should later plug in by writing verified provider events into:

- `Subscription` for recurring consumer or professional plans
- `OneOffPurchase` for guide packs
- `Invoice` for payment lifecycle and provider references
- entitlement recalculation through `billing.services.entitlement_snapshot`

## Out of Scope

The mobile app does not implement M-Pesa, payments, account linking, OpenAI calls, broker integrations, or professional booking.
