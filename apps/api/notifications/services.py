from datetime import timedelta

from django.utils import timezone

from journal.models import JournalEntry
from notifications.models import Notification
from privacy.models import DataGrant


def create_notification(*, user, type: str, title: str, body: str, channel: str = Notification.Channel.IN_APP):
    if not user:
        return None
    return Notification.objects.create(user=user, type=type, title=title, body=body, channel=channel)


def mark_notification_read(notification: Notification) -> Notification:
    if notification.status != Notification.Status.READ:
        notification.status = Notification.Status.READ
        notification.read_at = timezone.now()
        notification.save(update_fields=["status", "read_at"])
    return notification


def create_data_grant_expiry_notifications(*, days: int = 1) -> int:
    window_end = timezone.now() + timedelta(days=days)
    created = 0
    grants = DataGrant.objects.filter(
        status=DataGrant.Status.ACTIVE,
        revoked_at__isnull=True,
        expires_at__gt=timezone.now(),
        expires_at__lte=window_end,
    ).select_related("user")
    for grant in grants:
        notification, was_created = Notification.objects.get_or_create(
            user=grant.user,
            type=Notification.Type.DATA_GRANT_EXPIRING,
            title="Data sharing expires soon",
            body="A professional data sharing grant is close to expiry. You can revoke access anytime.",
        )
        created += int(was_created and bool(notification))
    return created


def create_journal_review_reminders(*, today=None) -> int:
    today = today or timezone.localdate()
    created = 0
    entries = JournalEntry.objects.filter(review_date=today).select_related("user")
    for entry in entries:
        notification, was_created = Notification.objects.get_or_create(
            user=entry.user,
            type=Notification.Type.JOURNAL_REVIEW_REMINDER,
            title="Review your journal note",
            body="A private journal entry is due for review. Open it when you are ready.",
        )
        created += int(was_created and bool(notification))
    return created
