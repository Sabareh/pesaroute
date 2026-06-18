"""Celery tasks for keeping the Kenya investment product catalog fresh.

Scheduled daily off-peak (EAT) via ``CELERY_BEAT_SCHEDULE`` in settings, run by the
``beat`` + ``worker`` services in docker-compose. Every task is idempotent and
source-linked: it re-imports the canonical YAML fixtures and only *stages* any
live-scraped rows for review. No task invents, publishes, or promises rates.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from pathlib import Path

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

CATALOG_FIXTURE_DIR = "content/catalog/kenya_products"
CIS_FIXTURE = "content/catalog/kenya_products/cma_cis_fallback.yaml"
RATES_FIXTURE = "content/catalog/kenya_products/published_rates.yaml"


@shared_task(name="pipelines.tasks.refresh_kenya_product_catalog")
def refresh_kenya_product_catalog(publish: bool = True) -> dict:
    """Re-import every catalog fixture (CIS + government securities + routes)."""
    from planning.catalog_import import import_catalog

    path = Path(settings.BASE_DIR) / CATALOG_FIXTURE_DIR
    batch = import_catalog(str(path), dry_run=False, publish=publish)
    summary = {
        "records_seen": batch.records_seen,
        "products_created": batch.products_created,
        "products_updated": batch.products_updated,
        "products_needing_review": batch.products_needing_review,
        "status": batch.status,
    }
    logger.info("refresh_kenya_product_catalog: %s", summary)
    return summary


@shared_task(name="pipelines.tasks.refresh_cma_cis_products")
def refresh_cma_cis_products(publish: bool = True, live: bool = False) -> dict:
    """Refresh CMA CIS products from the canonical fallback fixture; optionally try live."""
    from planning.catalog_import import import_catalog

    fixture = Path(settings.BASE_DIR) / CIS_FIXTURE
    batch = import_catalog(str(fixture), dry_run=False, publish=publish)
    summary = {
        "records_seen": batch.records_seen,
        "products_created": batch.products_created,
        "products_updated": batch.products_updated,
        "products_needing_review": batch.products_needing_review,
        "status": batch.status,
    }
    if live:
        try:
            from pipelines.registry import get_connector

            result = get_connector("cma-approved-collective-investment-schemes").run(auto_approve=False)
            summary["live_status"] = result.ingestion_run.status
            summary["live_records"] = result.ingestion_run.records_seen
        except Exception as exc:  # network/parser failure must not fail the task
            logger.warning("CMA live connector unavailable: %s", exc)
            summary["live_status"] = "unavailable"
    logger.info("refresh_cma_cis_products: %s", summary)
    return summary


@shared_task(name="pipelines.tasks.refresh_published_rates")
def refresh_published_rates() -> dict:
    """Re-apply source-linked, dated rate snapshots after the nightly catalog re-import."""
    from planning.rate_seed import seed_published_rates

    path = Path(settings.BASE_DIR) / RATES_FIXTURE
    if not path.exists():
        return {"snapshots": 0, "note": "no rates fixture"}
    summary = seed_published_rates(str(path), dry_run=False)
    logger.info("refresh_published_rates: %s", {k: summary[k] for k in ("snapshots", "products")})
    return {"snapshots": summary["snapshots"], "products": summary["products"]}


@shared_task(name="pipelines.tasks.scan_catalog_freshness")
def scan_catalog_freshness() -> dict:
    """Re-label InvestmentProduct freshness from current rate-snapshot age. No rates invented."""
    from planning.models import InvestmentProduct

    now = timezone.now()
    counts = {"fresh": 0, "acceptable": 0, "stale": 0, "unknown": 0}
    for product in InvestmentProduct.objects.prefetch_related("rate_snapshots").all():
        current = product.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
        if not current:
            label = InvestmentProduct.FreshnessStatus.UNKNOWN
        else:
            age = now.date() - current.snapshot_date
            if age <= timedelta(days=30):
                label = InvestmentProduct.FreshnessStatus.FRESH
            elif age <= timedelta(days=90):
                label = InvestmentProduct.FreshnessStatus.ACCEPTABLE
            else:
                label = InvestmentProduct.FreshnessStatus.STALE
        if product.freshness_status != label:
            product.freshness_status = label
            product.save(update_fields=["freshness_status", "updated_at"])
        counts[label] += 1
    logger.info("scan_catalog_freshness: %s", counts)
    return counts
