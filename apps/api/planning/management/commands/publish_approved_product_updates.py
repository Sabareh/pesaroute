from __future__ import annotations

from django.core.management.base import BaseCommand

from planning.models import StagedProductUpdate
from planning.product_pipeline_services import publish_staged_product_update


class Command(BaseCommand):
    help = "Publish all approved StagedProductUpdate records as ProductRateSnapshots."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be published without writing any records.",
        )
        parser.add_argument(
            "--source",
            default="",
            help="Optional: filter to a specific DataSource slug.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        source_slug = options["source"]

        qs = StagedProductUpdate.objects.filter(
            review_status__in=[
                StagedProductUpdate.ReviewStatus.APPROVED,
                StagedProductUpdate.ReviewStatus.AUTO_APPROVED,
            ]
        ).select_related("source", "product")

        if source_slug:
            qs = qs.filter(source__slug=source_slug)

        total = qs.count()
        if not total:
            self.stdout.write(self.style.WARNING("No approved staged product updates found."))
            return

        self.stdout.write(f"Found {total} approved update(s) to publish.")
        published = 0
        skipped = 0

        for staged in qs:
            label = f"  #{staged.id} {staged.provider_name} / {staged.product_name}"
            if dry_run:
                self.stdout.write(f"{label} [DRY RUN — would publish]")
                continue
            success = publish_staged_product_update(staged)
            if success:
                published += 1
                self.stdout.write(self.style.SUCCESS(f"{label} → published"))
            else:
                skipped += 1
                self.stdout.write(self.style.WARNING(f"{label} → skipped (no valid rate or product)"))

        if dry_run:
            self.stdout.write(self.style.WARNING(f"Dry run complete — {total} updates would be published."))
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Done: {published} published, {skipped} skipped.")
            )
