"""Remove generic / placeholder products, passports, and providers across the catalog.

Generic items are the old "Generic ..." seed rows (e.g. "Generic Money Market Fund",
"Generic educational provider"). Named education routes (NSE/SACCO/Land/Crypto/etc.)
are NOT generic and are kept.

Usage:
    python manage.py purge_generic_products --dry-run
    python manage.py purge_generic_products --apply
"""

from django.core.management.base import BaseCommand
from django.db.models import Q

from catalog.models import ProductPassport, Provider
from planning.models import InvestmentProduct

# Case-insensitive name markers that identify generic placeholder rows.
GENERIC_MARKERS = ["generic", "sample ", "example ", "placeholder", "lorem", "demo ", "test product"]


def _generic_q(field: str = "name") -> Q:
    q = Q()
    for marker in GENERIC_MARKERS:
        q |= Q(**{f"{field}__istartswith": marker}) | Q(**{f"{field}__icontains": f" {marker.strip()} "})
    return q


class Command(BaseCommand):
    help = "Delete generic placeholder products, passports, and providers (keeps named education routes)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="List what would be deleted without deleting.")
        parser.add_argument("--apply", action="store_true", help="Actually delete the generic rows.")

    def handle(self, *args, **options):
        apply = options["apply"] and not options["dry_run"]
        mode = "APPLY" if apply else "DRY-RUN"
        self.stdout.write(self.style.MIGRATE_HEADING(f"Purging generic catalog rows [{mode}]"))

        generic_providers = Provider.objects.filter(_generic_q())
        # Generic by name OR owned by a generic placeholder provider (old seed pages).
        products = InvestmentProduct.objects.filter(_generic_q() | Q(provider__in=generic_providers))
        passports = ProductPassport.objects.filter(_generic_q() | Q(provider__in=generic_providers))

        for label, qs in (
            ("InvestmentProduct", products),
            ("ProductPassport", passports),
            ("Provider", generic_providers),
        ):
            names = list(qs.values_list("name", flat=True))
            self.stdout.write(self.style.WARNING(f"\n  {label}: {len(names)} generic row(s)"))
            for name in names:
                self.stdout.write(f"    - {name}")

        if not apply:
            self.stdout.write(self.style.NOTICE("\n  Dry run - nothing deleted. Re-run with --apply to remove."))
            return

        # Delete owned products/passports first, then the generic providers themselves.
        p_count = products.count()
        pp_count = passports.count()
        products.delete()
        passports.delete()
        prov_count = generic_providers.count()
        generic_providers.delete()

        self.stdout.write(
            self.style.SUCCESS(f"\n  Deleted {p_count} product(s), {pp_count} passport(s), {prov_count} provider(s).")
        )
