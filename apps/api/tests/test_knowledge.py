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
    Regulator,
    SourceRecord,
    SourceReference,
)
from knowledge.services import upsert_source_record


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return get_user_model().objects.create_user(
        username="knowledge-admin",
        password="test-pass-123",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="consumer", password="test-pass-123")


def authenticate(api_client, user):
    token, _created = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


def create_source():
    return DataSource.objects.create(
        name="Capital Markets Authority",
        slug="cma",
        source_type=DataSource.SourceType.REGULATOR,
        authority_level=DataSource.AuthorityLevel.OFFICIAL,
        homepage_url="https://www.cma.or.ke/",
        data_url="https://www.cma.or.ke/",
        update_frequency=DataSource.UpdateFrequency.MONTHLY,
        parser_strategy=DataSource.ParserStrategy.MANUAL,
    )


def create_reference(source=None):
    source = source or create_source()
    return SourceReference.objects.create(
        source=source,
        title="CMA licensees reference",
        url="https://www.cma.or.ke/",
        retrieved_at=timezone.now(),
        citation_label="CMA licensees",
        notes="Educational information only.",
    )


@pytest.mark.django_db
def test_admin_can_create_data_source(api_client, admin_user):
    authenticate(api_client, admin_user)

    response = api_client.post(
        "/api/admin/data-sources/",
        {
            "name": "Central Bank of Kenya",
            "slug": "cbk",
            "source_type": DataSource.SourceType.GOVERNMENT,
            "authority_level": DataSource.AuthorityLevel.OFFICIAL,
            "homepage_url": "https://www.centralbank.go.ke/",
            "data_url": "https://www.centralbank.go.ke/",
            "update_frequency": DataSource.UpdateFrequency.WEEKLY,
            "parser_strategy": DataSource.ParserStrategy.MANUAL,
            "is_active": True,
        },
        format="json",
    )

    assert response.status_code == 201
    assert DataSource.objects.filter(slug="cbk").exists()


@pytest.mark.django_db
def test_can_create_ingestion_run_and_snapshot():
    source = create_source()
    run = DataIngestionRun.objects.create(
        source=source,
        run_type=DataIngestionRun.RunType.TEST,
        status=DataIngestionRun.Status.SUCCEEDED,
        started_at=timezone.now(),
        finished_at=timezone.now(),
        records_seen=1,
        records_created=1,
    )
    snapshot = RawDataSnapshot.objects.create(
        source=source,
        ingestion_run=run,
        content_hash="abc123",
        content_type="text/html",
        fetched_url="https://www.cma.or.ke/",
        fetched_at=timezone.now(),
        byte_size=128,
        metadata={"note": "manual test snapshot"},
    )

    assert snapshot.ingestion_run == run
    assert run.records_created == 1


@pytest.mark.django_db
def test_source_record_deduplicates_by_source_record_key():
    source = create_source()

    first, first_created = upsert_source_record(
        source=source,
        source_record_key="fund-manager-1",
        source_record_type=SourceRecord.RecordType.PROVIDER,
        raw_payload={"name": "Example Fund Manager"},
        normalized_payload={"name": "Example Fund Manager"},
        content_hash="hash-1",
    )
    second, second_created = upsert_source_record(
        source=source,
        source_record_key="fund-manager-1",
        source_record_type=SourceRecord.RecordType.PROVIDER,
        raw_payload={"name": "Example Fund Manager"},
        normalized_payload={"name": "Example Fund Manager"},
        content_hash="hash-1",
    )

    assert first_created is True
    assert second_created is False
    assert first.id == second.id
    assert SourceRecord.objects.count() == 1
    assert second.status == SourceRecord.Status.UNCHANGED


@pytest.mark.django_db
def test_product_passport_can_link_to_source_reference():
    reference = create_reference()
    category = ProductCategory.objects.create(name="Money Market Funds", slug="money-market-funds")
    provider = Provider.objects.create(name="Example Provider", regulator_category="Fund manager")
    passport = ProductPassport.objects.create(
        category=category,
        provider=provider,
        name="Example MMF",
        slug="example-mmf",
        description="Educational information only.",
        liquidity_level=ProductPassport.LiquidityLevel.HIGH,
        risk_level=ProductPassport.RiskLevel.LOW,
        status=ProductPassport.Status.PUBLISHED,
        published_status=ProductPassport.Status.PUBLISHED,
    )

    passport.source_references.add(reference)

    assert passport.source_references.filter(id=reference.id).exists()


@pytest.mark.django_db
def test_investment_provider_can_link_to_regulator_and_source_reference():
    reference = create_reference()
    regulator = Regulator.objects.create(
        name="Capital Markets Authority",
        abbreviation="CMA",
        website="https://www.cma.or.ke/",
    )
    provider = InvestmentProvider.objects.create(
        name="Example Stockbroker",
        slug="example-stockbroker",
        provider_type=InvestmentProvider.ProviderType.STOCKBROKER,
        regulator=regulator,
        license_number="CMA-123",
        license_status="Active",
        published_status=InvestmentProvider.PublishedStatus.PUBLISHED,
    )

    provider.source_references.add(reference)

    assert provider.regulator == regulator
    assert provider.source_references.filter(id=reference.id).exists()


@pytest.mark.django_db
def test_public_provider_endpoint_does_not_expose_internal_editorial_notes(api_client):
    reference = create_reference()
    regulator = Regulator.objects.create(name="Capital Markets Authority", abbreviation="CMA")
    provider = InvestmentProvider.objects.create(
        name="Example Adviser",
        slug="example-adviser",
        provider_type=InvestmentProvider.ProviderType.INVESTMENT_ADVISER,
        regulator=regulator,
        license_status="Active",
        published_status=InvestmentProvider.PublishedStatus.PUBLISHED,
    )
    provider.source_references.add(reference)

    response = api_client.get("/api/knowledge/providers/")

    assert response.status_code == 200
    provider_payload = response.json()["results"][0]
    assert provider_payload["slug"] == "example-adviser"
    assert "editorial_notes" not in provider_payload


@pytest.mark.django_db
def test_admin_endpoints_require_admin_permission(api_client, user):
    authenticate(api_client, user)

    response = api_client.get("/api/admin/data-sources/")

    assert response.status_code in {401, 403}


@pytest.mark.django_db
def test_consumer_knowledge_endpoints_are_read_only(api_client):
    response = api_client.post(
        "/api/knowledge/providers/",
        {"name": "Should not write"},
        format="json",
    )

    assert response.status_code == 405


@pytest.mark.django_db
def test_admin_can_resolve_data_quality_issue(api_client, admin_user):
    source = create_source()
    run = DataIngestionRun.objects.create(source=source, run_type=DataIngestionRun.RunType.TEST)
    issue = DataQualityIssue.objects.create(
        ingestion_run=run,
        severity=DataQualityIssue.Severity.WARNING,
        issue_type=DataQualityIssue.IssueType.MISSING_FIELD,
        message="License number missing.",
    )
    authenticate(api_client, admin_user)

    response = api_client.post(f"/api/admin/data-quality-issues/{issue.id}/resolve/")

    assert response.status_code == 200
    issue.refresh_from_db()
    assert issue.status == DataQualityIssue.Status.RESOLVED
    assert issue.resolved_at is not None
