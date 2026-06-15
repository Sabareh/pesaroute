from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from knowledge.models import DataSource
from knowledge.services import mark_source_records_stale


class Command(BaseCommand):
    help = "Mark staged records for a source as stale so admins can review freshness."

    def add_arguments(self, parser):
        parser.add_argument("--source", required=True, help="DataSource slug.")
        parser.add_argument("--reason", default="", help="Optional stale reason.")

    def handle(self, *args, **options):
        source = DataSource.objects.filter(slug=options["source"]).first()
        if not source:
            raise CommandError(f"Unknown data source: {options['source']}")
        count = mark_source_records_stale(source, reason=options["reason"])
        self.stdout.write(self.style.SUCCESS(f"Marked {count} source records stale for {source.slug}."))
