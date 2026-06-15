from __future__ import annotations

from django.core.management.base import BaseCommand

from knowledge.models import DataSource
from pipelines.registry import CONNECTOR_CLASSES, ensure_supported_sources


class Command(BaseCommand):
    help = "List configured PesaRoute data sources and supported pipeline connectors."

    def add_arguments(self, parser):
        parser.add_argument(
            "--ensure-supported", action="store_true", help="Create/update supported source rows first."
        )

    def handle(self, *args, **options):
        if options["ensure_supported"]:
            ensure_supported_sources()
        for source in DataSource.objects.filter(slug__in=CONNECTOR_CLASSES.keys()).order_by("slug"):
            active = "active" if source.is_active else "inactive"
            self.stdout.write(
                f"{source.slug} | {active} | {source.parser_strategy} | {source.update_frequency} | {source.data_url}"
            )
