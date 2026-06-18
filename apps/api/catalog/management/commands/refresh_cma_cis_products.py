"""Refresh the CMA approved CIS products from the canonical fallback fixture.

The shipped ``cma_cis_fallback.yaml`` is the source of truth. This command re-imports
it (idempotently) so the catalog stays in sync, and optionally publishes the confident,
non-review products. Live scraping (the connector) only *stages* rows for review and is
opt-in via ``--live`` because it is network- and parser-dependent.

Usage:
    python manage.py refresh_cma_cis_products --dry-run
    python manage.py refresh_cma_cis_products --publish-approved
    python manage.py refresh_cma_cis_products --live --dry-run    # also try the live connector
"""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from planning.catalog_import import import_catalog

CIS_FIXTURE = "content/catalog/kenya_products/cma_cis_fallback.yaml"


class Command(BaseCommand):
    help = "Refresh CMA CIS products from the canonical fallback fixture (idempotent, no invented rates)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report counts without writing.")
        parser.add_argument("--publish-approved", action="store_true", help="Publish confident, non-review products.")
        parser.add_argument("--live", action="store_true", help="Also run the live CMA connector (stages for review).")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        publish = options["publish_approved"] and not dry_run

        fixture = Path(settings.BASE_DIR) / CIS_FIXTURE
        if not fixture.exists():
            self.stderr.write(self.style.ERROR(f"CIS fixture not found: {fixture}"))
            return

        mode = "DRY-RUN" if dry_run else ("PUBLISH" if publish else "DRAFT")
        self.stdout.write(self.style.MIGRATE_HEADING(f"Refreshing CMA CIS products [{mode}]"))

        batch = import_catalog(str(fixture), dry_run=dry_run, publish=publish)
        self.stdout.write(f"  Schemes/products seen:  {batch.records_seen}")
        self.stdout.write(self.style.SUCCESS(f"  Products created:       {batch.products_created}"))
        self.stdout.write(f"  Products updated:       {batch.products_updated}")
        self.stdout.write(self.style.WARNING(f"  Flagged for review:     {batch.products_needing_review}"))

        if options["live"]:
            self._run_live(dry_run)

        if dry_run:
            self.stdout.write(self.style.NOTICE("\n  Dry run - nothing written."))

    def _run_live(self, dry_run: bool):
        self.stdout.write(self.style.HTTP_INFO("\n  Attempting live CMA connector (staged for review only)..."))
        try:
            from pipelines.registry import get_connector

            connector = get_connector("cma-approved-collective-investment-schemes")
            result = connector.run(dry_run=dry_run, auto_approve=False)
            self.stdout.write(
                f"    Live run: {result.ingestion_run.status}, "
                f"{result.ingestion_run.records_seen} record(s) staged for review."
            )
        except Exception as exc:  # network/parser failure must not break the refresh
            self.stdout.write(
                self.style.WARNING(f"    Live connector unavailable ({exc}); fallback fixture is canonical.")
            )
