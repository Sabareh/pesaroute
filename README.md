# PesaRoute

PesaRoute is a Kenya-first investment decision platform MVP. It helps users learn, compare options, run educational simulations, check scam red flags, keep a private journal, manually mirror a portfolio, and later request review from verified professionals.

It is not a broker, wallet, robo-adviser, fund manager, crypto exchange, or investment execution app. The MVP does not connect to bank, M-Pesa, broker, or crypto accounts.

## Monorepo

```text
apps/api       Django + Django REST Framework API
apps/web       Next.js public web app
apps/mobile    Expo React Native consumer app
docs           Architecture, roadmap, and performance notes
docker-compose.yml
```

## Backend Setup

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_pesaroute
python manage.py runserver
```

Run tests:

```bash
cd apps/api
pytest
```

## Docker Services

Set a local secret before using Compose:

```bash
$env:DJANGO_SECRET_KEY="replace-with-a-local-secret"
docker compose up --build
```

Then run migrations inside the API container:

```bash
docker compose exec api python manage.py migrate
docker compose exec api python manage.py seed_pesaroute
```

Postgres runs on `localhost:5432`, Redis on `localhost:6379`, and the API on `localhost:8000`.

## Web Setup

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Mobile Setup

```bash
cd apps/mobile
npm install
npm run android
```

If Android launch fails with a missing SDK or `adb`, install Android Studio and set `ANDROID_HOME`, or use Expo web while developing:

For browser-based Expo web checks:

```bash
cd apps/mobile
npm run web
```

To point the mobile app at a backend other than the default `http://localhost:8000`, set:

```bash
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:8000"
npm run web
```

For local validation:

```bash
cd apps/mobile
npm run typecheck
npm run test:logic
```

The mobile app supports offline mock mode and a connected MVP API mode. Catalog, product passports, simulators, and scam checks call the backend when available. Journal and portfolio mirror records are local-first: the app stores records and a sync queue on-device, then creates, updates, or deletes backend copies when a user is logged in and online. The Expo app stores the DRF auth token with `expo-secure-store` on native platforms and falls back to local storage on web. Anonymous users keep journal and portfolio entries local-only.

## Auth Setup

Run migrations before using auth endpoints; this creates the Django auth, PesaRoute profile, and DRF token tables:

```bash
cd apps/api
python manage.py migrate
```

Register or log in through the API to receive a token:

```bash
POST /api/accounts/register/
POST /api/accounts/login/
```

Authenticated private requests should send:

```text
Authorization: Token <token>
```

Supported PesaRoute roles are `consumer`, `professional`, `provider`, and `admin`. Public self-registration can create `consumer`, `professional`, or `provider` profiles; `admin` is reserved for staff/superuser accounts. Do not use PesaRoute auth fields for M-Pesa PINs, bank passwords, broker credentials, MMF credentials, or wallet secrets.

## MVP API

Public:

- `GET /api/health/`
- `POST /api/accounts/register/`
- `POST /api/accounts/login/`
- `GET /api/accounts/me/`
- `GET /api/catalog/categories/`
- `GET /api/catalog/product-passports/`
- `GET /api/catalog/product-passports/{id}/`

Planning:

- `POST /api/planning/simulate/mmf/`
- `POST /api/planning/simulate/tbill/`
- `POST /api/planning/simulate/sacco/`
- `POST /api/planning/simulate/global-route/`

Risk:

- `POST /api/risk/scam-check/`

Authenticated placeholders:

- `GET /api/journal/entries/`
- `POST /api/journal/entries/`
- `PATCH /api/journal/entries/{id}/`
- `DELETE /api/journal/entries/{id}/`
- `GET /api/portfolio/items/`
- `POST /api/portfolio/items/`
- `PATCH /api/portfolio/items/{id}/`
- `DELETE /api/portfolio/items/{id}/`
- `GET /api/portfolio/summary/`
- `POST /api/marketplace/consultation-requests/`
- `GET /api/privacy/data-grants/`
- `POST /api/privacy/data-grants/`
- `GET /api/privacy/access-logs/`

## Security Notes

- Do not collect bank passwords, M-Pesa PINs, broker credentials, or crypto wallet secrets.
- Secrets must come from environment variables.
- Exact portfolio values are optional; users may use rounded, range, or hidden amount modes.
- Professional sharing is modeled as explicit, time-limited, and revocable future consent.
- Sensitive actions create audit events.
- CORS is configured through `CORS_ALLOWED_ORIGINS`; keep it narrow outside local development.
- Scoped rate limiting is configured for auth, scam checks, simulators, and consultation request creation; tune the rates before public launch.

## Generated Asset

The web landing hero image was generated with the built-in image generation tool and copied to `apps/web/public/hero-workspace.png`.
