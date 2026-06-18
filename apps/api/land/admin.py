from django.contrib import admin

from land.models import (
    LandDecisionJournalLink,
    LandDocumentRecord,
    LandDueDiligenceItem,
    LandOpportunity,
    LandRiskFlag,
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
