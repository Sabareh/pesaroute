"""Report coverage and freshness of the Kenya investment product catalog.

Usage:
    python manage.py report_kenya_product_catalog_completeness
"""

from collections import Counter

from django.core.management.base import BaseCommand

from catalog.models import Provider
from planning.models import InvestmentProduct, StagedInvestmentProduct

# Providers we expect to see at least once (sanity check against the fallback list).
EXPECTED_PROVIDER_MARKERS = [
    "Britam",
    "NCBA",
    "CIC",
    "ICEA",
    "Old Mutual",
    "Sanlam",
    "Cytonn",
    "Etica",
    "Stanbic",
    "Standard Investment",
    "Mansa",
    "Central Bank of Kenya",
    "Nairobi Securities Exchange",
    "Co-op",
    "Genghis",
    "Madison",
    "Zimele",
]


class Command(BaseCommand):
    help = "Report coverage, freshness, and review backlog for the Kenya investment product catalog."

    def handle(self, *args, **options):
        total = InvestmentProduct.objects.count()
        published = InvestmentProduct.objects.filter(
            published_status=InvestmentProduct.PublishedStatus.PUBLISHED
        ).count()
        draft = InvestmentProduct.objects.filter(published_status=InvestmentProduct.PublishedStatus.DRAFT).count()
        with_rate = InvestmentProduct.objects.filter(rate_snapshots__is_current=True).distinct().count()

        self.stdout.write(self.style.MIGRATE_HEADING("Kenya investment product catalog - completeness"))
        self.stdout.write(f"\n  Total products:         {total}")
        self.stdout.write(f"  Published:              {published}")
        self.stdout.write(f"  Draft:                  {draft}")
        self.stdout.write(f"  With current rate:      {with_rate}")
        self.stdout.write(f"  Without rate (latest unavailable): {total - with_rate}")
        self.stdout.write(f"  Providers:              {Provider.objects.count()}")

        self.stdout.write(self.style.HTTP_INFO("\n  By product type:"))
        by_type = Counter(InvestmentProduct.objects.values_list("product_type", flat=True))
        for ptype, count in sorted(by_type.items(), key=lambda kv: -kv[1]):
            self.stdout.write(f"    {ptype:<32} {count}")

        self.stdout.write(self.style.HTTP_INFO("\n  By source confidence:"))
        by_conf = Counter(InvestmentProduct.objects.values_list("source_confidence", flat=True))
        for conf, count in sorted(by_conf.items(), key=lambda kv: -kv[1]):
            self.stdout.write(f"    {conf:<32} {count}")

        review = StagedInvestmentProduct.objects.filter(
            review_status=StagedInvestmentProduct.ReviewStatus.NEEDS_REVIEW
        ).count()
        self.stdout.write(self.style.WARNING(f"\n  Staged needing review:  {review}"))

        self.stdout.write(self.style.HTTP_INFO("\n  Expected-provider check:"))
        # Match provider names, their aliases (in editorial_notes/scheme_name), and product names —
        # e.g. "Britam" lives in products under "British-American Unit Trust Scheme".
        haystack = [n.lower() for n in Provider.objects.values_list("name", flat=True)]
        haystack += [n.lower() for n in InvestmentProduct.objects.values_list("name", flat=True)]
        missing = []
        for marker in EXPECTED_PROVIDER_MARKERS:
            present = any(marker.lower() in n for n in haystack)
            flag = self.style.SUCCESS("ok") if present else self.style.ERROR("MISSING")
            self.stdout.write(f"    {marker:<28} {flag}")
            if not present:
                missing.append(marker)

        if missing:
            self.stdout.write(
                self.style.ERROR(f"\n  {len(missing)} expected provider marker(s) missing: {', '.join(missing)}")
            )
        else:
            self.stdout.write(self.style.SUCCESS("\n  All expected provider markers present."))
