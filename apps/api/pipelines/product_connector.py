from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from django.db import transaction
from django.utils import timezone

from knowledge.models import DataIngestionRun, DataQualityIssue, DataSource, SourceRecord
from knowledge.services import create_quality_issue, source_reference_for_record, upsert_source_record
from pipelines.base import BaseSourceConnector
from pipelines.hashing import content_hash
from pipelines.http import SafeHttpClient
from pipelines.storage import store_raw_snapshot
from planning.models import StagedProductUpdate


@dataclass
class NormalizedProductData:
    provider_name: str
    product_name: str
    product_type: str
    currency: str
    current_rate: float | None
    rate_type: str
    rate_label: str
    minimum_amount: float | None
    withdrawal_timeline: str
    fees_summary: str
    risk_notes: str
    liquidity_notes: str
    source_url: str
    source_retrieved_at: date | None
    confidence: str
    parser_confidence: str
    requires_review: bool
    snapshot_date: date | None = None
    rate_period: str = "annual"
    notes: str = ""
    extra: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "provider_name": self.provider_name,
            "product_name": self.product_name,
            "product_type": self.product_type,
            "currency": self.currency,
            "current_rate": self.current_rate,
            "rate_type": self.rate_type,
            "rate_label": self.rate_label,
            "rate_period": self.rate_period,
            "minimum_amount": self.minimum_amount,
            "withdrawal_timeline": self.withdrawal_timeline,
            "fees_summary": self.fees_summary,
            "risk_notes": self.risk_notes,
            "liquidity_notes": self.liquidity_notes,
            "source_url": self.source_url,
            "source_retrieved_at": str(self.source_retrieved_at) if self.source_retrieved_at else None,
            "snapshot_date": str(self.snapshot_date) if self.snapshot_date else None,
            "confidence": self.confidence,
            "parser_confidence": self.parser_confidence,
            "requires_review": self.requires_review,
            "notes": self.notes,
            **self.extra,
        }


class ProductDataConnector(BaseSourceConnector):
    """
    Base connector for product-rate data. Subclasses implement fetch/parse/normalize
    to produce NormalizedProductData; this class handles staging and publishing.

    All connectors are inactive by default. Never auto-publish without explicit admin approval.
    """

    source_slug = ""
    source_defaults: dict = {}
    sensitive = True

    def __init__(self, *, http_client: SafeHttpClient | None = None):
        self.http_client = http_client or SafeHttpClient()

    def fetch(self, source: DataSource):
        if not source.data_url:
            raise ValueError(f"Data source {source.slug} has no data_url configured.")
        return self.http_client.get(source.data_url)

    def snapshot(self, source: DataSource, ingestion_run: DataIngestionRun, fetch_result) -> object:
        return store_raw_snapshot(
            source=source,
            ingestion_run=ingestion_run,
            content=fetch_result.content,
            content_type=fetch_result.content_type,
            fetched_url=fetch_result.final_url,
            metadata={"product_connector": self.source_slug},
        )

    def parse(self, source: DataSource, raw_snapshot) -> list[NormalizedProductData]:
        return []

    def normalize(self, items: list[NormalizedProductData]) -> list[NormalizedProductData]:
        return items

    def validate(self, items: list[NormalizedProductData]) -> list[str]:
        errors = []
        for item in items:
            if not item.provider_name:
                errors.append(f"Missing provider_name in record for product '{item.product_name}'")
            if not item.product_name:
                errors.append("Missing product_name in record")
            if item.current_rate is not None:
                try:
                    float(item.current_rate)
                except (TypeError, ValueError):
                    errors.append(f"Invalid rate value '{item.current_rate}' for {item.product_name}")
        return errors

    def stage(
        self,
        source: DataSource,
        ingestion_run: DataIngestionRun,
        items: list[NormalizedProductData],
        *,
        auto_approve: bool = False,
        dry_run: bool = False,
    ) -> list[StagedProductUpdate]:
        staged = []
        for item in items:
            payload = item.as_dict()
            review_status = (
                StagedProductUpdate.ReviewStatus.AUTO_APPROVED
                if auto_approve and item.parser_confidence == StagedProductUpdate.ParserConfidence.HIGH
                else StagedProductUpdate.ReviewStatus.NEEDS_REVIEW
            )
            if dry_run:
                staged.append(
                    StagedProductUpdate(
                        source=source,
                        ingestion_run=ingestion_run,
                        provider_name=item.provider_name,
                        product_name=item.product_name,
                        normalized_payload=payload,
                        proposed_changes=payload,
                        parser_confidence=item.parser_confidence or StagedProductUpdate.ParserConfidence.LOW,
                        review_status=review_status,
                    )
                )
            else:
                record_key = f"{self.source_slug}:product:{item.provider_name}:{item.product_name}"
                source_record, _created = upsert_source_record(
                    source=source,
                    source_record_key=record_key.lower()[:240],
                    source_record_type=SourceRecord.RecordType.PRODUCT,
                    raw_payload=payload,
                    normalized_payload=payload,
                    content_hash=content_hash(payload),
                    review_status=(
                        SourceRecord.ReviewStatus.AUTO_APPROVED
                        if auto_approve and item.parser_confidence == StagedProductUpdate.ParserConfidence.HIGH
                        else SourceRecord.ReviewStatus.NEEDS_REVIEW
                    ),
                )
                staged_update = StagedProductUpdate.objects.create(
                    source=source,
                    ingestion_run=ingestion_run,
                    provider_name=item.provider_name,
                    product_name=item.product_name,
                    normalized_payload=payload,
                    proposed_changes=payload,
                    parser_confidence=item.parser_confidence or StagedProductUpdate.ParserConfidence.LOW,
                    review_status=review_status,
                )
                staged.append(staged_update)
        return staged

    def publish(self, staged_update: StagedProductUpdate, *, auto_approve: bool = False) -> bool:
        from planning.product_pipeline_services import publish_staged_product_update

        return publish_staged_product_update(staged_update, auto_approve=auto_approve)

    @transaction.atomic
    def run(self, *, dry_run: bool = True, auto_approve: bool = False):
        source = self.get_source()
        if not source.is_active and not dry_run:
            raise ValueError(f"Connector '{self.source_slug}' is inactive. Enable the DataSource to run.")
        started = timezone.now()
        ingestion_run = DataIngestionRun.objects.create(
            source=source,
            run_type=DataIngestionRun.RunType.TEST if dry_run else DataIngestionRun.RunType.MANUAL,
            status=DataIngestionRun.Status.RUNNING,
            started_at=started,
        )
        staged: list[StagedProductUpdate] = []
        try:
            fetch_result = self.fetch(source)
            raw_snapshot = self.snapshot(source, ingestion_run, fetch_result)
            source.last_checked_at = timezone.now()
            source.save(update_fields=["last_checked_at", "updated_at"])
            parsed = self.parse(source, raw_snapshot)
            normalized = self.normalize(parsed)
            for message in self.validate(normalized):
                create_quality_issue(
                    ingestion_run=ingestion_run,
                    message=message,
                    severity=DataQualityIssue.Severity.ERROR,
                    issue_type=DataQualityIssue.IssueType.INVALID_FORMAT,
                )
            staged = self.stage(
                source,
                ingestion_run,
                normalized,
                auto_approve=auto_approve,
                dry_run=dry_run,
            )
            ingestion_run.records_seen = len(normalized)
            ingestion_run.records_created = len(staged) if not dry_run else 0
            ingestion_run.status = (
                DataIngestionRun.Status.NEEDS_REVIEW if staged and not auto_approve else DataIngestionRun.Status.SUCCEEDED
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
        ingestion_run.save()
        return ingestion_run, staged
