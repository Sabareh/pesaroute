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

Used by Journal and Portfolio Mirror only when temporary Basic Auth credentials are configured in the API Debug screen:

- `POST /api/journal/entries/`
- `POST /api/portfolio/items/`

If no credentials are set, entries remain local-only. If a backend write fails, the app keeps the local item and shows an error state.

## Out of Scope

The mobile app does not implement M-Pesa, payments, account linking, OpenAI calls, broker integrations, or professional booking.
