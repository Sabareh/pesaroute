from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from knowledge.models import DataSource
from pipelines.product_csv_import import import_product_rates_csv


class Command(BaseCommand):
    help = "Import product rates from a curated CSV file into StagedProductUpdate records."

    def add_arguments(self, parser):
        parser.add_argument("--source", required=True, help="DataSource slug for this import.")
        parser.add_argument("--file", required=True, help="Path to the CSV file.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and report; do not write any records.",
        )
        parser.add_argument(
            "--auto-approve",
            action="store_true",
            help="Auto-approve and publish. Only use for trusted internal curated CSVs.",
        )

    def handle(self, *args, **options):
        source_slug = options["source"]
        file_path = options["file"]
        dry_run = options["dry_run"]
        auto_approve = options["auto_approve"]

        if not Path(file_path).exists():
            raise CommandError(f"File not found: {file_path}")

        try:
            source = DataSource.objects.get(slug=source_slug)
        except DataSource.DoesNotExist:
            raise CommandError(
                f"DataSource '{source_slug}' not found. "
                "Create it via admin or seed_kenya_investment_knowledge first."
            )

        if auto_approve:
            self.stdout.write(
                self.style.WARNING(
                    "WARNING: --auto-approve is set. Staged updates will be published immediately. "
                    "Only use this for trusted internal curated data with verified sources."
                )
            )

        run = import_product_rates_csv(
            source=source,
            file_path=file_path,
            dry_run=dry_run,
            auto_approve=auto_approve and not dry_run,
        )

        style = self.style.SUCCESS if run.status not in {"failed"} else self.style.ERROR
        mode = "DRY RUN" if dry_run else "IMPORT"
        self.stdout.write(
            style(
                f"[{mode}] source={source_slug} status={run.status} "
                f"seen={run.records_seen} created={run.records_created} failed={run.records_failed}"
            )
        )
        issues = run.quality_issues.all()
        if issues.exists():
            self.stdout.write(self.style.WARNING(f"  {issues.count()} data quality issue(s):"))
            for issue in issues[:20]:
                self.stdout.write(f"    [{issue.severity}] {issue.message}")

        if dry_run:
            self.stdout.write(self.style.WARNING("  Dry run complete — no records written."))
        elif run.status == "needs_review":
            self.stdout.write(
                self.style.WARNING(
                    "  Staged updates created. Review in admin and run publish_approved_product_updates."
                )
            )
