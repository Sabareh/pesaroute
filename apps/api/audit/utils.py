from __future__ import annotations

from django.contrib.auth.models import AnonymousUser

from audit.models import AuditEvent


def record_audit_event(
    *,
    actor,
    event_type: str,
    resource_type: str,
    resource_id: str | int | None = "",
    metadata: dict | None = None,
) -> AuditEvent:
    if isinstance(actor, AnonymousUser):
        actor = None
    return AuditEvent.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        event_type=event_type,
        resource_type=resource_type,
        resource_id=str(resource_id or ""),
        metadata=metadata or {},
    )
