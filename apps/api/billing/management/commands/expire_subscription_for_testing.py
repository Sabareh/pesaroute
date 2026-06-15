from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from billing.models import Plan
from billing.services import expire_dev_subscriptions


class Command(BaseCommand):
    help = "Expire development-only subscriptions for testing entitlement rollback."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--plan", choices=Plan.Code.values)

    def handle(self, *args, **options):
        user = get_user_model().objects.filter(username=options["username"]).first()
        if not user:
            raise CommandError(f"User {options['username']} not found.")

        count = expire_dev_subscriptions(user, plan_code=options.get("plan"))
        self.stdout.write(self.style.SUCCESS(f"Expired {count} testing subscription(s) for {user.username}."))
