from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from knowledge.models import DataSource
from pipelines.registry import CONNECTOR_CLASSES, INACTIVE_STUB_SLUGS, get_connector


class Command(BaseCommand):
    help = "Run a product data pipeline connector (dry-run by default)."

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument("--source", help="Source slug to run.")
        group.add_argument("--all-active", action="store_true", help="Run all active product connectors.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=True,
            help="Fetch and stage only; do not publish. Default: True.",
        )
        parser.add_argument(
            "--no-dry-run",
            dest="dry_run",
            action="store_false",
            help="Run for real (creates StagedProductUpdate records).",
        )
        parser.add_argument(
            "--auto-approve",
            action="store_true",
            help="Auto-approve high-confidence staged updates (not recommended for provider stubs).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        auto_approve = options["auto_approve"]

        product_connector_slugs = set(CONNECTOR_CLASSES.keys()) - INACTIVE_STUB_SLUGS
        from pipelines.product_connector import ProductDataConnector

        product_only_slugs = set()
        for slug, cls in CONNECTOR_CLASSES.items():
            if issubclass(cls, ProductDataConnector):
                product_only_slugs.add(slug)

        if options["source"]:
            source_slugs = [options["source"]]
        else:
            source_slugs = list(
                DataSource.objects.filter(
                    slug__in=product_only_slugs, is_active=True
                ).values_list("slug", flat=True)
            )
            if not source_slugs:
                self.stdout.write(self.style.WARNING("No active product data connectors found."))
                return

        for source_slug in source_slugs:
            if source_slug in INACTIVE_STUB_SLUGS:
                self.stdout.write(
                    self.style.WARNING(f"{source_slug}: skipped (inactive stub — activate DataSource to use)")
                )
                continue
            try:
                connector = get_connector(source_slug)
            except KeyError as exc:
                raise CommandError(str(exc)) from exc

            from pipelines.product_connector import ProductDataConnector as PDC

            if isinstance(connector, PDC):
                ingestion_run, staged = connector.run(dry_run=dry_run, auto_approve=auto_approve)
                style = self.style.SUCCESS if ingestion_run.status != "failed" else self.style.ERROR
                self.stdout.write(
                    style(
                        f"{source_slug}: run={ingestion_run.id} status={ingestion_run.status} "
                        f"seen={ingestion_run.records_seen} staged={len(staged)} "
                        f"dry_run={dry_run}"
                    )
                )
            else:
                result = connector.run(dry_run=dry_run, auto_approve=auto_approve)
                run = result.ingestion_run
                style = self.style.SUCCESS if run.status != "failed" else self.style.ERROR
                self.stdout.write(
                    style(
                        f"{source_slug}: run={run.id} status={run.status} seen={run.records_seen} "
                        f"created={run.records_created} updated={run.records_updated}"
                    )
                )
