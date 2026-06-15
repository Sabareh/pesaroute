from django.contrib import admin

from knowledge.models import (
    DataChangeEvent,
    DataIngestionRun,
    DataQualityIssue,
    DataSource,
    GovernmentSecurityReference,
    InvestmentProductCategory,
    InvestmentProvider,
    ListedCompany,
    RawDataSnapshot,
    RegulatedEntityStatus,
    Regulator,
    SaccoEntity,
    SourceRecord,
    SourceReference,
)


@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ["name", "source_type", "authority_level", "parser_strategy", "is_active", "last_success_at"]
    list_filter = ["source_type", "authority_level", "parser_strategy", "is_active"]
    search_fields = ["name", "slug", "homepage_url", "data_url"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(DataIngestionRun)
class DataIngestionRunAdmin(admin.ModelAdmin):
    list_display = ["source", "run_type", "status", "started_at", "finished_at", "records_seen", "records_failed"]
    list_filter = ["run_type", "status", "source"]
    search_fields = ["source__name", "error_summary", "raw_snapshot_location"]


@admin.register(SourceRecord)
class SourceRecordAdmin(admin.ModelAdmin):
    list_display = ["source", "source_record_key", "source_record_type", "status", "review_status", "last_seen_at"]
    list_filter = ["source", "source_record_type", "status", "review_status"]
    search_fields = ["source_record_key", "source__name"]


@admin.register(DataQualityIssue)
class DataQualityIssueAdmin(admin.ModelAdmin):
    list_display = ["ingestion_run", "severity", "issue_type", "status", "created_at", "resolved_at"]
    list_filter = ["severity", "issue_type", "status"]
    search_fields = ["message", "source_record__source_record_key"]


@admin.register(SourceReference)
class SourceReferenceAdmin(admin.ModelAdmin):
    list_display = ["title", "source", "citation_label", "retrieved_at", "published_at"]
    list_filter = ["source"]
    search_fields = ["title", "url", "citation_label"]


@admin.register(Regulator)
class RegulatorAdmin(admin.ModelAdmin):
    list_display = ["abbreviation", "name", "country", "website"]
    search_fields = ["abbreviation", "name"]


@admin.register(InvestmentProductCategory)
class InvestmentProductCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "risk_level_default", "liquidity_level_default", "typical_minimum_amount"]
    list_filter = ["risk_level_default", "liquidity_level_default"]
    search_fields = ["name", "slug", "description"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(InvestmentProvider)
class InvestmentProviderAdmin(admin.ModelAdmin):
    list_display = ["name", "provider_type", "regulator", "license_status", "published_status", "last_verified_at"]
    list_filter = ["provider_type", "regulator", "license_status", "published_status"]
    search_fields = ["name", "slug", "license_number", "website"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(RegulatedEntityStatus)
class RegulatedEntityStatusAdmin(admin.ModelAdmin):
    list_display = ["provider", "regulator", "category", "license_number", "status", "effective_date", "expiry_date"]
    list_filter = ["regulator", "category", "status"]
    search_fields = ["provider__name", "license_number", "raw_notes"]


@admin.register(GovernmentSecurityReference)
class GovernmentSecurityReferenceAdmin(admin.ModelAdmin):
    list_display = ["security_type", "issue_number", "isin", "auction_date", "maturity_date", "average_rate", "status"]
    list_filter = ["security_type", "status", "auction_date"]
    search_fields = ["issue_number", "isin"]


@admin.register(ListedCompany)
class ListedCompanyAdmin(admin.ModelAdmin):
    list_display = ["symbol", "name", "sector", "listing_segment", "published_status", "last_verified_at"]
    list_filter = ["sector", "listing_segment", "published_status"]
    search_fields = ["symbol", "name", "isin"]


@admin.register(SaccoEntity)
class SaccoEntityAdmin(admin.ModelAdmin):
    list_display = ["name", "sacco_type", "sasra_status", "county", "published_status", "last_verified_at"]
    list_filter = ["sacco_type", "sasra_status", "county", "published_status"]
    search_fields = ["name", "county"]


admin.site.register(RawDataSnapshot)


@admin.register(DataChangeEvent)
class DataChangeEventAdmin(admin.ModelAdmin):
    list_display = ["object_type", "object_id", "change_type", "source", "requires_review", "created_at"]
    list_filter = ["change_type", "requires_review", "source"]
    search_fields = ["object_type", "object_id", "source__name", "source_record__source_record_key"]
