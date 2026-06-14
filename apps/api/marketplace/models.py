from django.conf import settings
from django.db import models


class Professional(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        SUSPENDED = "suspended", "Suspended"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="professional_profile"
    )
    display_name = models.CharField(max_length=160)
    regulator_body = models.CharField(max_length=160, blank=True)
    license_number = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["status"]), models.Index(fields=["created_at"])]

    def __str__(self) -> str:
        return self.display_name


class ProfessionalVerification(models.Model):
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name="verifications")
    status = models.CharField(max_length=32, choices=Professional.Status.choices, default=Professional.Status.PENDING)
    verified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["professional", "created_at"]), models.Index(fields=["status", "created_at"])]


class ConsultationRequest(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        REVIEWING = "reviewing", "Reviewing"
        CLOSED = "closed", "Closed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="consultation_requests")
    professional = models.ForeignKey(
        Professional, null=True, blank=True, on_delete=models.SET_NULL, related_name="consultation_requests"
    )
    topic = models.CharField(max_length=180)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.REQUESTED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["professional", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.topic}"
