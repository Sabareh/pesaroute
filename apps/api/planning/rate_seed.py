"""Seed source-linked, dated rate snapshots from a published-rates fixture.

Values are never invented here: every rate comes from the fixture, which records the
exact figure fetched from a cited source plus the date it was reported. Each snapshot
is tied to a SourceReference (URL) and a confidence label, and marked current.
"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import yaml
from django.db.models import Q
from django.utils import timezone

from knowledge.models import DataSource, SourceReference
from planning.models import InvestmentProduct, ProductRateSnapshot

CONFIDENCE_MAP = {
    "official": InvestmentProduct.SourceConfidence.OFFICIAL,
    "provider_reported": InvestmentProduct.SourceConfidence.PROVIDER_REPORTED,
    "third_party": InvestmentProduct.SourceConfidence.THIRD_PARTY,
    "editorial": InvestmentProduct.SourceConfidence.EDITORIAL,
}
SOURCE_TYPE_MAP = {"official": DataSource.SourceType.GOVERNMENT, "third_party": DataSource.SourceType.OTHER}
AUTHORITY_MAP = {
    "official": DataSource.AuthorityLevel.OFFICIAL,
    "provider_reported": DataSource.AuthorityLevel.PROVIDER_SELF_REPORTED,
    "third_party": DataSource.AuthorityLevel.THIRD_PARTY,
    "editorial": DataSource.AuthorityLevel.EDITORIAL,
}


def _resolve_products(entry: dict, group: dict):
    qs = InvestmentProduct.objects.filter(published_status=InvestmentProduct.PublishedStatus.PUBLISHED)
    if "match_name" in entry:
        qs = qs.filter(name__icontains=entry["match_name"])
        if group.get("product_type"):
            qs = qs.filter(product_type=group["product_type"])
    else:
        kw = entry["match_provider"]
        if group.get("product_type"):
            qs = qs.filter(product_type=group["product_type"])
        if group.get("currency"):
            qs = qs.filter(currency=group["currency"])
        qs = qs.filter(Q(provider__name__icontains=kw) | Q(name__icontains=kw))
    return list(qs)


def seed_published_rates(path: str, *, dry_run: bool = False) -> dict:
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    sources_cfg = data.get("sources", {})
    summary = {"snapshots": 0, "products": 0, "unmatched": [], "by_group": {}}

    # Resolve DataSource + SourceReference per configured source.
    source_objs: dict[str, tuple] = {}
    for key, cfg in sources_cfg.items():
        if dry_run:
            source_objs[key] = (None, None, cfg)
            continue
        confidence = cfg.get("confidence", "third_party")
        source, _ = DataSource.objects.get_or_create(
            slug=cfg["slug"],
            defaults={
                "name": cfg.get("name", cfg["slug"]),
                "source_type": SOURCE_TYPE_MAP.get(confidence, DataSource.SourceType.OTHER),
                "authority_level": AUTHORITY_MAP.get(confidence, DataSource.AuthorityLevel.THIRD_PARTY),
                "homepage_url": cfg.get("url", ""),
                "is_active": False,
                "license_notes": "Rate source. Verify the current figure with the provider/regulator before acting.",
            },
        )
        ref, _ = SourceReference.objects.get_or_create(
            source=source,
            title=cfg.get("name", cfg["slug"])[:240],
            url=cfg.get("url", "") or source.homepage_url or "https://pesaroute.local/source",
            defaults={"retrieved_at": timezone.now(), "citation_label": cfg.get("name", cfg["slug"])[:160]},
        )
        source_objs[key] = (source, ref, cfg)

    for group in data.get("rate_groups", []):
        source, ref, cfg = source_objs[group["source"]]
        confidence = CONFIDENCE_MAP.get(
            cfg.get("confidence", "third_party"), InvestmentProduct.SourceConfidence.THIRD_PARTY
        )
        snapshot_date = group["snapshot_date"]
        rate_type = group["rate_type"]
        group_seeded = 0
        for entry in group["entries"]:
            products = _resolve_products(entry, group)
            label = entry.get("match_name") or entry.get("match_provider")
            if not products:
                summary["unmatched"].append(label)
                continue
            for product in products:
                summary["products"] += 1
                if dry_run:
                    continue
                ProductRateSnapshot.objects.filter(product=product).update(is_current=False)
                ProductRateSnapshot.objects.update_or_create(
                    product=product,
                    snapshot_date=snapshot_date,
                    rate_type=rate_type,
                    defaults={
                        "rate_value": Decimal(str(entry["rate_value"])),
                        "rate_period": group.get("rate_period", ProductRateSnapshot.RatePeriod.ANNUAL),
                        "currency": group.get("currency", InvestmentProduct.Currency.KES),
                        "source": source,
                        "source_reference": ref,
                        "confidence": confidence,
                        "is_current": True,
                        "raw_label": f"{entry['rate_value']}% {group.get('raw_label_suffix', '')}".strip(),
                    },
                )
                group_seeded += 1
                # Reflect freshness immediately (the daily scan also recomputes this).
                if product.freshness_status != InvestmentProduct.FreshnessStatus.FRESH:
                    product.freshness_status = InvestmentProduct.FreshnessStatus.FRESH
                    product.save(update_fields=["freshness_status", "updated_at"])
        summary["snapshots"] += group_seeded
        summary["by_group"][group["source"]] = group_seeded
    return summary
