from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from planning.models import StagedProductUpdate
from planning.product_pipeline_services import approve_staged_product_update


class Command(BaseCommand):
    help = "Approve a specific StagedProductUpdate by ID."

    def add_arguments(self, parser):
        parser.add_argument("--id", type=int, required=True, help="StagedProductUpdate ID to approve.")
        parser.add_argument("--reason", default="", help="Optional reason for approval.")

    def handle(self, *args, **options):
        update_id = options["id"]
        reason = options["reason"]

        try:
            staged = StagedProductUpdate.objects.get(pk=update_id)
        except StagedProductUpdate.DoesNotExist:
            raise CommandError(f"StagedProductUpdate #{update_id} not found.")

        if staged.review_status in {
            StagedProductUpdate.ReviewStatus.APPROVED,
            StagedProductUpdate.ReviewStatus.AUTO_APPROVED,
        }:
            self.stdout.write(
                self.style.WARNING(f"StagedProductUpdate #{update_id} is already approved ({staged.review_status}).")
            )
            return

        if staged.review_status == StagedProductUpdate.ReviewStatus.REJECTED:
            raise CommandError(
                f"StagedProductUpdate #{update_id} was rejected. Create a new import to re-stage."
            )

        changed = approve_staged_product_update(staged, reason=reason)
        if changed:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Approved StagedProductUpdate #{update_id}: "
                    f"{staged.provider_name} / {staged.product_name}"
                )
            )
        else:
            self.stdout.write(self.style.WARNING(f"No change for StagedProductUpdate #{update_id}."))
