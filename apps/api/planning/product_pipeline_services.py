from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation

from django.utils import timezone
from django.utils.text import slugify

from knowledge.models import DataChangeEvent, SourceReference
from knowledge.services import source_reference_for_record
from planning.models import InvestmentProduct, ProductRateSnapshot, StagedProductUpdate


def _to_decimal(value) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        return None


def _to_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        from datetime import datetime

        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        return None


def _resolve_product_type(value: str) -> str:
    valid = {choice[0] for choice in InvestmentProduct.ProductType.choices}
    normalized = (value or "").strip().lower().replace(" ", "_").replace("-", "_")
    return normalized if normalized in valid else InvestmentProduct.ProductType.OTHER


def _resolve_rate_type(value: str) -> str:
    valid = {choice[0] for choice in ProductRateSnapshot.RateType.choices}
    normalized = (value or "").strip().lower().replace(" ", "_")
    return normalized if normalized in valid else ProductRateSnapshot.RateType.UNKNOWN


def _resolve_rate_period(value: str) -> str:
    valid = {choice[0] for choice in ProductRateSnapshot.RatePeriod.choices}
    normalized = (value or "").strip().lower()
    return normalized if normalized in valid else ProductRateSnapshot.RatePeriod.ANNUAL


def _resolve_confidence(value: str) -> str:
    valid = {choice[0] for choice in InvestmentProduct.SourceConfidence.choices}
    normalized = (value or "").strip().lower()
    if normalized == "official":
        return InvestmentProduct.SourceConfidence.OFFICIAL
    if normalized in {"provider_reported", "provider_self_reported"}:
        return InvestmentProduct.SourceConfidence.PROVIDER_REPORTED
    if normalized == "editorial":
        return InvestmentProduct.SourceConfidence.EDITORIAL
    if normalized == "third_party":
        return InvestmentProduct.SourceConfidence.THIRD_PARTY
    return InvestmentProduct.SourceConfidence.UNKNOWN


def _find_or_create_product(payload: dict, source_confidence: str) -> InvestmentProduct | None:
    from catalog.models import ProductCategory

    provider_name = payload.get("provider_name", "")
    product_name = payload.get("product_name", "")
    product_type = _resolve_product_type(payload.get("product_type", ""))

    if not product_name:
        return None

    slug_base = slugify(f"{provider_name} {product_name}"[:200]) or slugify(product_name[:200])
    slug = slug_base or "product"

    existing = InvestmentProduct.objects.filter(slug=slug).first()
    if existing:
        return existing

    category_slug = {
        InvestmentProduct.ProductType.MONEY_MARKET_FUND: "money-market-funds",
        InvestmentProduct.ProductType.TREASURY_BILL: "treasury-bills",
        InvestmentProduct.ProductType.TREASURY_BOND: "treasury-bonds",
        InvestmentProduct.ProductType.INFRASTRUCTURE_BOND: "treasury-bonds",
        InvestmentProduct.ProductType.SACCO_DEPOSIT: "saccos",
        InvestmentProduct.ProductType.SACCO_SHARE_CAPITAL: "saccos",
        InvestmentProduct.ProductType.FIXED_DEPOSIT: "fixed-deposits",
        InvestmentProduct.ProductType.NSE_EQUITY: "nse-equities",
        InvestmentProduct.ProductType.REIT: "reits",
    }.get(product_type, "general")

    category = (
        ProductCategory.objects.filter(slug=category_slug).first()
        or ProductCategory.objects.order_by("id").first()
    )
    if not category:
        return None

    product, _created = InvestmentProduct.objects.get_or_create(
        slug=slug,
        defaults={
            "name": product_name,
            "category": category,
            "product_type": product_type,
            "currency": payload.get("currency", InvestmentProduct.Currency.KES),
            "source_confidence": source_confidence,
            "freshness_status": InvestmentProduct.FreshnessStatus.UNKNOWN,
            "published_status": InvestmentProduct.PublishedStatus.DRAFT,
        },
    )
    return product


def _create_source_reference_from_payload(payload: dict, staged_update: StagedProductUpdate) -> SourceReference | None:
    source_url = payload.get("source_url", "")
    if not source_url:
        source_url = staged_update.source.data_url or staged_update.source.homepage_url
    if not source_url:
        return None
    title = payload.get("rate_label") or f"{staged_update.source.name}: {staged_update.product_name}"
    ref, _created = SourceReference.objects.get_or_create(
        source=staged_update.source,
        title=title[:240],
        url=source_url,
        defaults={
            "retrieved_at": timezone.now(),
            "citation_label": staged_update.source.name[:160],
            "notes": "Created by product data pipeline.",
        },
    )
    return ref


def publish_staged_product_update(
    staged_update: StagedProductUpdate, *, auto_approve: bool = False
) -> bool:
    """
    Publish an approved or auto-approved StagedProductUpdate:
    - create/update InvestmentProduct
    - create ProductRateSnapshot (is_current=True)
    - mark previous snapshots is_current=False
    - update product freshness_status and last_verified_at
    - attach SourceReference
    - create DataChangeEvent audit record

    Returns True if published, False if not eligible.
    """
    if staged_update.review_status == StagedProductUpdate.ReviewStatus.NEEDS_REVIEW and auto_approve:
        staged_update.review_status = StagedProductUpdate.ReviewStatus.AUTO_APPROVED
        staged_update.save(update_fields=["review_status"])

    if staged_update.review_status not in {
        StagedProductUpdate.ReviewStatus.APPROVED,
        StagedProductUpdate.ReviewStatus.AUTO_APPROVED,
    }:
        return False

    payload = staged_update.normalized_payload
    source_confidence = _resolve_confidence(payload.get("confidence", ""))
    product = staged_update.product or _find_or_create_product(payload, source_confidence)
    if not product:
        return False

    rate_value = _to_decimal(payload.get("current_rate"))
    if rate_value is None:
        return False

    snapshot_date = _to_date(payload.get("snapshot_date")) or timezone.localdate()
    rate_type = _resolve_rate_type(payload.get("rate_type", ""))
    rate_period = _resolve_rate_period(payload.get("rate_period", ""))
    currency = payload.get("currency", product.currency) or product.currency

    ProductRateSnapshot.objects.filter(
        product=product,
        rate_type=rate_type,
        currency=currency,
        is_current=True,
    ).update(is_current=False)

    source_ref = _create_source_reference_from_payload(payload, staged_update)

    snapshot = ProductRateSnapshot.objects.create(
        product=product,
        snapshot_date=snapshot_date,
        rate_type=rate_type,
        rate_value=rate_value,
        rate_period=rate_period,
        currency=currency,
        source=staged_update.source,
        source_reference=source_ref,
        confidence=source_confidence,
        is_current=True,
        raw_label=payload.get("rate_label", ""),
        notes=payload.get("notes", ""),
    )

    product.last_verified_at = timezone.now()
    product.freshness_status = InvestmentProduct.FreshnessStatus.FRESH
    product.source_confidence = source_confidence
    product.save(update_fields=["last_verified_at", "freshness_status", "source_confidence", "updated_at"])
    if source_ref:
        product.source_references.add(source_ref)

    DataChangeEvent.objects.create(
        object_type="ProductRateSnapshot",
        object_id=str(snapshot.id),
        change_type=DataChangeEvent.ChangeType.PUBLISHED,
        old_value={},
        new_value={
            "product_id": product.id,
            "product_name": product.name,
            "rate_value": str(rate_value),
            "rate_type": rate_type,
            "snapshot_date": str(snapshot_date),
            "staged_update_id": staged_update.id,
        },
        source=staged_update.source,
        requires_review=False,
    )

    return True


def approve_staged_product_update(staged_update: StagedProductUpdate, *, user=None, reason: str = "") -> bool:
    if staged_update.review_status in {
        StagedProductUpdate.ReviewStatus.APPROVED,
        StagedProductUpdate.ReviewStatus.AUTO_APPROVED,
    }:
        return False
    staged_update.review_status = StagedProductUpdate.ReviewStatus.APPROVED
    staged_update.reviewed_at = timezone.now()
    staged_update.reviewed_by = user
    staged_update.reason = reason
    staged_update.save(update_fields=["review_status", "reviewed_at", "reviewed_by", "reason"])
    return True


def reject_staged_product_update(staged_update: StagedProductUpdate, *, user=None, reason: str = "") -> bool:
    if staged_update.review_status == StagedProductUpdate.ReviewStatus.REJECTED:
        return False
    staged_update.review_status = StagedProductUpdate.ReviewStatus.REJECTED
    staged_update.reviewed_at = timezone.now()
    staged_update.reviewed_by = user
    staged_update.reason = reason
    staged_update.save(update_fields=["review_status", "reviewed_at", "reviewed_by", "reason"])
    return True


def refresh_product_freshness() -> dict[str, int]:
    """
    Scan InvestmentProduct objects and update freshness_status based on the age
    of the latest ProductRateSnapshot (or last_verified_at if no snapshot).

    Freshness thresholds by product_type:
    - MMF / fund yields: 7 days
    - T-bill auction rate: 14 days
    - T-bond coupon/yield: 30 days
    - CMA provider status: 60 days
    - SACCO deposit: 90 days
    - NSE equity: 30 days
    - All others: 180 days
    """
    from datetime import timedelta

    STALE_DAYS = {
        InvestmentProduct.ProductType.MONEY_MARKET_FUND: 7,
        InvestmentProduct.ProductType.FIXED_INCOME_FUND: 14,
        InvestmentProduct.ProductType.BALANCED_FUND: 14,
        InvestmentProduct.ProductType.EQUITY_FUND: 14,
        InvestmentProduct.ProductType.TREASURY_BILL: 14,
        InvestmentProduct.ProductType.TREASURY_BOND: 30,
        InvestmentProduct.ProductType.INFRASTRUCTURE_BOND: 30,
        InvestmentProduct.ProductType.NSE_EQUITY: 30,
        InvestmentProduct.ProductType.REIT: 30,
        InvestmentProduct.ProductType.SACCO_DEPOSIT: 90,
        InvestmentProduct.ProductType.SACCO_SHARE_CAPITAL: 90,
        InvestmentProduct.ProductType.FIXED_DEPOSIT: 30,
        InvestmentProduct.ProductType.GLOBAL_ETF_ROUTE: 90,
        InvestmentProduct.ProductType.GLOBAL_STOCK_ROUTE: 90,
        InvestmentProduct.ProductType.PENSION_PRODUCT: 90,
    }
    ACCEPTABLE_DAYS = {k: v * 2 for k, v in STALE_DAYS.items()}

    counts = {
        InvestmentProduct.FreshnessStatus.FRESH: 0,
        InvestmentProduct.FreshnessStatus.ACCEPTABLE: 0,
        InvestmentProduct.FreshnessStatus.STALE: 0,
        InvestmentProduct.FreshnessStatus.UNKNOWN: 0,
    }
    now = timezone.now()

    for product in InvestmentProduct.objects.all():
        latest_snapshot = product.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
        ref_time = None
        if latest_snapshot:
            ref_time = timezone.make_aware(
                timezone.datetime.combine(latest_snapshot.snapshot_date, timezone.datetime.min.time())
            )
        elif product.last_verified_at:
            ref_time = product.last_verified_at

        if ref_time is None:
            new_status = InvestmentProduct.FreshnessStatus.UNKNOWN
        else:
            age = now - ref_time
            stale_threshold = timedelta(days=STALE_DAYS.get(product.product_type, 180))
            acceptable_threshold = timedelta(days=ACCEPTABLE_DAYS.get(product.product_type, 360))
            if age <= stale_threshold:
                new_status = InvestmentProduct.FreshnessStatus.FRESH
            elif age <= acceptable_threshold:
                new_status = InvestmentProduct.FreshnessStatus.ACCEPTABLE
            else:
                new_status = InvestmentProduct.FreshnessStatus.STALE

        counts[new_status] += 1
        if product.freshness_status != new_status:
            old_status = product.freshness_status
            product.freshness_status = new_status
            product.save(update_fields=["freshness_status", "updated_at"])
            if new_status == InvestmentProduct.FreshnessStatus.STALE:
                DataChangeEvent.objects.create(
                    object_type="InvestmentProduct",
                    object_id=str(product.id),
                    change_type=DataChangeEvent.ChangeType.STALE,
                    old_value={"freshness_status": old_status},
                    new_value={"freshness_status": new_status},
                    requires_review=True,
                )

    return counts
