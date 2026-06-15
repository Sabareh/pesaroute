from django.conf import settings
from django.db import models
from django.utils import timezone


class FeatureFlag(models.Model):
    class Key(models.TextChoices):
        PAYMENTS_ENABLED = "payments_enabled", "Payments enabled"
        PROFESSIONAL_MARKETPLACE_ENABLED = "professional_marketplace_enabled", "Professional marketplace enabled"
        PACKS_ENABLED = "packs_enabled", "Packs enabled"
        SUBSCRIPTIONS_ENABLED = "subscriptions_enabled", "Subscriptions enabled"
        BETA_ONLY_MODE = "beta_only_mode", "Beta-only mode"

    key = models.CharField(max_length=80, choices=Key.choices, unique=True)
    enabled = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return f"{self.key}:{self.enabled}"


class BetaInvite(models.Model):
    code = models.CharField(max_length=80, unique=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    max_uses = models.PositiveIntegerField(default=1)
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_beta_invites"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active", "expires_at"]),
        ]

    @property
    def is_valid(self) -> bool:
        if not self.is_active:
            return False
        if self.used_count >= self.max_uses:
            return False
        return self.expires_at is None or self.expires_at > timezone.now()

    def __str__(self) -> str:
        return self.code


class BetaFeedback(models.Model):
    class Category(models.TextChoices):
        PAYMENT_ISSUE = "payment_issue", "Payment issue"
        PRIVACY_QUESTION = "privacy_question", "Privacy question"
        PROFESSIONAL_REVIEW_ISSUE = "professional_review_issue", "Professional review issue"
        BUG_REPORT = "bug_report", "Bug report"
        GENERAL = "general", "General"

    class Status(models.TextChoices):
        NEW = "new", "New"
        REVIEWING = "reviewing", "Reviewing"
        RESOLVED = "resolved", "Resolved"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    category = models.CharField(max_length=64, choices=Category.choices, default=Category.GENERAL)
    message = models.TextField()
    screenshot_placeholder = models.CharField(max_length=180, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["category", "status", "created_at"])]

    def __str__(self) -> str:
        return f"{self.category}:{self.status}"
