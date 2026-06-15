from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.utils import timezone

from knowledge.models import DataIngestionRun, DataSource, RawDataSnapshot
from pipelines.hashing import content_hash


def store_raw_snapshot(
    *,
    source: DataSource,
    ingestion_run: DataIngestionRun,
    content: bytes,
    content_type: str,
    fetched_url: str,
    metadata: dict | None = None,
) -> RawDataSnapshot:
    digest = content_hash(content)
    directory = Path(settings.BASE_DIR) / "data" / "raw_snapshots" / source.slug
    directory.mkdir(parents=True, exist_ok=True)
    suffix = ".html" if "html" in content_type else ".csv" if "csv" in content_type else ".bin"
    path = directory / f"{digest}{suffix}"
    if not path.exists():
        path.write_bytes(content)
    return RawDataSnapshot.objects.create(
        source=source,
        ingestion_run=ingestion_run,
        content_hash=digest,
        content_type=content_type,
        fetched_url=fetched_url,
        storage_path=str(path),
        fetched_at=timezone.now(),
        byte_size=len(content),
        metadata=metadata or {},
    )
