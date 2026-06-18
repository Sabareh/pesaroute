from __future__ import annotations

import os
import secrets
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = secrets.token_urlsafe(50)
    else:
        raise RuntimeError("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG=false")

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,10.0.2.2").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "accounts",
    "audit",
    "beta",
    "billing",
    "catalog",
    "notifications",
    "payments",
    "planning",
    "risk",
    "journal",
    "knowledge",
    "learning",
    "portfolio",
    "marketplace",
    "privacy",
    "land",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"


def database_from_url(url: str) -> dict[str, object]:
    parsed = urlparse(url)
    if parsed.scheme.startswith("postgres"):
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": parsed.username or "",
            "PASSWORD": parsed.password or "",
            "HOST": parsed.hostname or "localhost",
            "PORT": str(parsed.port or 5432),
        }
    if parsed.scheme == "sqlite":
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": parsed.path.lstrip("/") or BASE_DIR / "db.sqlite3",
        }
    raise RuntimeError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")


DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {"default": database_from_url(DATABASE_URL)}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "auth": os.getenv("THROTTLE_AUTH_RATE", "10/min"),
        "scam_check": os.getenv("THROTTLE_SCAM_CHECK_RATE", "30/min"),
        "simulators": os.getenv("THROTTLE_SIMULATORS_RATE", "60/min"),
        "consultation_create": os.getenv("THROTTLE_CONSULTATION_CREATE_RATE", "10/min"),
        "payments": os.getenv("THROTTLE_PAYMENTS_RATE", "60/min"),
    },
    "PAGE_SIZE": 20,
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:19006,http://localhost:8081",
    ).split(",")
    if origin.strip()
]
if not DEBUG and "*" in CORS_ALLOWED_ORIGINS:
    raise RuntimeError("CORS_ALLOWED_ORIGINS cannot include '*' when DJANGO_DEBUG=false")

CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if origin.strip()]
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "false").lower() == "true"
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", str(not DEBUG)).lower() == "true"
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", str(not DEBUG)).lower() == "true"
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0" if DEBUG else "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("SECURE_HSTS_INCLUDE_SUBDOMAINS", str(not DEBUG)).lower() == "true"
SECURE_HSTS_PRELOAD = os.getenv("SECURE_HSTS_PRELOAD", "false").lower() == "true"
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
# Run the scheduler in East Africa Time so "off-peak" means off-peak for Kenyan users.
CELERY_TIMEZONE = os.getenv("CELERY_TIMEZONE", "Africa/Nairobi")
CELERY_ENABLE_UTC = False
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "false").lower() == "true"

# Daily off-peak refresh of the Kenya investment product catalog. Times are EAT.
# These jobs are source-linked and idempotent: they re-import the canonical fixtures
# and only *stage* live-scraped rows for review — they never invent or publish rates.
from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    "refresh-kenya-product-catalog": {
        "task": "pipelines.tasks.refresh_kenya_product_catalog",
        "schedule": crontab(hour=2, minute=30),  # 02:30 EAT — lowest-traffic window
        "kwargs": {"publish": True},
    },
    "refresh-cma-cis-products": {
        "task": "pipelines.tasks.refresh_cma_cis_products",
        "schedule": crontab(hour=3, minute=0),  # 03:00 EAT
        "kwargs": {"publish": True},
    },
    "refresh-published-rates": {
        "task": "pipelines.tasks.refresh_published_rates",
        "schedule": crontab(hour=3, minute=30),  # 03:30 EAT — re-apply rates after re-import
    },
    "scan-catalog-freshness": {
        "task": "pipelines.tasks.scan_catalog_freshness",
        "schedule": crontab(hour=4, minute=0),  # 04:00 EAT
    },
}

MPESA_ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox").lower()
MPESA_MOCK_MODE = os.getenv("MPESA_MOCK_MODE", str(DEBUG)).lower() == "true"
MPESA_BASE_URL = os.getenv(
    "MPESA_BASE_URL",
    "https://sandbox.safaricom.co.ke" if MPESA_ENVIRONMENT == "sandbox" else "https://api.safaricom.co.ke",
)
MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "")
MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "")
MPESA_BUSINESS_SHORTCODE = os.getenv("MPESA_BUSINESS_SHORTCODE", "")
MPESA_PASSKEY = os.getenv("MPESA_PASSKEY", "")
MPESA_CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "")
MPESA_TRANSACTION_TYPE = os.getenv("MPESA_TRANSACTION_TYPE", "CustomerPayBillOnline")
MPESA_ACCOUNT_REFERENCE = os.getenv("MPESA_ACCOUNT_REFERENCE", "PesaRoute")
MPESA_INTENT_EXPIRY_MINUTES = int(os.getenv("MPESA_INTENT_EXPIRY_MINUTES", "15"))
BETA_ONLY_MODE = os.getenv("BETA_ONLY_MODE", "false").lower() == "true"
