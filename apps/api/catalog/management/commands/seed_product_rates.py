"""Seed source-linked, dated rate snapshots for catalog products.

Reads content/catalog/kenya_products/published_rates.yaml — official CBK Treasury
bill rates and third-party-tracked MMF effective annual yields — and attaches each as
a current ProductRateSnapshot with its source and date. No rate is invented.

Usage:
    python manage.py seed_product_rates --dry-run
    python manage.py seed_product_rates
"""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from planning.rate_seed import seed_published_rates

RATES_FIXTURE = "content/catalog/kenya_products/published_rates.yaml"


class Command(BaseCommand):
    help = "Seed source-linked, dated rate snapshots from published_rates.yaml (no invented rates)."

    def add_arguments(self, parser):
        parser.add_argument("--path", default=RATES_FIXTURE, help="Path to the published-rates YAML fixture.")
        parser.add_argument("--dry-run", action="store_true", help="Report matches without writing snapshots.")

    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.is_absolute() and not path.exists():
            path = Path(settings.BASE_DIR) / options["path"]
        if not path.exists():
            self.stderr.write(self.style.ERROR(f"Rates fixture not found: {path}"))
            return

        mode = "DRY-RUN" if options["dry_run"] else "SEED"
        self.stdout.write(self.style.MIGRATE_HEADING(f"Seeding product rates [{mode}] from {path.name}"))
        summary = seed_published_rates(str(path), dry_run=options["dry_run"])

        self.stdout.write(self.style.SUCCESS(f"  Snapshots written:   {summary['snapshots']}"))
        self.stdout.write(f"  Products matched:    {summary['products']}")
        for source_key, count in summary["by_group"].items():
            self.stdout.write(f"    {source_key:<22} {count}")
        if summary["unmatched"]:
            self.stdout.write(
                self.style.WARNING(
                    f"  Unmatched entries ({len(summary['unmatched'])}): {', '.join(summary['unmatched'])}"
                )
            )
        if options["dry_run"]:
            self.stdout.write(self.style.NOTICE("  Dry run - nothing written."))
