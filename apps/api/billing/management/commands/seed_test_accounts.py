"""Create development test accounts for web + Android testing. No payment is collected.

Creates a premium tester (manual dev subscription) and a free tester so you can compare
free-tier vs premium behaviour. Idempotent: re-running resets passwords and re-grants the
premium subscription. DEV/testing only — do not run against production data.

Usage:
    python manage.py seed_test_accounts
    python manage.py seed_test_accounts --days 365
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from billing.models import Plan
from billing.services import entitlement_snapshot, grant_dev_subscription

PREMIUM = {"username": "premium.tester", "email": "premium.tester@pesaroute.test", "password": "PesaRoutePremium#2026"}
FREE = {"username": "free.tester", "email": "free.tester@pesaroute.test", "password": "PesaRouteFree#2026"}


class Command(BaseCommand):
    help = "Create premium + free development test accounts (no payment collected)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=365, help="Premium subscription length in days.")

    def _upsert(self, spec):
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=spec["username"], defaults={"email": spec["email"], "is_active": True}
        )
        user.email = spec["email"]
        user.is_active = True
        user.set_password(spec["password"])
        user.save()
        return user, created

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding development test accounts"))

        free_user, _ = self._upsert(FREE)
        premium_user, _ = self._upsert(PREMIUM)
        subscription = grant_dev_subscription(premium_user, plan_code=Plan.Code.PREMIUM_MONTHLY, days=options["days"])

        snap = entitlement_snapshot(premium_user)
        self.stdout.write(self.style.SUCCESS("\n  Premium tester (web + Android):"))
        self.stdout.write(f"    username: {PREMIUM['username']}")
        self.stdout.write(f"    password: {PREMIUM['password']}")
        self.stdout.write(f"    plan:     {subscription.plan.code} (manual dev grant, {options['days']} days)")
        self.stdout.write(f"    premium_learning entitlement: {snap['features']['premium_learning']}")

        self.stdout.write(self.style.SUCCESS("\n  Free tester (for comparison):"))
        self.stdout.write(f"    username: {FREE['username']}")
        self.stdout.write(f"    password: {FREE['password']}")
        self.stdout.write(
            self.style.NOTICE(
                "\n  Log in via the app's sign-in screen with username + password. No payment is collected."
            )
        )
