from decimal import Decimal

from rest_framework import serializers

from catalog.serializers import ProductCategorySerializer, ProviderSerializer
from knowledge.serializers import SourceReferenceSerializer
from planning.models import (
    InvestmentProduct,
    ProductFeeSchedule,
    ProductLiquidityRule,
    ProductRateSnapshot,
)


class MMFSimulationSerializer(serializers.Serializer):
    principal = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    annual_rate_percent = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal("0.00"))
    months = serializers.IntegerField(min_value=1, max_value=600)


class TBillSimulationSerializer(serializers.Serializer):
    face_value = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    discount_rate_percent = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal("0.00"))
    days = serializers.IntegerField(min_value=1, max_value=364, default=91)


class SaccoSimulationSerializer(serializers.Serializer):
    monthly_deposit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    months = serializers.IntegerField(min_value=1, max_value=600)
    annual_dividend_percent = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal("0.00"))


class GlobalRouteSimulationSerializer(serializers.Serializer):
    amount_kes = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    fx_rate = serializers.DecimalField(max_digits=10, decimal_places=4, min_value=Decimal("1.0000"))
    transfer_fee_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )


class ProductRateSnapshotSerializer(serializers.ModelSerializer):
    source_reference = SourceReferenceSerializer(read_only=True)

    class Meta:
        model = ProductRateSnapshot
        fields = [
            "id",
            "snapshot_date",
            "rate_type",
            "rate_value",
            "rate_period",
            "currency",
            "source_reference",
            "confidence",
            "is_current",
            "raw_label",
            "notes",
            "created_at",
            "updated_at",
        ]


class ProductFeeScheduleSerializer(serializers.ModelSerializer):
    source_reference = SourceReferenceSerializer(read_only=True)

    class Meta:
        model = ProductFeeSchedule
        fields = [
            "id",
            "fee_type",
            "fee_value",
            "fee_unit",
            "notes",
            "source_reference",
            "effective_from",
            "effective_to",
            "is_current",
        ]


class ProductLiquidityRuleSerializer(serializers.ModelSerializer):
    source_reference = SourceReferenceSerializer(read_only=True)

    class Meta:
        model = ProductLiquidityRule
        fields = [
            "id",
            "withdrawal_timeline",
            "lock_in_period",
            "maturity_period_days",
            "early_withdrawal_notes",
            "liquidity_level",
            "source_reference",
        ]


class InvestmentProductListSerializer(serializers.ModelSerializer):
    category = ProductCategorySerializer(read_only=True)
    provider = ProviderSerializer(read_only=True)
    current_rate = serializers.SerializerMethodField()
    educational_disclaimer = serializers.SerializerMethodField()
    simulate_enabled = serializers.SerializerMethodField()
    compare_enabled = serializers.SerializerMethodField()

    class Meta:
        model = InvestmentProduct
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "provider",
            "product_type",
            "currency",
            "regulator",
            "regulator_category",
            "license_status",
            "minimum_amount",
            "minimum_amount_notes",
            "liquidity_level",
            "risk_level",
            "typical_use_cases",
            "not_ideal_for",
            "documents_needed",
            "beginner_mistakes",
            "questions_to_ask",
            "public_url",
            "published_status",
            "last_verified_at",
            "freshness_status",
            "source_confidence",
            "current_rate",
            "simulate_enabled",
            "compare_enabled",
            "educational_disclaimer",
            "created_at",
            "updated_at",
        ]

    def get_current_rate(self, obj):
        snapshot = (
            next((rate for rate in obj.prefetched_current_rates if rate.is_current), None)
            if hasattr(obj, "prefetched_current_rates")
            else obj.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
        )
        return ProductRateSnapshotSerializer(snapshot).data if snapshot else None

    def get_simulate_enabled(self, obj):
        # Published products can always run an educational simulation (custom rate
        # is offered when no latest rate exists), so this stays True for published.
        return obj.published_status == InvestmentProduct.PublishedStatus.PUBLISHED

    def get_compare_enabled(self, _obj):
        return True

    def get_educational_disclaimer(self, _obj):
        return "Educational information only. PesaRoute does not hold money, execute investments, or promise returns."


class InvestmentProductDetailSerializer(InvestmentProductListSerializer):
    source_references = SourceReferenceSerializer(many=True, read_only=True)
    current_rate_snapshot = serializers.SerializerMethodField()
    previous_rate_snapshots = serializers.SerializerMethodField()
    fee_schedule = serializers.SerializerMethodField()
    liquidity_rules = serializers.SerializerMethodField()

    class Meta(InvestmentProductListSerializer.Meta):
        fields = InvestmentProductListSerializer.Meta.fields + [
            "source_references",
            "current_rate_snapshot",
            "previous_rate_snapshots",
            "fee_schedule",
            "liquidity_rules",
        ]

    def get_current_rate_snapshot(self, obj):
        snapshot = obj.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
        return ProductRateSnapshotSerializer(snapshot).data if snapshot else None

    def get_previous_rate_snapshots(self, obj):
        snapshots = obj.rate_snapshots.filter(is_current=False).order_by("-snapshot_date")[:10]
        return ProductRateSnapshotSerializer(snapshots, many=True).data

    def get_fee_schedule(self, obj):
        return ProductFeeScheduleSerializer(obj.fee_schedules.filter(is_current=True), many=True).data

    def get_liquidity_rules(self, obj):
        return ProductLiquidityRuleSerializer(obj.liquidity_rules.all(), many=True).data


class ProductSimulationSerializer(serializers.Serializer):
    class RateMode:
        LATEST_SNAPSHOT = "latest_snapshot"
        USER_CUSTOM = "user_custom"
        CONSERVATIVE = "conservative"
        OPTIMISTIC = "optimistic"

    product_id = serializers.IntegerField(required=False)
    product_slug = serializers.SlugField(required=False)
    input_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    monthly_topup = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )
    timeline_months = serializers.IntegerField(min_value=1, max_value=600)
    rate_mode = serializers.ChoiceField(
        choices=[RateMode.LATEST_SNAPSHOT, RateMode.USER_CUSTOM, RateMode.CONSERVATIVE, RateMode.OPTIMISTIC],
        default=RateMode.LATEST_SNAPSHOT,
    )
    custom_rate = serializers.DecimalField(max_digits=9, decimal_places=4, min_value=Decimal("0.0000"), required=False)
    goal = serializers.CharField(required=False, allow_blank=True, max_length=80)
    liquidity_need = serializers.CharField(required=False, allow_blank=True, max_length=40)

    def validate(self, attrs):
        if not attrs.get("product_id") and not attrs.get("product_slug"):
            raise serializers.ValidationError("product_id or product_slug is required.")
        if attrs["rate_mode"] == self.RateMode.USER_CUSTOM and attrs.get("custom_rate") is None:
            raise serializers.ValidationError("custom_rate is required when rate_mode is user_custom.")
        return attrs


RATE_MODE_CHOICES = [
    "latest_available_rate",
    "conservative_scenario",
    "neutral_scenario",
    "optimistic_scenario",
    "custom_educational_rate",
]


class ProductSpecificSimulationSerializer(serializers.Serializer):
    product_slug = serializers.SlugField()
    initial_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    monthly_topup = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )
    timeline_months = serializers.IntegerField(min_value=1, max_value=600)
    rate_mode = serializers.ChoiceField(choices=RATE_MODE_CHOICES, default="latest_available_rate")
    custom_rate = serializers.DecimalField(max_digits=9, decimal_places=4, required=False, allow_null=True)
    compounding_frequency = serializers.ChoiceField(
        choices=["daily", "monthly", "annual", "unknown"], required=False, allow_null=True
    )
    include_tax_estimate = serializers.BooleanField(default=False)
    include_fees = serializers.BooleanField(default=True)
    goal = serializers.CharField(required=False, allow_blank=True, max_length=80)
    amount_display_mode = serializers.CharField(required=False, allow_blank=True, max_length=20)
    tenor_days = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=3650)
    years_to_maturity = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=40)

    def validate(self, attrs):
        if attrs["rate_mode"] == "custom_educational_rate" and attrs.get("custom_rate") is None:
            raise serializers.ValidationError("custom_rate is required when rate_mode is custom_educational_rate.")
        return attrs


class CompareProductsSimulationSerializer(serializers.Serializer):
    product_slugs = serializers.ListField(
        child=serializers.SlugField(), min_length=2, max_length=5
    )
    initial_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    monthly_topup = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )
    timeline_months = serializers.IntegerField(min_value=1, max_value=600)
    rate_mode = serializers.ChoiceField(choices=RATE_MODE_CHOICES, default="latest_available_rate")
    custom_rates = serializers.DictField(child=serializers.DecimalField(max_digits=9, decimal_places=4), required=False)
    goal = serializers.CharField(required=False, allow_blank=True, max_length=80)


class VirtualPortfolioCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    starting_virtual_cash = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )
    currency = serializers.CharField(max_length=12, required=False, allow_blank=True)
    goal = serializers.CharField(max_length=180, required=False, allow_blank=True)


class VirtualPositionCreateSerializer(serializers.Serializer):
    product_slug = serializers.SlugField()
    virtual_amount_allocated = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.00"))
    rate_mode = serializers.ChoiceField(choices=RATE_MODE_CHOICES, default="neutral_scenario")
    custom_rate = serializers.DecimalField(max_digits=9, decimal_places=4, required=False, allow_null=True)
    timeline_months = serializers.IntegerField(min_value=1, max_value=600, default=12)


class VirtualPositionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default="")
    product_slug = serializers.CharField(source="product.slug", read_only=True, default="")

    class Meta:
        from planning.models import VirtualSimulationPosition

        model = VirtualSimulationPosition
        fields = [
            "id", "product", "product_name", "product_slug", "virtual_amount_allocated",
            "rate_mode", "custom_rate", "timeline_months", "assumptions", "created_at",
        ]


class VirtualPortfolioSerializer(serializers.ModelSerializer):
    positions = VirtualPositionSerializer(many=True, read_only=True)

    class Meta:
        from planning.models import VirtualSimulationPortfolio

        model = VirtualSimulationPortfolio
        fields = [
            "id", "name", "starting_virtual_cash", "currency", "goal", "created_at", "positions",
        ]


class CategoryCompareSimulationSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    monthly_topup = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )
    timeline_months = serializers.IntegerField(min_value=1, max_value=600)
    category = serializers.CharField(required=False, allow_blank=True, max_length=160)
    product_type = serializers.CharField(required=False, allow_blank=True, max_length=60)
    goal = serializers.CharField(required=False, allow_blank=True, max_length=80)
    risk_preference = serializers.CharField(required=False, allow_blank=True, max_length=40)
    liquidity_need = serializers.CharField(required=False, allow_blank=True, max_length=40)
