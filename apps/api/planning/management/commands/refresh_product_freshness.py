from __future__ import annotations

from django.core.management.base import BaseCommand

from planning.product_pipeline_services import refresh_product_freshness


class Command(BaseCommand):
    help = "Refresh freshness_status on all InvestmentProduct records based on rate snapshot age."

    def handle(self, *args, **options):
        counts = refresh_product_freshness()
        total = sum(counts.values())
        self.stdout.write(self.style.SUCCESS(f"Refreshed {total} product freshness records:"))
        for label, count in counts.items():
            self.stdout.write(f"  {label}: {count}")
