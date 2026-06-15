from django.conf import settings
from django.db import models
from django.utils import timezone


class PaymentIntent(models.Model):
    class Purpose(models.TextChoices):
        SUBSCRIPTION = "subscription", "Subscription"
        ONE_OFF_PACK = "one_off_pack", "One-off pack"
        PROFESSIONAL_CONSULTATION = "professional_consultation", "Professional consultation"

    class Provider(models.TextChoices):
        MPESA = "mpesa", "M-Pesa"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        INITIATED = "initiated", "Initiated"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payment_intents")
    purpose = models.CharField(max_length=40, choices=Purpose.choices)
    plan_code = models.CharField(max_length=64, blank=True)
    pack_code = models.CharField(max_length=80, blank=True)
    consultation_request = models.ForeignKey(
        "marketplace.ConsultationRequest",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payment_intents",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="KES")
    phone_number_masked = models.CharField(max_length=32, blank=True)
    provider = models.CharField(max_length=32, choices=Provider.choices, default=Provider.MPESA)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    provider_checkout_request_id = models.CharField(max_length=120, blank=True)
    provider_merchant_request_id = models.CharField(max_length=120, blank=True)
    provider_receipt = models.CharField(max_length=120, blank=True)
    idempotency_key = models.CharField(max_length=160)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "idempotency_key"], name="unique_payment_intent_idempotency")
        ]
        indexes = [
            models.Index(fields=["user", "status", "created_at"]),
            models.Index(fields=["provider_checkout_request_id"]),
            models.Index(fields=["provider_merchant_request_id"]),
            models.Index(fields=["status", "expires_at"]),
        ]

    @property
    def is_terminal(self) -> bool:
        return self.status in {
            self.Status.SUCCESSFUL,
            self.Status.FAILED,
            self.Status.CANCELLED,
            self.Status.EXPIRED,
        }

    @property
    def is_expired(self) -> bool:
        return self.expires_at <= timezone.now() and self.status not in {
            self.Status.SUCCESSFUL,
            self.Status.FAILED,
            self.Status.CANCELLED,
        }

    @property
    def amount_as_integer(self) -> int:
        return int(self.amount)

    def __str__(self) -> str:
        return f"{self.user_id}:{self.purpose}:{self.status}:{self.amount}"


class PaymentEvent(models.Model):
    payment_intent = models.ForeignKey(PaymentIntent, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=80)
    provider = models.CharField(
        max_length=32, choices=PaymentIntent.Provider.choices, default=PaymentIntent.Provider.MPESA
    )
    safe_payload_summary = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payment_intent", "created_at"]),
            models.Index(fields=["event_type", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.payment_intent_id}:{self.event_type}"
