from django.contrib import admin
from django.utils import timezone

from planning.models import (
    InvestmentGoal,
    InvestmentProduct,
    ProductFeeSchedule,
    ProductLiquidityRule,
    ProductRateSnapshot,
    ProductSimulationRun,
    RouteRequest,
    RouteResult,
    SimulationProfile,
    SimulationRun,
    StagedProductUpdate,
)


class ProductRateSnapshotInline(admin.TabularInline):
    model = ProductRateSnapshot
    extra = 0


class ProductFeeScheduleInline(admin.TabularInline):
    model = ProductFeeSchedule
    extra = 0


class ProductLiquidityRuleInline(admin.TabularInline):
    model = ProductLiquidityRule
    extra = 0


@admin.register(InvestmentProduct)
class InvestmentProductAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "product_type",
        "category",
        "provider",
        "currency",
        "risk_level",
        "liquidity_level",
        "freshness_status",
        "source_confidence",
        "published_status",
    ]
    list_filter = [
        "product_type",
        "currency",
        "risk_level",
        "liquidity_level",
        "freshness_status",
        "source_confidence",
        "published_status",
    ]
    search_fields = ["name", "slug", "provider__name", "category__name", "regulator"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductRateSnapshotInline, ProductFeeScheduleInline, ProductLiquidityRuleInline]


@admin.register(ProductRateSnapshot)
class ProductRateSnapshotAdmin(admin.ModelAdmin):
    list_display = ["product", "snapshot_date", "rate_type", "rate_value", "confidence", "is_current"]
    list_filter = ["rate_type", "rate_period", "confidence", "is_current", "currency"]
    search_fields = ["product__name", "raw_label", "notes"]


@admin.register(ProductFeeSchedule)
class ProductFeeScheduleAdmin(admin.ModelAdmin):
    list_display = ["product", "fee_type", "fee_value", "fee_unit", "is_current"]
    list_filter = ["fee_type", "fee_unit", "is_current"]
    search_fields = ["product__name", "notes"]


@admin.register(ProductLiquidityRule)
class ProductLiquidityRuleAdmin(admin.ModelAdmin):
    list_display = ["product", "liquidity_level", "withdrawal_timeline", "maturity_period_days"]
    list_filter = ["liquidity_level"]
    search_fields = ["product__name", "withdrawal_timeline", "early_withdrawal_notes"]


@admin.register(ProductSimulationRun)
class ProductSimulationRunAdmin(admin.ModelAdmin):
    list_display = ["product", "user", "input_amount", "timeline_months", "assumed_rate_source", "created_at"]
    list_filter = ["assumed_rate_source", "created_at"]
    search_fields = ["product__name", "category__name", "provider__name"]
    readonly_fields = ["output", "warnings", "created_at"]


@admin.register(StagedProductUpdate)
class StagedProductUpdateAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "provider_name",
        "product_name",
        "review_status",
        "parser_confidence",
        "source",
        "created_at",
        "reviewed_at",
        "reviewed_by",
    ]
    list_filter = ["review_status", "parser_confidence", "source", "created_at"]
    search_fields = ["provider_name", "product_name", "source__name"]
    readonly_fields = [
        "source",
        "ingestion_run",
        "normalized_payload",
        "proposed_changes",
        "created_at",
        "reviewed_at",
        "reviewed_by",
    ]
    actions = ["approve_updates", "reject_updates", "publish_approved"]

    @admin.action(description="Approve selected staged product updates")
    def approve_updates(self, request, queryset):
        from planning.product_pipeline_services import approve_staged_product_update

        count = 0
        for update in queryset.filter(review_status=StagedProductUpdate.ReviewStatus.NEEDS_REVIEW):
            approve_staged_product_update(update, user=request.user)
            count += 1
        self.message_user(request, f"Approved {count} staged update(s).")

    @admin.action(description="Reject selected staged product updates")
    def reject_updates(self, request, queryset):
        from planning.product_pipeline_services import reject_staged_product_update

        count = 0
        for update in queryset.filter(review_status=StagedProductUpdate.ReviewStatus.NEEDS_REVIEW):
            reject_staged_product_update(update, user=request.user, reason="Rejected via admin bulk action.")
            count += 1
        self.message_user(request, f"Rejected {count} staged update(s).")

    @admin.action(description="Publish approved staged product updates")
    def publish_approved(self, request, queryset):
        from planning.product_pipeline_services import publish_staged_product_update

        count = 0
        for update in queryset.filter(
            review_status__in=[
                StagedProductUpdate.ReviewStatus.APPROVED,
                StagedProductUpdate.ReviewStatus.AUTO_APPROVED,
            ]
        ):
            if publish_staged_product_update(update):
                count += 1
        self.message_user(request, f"Published {count} staged update(s) as ProductRateSnapshot records.")


admin.site.register(InvestmentGoal)
admin.site.register(RouteRequest)
admin.site.register(RouteResult)
admin.site.register(SimulationProfile)
admin.site.register(SimulationRun)
