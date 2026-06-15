from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from billing.models import OneOffPackCode
from billing.services import grant_dev_pack


class Command(BaseCommand):
    help = "Grant a development-only one-off guide pack for testing. No payment is collected."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--pack", required=True, choices=OneOffPackCode.values)

    def handle(self, *args, **options):
        user = get_user_model().objects.filter(username=options["username"]).first()
        if not user:
            raise CommandError(f"User {options['username']} not found.")

        purchase = grant_dev_pack(user, options["pack"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Granted testing guide pack {purchase.pack_code} to {user.username}. No payment was collected."
            )
        )
