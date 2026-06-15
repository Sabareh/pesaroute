from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from billing.models import Plan
from billing.services import grant_dev_subscription


class Command(BaseCommand):
    help = "Grant a development-only premium subscription for testing. No payment is collected."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument(
            "--plan",
            default=Plan.Code.PREMIUM_MONTHLY,
            choices=[Plan.Code.PREMIUM_MONTHLY, Plan.Code.PREMIUM_YEARLY],
        )
        parser.add_argument("--days", type=int, default=30)

    def handle(self, *args, **options):
        user = get_user_model().objects.filter(username=options["username"]).first()
        if not user:
            raise CommandError(f"User {options['username']} not found.")

        subscription = grant_dev_subscription(user, plan_code=options["plan"], days=options["days"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Granted testing premium subscription {subscription.plan.code} to {user.username} "
                f"for {options['days']} days. No payment was collected."
            )
        )
