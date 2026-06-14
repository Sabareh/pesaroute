from django.core.management.base import BaseCommand

from billing.services import seed_default_plans


class Command(BaseCommand):
    help = "Seed PesaRoute billing plans for local development."

    def handle(self, *args, **options):
        plans = seed_default_plans()
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(plans)} billing plans."))
