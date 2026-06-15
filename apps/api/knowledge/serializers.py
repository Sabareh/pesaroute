from rest_framework import serializers

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


class DataSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSource
        fields = [
            "id",
            "name",
            "slug",
            "source_type",
            "authority_level",
            "homepage_url",
            "data_url",
            "terms_url",
            "robots_notes",
            "license_notes",
            "update_frequency",
            "parser_strategy",
            "is_active",
            "last_checked_at",
            "last_success_at",
            "last_failure_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PublicDataSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSource
        fields = [
            "id",
            "name",
            "slug",
            "source_type",
            "authority_level",
            "homepage_url",
            "data_url",
            "terms_url",
            "update_frequency",
            "last_checked_at",
            "last_success_at",
            "updated_at",
        ]


class DataIngestionRunSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)

    class Meta:
        model = DataIngestionRun
        fields = [
            "id",
            "source",
            "source_name",
            "run_type",
            "status",
            "started_at",
            "finished_at",
            "records_seen",
            "records_created",
            "records_updated",
            "records_unchanged",
            "records_failed",
            "error_summary",
            "raw_snapshot_location",
            "created_by",
        ]
        read_only_fields = fields


class RawDataSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawDataSnapshot
        fields = [
            "id",
            "source",
            "ingestion_run",
            "content_hash",
            "content_type",
            "fetched_url",
            "storage_path",
            "fetched_at",
            "byte_size",
            "metadata",
        ]
        read_only_fields = fields


class SourceRecordSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)

    class Meta:
        model = SourceRecord
        fields = [
            "id",
            "source",
            "source_name",
            "source_record_key",
            "source_record_type",
            "raw_payload",
            "normalized_payload",
            "content_hash",
            "first_seen_at",
            "last_seen_at",
            "status",
            "review_status",
        ]
        read_only_fields = fields


class SourceReferenceSerializer(serializers.ModelSerializer):
    source = PublicDataSourceSerializer(read_only=True)

    class Meta:
        model = SourceReference
        fields = [
            "id",
            "source",
            "title",
            "url",
            "retrieved_at",
            "published_at",
            "citation_label",
            "notes",
            "related_object_type",
            "related_object_id",
        ]


class DataQualityIssueSerializer(serializers.ModelSerializer):
    source_record_key = serializers.CharField(source="source_record.source_record_key", read_only=True)

    class Meta:
        model = DataQualityIssue
        fields = [
            "id",
            "ingestion_run",
            "source_record",
            "source_record_key",
            "severity",
            "issue_type",
            "message",
            "status",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = fields


class DataChangeEventSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)
    source_record_key = serializers.CharField(source="source_record.source_record_key", read_only=True)

    class Meta:
        model = DataChangeEvent
        fields = [
            "id",
            "object_type",
            "object_id",
            "change_type",
            "old_value",
            "new_value",
            "source",
            "source_name",
            "source_record",
            "source_record_key",
            "ingestion_run",
            "requires_review",
            "created_at",
        ]
        read_only_fields = fields


class RegulatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Regulator
        fields = ["id", "name", "abbreviation", "country", "website", "description", "created_at", "updated_at"]


class InvestmentProductCategorySerializer(serializers.ModelSerializer):
    source_references = SourceReferenceSerializer(many=True, read_only=True)

    class Meta:
        model = InvestmentProductCategory
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "risk_level_default",
            "liquidity_level_default",
            "beginner_summary",
            "regulatory_notes",
            "typical_minimum_amount",
            "source_references",
            "created_at",
            "updated_at",
        ]


class InvestmentProviderSerializer(serializers.ModelSerializer):
    regulator = RegulatorSerializer(read_only=True)
    source_references = SourceReferenceSerializer(many=True, read_only=True)

    class Meta:
        model = InvestmentProvider
        fields = [
            "id",
            "name",
            "slug",
            "provider_type",
            "regulator",
            "license_number",
            "license_status",
            "website",
            "phone",
            "email",
            "last_verified_at",
            "source_references",
            "published_status",
            "created_at",
            "updated_at",
        ]


class RegulatedEntityStatusSerializer(serializers.ModelSerializer):
    provider = InvestmentProviderSerializer(read_only=True)
    regulator = RegulatorSerializer(read_only=True)
    source_reference = SourceReferenceSerializer(read_only=True)

    class Meta:
        model = RegulatedEntityStatus
        fields = [
            "id",
            "provider",
            "regulator",
            "category",
            "license_number",
            "status",
            "effective_date",
            "expiry_date",
            "source_reference",
            "raw_notes",
        ]


class GovernmentSecurityReferenceSerializer(serializers.ModelSerializer):
    source_reference = SourceReferenceSerializer(read_only=True)

    class Meta:
        model = GovernmentSecurityReference
        fields = [
            "id",
            "security_type",
            "tenor_days",
            "issue_number",
            "isin",
            "auction_date",
            "value_date",
            "maturity_date",
            "average_rate",
            "accepted_yield",
            "source_reference",
            "status",
        ]


class ListedCompanySerializer(serializers.ModelSerializer):
    source_reference = SourceReferenceSerializer(read_only=True)

    class Meta:
        model = ListedCompany
        fields = [
            "id",
            "name",
            "symbol",
            "isin",
            "sector",
            "listing_segment",
            "website",
            "source_reference",
            "last_verified_at",
            "published_status",
            "created_at",
            "updated_at",
        ]


class SaccoEntitySerializer(serializers.ModelSerializer):
    source_reference = SourceReferenceSerializer(read_only=True)

    class Meta:
        model = SaccoEntity
        fields = [
            "id",
            "name",
            "sacco_type",
            "sasra_status",
            "county",
            "source_reference",
            "last_verified_at",
            "published_status",
            "created_at",
            "updated_at",
        ]
