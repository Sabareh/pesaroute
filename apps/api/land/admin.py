from django.contrib import admin

from land.models import (
    LandCountyMarket,
    LandDecisionJournalLink,
    LandDocumentRecord,
    LandDueDiligenceItem,
    LandListing,
    LandOpportunity,
    LandRiskFlag,
    LandSubcountyMarket,
)


@admin.register(LandOpportunity)
class LandOpportunityAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "decision_stage", "risk_level", "seller_type", "created_at")
    list_filter = ("decision_stage", "risk_level", "seller_type", "title_status", "privacy_mode")
    search_fields = ("title", "location_text", "county", "area_or_town")


@admin.register(LandDueDiligenceItem)
class LandDueDiligenceItemAdmin(admin.ModelAdmin):
    list_display = ("item_key", "land_opportunity", "status", "importance", "professional_type_needed")
    list_filter = ("status", "importance", "professional_type_needed")


@admin.register(LandDocumentRecord)
class LandDocumentRecordAdmin(admin.ModelAdmin):
    list_display = ("document_type", "land_opportunity", "visibility", "created_at")
    list_filter = ("document_type", "visibility")


@admin.register(LandRiskFlag)
class LandRiskFlagAdmin(admin.ModelAdmin):
    list_display = ("flag_type", "severity", "land_opportunity", "created_at")
    list_filter = ("flag_type", "severity")


@admin.register(LandDecisionJournalLink)
class LandDecisionJournalLinkAdmin(admin.ModelAdmin):
    list_display = ("land_opportunity", "journal_entry", "created_at")


class LandSubcountyMarketInline(admin.TabularInline):
    model = LandSubcountyMarket
    extra = 0


class LandListingInline(admin.TabularInline):
    model = LandListing
    extra = 1
    fields = ("name", "kind", "place", "price_kes", "tag1", "tag2", "advertiser", "listing_url", "is_active")


@admin.register(LandCountyMarket)
class LandCountyMarketAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "region", "tier", "avg_price_per_acre", "appreciation_pct", "rental_yield_pct")
    list_filter = ("tier", "region")
    search_fields = ("name", "code", "region")
    inlines = [LandListingInline, LandSubcountyMarketInline]


@admin.register(LandListing)
class LandListingAdmin(admin.ModelAdmin):
    list_display = ("name", "county", "kind", "place", "price_kes", "advertiser", "is_sponsored", "is_active")
    list_filter = ("is_active", "is_sponsored", "kind", "county__region")
    list_editable = ("is_active",)
    search_fields = ("name", "place", "advertiser", "county__name")
    list_select_related = ("county",)
