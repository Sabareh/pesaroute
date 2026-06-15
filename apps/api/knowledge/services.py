from __future__ import annotations

from datetime import date

from django.utils import timezone
from django.utils.text import slugify

from knowledge.models import (
    DataChangeEvent,
    DataIngestionRun,
    DataQualityIssue,
    DataSource,
    GovernmentSecurityReference,
    InvestmentProvider,
    ListedCompany,
    RegulatedEntityStatus,
    Regulator,
    SaccoEntity,
    SourceRecord,
    SourceReference,
)


def upsert_source_record(
    *,
    source,
    source_record_key: str,
    source_record_type: str,
    raw_payload: dict,
    normalized_payload: dict,
    content_hash: str,
    review_status: str = SourceRecord.ReviewStatus.NEEDS_REVIEW,
) -> tuple[SourceRecord, bool]:
    record, created = SourceRecord.objects.get_or_create(
        source=source,
        source_record_key=source_record_key,
        defaults={
            "source_record_type": source_record_type,
            "raw_payload": raw_payload,
            "normalized_payload": normalized_payload,
            "content_hash": content_hash,
            "review_status": review_status,
            "status": SourceRecord.Status.NEW,
        },
    )
    if created:
        return record, True

    changed = record.content_hash != content_hash
    record.source_record_type = source_record_type
    record.raw_payload = raw_payload
    record.normalized_payload = normalized_payload
    record.content_hash = content_hash
    record.review_status = review_status
    record.status = SourceRecord.Status.CHANGED if changed else SourceRecord.Status.UNCHANGED
    record.last_seen_at = timezone.now()
    record.save(
        update_fields=[
            "source_record_type",
            "raw_payload",
            "normalized_payload",
            "content_hash",
            "review_status",
            "status",
            "last_seen_at",
        ]
    )
    return record, False


def approve_source_record(record: SourceRecord, *, ingestion_run: DataIngestionRun | None = None) -> SourceRecord:
    record.review_status = SourceRecord.ReviewStatus.APPROVED
    record.save(update_fields=["review_status", "last_seen_at"])
    DataChangeEvent.objects.create(
        object_type="SourceRecord",
        object_id=str(record.id),
        change_type=DataChangeEvent.ChangeType.SOURCE_CHANGED,
        new_value={"review_status": record.review_status},
        source=record.source,
        source_record=record,
        ingestion_run=ingestion_run,
        requires_review=False,
    )
    return record


def reject_source_record(
    record: SourceRecord, *, reason: str = "", ingestion_run: DataIngestionRun | None = None
) -> SourceRecord:
    record.review_status = SourceRecord.ReviewStatus.REJECTED
    record.save(update_fields=["review_status", "last_seen_at"])
    DataChangeEvent.objects.create(
        object_type="SourceRecord",
        object_id=str(record.id),
        change_type=DataChangeEvent.ChangeType.REJECTED,
        new_value={"review_status": record.review_status, "reason": reason},
        source=record.source,
        source_record=record,
        ingestion_run=ingestion_run,
        requires_review=False,
    )
    return record


def source_reference_for_record(record: SourceRecord) -> SourceReference:
    source = record.source
    url = (
        record.raw_payload.get("source_url")
        or source.data_url
        or source.homepage_url
        or "https://pesaroute.local/manual-source"
    )
    title = record.raw_payload.get("source_title") or f"{source.name}: {record.source_record_key}"
    reference, _created = SourceReference.objects.get_or_create(
        source=source,
        title=title[:240],
        url=url,
        defaults={
            "retrieved_at": timezone.now(),
            "citation_label": source.name[:160],
            "notes": "Staged by the PesaRoute data pipeline. Verify with the official source before publishing.",
        },
    )
    return reference


def publish_source_record(record: SourceRecord, *, auto_approve: bool = False) -> tuple[object | None, bool]:
    if auto_approve and record.review_status == SourceRecord.ReviewStatus.NEEDS_REVIEW:
        record.review_status = SourceRecord.ReviewStatus.AUTO_APPROVED
        record.save(update_fields=["review_status", "last_seen_at"])

    if record.review_status not in {SourceRecord.ReviewStatus.APPROVED, SourceRecord.ReviewStatus.AUTO_APPROVED}:
        return None, False

    publisher = {
        SourceRecord.RecordType.PROVIDER: _publish_provider,
        SourceRecord.RecordType.LICENSE: _publish_regulated_entity_status,
        SourceRecord.RecordType.LISTED_COMPANY: _publish_listed_company,
        SourceRecord.RecordType.SACCO: _publish_sacco,
        SourceRecord.RecordType.AUCTION_RESULT: _publish_government_security,
        SourceRecord.RecordType.PENSION_SERVICE_PROVIDER: _publish_provider,
        SourceRecord.RecordType.INSURANCE_ENTITY: _publish_provider,
    }.get(record.source_record_type)
    if not publisher:
        return None, False

    obj, created, old_value = publisher(record)
    DataChangeEvent.objects.create(
        object_type=obj.__class__.__name__,
        object_id=str(obj.pk),
        change_type=DataChangeEvent.ChangeType.CREATED if created else DataChangeEvent.ChangeType.UPDATED,
        old_value=old_value,
        new_value=record.normalized_payload,
        source=record.source,
        source_record=record,
        requires_review=False,
    )
    return obj, True


def mark_source_records_stale(source: DataSource, *, reason: str = "") -> int:
    count = 0
    for record in source.source_records.exclude(status=SourceRecord.Status.STALE):
        record.status = SourceRecord.Status.STALE
        record.save(update_fields=["status", "last_seen_at"])
        DataChangeEvent.objects.create(
            object_type="SourceRecord",
            object_id=str(record.id),
            change_type=DataChangeEvent.ChangeType.STALE,
            old_value={"status": record.status},
            new_value={"reason": reason or "Marked stale by admin command."},
            source=source,
            source_record=record,
            requires_review=True,
        )
        count += 1
    return count


def create_quality_issue(
    *,
    ingestion_run: DataIngestionRun,
    message: str,
    severity: str = DataQualityIssue.Severity.WARNING,
    issue_type: str = DataQualityIssue.IssueType.OTHER,
    source_record: SourceRecord | None = None,
) -> DataQualityIssue:
    return DataQualityIssue.objects.create(
        ingestion_run=ingestion_run,
        source_record=source_record,
        severity=severity,
        issue_type=issue_type,
        message=message,
    )


def _provider_type(value: str) -> str:
    valid = {choice[0] for choice in InvestmentProvider.ProviderType.choices}
    normalized = (value or InvestmentProvider.ProviderType.OTHER).strip().lower().replace(" ", "_")
    return normalized if normalized in valid else InvestmentProvider.ProviderType.OTHER


def _date_or_none(value: object) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None


def _snapshot_model(obj, fields: list[str]) -> dict:
    if not obj:
        return {}
    return {field: getattr(obj, field, None) for field in fields}


def _publish_provider(record: SourceRecord) -> tuple[InvestmentProvider, bool, dict]:
    payload = record.normalized_payload
    name = payload["name"]
    regulator = None
    if payload.get("regulator"):
        regulator = Regulator.objects.filter(abbreviation__iexact=payload["regulator"]).first()
    slug = payload.get("slug") or slugify(name)
    existing = InvestmentProvider.objects.filter(slug=slug).first()
    old_value = _snapshot_model(existing, ["name", "provider_type", "license_number", "license_status", "website"])
    provider, created = InvestmentProvider.objects.update_or_create(
        slug=slug,
        defaults={
            "name": name,
            "provider_type": _provider_type(payload.get("provider_type", "")),
            "regulator": regulator,
            "license_number": payload.get("license_number", ""),
            "license_status": payload.get("license_status", payload.get("status", "")),
            "website": payload.get("website", ""),
            "last_verified_at": timezone.now(),
            "published_status": InvestmentProvider.PublishedStatus.PUBLISHED,
        },
    )
    provider.source_references.add(source_reference_for_record(record))
    return provider, created, old_value


def _publish_regulated_entity_status(record: SourceRecord) -> tuple[RegulatedEntityStatus, bool, dict]:
    payload = record.normalized_payload
    provider_record = SourceRecord(
        source=record.source,
        source_record_key=f"{record.source_record_key}:provider",
        source_record_type=SourceRecord.RecordType.PROVIDER,
        raw_payload=record.raw_payload,
        normalized_payload=payload,
        content_hash=record.content_hash,
        review_status=record.review_status,
    )
    provider, _created_provider, _old_provider = _publish_provider(provider_record)
    regulator = Regulator.objects.filter(abbreviation__iexact=payload.get("regulator", "")).first()
    if not regulator:
        regulator = provider.regulator
    existing = RegulatedEntityStatus.objects.filter(
        provider=provider,
        regulator=regulator,
        category=payload.get("category", payload.get("provider_type", "")),
        license_number=payload.get("license_number", ""),
    ).first()
    old_value = _snapshot_model(existing, ["status", "effective_date", "expiry_date"])
    status_obj, created = RegulatedEntityStatus.objects.update_or_create(
        provider=provider,
        regulator=regulator,
        category=payload.get("category", payload.get("provider_type", "License")),
        license_number=payload.get("license_number", ""),
        defaults={
            "status": payload.get("license_status", payload.get("status", "Needs verification")),
            "effective_date": _date_or_none(payload.get("effective_date")),
            "expiry_date": _date_or_none(payload.get("expiry_date")),
            "source_reference": source_reference_for_record(record),
            "raw_notes": payload.get("notes", ""),
        },
    )
    return status_obj, created, old_value


def _publish_listed_company(record: SourceRecord) -> tuple[ListedCompany, bool, dict]:
    payload = record.normalized_payload
    symbol = str(payload["symbol"]).upper()
    existing = ListedCompany.objects.filter(symbol=symbol).first()
    old_value = _snapshot_model(existing, ["name", "isin", "sector", "listing_segment", "website"])
    company, created = ListedCompany.objects.update_or_create(
        symbol=symbol,
        defaults={
            "name": payload["name"],
            "isin": payload.get("isin", ""),
            "sector": payload.get("sector", ""),
            "listing_segment": payload.get("listing_segment", ""),
            "website": payload.get("website", ""),
            "source_reference": source_reference_for_record(record),
            "last_verified_at": timezone.now(),
            "published_status": ListedCompany.PublishedStatus.PUBLISHED,
        },
    )
    return company, created, old_value


def _publish_sacco(record: SourceRecord) -> tuple[SaccoEntity, bool, dict]:
    payload = record.normalized_payload
    name = payload["name"]
    existing = SaccoEntity.objects.filter(name__iexact=name).first()
    old_value = _snapshot_model(existing, ["name", "sacco_type", "sasra_status", "county"])
    sacco, created = SaccoEntity.objects.update_or_create(
        name=name,
        defaults={
            "sacco_type": payload.get("sacco_type", SaccoEntity.SaccoType.OTHER),
            "sasra_status": payload.get("sasra_status", payload.get("status", "Needs verification")),
            "county": payload.get("county", ""),
            "source_reference": source_reference_for_record(record),
            "last_verified_at": timezone.now(),
            "published_status": SaccoEntity.PublishedStatus.PUBLISHED,
        },
    )
    return sacco, created, old_value


def _publish_government_security(record: SourceRecord) -> tuple[GovernmentSecurityReference, bool, dict]:
    payload = record.normalized_payload
    security_type = payload.get("security_type", GovernmentSecurityReference.SecurityType.TREASURY_BILL)
    issue_number = payload.get("issue_number", "")
    isin = payload.get("isin", "")
    existing = GovernmentSecurityReference.objects.filter(
        security_type=security_type, issue_number=issue_number, isin=isin
    ).first()
    old_value = _snapshot_model(
        existing, ["auction_date", "value_date", "maturity_date", "average_rate", "accepted_yield"]
    )
    security, created = GovernmentSecurityReference.objects.update_or_create(
        security_type=security_type,
        issue_number=issue_number,
        isin=isin,
        defaults={
            "tenor_days": payload.get("tenor_days") or None,
            "auction_date": _date_or_none(payload.get("auction_date")),
            "value_date": _date_or_none(payload.get("value_date")),
            "maturity_date": _date_or_none(payload.get("maturity_date")),
            "average_rate": payload.get("average_rate") or None,
            "accepted_yield": payload.get("accepted_yield") or None,
            "source_reference": source_reference_for_record(record),
            "status": payload.get("status", "Needs review"),
        },
    )
    return security, created, old_value
