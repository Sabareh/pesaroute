from __future__ import annotations

import csv
from datetime import date
from pathlib import Path

from django.db import transaction
from django.utils import timezone

from knowledge.models import DataIngestionRun, DataQualityIssue, DataSource
from knowledge.services import create_quality_issue
from planning.models import StagedProductUpdate

PRODUCT_RATE_REQUIRED_FIELDS = ("provider_name", "product_name", "product_type", "rate_value", "snapshot_date")

PRODUCT_RATE_NUMERIC_FIELDS = ("rate_value", "minimum_amount")

PRODUCT_RATE_OPTIONAL_FIELDS = (
    "currency",
    "rate_type",
    "rate_period",
    "minimum_amount",
    "withdrawal_timeline",
    "fees_summary",
    "source_url",
    "source_label",
    "confidence",
    "notes",
)


def _parse_date(value: str) -> date | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            from datetime import datetime

            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _parse_float(value: str) -> float | None:
    if not value:
        return None
    try:
        return float(value.strip().replace(",", ""))
    except ValueError:
        return None


@transaction.atomic
def import_product_rates_csv(
    *,
    source: DataSource,
    file_path: str,
    dry_run: bool = False,
    auto_approve: bool = False,
) -> DataIngestionRun:
    """
    Import product rates from a curated CSV file.

    CSV must include: provider_name, product_name, product_type, rate_value, snapshot_date.
    Optional: currency, rate_type, rate_period, minimum_amount, withdrawal_timeline,
    fees_summary, source_url, source_label, confidence, notes.

    Creates StagedProductUpdate records. Does not publish unless --auto-approve is set
    and only for trusted internal curated CSVs with high confidence.
    """
    content = Path(file_path).read_bytes()
    run = DataIngestionRun.objects.create(
        source=source,
        run_type=DataIngestionRun.RunType.TEST if dry_run else DataIngestionRun.RunType.MANUAL,
        status=DataIngestionRun.Status.RUNNING,
        started_at=timezone.now(),
    )

    from pipelines.storage import store_raw_snapshot

    snapshot = store_raw_snapshot(
        source=source,
        ingestion_run=run,
        content=content,
        content_type="text/csv",
        fetched_url=source.data_url or source.homepage_url,
        metadata={"product_rates_csv": True, "dry_run": dry_run},
    )
    run.raw_snapshot_location = snapshot.storage_path

    decoded = content.decode("utf-8-sig")
    reader = csv.DictReader(decoded.splitlines())
    header_fields = set(reader.fieldnames or [])

    missing_headers = [f for f in PRODUCT_RATE_REQUIRED_FIELDS if f not in header_fields]
    if missing_headers:
        create_quality_issue(
            ingestion_run=run,
            message=f"CSV missing required columns: {', '.join(missing_headers)}",
            severity=DataQualityIssue.Severity.ERROR,
            issue_type=DataQualityIssue.IssueType.MISSING_FIELD,
        )
        run.status = DataIngestionRun.Status.FAILED
        run.finished_at = timezone.now()
        run.records_failed = 1
        run.save()
        return run

    staged_updates: list[StagedProductUpdate] = []

    for index, row in enumerate(reader, start=2):
        normalized = {k: (v or "").strip() for k, v in row.items() if k}

        missing_values = [f for f in PRODUCT_RATE_REQUIRED_FIELDS if not normalized.get(f)]
        if missing_values:
            create_quality_issue(
                ingestion_run=run,
                message=f"Row {index}: missing required values: {', '.join(missing_values)}",
                severity=DataQualityIssue.Severity.ERROR,
                issue_type=DataQualityIssue.IssueType.MISSING_FIELD,
            )
            run.records_failed += 1
            continue

        rate_raw = normalized.get("rate_value", "")
        rate_float = _parse_float(rate_raw)
        if rate_float is None:
            create_quality_issue(
                ingestion_run=run,
                message=f"Row {index}: rate_value '{rate_raw}' is not numeric",
                severity=DataQualityIssue.Severity.ERROR,
                issue_type=DataQualityIssue.IssueType.INVALID_FORMAT,
            )
            run.records_failed += 1
            continue

        snapshot_date = _parse_date(normalized.get("snapshot_date", ""))
        if snapshot_date is None:
            create_quality_issue(
                ingestion_run=run,
                message=f"Row {index}: snapshot_date '{normalized.get('snapshot_date')}' could not be parsed (use YYYY-MM-DD)",
                severity=DataQualityIssue.Severity.ERROR,
                issue_type=DataQualityIssue.IssueType.INVALID_FORMAT,
            )
            run.records_failed += 1
            continue

        source_url = normalized.get("source_url", "")
        if source_url and not (source_url.startswith("http://") or source_url.startswith("https://")):
            create_quality_issue(
                ingestion_run=run,
                message=f"Row {index}: source_url '{source_url}' does not look like a valid URL",
                severity=DataQualityIssue.Severity.WARNING,
                issue_type=DataQualityIssue.IssueType.INVALID_FORMAT,
            )

        min_amount_raw = normalized.get("minimum_amount", "")
        min_amount = _parse_float(min_amount_raw) if min_amount_raw else None

        payload = {
            "provider_name": normalized["provider_name"],
            "product_name": normalized["product_name"],
            "product_type": normalized["product_type"],
            "currency": normalized.get("currency", "KES") or "KES",
            "current_rate": rate_float,
            "rate_type": normalized.get("rate_type", "annual_yield") or "annual_yield",
            "rate_label": normalized.get("source_label", "") or "",
            "rate_period": normalized.get("rate_period", "annual") or "annual",
            "minimum_amount": min_amount,
            "withdrawal_timeline": normalized.get("withdrawal_timeline", ""),
            "fees_summary": normalized.get("fees_summary", ""),
            "risk_notes": "",
            "liquidity_notes": normalized.get("withdrawal_timeline", ""),
            "source_url": source_url or source.data_url or source.homepage_url,
            "source_retrieved_at": str(timezone.localdate()),
            "snapshot_date": str(snapshot_date),
            "confidence": normalized.get("confidence", source.authority_level) or source.authority_level,
            "parser_confidence": StagedProductUpdate.ParserConfidence.HIGH,
            "requires_review": not auto_approve,
            "notes": normalized.get("notes", ""),
        }

        confidence_value = (
            normalized.get("confidence", source.authority_level) or source.authority_level
        )
        parser_confidence = StagedProductUpdate.ParserConfidence.HIGH

        review_status = (
            StagedProductUpdate.ReviewStatus.AUTO_APPROVED
            if auto_approve
            else StagedProductUpdate.ReviewStatus.NEEDS_REVIEW
        )

        run.records_seen += 1

        if not dry_run:
            staged = StagedProductUpdate.objects.create(
                source=source,
                ingestion_run=run,
                provider_name=normalized["provider_name"],
                product_name=normalized["product_name"],
                normalized_payload=payload,
                proposed_changes=payload,
                parser_confidence=parser_confidence,
                review_status=review_status,
            )
            staged_updates.append(staged)
            run.records_created += 1

            if auto_approve:
                from planning.product_pipeline_services import publish_staged_product_update

                publish_staged_product_update(staged, auto_approve=True)
        else:
            staged_updates.append(
                StagedProductUpdate(
                    source=source,
                    ingestion_run=run,
                    provider_name=normalized["provider_name"],
                    product_name=normalized["product_name"],
                    normalized_payload=payload,
                    proposed_changes=payload,
                    parser_confidence=parser_confidence,
                    review_status=review_status,
                )
            )

    run.status = (
        DataIngestionRun.Status.NEEDS_REVIEW
        if not auto_approve and run.records_seen
        else DataIngestionRun.Status.SUCCEEDED
    )
    if run.records_failed and run.records_seen:
        run.status = DataIngestionRun.Status.PARTIAL
    if not run.records_seen and run.records_failed:
        run.status = DataIngestionRun.Status.FAILED

    run.finished_at = timezone.now()
    run.save()
    source.last_checked_at = timezone.now()
    if run.status not in {DataIngestionRun.Status.FAILED}:
        source.last_success_at = timezone.now()
    source.save(update_fields=["last_checked_at", "last_success_at", "updated_at"])
    return run
