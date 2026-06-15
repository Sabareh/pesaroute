from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from catalog.models import ProductCategory, ProductPassport, Provider
from knowledge.models import (
    DataIngestionRun,
    DataQualityIssue,
    DataSource,
    InvestmentProvider,
    RawDataSnapshot,
    SourceRecord,
)
from pipelines.base import BaseSourceConnector, PipelineRecord
from pipelines.csv_import import import_source_csv
from pipelines.freshness import FreshnessLabel, scan_data_freshness
from pipelines.http import HttpFetchResult


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return get_user_model().objects.create_user(
        username="pipeline-admin",
        password="test-pass-123",
        is_staff=True,
        is_superuser=True,
    )


def authenticate(api_client, user):
    token, _created = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


def create_pipeline_source(slug="test-pipeline-source"):
    return DataSource.objects.create(
        name="Test Pipeline Source",
        slug=slug,
        source_type=DataSource.SourceType.REGULATOR,
        authority_level=DataSource.AuthorityLevel.OFFICIAL,
        homepage_url="https://example.com/",
        data_url="https://example.com/source",
        update_frequency=DataSource.UpdateFrequency.MONTHLY,
        parser_strategy=DataSource.ParserStrategy.CSV_IMPORT,
    )


class FakeProviderConnector(BaseSourceConnector):
    source_slug = "test-provider-connector"
    source_defaults = {
        "name": "Test Provider Connector",
        "source_type": DataSource.SourceType.REGULATOR,
        "authority_level": DataSource.AuthorityLevel.OFFICIAL,
        "homepage_url": "https://example.com/",
        "data_url": "https://example.com/providers",
        "update_frequency": DataSource.UpdateFrequency.MONTHLY,
        "parser_strategy": DataSource.ParserStrategy.API,
        "is_active": False,
    }

    def fetch(self, source):
        return HttpFetchResult(
            content=b"name,provider_type\nExample Fund Manager,fund_manager\n",
            content_type="text/csv",
            final_url=source.data_url,
            metadata={"status_code": 200},
        )

    def parse(self, source, raw_snapshot):
        return [
            PipelineRecord(
                source_record_key="providers:example-fund-manager",
                source_record_type=SourceRecord.RecordType.PROVIDER,
                raw_payload={"name": "Example Fund Manager", "source_url": source.data_url},
                normalized_payload={"name": "Example Fund Manager", "provider_type": "fund_manager"},
            )
        ]


@pytest.mark.django_db
def test_pipeline_dry_run_stages_records_but_does_not_publish():
    result = FakeProviderConnector().run(dry_run=True)

    assert result.ingestion_run.status == DataIngestionRun.Status.NEEDS_REVIEW
    assert SourceRecord.objects.filter(review_status=SourceRecord.ReviewStatus.NEEDS_REVIEW).exists()
    assert RawDataSnapshot.objects.filter(content_hash__isnull=False).exists()
    assert not InvestmentProvider.objects.filter(slug="example-fund-manager").exists()


@pytest.mark.django_db
def test_successful_connector_creates_ingestion_run_and_raw_snapshot():
    result = FakeProviderConnector().run(dry_run=True)

    snapshot = RawDataSnapshot.objects.get(ingestion_run=result.ingestion_run)
    assert snapshot.byte_size > 0
    assert snapshot.content_hash
    assert snapshot.storage_path


@pytest.mark.django_db
def test_admin_review_is_required_before_publish(api_client, admin_user):
    result = FakeProviderConnector().run(dry_run=True)
    record = result.records[0]
    authenticate(api_client, admin_user)

    blocked = api_client.post(f"/api/admin/source-records/{record.id}/publish/")
    assert blocked.status_code == 409
    assert not InvestmentProvider.objects.filter(slug="example-fund-manager").exists()

    approved = api_client.post(f"/api/admin/source-records/{record.id}/approve/")
    assert approved.status_code == 200
    published = api_client.post(f"/api/admin/source-records/{record.id}/publish/")

    assert published.status_code == 200
    provider = InvestmentProvider.objects.get(slug="example-fund-manager")
    assert provider.published_status == InvestmentProvider.PublishedStatus.PUBLISHED


@pytest.mark.django_db
def test_csv_import_validates_required_fields(tmp_path):
    source = create_pipeline_source()
    csv_path = tmp_path / "bad.csv"
    csv_path.write_text("name\nIncomplete Provider\n", encoding="utf-8")

    run = import_source_csv(source=source, file_path=str(csv_path), record_kind="providers", dry_run=True)

    assert run.status == DataIngestionRun.Status.FAILED
    assert DataQualityIssue.objects.filter(issue_type=DataQualityIssue.IssueType.MISSING_FIELD).exists()
    assert SourceRecord.objects.count() == 0


@pytest.mark.django_db
def test_nse_csv_import_does_not_ingest_restricted_price_data(tmp_path):
    source = create_pipeline_source(slug="nse-listed-companies")
    csv_path = tmp_path / "nse.csv"
    csv_path.write_text("name,symbol,isin,price\nExample PLC,EXM,KE0000000000,123.45\n", encoding="utf-8")

    run = import_source_csv(source=source, file_path=str(csv_path), record_kind="listed_companies", dry_run=True)
    record = SourceRecord.objects.get()

    assert run.status == DataIngestionRun.Status.NEEDS_REVIEW
    assert "price" not in record.normalized_payload
    assert DataQualityIssue.objects.filter(issue_type=DataQualityIssue.IssueType.PERMISSION_WARNING).exists()


@pytest.mark.django_db
def test_freshness_scan_marks_old_catalog_records_stale():
    category = ProductCategory.objects.create(name="Treasury Bills", slug="treasury-bills")
    provider = Provider.objects.create(name="Generic Provider")
    passport = ProductPassport.objects.create(
        category=category,
        provider=provider,
        name="Old Passport",
        slug="old-passport",
        description="Educational information only.",
        liquidity_level=ProductPassport.LiquidityLevel.MEDIUM,
        risk_level=ProductPassport.RiskLevel.LOW,
        status=ProductPassport.Status.PUBLISHED,
        published_status=ProductPassport.Status.PUBLISHED,
        last_verified_at=timezone.now() - timedelta(days=365),
    )

    counts = scan_data_freshness()

    passport.refresh_from_db()
    assert counts[FreshnessLabel.STALE] >= 1
    assert passport.data_freshness == ProductPassport.DataFreshness.STALE


@pytest.mark.django_db
def test_public_api_does_not_expose_source_record_payloads(api_client, admin_user):
    result = FakeProviderConnector().run(dry_run=True)
    record = result.records[0]
    authenticate(api_client, admin_user)
    api_client.post(f"/api/admin/source-records/{record.id}/approve/")
    api_client.post(f"/api/admin/source-records/{record.id}/publish/")

    response = api_client.get("/api/knowledge/providers/")

    assert response.status_code == 200
    provider_payload = response.json()["results"][0]
    assert "raw_payload" not in provider_payload
    assert "normalized_payload" not in provider_payload
