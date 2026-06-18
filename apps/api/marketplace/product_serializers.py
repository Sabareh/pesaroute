"""Marketplace product serializers (Phase 2.13 + 2.15).

Public, card- and detail-shaped views of planning.InvestmentProduct with MMF/SACCO
attributes and derived yield/source/freshness fields. internal_notes is NEVER exposed.
"""

from rest_framework import serializers

from marketplace.models import WatchedProduct
from marketplace.product_services import sacco_due_diligence_score
from planning.models import InvestmentProduct

SACCO_TYPES = {InvestmentProduct.ProductType.SACCO_DEPOSIT, InvestmentProduct.ProductType.SACCO_SHARE_CAPITAL}


def _current_snapshot(obj):
    return obj.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()


class _ProductBase(serializers.ModelSerializer):
    provider_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    current_rate = serializers.SerializerMethodField()
    annual_yield = serializers.SerializerMethodField()
    yield_snapshot_date = serializers.SerializerMethodField()
    yield_source_url = serializers.SerializerMethodField()
    yield_source_confidence = serializers.SerializerMethodField()
    yield_freshness = serializers.SerializerMethodField()

    def get_provider_name(self, obj):
        return obj.provider.name if obj.provider else None

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_current_rate(self, obj):
        snap = _current_snapshot(obj)
        if not snap:
            return None
        ref = snap.source_reference
        return {
            "rate_value": str(snap.rate_value),
            "rate_type": snap.rate_type,
            "snapshot_date": snap.snapshot_date.isoformat(),
            "confidence": snap.confidence,
            "source_url": ref.url if ref else (obj.public_url or ""),
        }

    def get_annual_yield(self, obj):
        snap = _current_snapshot(obj)
        return str(snap.rate_value) if snap else None

    def get_yield_snapshot_date(self, obj):
        snap = _current_snapshot(obj)
        return snap.snapshot_date.isoformat() if snap else None

    def get_yield_source_url(self, obj):
        snap = _current_snapshot(obj)
        if snap and snap.source_reference:
            return snap.source_reference.url
        return obj.public_url or ""

    def get_yield_source_confidence(self, obj):
        snap = _current_snapshot(obj)
        return snap.confidence if snap else obj.source_confidence

    def get_yield_freshness(self, obj):
        return obj.freshness_status


class MarketplaceProductCardSerializer(_ProductBase):
    sacco_due_diligence_score = serializers.SerializerMethodField()

    class Meta:
        model = InvestmentProduct
        fields = [
            "id",
            "name",
            "slug",
            "provider_name",
            "category_name",
            "product_type",
            "currency",
            "annual_yield",
            "yield_type",
            "yield_snapshot_date",
            "yield_source_url",
            "yield_source_confidence",
            "yield_freshness",
            "management_fee_rate",
            "withdrawal_timeline",
            "minimum_amount",
            "minimum_topup",
            "mpesa_paybill_available",
            "mpesa_paybill_number",
            "withholding_tax_rate",
            "dividend_rate_latest",
            "interest_on_deposits_latest",
            "loan_multiplier",
            "minimum_shares",
            "membership_eligibility",
            "sasra_status",
            "audited_report_url",
            "risk_level",
            "liquidity_level",
            "freshness_status",
            "source_confidence",
            "regulator_category",
            "current_rate",
            "sacco_due_diligence_score",
        ]

    def get_sacco_due_diligence_score(self, obj):
        if obj.product_type in SACCO_TYPES:
            return sacco_due_diligence_score(obj)["score"]
        return None


class MarketplaceProductDetailSerializer(_ProductBase):
    fees = serializers.SerializerMethodField()
    liquidity_rules = serializers.SerializerMethodField()
    sources = serializers.SerializerMethodField()
    sacco_due_diligence = serializers.SerializerMethodField()

    class Meta:
        model = InvestmentProduct
        fields = [
            "id",
            "name",
            "slug",
            "provider_name",
            "category_name",
            "product_type",
            "currency",
            "regulator",
            "regulator_category",
            "license_status",
            "annual_yield",
            "yield_type",
            "yield_snapshot_date",
            "yield_source_url",
            "yield_source_confidence",
            "yield_freshness",
            "current_rate",
            "management_fee_rate",
            "withholding_tax_rate",
            "minimum_amount",
            "minimum_amount_notes",
            "minimum_topup",
            "withdrawal_timeline",
            "mpesa_paybill_available",
            "mpesa_paybill_number",
            "dividend_rate_latest",
            "interest_on_deposits_latest",
            "loan_multiplier",
            "minimum_shares",
            "membership_eligibility",
            "sasra_status",
            "audited_report_url",
            "risk_level",
            "liquidity_level",
            "typical_use_cases",
            "not_ideal_for",
            "documents_needed",
            "beginner_mistakes",
            "questions_to_ask",
            "freshness_status",
            "source_confidence",
            "last_verified_at",
            "public_url",
            "fees",
            "liquidity_rules",
            "sources",
            "sacco_due_diligence",
        ]

    def get_fees(self, obj):
        return [
            {
                "fee_type": f.fee_type,
                "fee_value": str(f.fee_value) if f.fee_value is not None else None,
                "fee_unit": f.fee_unit,
                "notes": f.notes,
            }
            for f in obj.fee_schedules.filter(is_current=True)
        ]

    def get_liquidity_rules(self, obj):
        return [
            {
                "withdrawal_timeline": r.withdrawal_timeline,
                "lock_in_period": r.lock_in_period,
                "early_withdrawal_notes": r.early_withdrawal_notes,
                "liquidity_level": r.liquidity_level,
            }
            for r in obj.liquidity_rules.all()
        ]

    def get_sources(self, obj):
        return [
            {"title": ref.title, "url": ref.url, "citation_label": ref.citation_label}
            for ref in obj.source_references.all()
        ]

    def get_sacco_due_diligence(self, obj):
        if obj.product_type in SACCO_TYPES:
            return sacco_due_diligence_score(obj)
        return None


class WatchlistItemSerializer(serializers.ModelSerializer):
    product = MarketplaceProductCardSerializer(read_only=True)
    rate_changed = serializers.SerializerMethodField()
    stale = serializers.SerializerMethodField()

    class Meta:
        model = WatchedProduct
        fields = [
            "id",
            "product",
            "note",
            "last_seen_rate_value",
            "last_seen_snapshot_date",
            "last_reviewed_at",
            "created_at",
            "rate_changed",
            "stale",
        ]
        read_only_fields = ["id", "created_at", "rate_changed", "stale"]

    def get_rate_changed(self, obj):
        snap = _current_snapshot(obj.product)
        if snap and obj.last_seen_rate_value is not None:
            return snap.rate_value != obj.last_seen_rate_value
        return False

    def get_stale(self, obj):
        return obj.product.freshness_status == InvestmentProduct.FreshnessStatus.STALE
