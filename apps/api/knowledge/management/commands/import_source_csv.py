from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from knowledge.models import DataSource
from pipelines.csv_import import CSV_SCHEMAS, import_source_csv


class Command(BaseCommand):
    help = "Import a curated CSV into staged SourceRecord rows for admin review."

    def add_arguments(self, parser):
        parser.add_argument("--source", required=True, help="DataSource slug.")
        parser.add_argument("--file", required=True, help="Path to CSV file.")
        parser.add_argument("--record-kind", required=True, choices=sorted(CSV_SCHEMAS.keys()))
        parser.add_argument("--dry-run", action="store_true", help="Stage only. Do not publish canonical data.")
        parser.add_argument("--auto-approve", action="store_true", help="Approve and publish compatible records.")

    def handle(self, *args, **options):
        source = DataSource.objects.filter(slug=options["source"]).first()
        if not source:
            raise CommandError(f"Unknown data source: {options['source']}")
        run = import_source_csv(
            source=source,
            file_path=options["file"],
            record_kind=options["record_kind"],
            dry_run=options["dry_run"],
            auto_approve=options["auto_approve"],
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"CSV import run={run.id} status={run.status} seen={run.records_seen} "
                f"created={run.records_created} failed={run.records_failed}"
            )
        )
