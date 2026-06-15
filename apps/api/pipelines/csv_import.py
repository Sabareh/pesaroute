from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from django.db import transaction
from django.utils import timezone

from knowledge.models import DataIngestionRun, DataQualityIssue, DataSource, SourceRecord
from knowledge.services import create_quality_issue, publish_source_record, upsert_source_record
from pipelines.hashing import content_hash
from pipelines.storage import store_raw_snapshot

RESTRICTED_MARKET_DATA_FIELDS = {"price", "share_price", "last_price", "bid", "ask", "volume", "turnover"}


@dataclass(frozen=True)
class CsvSchema:
    record_type: str
    required_fields: tuple[str, ...]
    key_fields: tuple[str, ...]


CSV_SCHEMAS = {
    "providers": CsvSchema(SourceRecord.RecordType.PROVIDER, ("name", "provider_type"), ("name",)),
    "product_passports": CsvSchema(SourceRecord.RecordType.PRODUCT, ("name", "slug", "category"), ("slug",)),
    "listed_companies": CsvSchema(SourceRecord.RecordType.LISTED_COMPANY, ("name", "symbol"), ("symbol",)),
    "saccos": CsvSchema(SourceRecord.RecordType.SACCO, ("name", "sasra_status"), ("name",)),
    "government_securities": CsvSchema(
        SourceRecord.RecordType.AUCTION_RESULT, ("security_type",), ("security_type", "issue_number", "isin")
    ),
    "regulator_licensees": CsvSchema(
        SourceRecord.RecordType.LICENSE, ("name", "regulator", "category"), ("regulator", "category", "name")
    ),
    "learning_references": CsvSchema(SourceRecord.RecordType.LEARNING_REFERENCE, ("title", "source_url"), ("title",)),
}


@transaction.atomic
def import_source_csv(
    *,
    source: DataSource,
    file_path: str,
    record_kind: str,
    dry_run: bool = False,
    auto_approve: bool = False,
) -> DataIngestionRun:
    schema = CSV_SCHEMAS[record_kind]
    content = Path(file_path).read_bytes()
    run = DataIngestionRun.objects.create(
        source=source,
        run_type=DataIngestionRun.RunType.TEST if dry_run else DataIngestionRun.RunType.MANUAL,
        status=DataIngestionRun.Status.RUNNING,
        started_at=timezone.now(),
    )
    snapshot = store_raw_snapshot(
        source=source,
        ingestion_run=run,
        content=content,
        content_type="text/csv",
        fetched_url=source.data_url or source.homepage_url,
        metadata={"csv_import": True, "record_kind": record_kind, "dry_run": dry_run},
    )
    run.raw_snapshot_location = snapshot.storage_path
    decoded = content.decode("utf-8-sig")
    reader = csv.DictReader(decoded.splitlines())
    header_fields = set(reader.fieldnames or [])
    missing_headers = [field for field in schema.required_fields if field not in header_fields]
    if missing_headers:
        create_quality_issue(
            ingestion_run=run,
            message=f"CSV is missing required columns: {', '.join(missing_headers)}",
            severity=DataQualityIssue.Severity.ERROR,
            issue_type=DataQualityIssue.IssueType.MISSING_FIELD,
        )
        run.status = DataIngestionRun.Status.FAILED
        run.finished_at = timezone.now()
        run.records_failed = 1
        run.save()
        return run

    for index, row in enumerate(reader, start=2):
        normalized = {key: (value or "").strip() for key, value in row.items() if key}
        missing_values = [field for field in schema.required_fields if not normalized.get(field)]
        if missing_values:
            create_quality_issue(
                ingestion_run=run,
                message=f"Row {index} missing required values: {', '.join(missing_values)}",
                severity=DataQualityIssue.Severity.ERROR,
                issue_type=DataQualityIssue.IssueType.MISSING_FIELD,
            )
            run.records_failed += 1
            continue

        restricted_fields = RESTRICTED_MARKET_DATA_FIELDS.intersection(normalized)
        if source.slug.startswith("nse") and restricted_fields:
            for field in restricted_fields:
                normalized.pop(field, None)
            field_list = ", ".join(sorted(restricted_fields))
            create_quality_issue(
                ingestion_run=run,
                message=f"Row {index} contained restricted market data fields that were not imported: {field_list}",
                severity=DataQualityIssue.Severity.WARNING,
                issue_type=DataQualityIssue.IssueType.PERMISSION_WARNING,
            )

        key = ":".join(normalized.get(field, "") for field in schema.key_fields if normalized.get(field))
        record, created = upsert_source_record(
            source=source,
            source_record_key=f"{record_kind}:{key.lower()}",
            source_record_type=schema.record_type,
            raw_payload={**row, "source_url": source.data_url or source.homepage_url},
            normalized_payload=normalized,
            content_hash=content_hash(normalized),
            review_status=(
                SourceRecord.ReviewStatus.AUTO_APPROVED if auto_approve else SourceRecord.ReviewStatus.NEEDS_REVIEW
            ),
        )
        if auto_approve and not dry_run:
            publish_source_record(record, auto_approve=True)
        run.records_seen += 1
        if created:
            run.records_created += 1
        elif record.status == SourceRecord.Status.CHANGED:
            run.records_updated += 1
        else:
            run.records_unchanged += 1

    run.status = (
        DataIngestionRun.Status.NEEDS_REVIEW
        if not auto_approve and run.records_seen
        else DataIngestionRun.Status.SUCCEEDED
    )
    if run.records_failed and run.records_seen:
        run.status = DataIngestionRun.Status.PARTIAL
    run.finished_at = timezone.now()
    run.save()
    source.last_checked_at = timezone.now()
    source.last_success_at = timezone.now() if run.status != DataIngestionRun.Status.FAILED else source.last_success_at
    source.save(update_fields=["last_checked_at", "last_success_at", "updated_at"])
    return run
