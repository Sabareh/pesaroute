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

The mobile app supports offline mock mode and a connected MVP API mode. Catalog, product passports, simulators, and scam checks call the backend when available; journal and portfolio writes call the backend only when temporary debug Basic Auth is configured in the API tab, otherwise they stay local-only.

## MVP API

Public:

- `GET /api/health/`
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
- `GET /api/portfolio/items/`
- `POST /api/portfolio/items/`
- `GET /api/portfolio/summary/`
- `POST /api/marketplace/consultation-requests/`

## Security Notes

- Do not collect bank passwords, M-Pesa PINs, broker credentials, or crypto wallet secrets.
- Secrets must come from environment variables.
- Exact portfolio values are optional; users may use rounded, range, or hidden amount modes.
- Professional sharing is modeled as explicit, time-limited, and revocable future consent.
- Sensitive actions create audit events.
- CORS is configured through `CORS_ALLOWED_ORIGINS`; keep it narrow outside local development.
- Rate limiting is still a placeholder and should be added before public launch.

## Generated Asset

The web landing hero image was generated with the built-in image generation tool and copied to `apps/web/public/hero-workspace.png`.
