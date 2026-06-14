from django.conf import settings
from django.db import models

from marketplace.models import Professional


class DataGrant(models.Model):
    class GranteeType(models.TextChoices):
        PROFESSIONAL = "professional", "Professional"
        PROVIDER = "provider", "Provider"
        ADMIN = "admin", "Admin"

    class Scope(models.TextChoices):
        CONTACT_INFO = "contact_info", "Contact info"
        PORTFOLIO_SUMMARY = "portfolio_summary", "Portfolio summary"
        PORTFOLIO_EXACT_VALUES = "portfolio_exact_values", "Portfolio exact values"
        JOURNAL_ENTRIES = "journal_entries", "Journal entries"
        SELECTED_DOCUMENTS = "selected_documents", "Selected documents"
        CONSULTATION_CONTEXT = "consultation_context", "Consultation context"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        REVOKED = "revoked", "Revoked"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="data_grants")
    grantee_type = models.CharField(max_length=32, choices=GranteeType.choices, default=GranteeType.PROFESSIONAL)
    grantee_id = models.PositiveIntegerField(null=True, blank=True)
    professional = models.ForeignKey(
        Professional, null=True, blank=True, on_delete=models.SET_NULL, related_name="data_grants"
    )
    scopes = models.JSONField(default=list)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)
    starts_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["professional", "created_at"]),
            models.Index(fields=["grantee_type", "grantee_id", "created_at"]),
            models.Index(fields=["status", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.status}"


class DataAccessLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="data_access_logs")
    grantee_type = models.CharField(
        max_length=32, choices=DataGrant.GranteeType.choices, default=DataGrant.GranteeType.PROFESSIONAL
    )
    grantee_id = models.PositiveIntegerField(null=True, blank=True)
    professional = models.ForeignKey(
        Professional, null=True, blank=True, on_delete=models.SET_NULL, related_name="data_access_logs"
    )
    data_grant = models.ForeignKey(
        DataGrant, null=True, blank=True, on_delete=models.SET_NULL, related_name="access_logs"
    )
    action = models.CharField(max_length=120)
    scope = models.CharField(max_length=80, blank=True)
    resource_type = models.CharField(max_length=80)
    resource_id = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["professional", "created_at"]),
            models.Index(fields=["grantee_type", "grantee_id", "created_at"]),
            models.Index(fields=["resource_type", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action}:{self.resource_type}"
