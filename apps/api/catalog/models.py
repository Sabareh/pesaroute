from django.conf import settings
from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ProductCategory(TimestampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["status"]), models.Index(fields=["created_at"])]

    def __str__(self) -> str:
        return self.name


class Provider(TimestampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    class DataFreshness(models.TextChoices):
        FRESH = "fresh", "Fresh"
        ACCEPTABLE = "acceptable", "Acceptable"
        STALE = "stale", "Stale"
        UNKNOWN = "unknown", "Unknown"

    class VerificationStatus(models.TextChoices):
        UNVERIFIED = "unverified", "Unverified"
        SOURCE_VERIFIED = "source_verified", "Source verified"
        MANUALLY_REVIEWED = "manually_reviewed", "Manually reviewed"
        PROVIDER_CLAIMED = "provider_claimed", "Provider claimed"

    class PublishedStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=160, unique=True)
    slug = models.SlugField(max_length=200, blank=True, db_index=True)
    regulator_category = models.CharField(max_length=160, blank=True)
    regulator_license_number = models.CharField(max_length=120, blank=True)
    regulator_status = models.CharField(max_length=120, blank=True)
    website = models.URLField(blank=True)
    public_source_url = models.URLField(blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    data_freshness = models.CharField(max_length=32, choices=DataFreshness.choices, default=DataFreshness.UNKNOWN)
    verification_status = models.CharField(
        max_length=40, choices=VerificationStatus.choices, default=VerificationStatus.UNVERIFIED
    )
    published_status = models.CharField(max_length=32, choices=PublishedStatus.choices, default=PublishedStatus.DRAFT)
    source_references = models.ManyToManyField(
        "knowledge.SourceReference", blank=True, related_name="catalog_providers"
    )
    editorial_notes = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["status"]),
            models.Index(fields=["published_status"]),
            models.Index(fields=["verification_status"]),
            models.Index(fields=["data_freshness"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return self.name


class ProductPassport(TimestampedModel):
    class LiquidityLevel(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"
        LOCKED = "locked", "Locked"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MODERATE = "moderate", "Moderate"
        HIGH = "high", "High"
        VERY_HIGH = "very_high", "Very high"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class DataFreshness(models.TextChoices):
        FRESH = "fresh", "Fresh"
        ACCEPTABLE = "acceptable", "Acceptable"
        STALE = "stale", "Stale"
        UNKNOWN = "unknown", "Unknown"

    class VerificationStatus(models.TextChoices):
        UNVERIFIED = "unverified", "Unverified"
        SOURCE_VERIFIED = "source_verified", "Source verified"
        MANUALLY_REVIEWED = "manually_reviewed", "Manually reviewed"
        PROVIDER_CLAIMED = "provider_claimed", "Provider claimed"

    category = models.ForeignKey(ProductCategory, on_delete=models.PROTECT, related_name="product_passports")
    provider = models.ForeignKey(
        Provider, null=True, blank=True, on_delete=models.SET_NULL, related_name="product_passports"
    )
    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    regulator_category = models.CharField(max_length=180, blank=True)
    regulator_license_number = models.CharField(max_length=120, blank=True)
    regulator_status = models.CharField(max_length=120, blank=True)
    minimum_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    liquidity_level = models.CharField(max_length=32, choices=LiquidityLevel.choices)
    risk_level = models.CharField(max_length=32, choices=RiskLevel.choices)
    withdrawal_timeline = models.CharField(max_length=200, blank=True)
    fees_summary = models.TextField(blank=True)
    tax_notes = models.TextField(blank=True)
    beginner_mistakes = models.JSONField(default=list, blank=True)
    documents_needed = models.JSONField(default=list, blank=True)
    execution_route_external = models.TextField(blank=True)
    disclosures = models.TextField(blank=True)
    public_source_url = models.URLField(blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    data_freshness = models.CharField(max_length=32, choices=DataFreshness.choices, default=DataFreshness.UNKNOWN)
    verification_status = models.CharField(
        max_length=40, choices=VerificationStatus.choices, default=VerificationStatus.UNVERIFIED
    )
    published_status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    source_references = models.ManyToManyField(
        "knowledge.SourceReference", blank=True, related_name="product_passports"
    )
    editorial_notes = models.TextField(blank=True)
    is_sponsored = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        ordering = ["category__name", "name"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["category", "published_status"]),
            models.Index(fields=["status"]),
            models.Index(fields=["published_status"]),
            models.Index(fields=["verification_status"]),
            models.Index(fields=["data_freshness"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["risk_level"]),
            models.Index(fields=["liquidity_level"]),
            models.Index(fields=["provider"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self) -> str:
        return self.name


class ProductPassportVersion(models.Model):
    passport = models.ForeignKey(ProductPassport, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    content = models.JSONField(default=dict)
    status = models.CharField(
        max_length=32, choices=ProductPassport.Status.choices, default=ProductPassport.Status.DRAFT
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("passport", "version_number")]
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["passport", "created_at"]), models.Index(fields=["status", "created_at"])]

    def __str__(self) -> str:
        return f"{self.passport_id}:v{self.version_number}"
