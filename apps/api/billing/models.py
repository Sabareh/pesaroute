from django.conf import settings
from django.db import models
from django.utils import timezone


class EntitlementCode(models.TextChoices):
    CORE_LEARNING = "core_learning", "Core learning"
    LIMITED_SIMULATIONS = "limited_simulations", "Limited simulations"
    LIMITED_SCAM_CHECKS = "limited_scam_checks", "Limited scam checks"
    UNLIMITED_SIMULATIONS = "unlimited_simulations", "Unlimited simulations"
    UNLIMITED_SCAM_CHECKS = "unlimited_scam_checks", "Unlimited scam checks"
    PORTFOLIO_MIRROR = "portfolio_mirror", "Portfolio mirror"
    ADVANCED_ROUTE_ENGINE = "advanced_route_engine", "Advanced route engine"
    PROFESSIONAL_REQUEST_PRIORITY = "professional_request_priority", "Professional request priority"
    PROFESSIONAL_DASHBOARD = "professional_dashboard", "Professional dashboard"
    PROFESSIONAL_LEADS = "professional_leads", "Professional leads"
    PROFESSIONAL_ANALYTICS = "professional_analytics", "Professional analytics"


class OneOffPackCode(models.TextChoices):
    GLOBAL_INVESTING = "global_investing_pack", "Global investing pack"
    TREASURY_BILLS = "treasury_bills_pack", "Treasury bills pack"
    SACCO_CHAMA = "sacco_chama_pack", "SACCO/chama pack"
    LAND_DUE_DILIGENCE_LITERACY = "land_due_diligence_literacy_pack", "Land due diligence literacy pack"
    DIASPORA = "diaspora_pack", "Diaspora pack"


class Plan(models.Model):
    class Code(models.TextChoices):
        FREE = "free", "Free"
        PREMIUM_MONTHLY = "premium_monthly", "Premium monthly"
        PREMIUM_YEARLY = "premium_yearly", "Premium yearly"
        PROFESSIONAL_BASIC = "professional_basic", "Professional basic"
        PROFESSIONAL_PRO = "professional_pro", "Professional pro"

    class Audience(models.TextChoices):
        CONSUMER = "consumer", "Consumer"
        PROFESSIONAL = "professional", "Professional"

    class BillingPeriod(models.TextChoices):
        NONE = "none", "None"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    code = models.CharField(max_length=64, choices=Code.choices, unique=True)
    name = models.CharField(max_length=120)
    audience = models.CharField(max_length=32, choices=Audience.choices)
    price_kes = models.PositiveIntegerField(default=0)
    billing_period = models.CharField(max_length=32, choices=BillingPeriod.choices, default=BillingPeriod.NONE)
    included_entitlements = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["audience", "price_kes", "code"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["audience", "is_active"]),
        ]

    def __str__(self) -> str:
        return self.code


class Subscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        TRIALING = "trialing", "Trialing"
        CANCELED = "canceled", "Canceled"
        EXPIRED = "expired", "Expired"
        MANUAL = "manual", "Manual development grant"

    class Source(models.TextChoices):
        DEV_MANUAL = "dev_manual", "Development manual"
        FAKE_PAYMENT = "fake_payment", "Fake payment"
        FUTURE_MPESA = "future_mpesa", "Future M-Pesa"
        FUTURE_CARD = "future_card", "Future card"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.DEV_MANUAL)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["plan", "status"]),
            models.Index(fields=["current_period_end"]),
        ]

    @property
    def is_active(self) -> bool:
        active_statuses = {self.Status.ACTIVE, self.Status.TRIALING, self.Status.MANUAL}
        if self.status not in active_statuses:
            return False
        return self.current_period_end is None or self.current_period_end > timezone.now()

    def __str__(self) -> str:
        return f"{self.user_id}:{self.plan.code}:{self.status}"


class OneOffPurchase(models.Model):
    class Status(models.TextChoices):
        COMPLETED = "completed", "Completed"
        PENDING = "pending", "Pending"
        CANCELED = "canceled", "Canceled"
        REFUNDED = "refunded", "Refunded"

    class Source(models.TextChoices):
        DEV_MANUAL = "dev_manual", "Development manual"
        FAKE_PAYMENT = "fake_payment", "Fake payment"
        FUTURE_MPESA = "future_mpesa", "Future M-Pesa"
        FUTURE_CARD = "future_card", "Future card"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="one_off_purchases")
    pack_code = models.CharField(max_length=80, choices=OneOffPackCode.choices)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.COMPLETED)
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.DEV_MANUAL)
    amount_kes = models.PositiveIntegerField(default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("user", "pack_code", "status")]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["pack_code", "status"]),
        ]

    @property
    def is_active(self) -> bool:
        return self.status == self.Status.COMPLETED

    def __str__(self) -> str:
        return f"{self.user_id}:{self.pack_code}:{self.status}"


class Entitlement(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        SUBSCRIPTION = "subscription", "Subscription"
        ONE_OFF_PURCHASE = "one_off_purchase", "One-off purchase"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="entitlements")
    code = models.CharField(max_length=80)
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.MANUAL)
    source_reference = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        unique_together = [("user", "code", "source", "source_reference")]
        indexes = [
            models.Index(fields=["user", "code", "is_active"]),
            models.Index(fields=["expires_at"]),
        ]

    @property
    def is_current(self) -> bool:
        return self.is_active and (self.expires_at is None or self.expires_at > timezone.now())

    def __str__(self) -> str:
        return f"{self.user_id}:{self.code}"


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        VOID = "void", "Void"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="billing_invoices")
    plan = models.ForeignKey(Plan, null=True, blank=True, on_delete=models.SET_NULL, related_name="invoices")
    one_off_purchase = models.ForeignKey(
        OneOffPurchase, null=True, blank=True, on_delete=models.SET_NULL, related_name="invoices"
    )
    amount_kes = models.PositiveIntegerField()
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    source = models.CharField(max_length=32, default="manual_placeholder")
    provider_reference = models.CharField(max_length=160, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.amount_kes}:{self.status}"
