"""Import the source-linked Kenya investment product catalog from YAML fixtures.

Usage:
    python manage.py import_kenya_product_catalog --path content/catalog/kenya_products --dry-run
    python manage.py import_kenya_product_catalog --path content/catalog/kenya_products --publish

The importer never invents rates, minimums, or yields. Products are created with
"latest rate unavailable" until a source-linked snapshot exists. Possible duplicates
are flagged as needs_review and never auto-merged.
"""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from planning.catalog_import import import_catalog


class Command(BaseCommand):
    help = "Import the Kenya investment product catalog from YAML fixtures (source-linked, no invented rates)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default="content/catalog/kenya_products",
            help="Path to a fixture directory or a single YAML file (relative to the api app or absolute).",
        )
        parser.add_argument("--dry-run", action="store_true", help="Parse and report counts without writing.")
        parser.add_argument("--publish", action="store_true", help="Publish confident products (else they stay draft).")

    def handle(self, *args, **options):
        raw_path = options["path"]
        path = Path(raw_path)
        if not path.is_absolute() and not path.exists():
            path = Path(settings.BASE_DIR) / raw_path
        if not path.exists():
            self.stderr.write(self.style.ERROR(f"Path not found: {path}"))
            return

        dry_run = options["dry_run"]
        publish = options["publish"] and not dry_run

        mode = "DRY-RUN" if dry_run else ("PUBLISH" if publish else "DRAFT")
        self.stdout.write(self.style.MIGRATE_HEADING(f"Importing Kenya product catalog [{mode}] from {path}"))

        batch = import_catalog(str(path), dry_run=dry_run, publish=publish)

        self.stdout.write("")
        self.stdout.write(f"  Records seen:           {batch.records_seen}")
        self.stdout.write(f"  Providers created:      {batch.providers_created}")
        self.stdout.write(f"  Providers reused:       {batch.providers_updated}")
        self.stdout.write(self.style.SUCCESS(f"  Products created:       {batch.products_created}"))
        self.stdout.write(f"  Products updated:       {batch.products_updated}")
        if batch.products_needing_review:
            self.stdout.write(self.style.WARNING(f"  Flagged for review:     {batch.products_needing_review}"))
        self.stdout.write(f"  Batch status:           {batch.status}")
        if dry_run:
            self.stdout.write(self.style.NOTICE("\n  Dry run - nothing was written. Re-run with --publish to persist."))
