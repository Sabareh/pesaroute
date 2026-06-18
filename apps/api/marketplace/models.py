from django.conf import settings
from django.db import models


class Professional(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        SUSPENDED = "suspended", "Suspended"

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="professional_profile"
    )
    name = models.CharField(max_length=160, blank=True)
    display_name = models.CharField(max_length=160)
    firm = models.CharField(max_length=160, blank=True)
    specialty = models.CharField(max_length=120, blank=True)
    regulator_body = models.CharField(max_length=160, blank=True)
    license_category = models.CharField(max_length=120, blank=True)
    license_number = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    verification_status = models.CharField(
        max_length=32, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    languages = models.JSONField(default=list)
    consultation_fee_range = models.CharField(max_length=120, blank=True)
    diaspora_support = models.BooleanField(default=False)
    chama_support = models.BooleanField(default=False)
    bio = models.TextField(blank=True)
    disclosures = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["verification_status", "is_active"]),
            models.Index(fields=["specialty"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return self.name or self.display_name

    def save(self, *args, **kwargs):
        if not self.display_name and self.name:
            self.display_name = self.name
        if not self.name and self.display_name:
            self.name = self.display_name
        super().save(*args, **kwargs)


class ProfessionalVerification(models.Model):
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name="verifications")
    status = models.CharField(max_length=32, choices=Professional.Status.choices, default=Professional.Status.PENDING)
    verified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["professional", "created_at"]), models.Index(fields=["status", "created_at"])]


class ConsultationRequest(models.Model):
    class Category(models.TextChoices):
        MMF = "mmf", "MMF"
        TREASURY = "treasury", "Treasury bills/bonds"
        SACCO = "sacco", "SACCO"
        CHAMA = "chama", "Chama"
        GLOBAL_INVESTING = "global_investing", "Global investing"
        LAND_LITERACY = "land_literacy", "Land due diligence literacy"
        TAX = "tax", "Tax"
        DIASPORA = "diaspora", "Diaspora"
        GENERAL_FIRST_INVESTMENT = "general_first_investment", "General first investment"

    class AmountDisplayMode(models.TextChoices):
        EXACT = "exact", "Exact"
        ROUNDED = "rounded", "Rounded"
        RANGE = "range", "Range"
        HIDDEN = "hidden", "Hidden"

    class Timeline(models.TextChoices):
        THIS_WEEK = "this_week", "This week"
        THIS_MONTH = "this_month", "This month"
        FLEXIBLE = "flexible", "Flexible"

    class RiskPreference(models.TextChoices):
        LOW = "low", "Low"
        MODERATE = "moderate", "Moderate"
        HIGH = "high", "High"
        NOT_SURE = "not_sure", "Not sure"

    class PreferredLanguage(models.TextChoices):
        ENGLISH = "en", "English"
        SWAHILI = "sw", "Swahili"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        PROFESSIONAL_RESPONDED = "professional_responded", "Professional responded"
        USER_SELECTED_PROFESSIONAL = "user_selected_professional", "User selected professional"
        AWAITING_PAYMENT = "awaiting_payment", "Awaiting payment"
        PAID = "paid", "Paid"
        SCHEDULED = "scheduled", "Scheduled"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        # Legacy MVP statuses retained for existing beta data and tests.
        REQUESTED = "requested", "Requested"
        REVIEWING = "reviewing", "Reviewing"
        RESPONDED = "responded", "Responded"
        CLOSED = "closed", "Closed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="consultation_requests")
    learning_track = models.ForeignKey(
        "learning.LearningTrack",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="consultation_requests",
    )
    journal_entry = models.ForeignKey(
        "journal.JournalEntry",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="consultation_requests",
    )
    professional = models.ForeignKey(
        Professional, null=True, blank=True, on_delete=models.SET_NULL, related_name="consultation_requests"
    )
    selected_professional = models.ForeignKey(
        Professional, null=True, blank=True, on_delete=models.SET_NULL, related_name="selected_consultation_requests"
    )
    data_grant = models.ForeignKey(
        "privacy.DataGrant", null=True, blank=True, on_delete=models.SET_NULL, related_name="consultation_requests"
    )
    category = models.CharField(max_length=64, choices=Category.choices, default=Category.GENERAL_FIRST_INVESTMENT)
    amount_display_mode = models.CharField(
        max_length=32, choices=AmountDisplayMode.choices, default=AmountDisplayMode.RANGE
    )
    amount_range_min = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_range_max = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    user_question = models.TextField(blank=True)
    timeline = models.CharField(max_length=32, choices=Timeline.choices, default=Timeline.FLEXIBLE)
    risk_preference = models.CharField(max_length=32, choices=RiskPreference.choices, default=RiskPreference.NOT_SURE)
    preferred_language = models.CharField(
        max_length=8, choices=PreferredLanguage.choices, default=PreferredLanguage.ENGLISH
    )
    topic = models.CharField(max_length=180)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.REQUESTED)
    platform_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["learning_track", "created_at"]),
            models.Index(fields=["journal_entry", "created_at"]),
            models.Index(fields=["professional", "created_at"]),
            models.Index(fields=["selected_professional", "created_at"]),
            models.Index(fields=["category", "status", "created_at"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["status", "updated_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.topic}"

    def save(self, *args, **kwargs):
        if self.selected_professional and not self.professional:
            self.professional = self.selected_professional
        if self.professional and not self.selected_professional:
            self.selected_professional = self.professional
        if not self.topic:
            self.topic = self.get_category_display()
        if not self.user_question and self.notes:
            self.user_question = self.notes
        if not self.notes and self.user_question:
            self.notes = self.user_question
        super().save(*args, **kwargs)


class ConsultationOffer(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    consultation_request = models.ForeignKey(ConsultationRequest, on_delete=models.CASCADE, related_name="offers")
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name="consultation_offers")
    proposed_fee = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    message = models.TextField()
    estimated_duration = models.CharField(max_length=80)
    available_slots_text = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["consultation_request", "status", "created_at"]),
            models.Index(fields=["professional", "status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.professional_id}:{self.consultation_request_id}:{self.status}"


class WatchedProduct(models.Model):
    """A product a user is watching, with a snapshot of the rate at watch time so we can
    surface 'changed since you saved it' without claiming any recommendation."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watched_products")
    product = models.ForeignKey(
        "planning.InvestmentProduct", on_delete=models.CASCADE, related_name="watchers"
    )
    note = models.TextField(blank=True)
    # Snapshot captured when the user added/last reviewed the watch (for change detection).
    last_seen_rate_value = models.DecimalField(max_digits=9, decimal_places=4, null=True, blank=True)
    last_seen_snapshot_date = models.DateField(null=True, blank=True)
    last_seen_source_confidence = models.CharField(max_length=32, blank=True)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("user", "product")]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["product", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.product_id}"


class ConsultationResponse(models.Model):
    class Status(models.TextChoices):
        SENT = "sent", "Sent"
        WITHDRAWN = "withdrawn", "Withdrawn"

    consultation_request = models.ForeignKey(ConsultationRequest, on_delete=models.CASCADE, related_name="responses")
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name="consultation_responses")
    response_text = models.TextField()
    next_steps = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.SENT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["consultation_request", "created_at"]),
            models.Index(fields=["professional", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.professional_id}:{self.consultation_request_id}"
