from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from knowledge.models import DataIngestionRun, DataQualityIssue, DataSource, SourceRecord
from knowledge.services import create_quality_issue, publish_source_record, upsert_source_record
from pipelines.hashing import content_hash
from pipelines.http import SafeHttpClient
from pipelines.storage import store_raw_snapshot


@dataclass(frozen=True)
class PipelineRecord:
    source_record_key: str
    source_record_type: str
    raw_payload: dict
    normalized_payload: dict
    review_status: str = SourceRecord.ReviewStatus.NEEDS_REVIEW


@dataclass(frozen=True)
class PipelineRunResult:
    ingestion_run: DataIngestionRun
    records: list[SourceRecord]
    issues: list[DataQualityIssue]


class BaseSourceConnector:
    source_slug = ""
    source_defaults: dict = {}
    sensitive = True

    def __init__(self, *, http_client: SafeHttpClient | None = None):
        self.http_client = http_client or SafeHttpClient()

    def get_source(self) -> DataSource:
        defaults = {"is_active": False, **self.source_defaults}
        source, _created = DataSource.objects.update_or_create(slug=self.source_slug, defaults=defaults)
        return source

    def fetch(self, source: DataSource):
        if not source.data_url:
            raise ValueError(f"Data source {source.slug} has no data_url.")
        return self.http_client.get(source.data_url)

    def parse(self, source: DataSource, raw_snapshot) -> list[PipelineRecord]:
        title = f"{source.name} raw snapshot"
        return [
            PipelineRecord(
                source_record_key=f"{source.slug}:raw-snapshot:{raw_snapshot.content_hash[:12]}",
                source_record_type=SourceRecord.RecordType.LEARNING_REFERENCE,
                raw_payload={
                    "source_title": title,
                    "source_url": raw_snapshot.fetched_url,
                    "content_hash": raw_snapshot.content_hash,
                    "content_type": raw_snapshot.content_type,
                    "storage_path": raw_snapshot.storage_path,
                },
                normalized_payload={
                    "title": title,
                    "source_url": raw_snapshot.fetched_url,
                    "needs_manual_review": True,
                },
            )
        ]

    def normalize(self, records: list[PipelineRecord]) -> list[PipelineRecord]:
        return records

    def validate(self, records: list[PipelineRecord]) -> list[str]:
        errors: list[str] = []
        for record in records:
            if not record.source_record_key or not record.source_record_type:
                errors.append("Pipeline record is missing key or type.")
            if record.source_record_type not in {choice[0] for choice in SourceRecord.RecordType.choices}:
                errors.append(f"Unsupported source record type: {record.source_record_type}")
        return errors

    @transaction.atomic
    def run(self, *, dry_run: bool = False, auto_approve: bool = False) -> PipelineRunResult:
        source = self.get_source()
        started = timezone.now()
        ingestion_run = DataIngestionRun.objects.create(
            source=source,
            run_type=DataIngestionRun.RunType.TEST if dry_run else DataIngestionRun.RunType.MANUAL,
            status=DataIngestionRun.Status.RUNNING,
            started_at=started,
        )
        records: list[SourceRecord] = []
        issues: list[DataQualityIssue] = []
        try:
            fetch_result = self.fetch(source)
            raw_snapshot = store_raw_snapshot(
                source=source,
                ingestion_run=ingestion_run,
                content=fetch_result.content,
                content_type=fetch_result.content_type,
                fetched_url=fetch_result.final_url,
                metadata={"dry_run": dry_run, **fetch_result.metadata},
            )
            source.last_checked_at = timezone.now()
            source.save(update_fields=["last_checked_at", "updated_at"])
            parsed = self.parse(source, raw_snapshot)
            normalized = self.normalize(parsed)
            for message in self.validate(normalized):
                issues.append(
                    create_quality_issue(
                        ingestion_run=ingestion_run,
                        message=message,
                        severity=DataQualityIssue.Severity.ERROR,
                        issue_type=DataQualityIssue.IssueType.INVALID_FORMAT,
                    )
                )
            for pipeline_record in normalized:
                review_status = (
                    SourceRecord.ReviewStatus.AUTO_APPROVED
                    if auto_approve and not self.sensitive
                    else pipeline_record.review_status
                )
                record, created = upsert_source_record(
                    source=source,
                    source_record_key=pipeline_record.source_record_key,
                    source_record_type=pipeline_record.source_record_type,
                    raw_payload=pipeline_record.raw_payload,
                    normalized_payload=pipeline_record.normalized_payload,
                    content_hash=content_hash(pipeline_record.normalized_payload),
                    review_status=review_status,
                )
                records.append(record)
                if created:
                    ingestion_run.records_created += 1
                elif record.status == SourceRecord.Status.CHANGED:
                    ingestion_run.records_updated += 1
                else:
                    ingestion_run.records_unchanged += 1
                if auto_approve and not dry_run:
                    publish_source_record(record, auto_approve=True)

            ingestion_run.records_seen = len(normalized)
            ingestion_run.status = (
                DataIngestionRun.Status.NEEDS_REVIEW
                if records and not auto_approve
                else DataIngestionRun.Status.SUCCEEDED
            )
            source.last_success_at = timezone.now()
            source.save(update_fields=["last_success_at", "updated_at"])
        except Exception as exc:
            ingestion_run.status = DataIngestionRun.Status.FAILED
            ingestion_run.error_summary = str(exc)
            ingestion_run.records_failed += 1
            source.last_failure_at = timezone.now()
            source.save(update_fields=["last_failure_at", "updated_at"])
        ingestion_run.finished_at = timezone.now()
        ingestion_run.raw_snapshot_location = (
            ingestion_run.raw_snapshots.first().storage_path if ingestion_run.raw_snapshots.exists() else ""
        )
        ingestion_run.save()
        return PipelineRunResult(ingestion_run=ingestion_run, records=records, issues=issues)
