from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from billing.models import OneOffPackCode, Plan
from billing.services import grant_dev_pack, grant_dev_subscription


class Command(BaseCommand):
    help = "Grant a development-only subscription or guide pack. No payment is collected."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--plan", default=Plan.Code.PREMIUM_MONTHLY, choices=Plan.Code.values)
        parser.add_argument("--days", type=int, default=30)
        parser.add_argument("--pack", choices=OneOffPackCode.values)

    def handle(self, *args, **options):
        user = get_user_model().objects.filter(username=options["username"]).first()
        if not user:
            raise CommandError(f"User {options['username']} not found.")

        if options.get("pack"):
            purchase = grant_dev_pack(user, options["pack"])
            self.stdout.write(self.style.SUCCESS(f"Granted development pack {purchase.pack_code} to {user.username}."))
            return

        subscription = grant_dev_subscription(user, plan_code=options["plan"], days=options["days"])
        message = (
            f"Granted development subscription {subscription.plan.code} "
            f"to {user.username} for {options['days']} days."
        )
        self.stdout.write(self.style.SUCCESS(message))
