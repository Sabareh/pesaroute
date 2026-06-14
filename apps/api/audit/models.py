from django.conf import settings
from django.db import models


class AuditEvent(models.Model):
    class EventType(models.TextChoices):
        USER_REGISTERED = "accounts.user_registered", "User registered"
        USER_LOGGED_IN = "accounts.user_logged_in", "User logged in"
        JOURNAL_CREATED = "journal.created", "Journal created"
        PORTFOLIO_ITEM_CREATED = "portfolio.item_created", "Portfolio item created"
        SCAM_CHECK_CREATED = "risk.scam_check_created", "Scam check created"
        PRODUCT_PASSPORT_UPDATED = "catalog.product_passport_updated", "Product passport updated"
        CONSULTATION_REQUEST_CREATED = "marketplace.consultation_request_created", "Consultation request created"
        CONSULTATION_RESPONSE_CREATED = "marketplace.consultation_response_created", "Consultation response created"
        DATA_GRANT_CREATED = "privacy.data_grant_created", "Data grant created"
        DATA_GRANT_REVOKED = "privacy.data_grant_revoked", "Data grant revoked"

    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    event_type = models.CharField(max_length=80, choices=EventType.choices)
    resource_type = models.CharField(max_length=80)
    resource_id = models.CharField(max_length=80, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.event_type}:{self.resource_type}:{self.resource_id}"
