from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Channel(models.TextChoices):
        IN_APP = "in_app", "In-app"
        EMAIL = "email", "Email"
        PUSH = "push", "Push"
        SMS_PLACEHOLDER = "sms_placeholder", "SMS placeholder"

    class Status(models.TextChoices):
        UNREAD = "unread", "Unread"
        READ = "read", "Read"
        ARCHIVED = "archived", "Archived"

    class Type(models.TextChoices):
        PAYMENT_SUCCESSFUL = "payment_successful", "Payment successful"
        PAYMENT_FAILED = "payment_failed", "Payment failed"
        PREMIUM_ACTIVATED = "premium_activated", "Premium activated"
        PACK_UNLOCKED = "pack_unlocked", "Pack unlocked"
        PROFESSIONAL_RESPONDED = "professional_responded", "Professional responded"
        CONSULTATION_PAID = "consultation_paid", "Consultation paid"
        DATA_GRANT_EXPIRING = "data_grant_expiring", "Data grant expiring"
        JOURNAL_REVIEW_REMINDER = "journal_review_reminder", "Journal review reminder"
        BETA_FEEDBACK_RECEIVED = "beta_feedback_received", "Beta feedback received"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    channel = models.CharField(max_length=32, choices=Channel.choices, default=Channel.IN_APP)
    type = models.CharField(max_length=64, choices=Type.choices)
    title = models.CharField(max_length=160)
    body = models.TextField()
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.UNREAD)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "created_at"]),
            models.Index(fields=["type", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.type}:{self.status}"
