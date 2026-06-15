from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from knowledge.models import DataSource
from pipelines.registry import CONNECTOR_CLASSES, get_connector


class Command(BaseCommand):
    help = "Run safe PesaRoute data pipelines for official/public sources."

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument("--source", help="Source slug to run.")
        group.add_argument("--all-active", action="store_true", help="Run all active supported connectors.")
        parser.add_argument(
            "--dry-run", action="store_true", help="Fetch and stage only. Never publish canonical data."
        )
        parser.add_argument(
            "--auto-approve", action="store_true", help="Publish low-risk connector output when supported."
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        auto_approve = options["auto_approve"]
        source_slugs = []
        if options["source"]:
            source_slugs = [options["source"]]
        elif options["all_active"]:
            source_slugs = list(
                DataSource.objects.filter(slug__in=CONNECTOR_CLASSES.keys(), is_active=True).values_list(
                    "slug", flat=True
                )
            )
            if not source_slugs:
                self.stdout.write(self.style.WARNING("No active supported data connectors are enabled."))
                return

        for source_slug in source_slugs:
            try:
                connector = get_connector(source_slug)
            except KeyError as exc:
                raise CommandError(str(exc)) from exc
            result = connector.run(dry_run=dry_run, auto_approve=auto_approve)
            run = result.ingestion_run
            style = self.style.SUCCESS if run.status != "failed" else self.style.ERROR
            self.stdout.write(
                style(
                    f"{source_slug}: run={run.id} status={run.status} seen={run.records_seen} "
                    f"created={run.records_created} updated={run.records_updated} failed={run.records_failed}"
                )
            )
