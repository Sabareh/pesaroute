"""Seed indicative county + subcounty land-market data for the Explore map.

Educational learning averages only - NOT a valuation. County names/codes match
the real Kenya county boundaries (geoBoundaries ADM1); subcounty rows are derived
deterministically from the tagged ADM2 GeoJSON so the DB matches the map exactly.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from land.models import LandCountyMarket, LandSubcountyMarket

# (name, region, tier, avg_price_per_acre[KES millions], appreciation %, rental yield %)
COUNTY_DATA = [
    ("Nairobi", "Nairobi Metro", "Prime", 45.0, 6.0, 5.5),
    ("Mombasa", "Coast", "Prime", 30.0, 7.0, 8.0),
    ("Kiambu", "Central", "Hotspot", 18.0, 12.0, 6.0),
    ("Kajiado", "Rift Valley", "Hotspot", 9.0, 15.0, 4.5),
    ("Kilifi", "Coast", "Hotspot", 8.0, 14.0, 9.0),
    ("Machakos", "Eastern", "Hotspot", 6.0, 11.0, 5.0),
    ("Nyeri", "Central", "Stable", 5.0, 8.0, 5.0),
    ("Nakuru", "Rift Valley", "Hotspot", 4.5, 13.0, 6.5),
    ("Kisumu", "Nyanza", "Emerging", 4.0, 9.0, 7.0),
    ("Uasin Gishu", "Rift Valley", "Emerging", 3.5, 10.0, 5.5),
    ("Meru", "Eastern", "Emerging", 2.5, 9.0, 4.0),
    ("Murang'a", "Central", "Stable", 4.5, 9.0, 5.5),
    ("Kirinyaga", "Central", "Stable", 4.0, 8.0, 5.0),
    ("Nyandarua", "Central", "Emerging", 3.0, 9.0, 5.0),
    ("Narok", "Rift Valley", "Emerging", 3.0, 12.0, 4.5),
    ("Bomet", "Rift Valley", "Emerging", 2.5, 8.0, 5.0),
    ("Kericho", "Rift Valley", "Stable", 3.0, 7.0, 6.0),
    ("Nandi", "Rift Valley", "Emerging", 2.5, 8.0, 5.0),
    ("Baringo", "Rift Valley", "Emerging", 1.5, 7.0, 4.5),
    ("Laikipia", "Rift Valley", "Hotspot", 3.5, 12.0, 5.5),
    ("Trans Nzoia", "Rift Valley", "Emerging", 2.5, 8.0, 5.5),
    ("Elgeyo-Marakwet", "Rift Valley", "Emerging", 1.8, 7.0, 4.5),
    ("West Pokot", "Rift Valley", "Emerging", 1.2, 6.0, 4.0),
    ("Samburu", "Rift Valley", "Emerging", 1.0, 6.0, 4.0),
    ("Turkana", "Rift Valley", "Emerging", 0.8, 5.0, 3.5),
    ("Kwale", "Coast", "Hotspot", 5.0, 12.0, 7.0),
    ("Lamu", "Coast", "Emerging", 4.0, 10.0, 8.0),
    ("Taita Taveta", "Coast", "Emerging", 2.5, 9.0, 5.0),
    ("Tana River", "Coast", "Emerging", 1.2, 7.0, 4.0),
    ("Embu", "Eastern", "Stable", 4.0, 9.0, 5.0),
    ("Kitui", "Eastern", "Emerging", 1.8, 8.0, 4.5),
    ("Makueni", "Eastern", "Emerging", 2.5, 9.0, 5.0),
    ("Tharaka", "Eastern", "Emerging", 2.0, 8.0, 4.5),
    ("Isiolo", "Eastern", "Emerging", 1.5, 9.0, 4.5),
    ("Marsabit", "Eastern", "Emerging", 0.8, 6.0, 3.5),
    ("Mandera", "Eastern", "Emerging", 0.7, 5.0, 3.0),
    ("Wajir", "Eastern", "Emerging", 0.7, 5.0, 3.0),
    ("Garissa", "Eastern", "Emerging", 1.0, 6.0, 4.0),
    ("Siaya", "Nyanza", "Emerging", 2.5, 8.0, 6.0),
    ("Homa Bay", "Nyanza", "Emerging", 2.5, 9.0, 6.5),
    ("Migori", "Nyanza", "Emerging", 2.5, 9.0, 6.0),
    ("Kisii", "Nyanza", "Stable", 3.5, 8.0, 6.0),
    ("Nyamira", "Nyanza", "Emerging", 3.0, 8.0, 5.5),
    ("Kakamega", "Western", "Stable", 3.0, 8.0, 6.0),
    ("Bungoma", "Western", "Emerging", 2.5, 8.0, 5.5),
    ("Busia", "Western", "Emerging", 2.5, 8.0, 6.0),
    ("Vihiga", "Western", "Emerging", 3.0, 8.0, 5.5),
]


def _slug(name: str) -> str:
    return "ke-" + "".join(ch.lower() if ch.isalnum() else "-" for ch in name).strip("-")


def _hash(name: str) -> int:
    return sum(ord(c) for c in name)


class Command(BaseCommand):
    help = "Seed indicative county + subcounty land-market data for the Explore map."

    @transaction.atomic
    def handle(self, *args, **options):
        counties: dict[str, LandCountyMarket] = {}
        for name, region, tier, price, apprec, yld in COUNTY_DATA:
            obj, _ = LandCountyMarket.objects.update_or_create(
                name=name,
                defaults={
                    "code": _slug(name),
                    "region": region,
                    "tier": tier,
                    "avg_price_per_acre": Decimal(str(price)),
                    "appreciation_pct": Decimal(str(apprec)),
                    "rental_yield_pct": Decimal(str(yld)),
                },
            )
            counties[name] = obj
        self.stdout.write(f"Counties seeded: {len(counties)}")

        # Derive subcounty rows from the tagged ADM2 GeoJSON so they match the map.
        geo = Path(__file__).resolve().parents[4] / "web" / "public" / "geo" / "kenya-subcounties.geojson"
        sub_count = 0
        if geo.exists():
            data = json.loads(geo.read_text(encoding="utf-8"))
            LandSubcountyMarket.objects.all().delete()
            rows: list[LandSubcountyMarket] = []
            for feat in data.get("features", []):
                props = feat.get("properties", {})
                sub_name = props.get("name")
                county_name = props.get("county")
                county = counties.get(county_name)
                if not sub_name or county is None:
                    continue
                h = _hash(sub_name)
                price_factor = 0.45 + (h % 1000) / 1000 * 0.9  # 0.45x - 1.35x of county avg
                sub_price = max(Decimal("0.3"), (county.avg_price_per_acre * Decimal(str(round(price_factor, 3)))).quantize(Decimal("0.1")))
                sub_apprec = (county.appreciation_pct + Decimal(h % 6 - 2)).quantize(Decimal("0.1"))
                rows.append(
                    LandSubcountyMarket(county=county, name=sub_name, avg_price_per_acre=sub_price, appreciation_pct=sub_apprec)
                )
            LandSubcountyMarket.objects.bulk_create(rows)
            sub_count = len(rows)
            self.stdout.write(f"Subcounties seeded from GeoJSON: {sub_count}")
        else:
            self.stdout.write(self.style.WARNING(f"Subcounty GeoJSON not found at {geo}; skipped subcounties."))

        self.stdout.write(self.style.SUCCESS(f"Done. {len(counties)} counties, {sub_count} subcounties."))
