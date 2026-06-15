from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from django.utils import timezone

from catalog.models import ProductPassport, Provider
from knowledge.models import DataChangeEvent, InvestmentProvider, ListedCompany, SaccoEntity


class FreshnessLabel:
    FRESH = "fresh"
    ACCEPTABLE = "acceptable"
    STALE = "stale"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class FreshnessRule:
    slug_contains: str
    fresh_days: int
    acceptable_days: int


FRESHNESS_RULES = [
    FreshnessRule("cbk-treasury", 14, 28),
    FreshnessRule("nse-listed", 30, 60),
    FreshnessRule("cma-", 45, 75),
    FreshnessRule("sasra", 90, 365),
    FreshnessRule("rba-", 75, 120),
    FreshnessRule("ira-", 75, 120),
    FreshnessRule("generic", 180, 240),
]


def classify_freshness(last_verified_at, *, source_slug: str = "generic") -> str:
    if not last_verified_at:
        return FreshnessLabel.UNKNOWN
    now = timezone.now()
    rule = next((item for item in FRESHNESS_RULES if item.slug_contains in source_slug), FRESHNESS_RULES[-1])
    age = now - last_verified_at
    if age <= timedelta(days=rule.fresh_days):
        return FreshnessLabel.FRESH
    if age <= timedelta(days=rule.acceptable_days):
        return FreshnessLabel.ACCEPTABLE
    return FreshnessLabel.STALE


def scan_data_freshness() -> dict[str, int]:
    counts = {FreshnessLabel.FRESH: 0, FreshnessLabel.ACCEPTABLE: 0, FreshnessLabel.STALE: 0, FreshnessLabel.UNKNOWN: 0}
    for model in (Provider, ProductPassport):
        for obj in model.objects.all():
            source_slug = obj.source_references.first().source.slug if obj.source_references.exists() else "generic"
            label = classify_freshness(obj.last_verified_at, source_slug=source_slug)
            if getattr(obj, "data_freshness", None) != label:
                old_value = {"data_freshness": getattr(obj, "data_freshness", "")}
                obj.data_freshness = label
                obj.save(update_fields=["data_freshness", "updated_at"])
                if label == FreshnessLabel.STALE:
                    DataChangeEvent.objects.create(
                        object_type=obj.__class__.__name__,
                        object_id=str(obj.pk),
                        change_type=DataChangeEvent.ChangeType.STALE,
                        old_value=old_value,
                        new_value={"data_freshness": label},
                        requires_review=True,
                    )
            counts[label] += 1

    for model in (InvestmentProvider, ListedCompany, SaccoEntity):
        for obj in model.objects.all():
            source_slug = getattr(getattr(obj, "source_reference", None), "source", None)
            label = classify_freshness(obj.last_verified_at, source_slug=getattr(source_slug, "slug", "generic"))
            counts[label] += 1
            if label == FreshnessLabel.STALE:
                DataChangeEvent.objects.get_or_create(
                    object_type=obj.__class__.__name__,
                    object_id=str(obj.pk),
                    change_type=DataChangeEvent.ChangeType.STALE,
                    new_value={"data_freshness": label},
                    requires_review=True,
                )
    return counts
