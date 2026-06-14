# PesaRoute Agent Guide

## Product Context

PesaRoute is a Kenya-first investment education and decision-support MVP. It helps users choose an amount range and goal, view a learning route, run educational simulations, check investment pitches for red flags, keep a private journal, manually mirror a portfolio, and inspect generic product passports.

PesaRoute is not a broker, wallet, fund manager, robo-adviser, exchange, bank connector, or investment execution app. The current milestone touches no money, links no financial accounts, and stores only user-entered educational and planning data.

## Repo Layout

```text
apps/api       Django + Django REST Framework API
apps/web       Next.js public web app
apps/mobile    Expo React Native consumer app
docs           Product, API, architecture, and planning notes
docker-compose.yml
README.md
```

Backend domain apps:

- `accounts`: Django users and role profile models.
- `catalog`: product categories, providers, product passports, versions, and seed command.
- `planning`: educational route and simulator APIs.
- `risk`: deterministic scam checker APIs.
- `journal`: private decision journal APIs.
- `portfolio`: manual portfolio mirror APIs.
- `marketplace`: professional/consultation placeholders.
- `privacy`: future data grants and access logs.
- `audit`: sensitive action audit events.

## Commands

Run commands from the repo root unless a command starts with `cd`.

### Backend Install

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r apps\api\requirements.txt
```

### Backend Run, Test, Lint, Format

```powershell
cd apps\api
..\..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
..\..\.venv\Scripts\python.exe -m pytest
..\..\.venv\Scripts\python.exe -m ruff check .
..\..\.venv\Scripts\python.exe -m black --check .
..\..\.venv\Scripts\python.exe -m black .
```

### Backend Migrations And Seed Data

```powershell
cd apps\api
..\..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
..\..\.venv\Scripts\python.exe manage.py migrate
..\..\.venv\Scripts\python.exe manage.py migrate --check
..\..\.venv\Scripts\python.exe manage.py seed_pesaroute
```

### Docker Compose

```powershell
$env:DJANGO_SECRET_KEY="replace-with-a-local-secret"
docker compose config --quiet
docker compose up --build
docker compose exec api python manage.py migrate
docker compose exec api python manage.py seed_pesaroute
```

### Web Install And Checks

```powershell
cd apps\web
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

### Mobile Install And Checks

```powershell
cd apps\mobile
npm install
npm run start
npm run android
npm run web
npx expo install --check
npm run typecheck
npm run test:logic
```

There is no mobile lint script yet. Do not claim mobile lint passed unless a lint script is added and run.

For Android emulator API calls, the mobile client rewrites `localhost` to `10.0.2.2`. The Django local default `ALLOWED_HOSTS` includes `10.0.2.2` for this purpose.

## Coding Conventions

- Keep changes small, direct, and aligned with the current app structure.
- Prefer existing serializers, services, and typed API client patterns over new abstractions.
- Use Django REST Framework serializers for API validation.
- Keep simulator logic deterministic and unit-tested.
- Keep mobile API calls graceful: loading state, error state, and local fallback where available.
- Keep web pages static and product-explanatory unless a task explicitly asks for an interactive flow.
- Do not introduce broad refactors while stabilizing a milestone.

## Security Rules

- Never collect M-Pesa PINs, bank passwords, broker credentials, crypto seed phrases, private keys, or one-time passwords.
- Do not log secrets, credentials, precise financial details, or personal notes.
- Read secrets from environment variables, not source files.
- Keep CORS and `ALLOWED_HOSTS` narrow outside local development.
- Use authenticated permissions before exposing private journal, portfolio, consent, or professional-review data.
- Add audit events for sensitive writes or data-sharing actions.
- Treat temporary Basic Auth as a development placeholder only.
- Do not add external financial integrations without a separate security and compliance task.

## Privacy Rules

- Users may use exact, rounded, range, or hidden amount modes.
- Journal entries are private by default.
- Portfolio mirror data is manually entered and private by default.
- Professional sharing must be explicit, scoped, time-limited, revocable, and audited.
- Offline/mock mode must not send data to external services.
- Do not add analytics, tracking, AI calls, or third-party SDKs without explicit consent and review.

## Do Not Build Yet

- Payments or wallet balances.
- M-Pesa integrations.
- Bank, broker, MMF, crypto exchange, or SACCO account linking.
- Investment execution, order placement, custody, or money movement.
- OpenAI or other AI-provider calls.
- Real professional booking or payment workflows.
- Product recommendations presented as personalized financial advice.
- Automated portfolio imports.
- Production onboarding or KYC flows.

## Done Criteria For Future Codex Tasks

- The requested behavior is implemented with minimal scope creep.
- Backend tests pass when backend code changes.
- Backend Ruff and Black checks pass when Python code changes.
- Migrations are created, checked, and applied when models change.
- Seed data remains idempotent when catalog defaults change.
- Web lint, typecheck, and build pass when web code changes.
- Mobile Expo dependency check, TypeScript check, and simulator tests pass when mobile code changes.
- API/mobile flows have graceful loading, error, and offline/mock fallback states.
- Security and privacy boundaries above are preserved.
- Documentation is updated when commands, endpoints, environment variables, or product boundaries change.
