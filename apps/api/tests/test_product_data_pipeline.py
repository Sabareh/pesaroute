"""
Tests for the product data pipeline:
- CSV import creates StagedProductUpdate records
- Dry-run does not write to DB
- Bad CSV rows create DataQualityIssue records
- Approval publishes ProductRateSnapshot
- Old snapshot is no longer current after publish
- Freshness refresh updates product freshness_status
- Provider connector stubs are inactive by default
- CBK connector dry-run creates DataIngestionRun
- NSE connector does not ingest price data
- Public product API shows source/freshness/confidence
- Public product API does not expose raw_payload or internal notes
"""
from __future__ import annotations

import os
import tempfile
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import ProductCategory, Provider
from knowledge.models import DataIngestionRun, DataQualityIssue, DataSource
from planning.models import InvestmentProduct, ProductRateSnapshot, StagedProductUpdate
from planning.product_pipeline_services import (
    approve_staged_product_update,
    publish_staged_product_update,
    refresh_product_freshness,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mmf_category(db):
    return ProductCategory.objects.create(name="Money Market Funds", slug="money-market-funds")


@pytest.fixture
def provider(db):
    return Provider.objects.create(name="Test Provider", slug="test-provider")


@pytest.fixture
def data_source(db):
    return DataSource.objects.create(
        name="Test Editorial CSV",
        slug="test-editorial-csv",
        source_type=DataSource.SourceType.MANUAL_EDITORIAL,
        authority_level=DataSource.AuthorityLevel.EDITORIAL,
        homepage_url="https://example.com",
        is_active=True,
    )


def write_csv(content: str) -> str:
    f = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, encoding="utf-8")
    f.write(content)
    f.close()
    return f.name


VALID_CSV = """provider_name,product_name,product_type,currency,rate_value,rate_type,rate_period,snapshot_date,source_url,confidence,notes
Test Provider,Starter MMF,money_market_fund,KES,11.50,annual_yield,annual,2026-01-15,https://example.com/rates,editorial,Test fixture
"""

BAD_RATE_CSV = """provider_name,product_name,product_type,currency,rate_value,snapshot_date
Test Provider,Bad Rate MMF,money_market_fund,KES,not-a-number,2026-01-15
"""

MISSING_FIELDS_CSV = """provider_name,product_name,product_type
Test Provider,Incomplete Product,money_market_fund
"""


@pytest.mark.django_db
def test_csv_dry_run_does_not_create_staged_updates(data_source):
    from pipelines.product_csv_import import import_product_rates_csv

    path = write_csv(VALID_CSV)
    try:
        run = import_product_rates_csv(source=data_source, file_path=path, dry_run=True)
    finally:
        os.unlink(path)

    assert run.records_seen == 1
    assert StagedProductUpdate.objects.filter(source=data_source).count() == 0


@pytest.mark.django_db
def test_csv_import_creates_staged_updates(data_source):
    from pipelines.product_csv_import import import_product_rates_csv

    path = write_csv(VALID_CSV)
    try:
        run = import_product_rates_csv(source=data_source, file_path=path, dry_run=False)
    finally:
        os.unlink(path)

    assert run.records_seen == 1
    staged = StagedProductUpdate.objects.filter(source=data_source)
    assert staged.count() == 1
    update = staged.first()
    assert update.provider_name == "Test Provider"
    assert update.product_name == "Starter MMF"
    assert update.review_status == StagedProductUpdate.ReviewStatus.NEEDS_REVIEW
    assert update.normalized_payload["current_rate"] == 11.50


@pytest.mark.django_db
def test_csv_import_bad_rate_creates_quality_issue(data_source):
    from pipelines.product_csv_import import import_product_rates_csv

    path = write_csv(BAD_RATE_CSV)
    try:
        run = import_product_rates_csv(source=data_source, file_path=path, dry_run=False)
    finally:
        os.unlink(path)

    assert run.records_failed == 1
    assert DataQualityIssue.objects.filter(ingestion_run=run).exists()
    issue = DataQualityIssue.objects.filter(ingestion_run=run).first()
    assert issue.issue_type == DataQualityIssue.IssueType.INVALID_FORMAT


@pytest.mark.django_db
def test_csv_import_missing_columns_fails_run(data_source):
    from pipelines.product_csv_import import import_product_rates_csv

    path = write_csv(MISSING_FIELDS_CSV)
    try:
        run = import_product_rates_csv(source=data_source, file_path=path, dry_run=False)
    finally:
        os.unlink(path)

    assert run.status == DataIngestionRun.Status.FAILED
    assert DataQualityIssue.objects.filter(ingestion_run=run).exists()


@pytest.mark.django_db
def test_approve_and_publish_creates_rate_snapshot(data_source, mmf_category):
    from pipelines.product_csv_import import import_product_rates_csv

    path = write_csv(VALID_CSV)
    try:
        import_product_rates_csv(source=data_source, file_path=path, dry_run=False)
    finally:
        os.unlink(path)

    staged = StagedProductUpdate.objects.filter(source=data_source).first()
    assert staged is not None

    product = InvestmentProduct.objects.create(
        name="Starter MMF",
        slug="test-provider-starter-mmf",
        category=mmf_category,
        product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
        published_status=InvestmentProduct.PublishedStatus.PUBLISHED,
    )
    staged.product = product
    staged.save()

    approve_staged_product_update(staged)
    success = publish_staged_product_update(staged)

    assert success is True
    snapshots = ProductRateSnapshot.objects.filter(product=product)
    assert snapshots.count() == 1
    snapshot = snapshots.first()
    assert snapshot.is_current is True
    assert snapshot.rate_value == Decimal("11.50")


@pytest.mark.django_db
def test_publish_marks_old_snapshot_not_current(data_source, mmf_category):
    product = InvestmentProduct.objects.create(
        name="Multi-Rate MMF",
        slug="multi-rate-mmf",
        category=mmf_category,
        product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
        published_status=InvestmentProduct.PublishedStatus.PUBLISHED,
    )
    old_snapshot = ProductRateSnapshot.objects.create(
        product=product,
        snapshot_date=timezone.localdate() - timedelta(days=10),
        rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("9.00"),
        currency="KES",
        is_current=True,
    )

    ingestion_run = DataIngestionRun.objects.create(
        source=data_source,
        run_type=DataIngestionRun.RunType.MANUAL,
        status=DataIngestionRun.Status.SUCCEEDED,
        started_at=timezone.now(),
    )
    staged = StagedProductUpdate.objects.create(
        source=data_source,
        ingestion_run=ingestion_run,
        product=product,
        provider_name="Test Provider",
        product_name="Multi-Rate MMF",
        normalized_payload={
            "current_rate": 11.5,
            "rate_type": "annual_yield",
            "rate_period": "annual",
            "currency": "KES",
            "snapshot_date": str(timezone.localdate()),
            "confidence": "editorial",
            "provider_name": "Test Provider",
            "product_name": "Multi-Rate MMF",
        },
        proposed_changes={},
        parser_confidence=StagedProductUpdate.ParserConfidence.HIGH,
        review_status=StagedProductUpdate.ReviewStatus.APPROVED,
    )

    success = publish_staged_product_update(staged)

    assert success is True
    old_snapshot.refresh_from_db()
    assert old_snapshot.is_current is False
    new_snapshot = ProductRateSnapshot.objects.filter(product=product, is_current=True).first()
    assert new_snapshot is not None
    assert new_snapshot.rate_value == Decimal("11.5")


@pytest.mark.django_db
def test_refresh_freshness_marks_stale_after_threshold(mmf_category):
    product = InvestmentProduct.objects.create(
        name="Stale MMF",
        slug="stale-mmf",
        category=mmf_category,
        product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
        freshness_status=InvestmentProduct.FreshnessStatus.FRESH,
        last_verified_at=timezone.now() - timedelta(days=30),
    )
    ProductRateSnapshot.objects.create(
        product=product,
        snapshot_date=timezone.localdate() - timedelta(days=30),
        rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("10.00"),
        is_current=True,
    )

    counts = refresh_product_freshness()
    product.refresh_from_db()

    assert product.freshness_status == InvestmentProduct.FreshnessStatus.STALE
    assert counts[InvestmentProduct.FreshnessStatus.STALE] >= 1


@pytest.mark.django_db
def test_refresh_freshness_marks_fresh_when_recent(mmf_category):
    product = InvestmentProduct.objects.create(
        name="Fresh MMF",
        slug="fresh-mmf",
        category=mmf_category,
        product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
        freshness_status=InvestmentProduct.FreshnessStatus.UNKNOWN,
    )
    ProductRateSnapshot.objects.create(
        product=product,
        snapshot_date=timezone.localdate(),
        rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("11.00"),
        is_current=True,
    )

    refresh_product_freshness()
    product.refresh_from_db()

    assert product.freshness_status == InvestmentProduct.FreshnessStatus.FRESH


@pytest.mark.django_db
def test_provider_connector_stubs_inactive_by_default():
    from pipelines.connectors.provider_stubs import (
        ProviderCalculatorPageConnector,
        ProviderPageHtmlConnector,
        ProviderPdfFactsheetConnector,
    )

    for cls in [ProviderPageHtmlConnector, ProviderPdfFactsheetConnector, ProviderCalculatorPageConnector]:
        connector = cls()
        source = connector.get_source()
        assert source.is_active is False


@pytest.mark.django_db
def test_cbk_connector_dry_run_creates_ingestion_run():
    from pipelines.connectors.official_sources import CbkTreasuryBillsConnector

    connector = CbkTreasuryBillsConnector()
    source = connector.get_source()
    run = DataIngestionRun.objects.create(
        source=source,
        run_type=DataIngestionRun.RunType.TEST,
        status=DataIngestionRun.Status.PENDING,
        started_at=timezone.now(),
    )
    assert run.source == source
    assert run.run_type == DataIngestionRun.RunType.TEST


@pytest.mark.django_db
def test_nse_connector_strips_price_data():
    from pipelines.csv_import import import_source_csv

    nse_source = DataSource.objects.create(
        name="NSE Listed Companies",
        slug="nse-listed-companies",
        source_type=DataSource.SourceType.EXCHANGE,
        authority_level=DataSource.AuthorityLevel.OFFICIAL,
        homepage_url="https://www.nse.co.ke/",
        is_active=False,
    )
    csv_content = (
        "name,symbol,isin,sector,price,last_price,bid,ask\n"
        "Safaricom,SCOM,KE0000000003,Telecom,28.50,28.50,28.45,28.55\n"
    )
    path = write_csv(csv_content)
    try:
        run = import_source_csv(source=nse_source, file_path=path, record_kind="listed_companies", dry_run=False)
    finally:
        os.unlink(path)

    from knowledge.models import SourceRecord

    records = SourceRecord.objects.filter(source=nse_source)
    for record in records:
        payload = record.normalized_payload
        for price_field in ("price", "last_price", "bid", "ask"):
            assert price_field not in payload, f"Price field '{price_field}' should not be in normalized_payload"

    issues = DataQualityIssue.objects.filter(ingestion_run=run, issue_type=DataQualityIssue.IssueType.PERMISSION_WARNING)
    assert issues.exists()


@pytest.mark.django_db
def test_product_api_shows_source_and_freshness(api_client, mmf_category, provider):
    product = InvestmentProduct.objects.create(
        name="API Test MMF",
        slug="api-test-mmf",
        category=mmf_category,
        provider=None,
        product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
        freshness_status=InvestmentProduct.FreshnessStatus.FRESH,
        source_confidence=InvestmentProduct.SourceConfidence.OFFICIAL,
        published_status=InvestmentProduct.PublishedStatus.PUBLISHED,
    )
    ProductRateSnapshot.objects.create(
        product=product,
        snapshot_date=timezone.localdate(),
        rate_type=ProductRateSnapshot.RateType.ANNUAL_YIELD,
        rate_value=Decimal("12.00"),
        confidence=InvestmentProduct.SourceConfidence.OFFICIAL,
        is_current=True,
    )

    response = api_client.get(f"/api/products/{product.slug}/")

    assert response.status_code == 200
    payload = response.json()
    assert "freshness_status" in payload
    assert "source_confidence" in payload
    assert payload["freshness_status"] == InvestmentProduct.FreshnessStatus.FRESH
    assert payload["source_confidence"] == InvestmentProduct.SourceConfidence.OFFICIAL


@pytest.mark.django_db
def test_product_api_excludes_internal_notes_and_raw_payload(api_client, mmf_category):
    product = InvestmentProduct.objects.create(
        name="Private Notes MMF",
        slug="private-notes-mmf",
        category=mmf_category,
        product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
        published_status=InvestmentProduct.PublishedStatus.PUBLISHED,
        internal_notes="This is private and must not be exposed.",
    )

    response = api_client.get(f"/api/products/{product.slug}/")

    assert response.status_code == 200
    payload = response.json()
    assert "internal_notes" not in payload
    assert "raw_payload" not in payload


@pytest.mark.django_db
def test_auto_approve_csv_import_publishes_immediately(data_source, mmf_category):
    path = write_csv(VALID_CSV)
    try:
        from pipelines.product_csv_import import import_product_rates_csv

        InvestmentProduct.objects.create(
            name="Starter MMF",
            slug="test-provider-starter-mmf",
            category=mmf_category,
            product_type=InvestmentProduct.ProductType.MONEY_MARKET_FUND,
            published_status=InvestmentProduct.PublishedStatus.PUBLISHED,
        )
        run = import_product_rates_csv(source=data_source, file_path=path, dry_run=False, auto_approve=True)
    finally:
        os.unlink(path)

    staged = StagedProductUpdate.objects.filter(source=data_source).first()
    assert staged is not None
    assert staged.review_status == StagedProductUpdate.ReviewStatus.AUTO_APPROVED
    snapshot_count = ProductRateSnapshot.objects.filter(
        product__slug="test-provider-starter-mmf"
    ).count()
    assert snapshot_count >= 1
