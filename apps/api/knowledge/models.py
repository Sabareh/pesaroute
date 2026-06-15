from django.conf import settings
from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class DataSource(TimestampedModel):
    class SourceType(models.TextChoices):
        REGULATOR = "regulator", "Regulator"
        EXCHANGE = "exchange", "Exchange"
        GOVERNMENT = "government", "Government"
        PROVIDER = "provider", "Provider"
        PROFESSIONAL_BODY = "professional_body", "Professional body"
        MANUAL_EDITORIAL = "manual_editorial", "Manual editorial"
        OTHER = "other", "Other"

    class AuthorityLevel(models.TextChoices):
        OFFICIAL = "official", "Official"
        PROVIDER_SELF_REPORTED = "provider_self_reported", "Provider self-reported"
        EDITORIAL = "editorial", "Editorial"
        THIRD_PARTY = "third_party", "Third party"

    class UpdateFrequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"
        ANNUALLY = "annually", "Annually"
        AD_HOC = "ad_hoc", "Ad hoc"
        MANUAL = "manual", "Manual"

    class ParserStrategy(models.TextChoices):
        MANUAL = "manual", "Manual"
        CSV_IMPORT = "csv_import", "CSV import"
        HTML_TABLE = "html_table", "HTML table"
        PDF = "pdf", "PDF"
        API = "api", "API"
        RSS = "rss", "RSS"
        UNKNOWN = "unknown", "Unknown"

    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    source_type = models.CharField(max_length=40, choices=SourceType.choices)
    authority_level = models.CharField(max_length=40, choices=AuthorityLevel.choices)
    homepage_url = models.URLField(blank=True)
    data_url = models.URLField(blank=True)
    terms_url = models.URLField(blank=True)
    robots_notes = models.TextField(blank=True)
    license_notes = models.TextField(blank=True)
    update_frequency = models.CharField(max_length=40, choices=UpdateFrequency.choices, default=UpdateFrequency.MANUAL)
    parser_strategy = models.CharField(max_length=40, choices=ParserStrategy.choices, default=ParserStrategy.MANUAL)
    is_active = models.BooleanField(default=True)
    last_checked_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)
    last_failure_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["source_type", "is_active"]),
            models.Index(fields=["authority_level"]),
        ]

    def __str__(self) -> str:
        return self.name


class DataIngestionRun(models.Model):
    class RunType(models.TextChoices):
        MANUAL = "manual", "Manual"
        SCHEDULED = "scheduled", "Scheduled"
        BACKFILL = "backfill", "Backfill"
        TEST = "test", "Test"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        PARTIAL = "partial", "Partial"
        NEEDS_REVIEW = "needs_review", "Needs review"

    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="ingestion_runs")
    run_type = models.CharField(max_length=32, choices=RunType.choices, default=RunType.MANUAL)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    records_seen = models.PositiveIntegerField(default=0)
    records_created = models.PositiveIntegerField(default=0)
    records_updated = models.PositiveIntegerField(default=0)
    records_unchanged = models.PositiveIntegerField(default=0)
    records_failed = models.PositiveIntegerField(default=0)
    error_summary = models.TextField(blank=True)
    raw_snapshot_location = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-started_at", "-id"]
        indexes = [
            models.Index(fields=["source", "started_at"]),
            models.Index(fields=["status", "started_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.source_id}:{self.run_type}:{self.status}"


class RawDataSnapshot(models.Model):
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="raw_snapshots")
    ingestion_run = models.ForeignKey(
        DataIngestionRun, null=True, blank=True, on_delete=models.SET_NULL, related_name="raw_snapshots"
    )
    content_hash = models.CharField(max_length=128)
    content_type = models.CharField(max_length=120)
    fetched_url = models.URLField(blank=True)
    storage_path = models.CharField(max_length=500, blank=True)
    fetched_at = models.DateTimeField()
    byte_size = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-fetched_at"]
        indexes = [
            models.Index(fields=["source", "fetched_at"]),
            models.Index(fields=["content_hash"]),
        ]

    def __str__(self) -> str:
        return f"{self.source_id}:{self.content_hash[:12]}"


class SourceRecord(models.Model):
    class RecordType(models.TextChoices):
        PROVIDER = "provider", "Provider"
        PRODUCT = "product", "Product"
        LICENSE = "license", "License"
        AUCTION_RESULT = "auction_result", "Auction result"
        LISTED_COMPANY = "listed_company", "Listed company"
        SACCO = "sacco", "SACCO"
        PENSION_SERVICE_PROVIDER = "pension_service_provider", "Pension service provider"
        INSURANCE_ENTITY = "insurance_entity", "Insurance entity"
        LEARNING_REFERENCE = "learning_reference", "Learning reference"

    class Status(models.TextChoices):
        NEW = "new", "New"
        UNCHANGED = "unchanged", "Unchanged"
        CHANGED = "changed", "Changed"
        STALE = "stale", "Stale"
        RETIRED = "retired", "Retired"
        ERROR = "error", "Error"

    class ReviewStatus(models.TextChoices):
        AUTO_APPROVED = "auto_approved", "Auto approved"
        NEEDS_REVIEW = "needs_review", "Needs review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="source_records")
    source_record_key = models.CharField(max_length=240)
    source_record_type = models.CharField(max_length=60, choices=RecordType.choices)
    raw_payload = models.JSONField(default=dict, blank=True)
    normalized_payload = models.JSONField(default=dict, blank=True)
    content_hash = models.CharField(max_length=128)
    first_seen_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.NEW)
    review_status = models.CharField(max_length=32, choices=ReviewStatus.choices, default=ReviewStatus.NEEDS_REVIEW)

    class Meta:
        ordering = ["source__name", "source_record_key"]
        unique_together = [("source", "source_record_key")]
        indexes = [
            models.Index(fields=["source", "source_record_key"]),
            models.Index(fields=["source_record_type"]),
            models.Index(fields=["review_status"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.source.slug}:{self.source_record_key}"


class SourceReference(models.Model):
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="references")
    title = models.CharField(max_length=240)
    url = models.URLField()
    retrieved_at = models.DateTimeField()
    published_at = models.DateTimeField(null=True, blank=True)
    citation_label = models.CharField(max_length=160)
    notes = models.TextField(blank=True)
    related_object_type = models.CharField(max_length=120, blank=True)
    related_object_id = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ["source__name", "title"]
        indexes = [
            models.Index(fields=["source", "retrieved_at"]),
            models.Index(fields=["related_object_type", "related_object_id"]),
        ]

    def __str__(self) -> str:
        return self.citation_label or self.title


class DataQualityIssue(models.Model):
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        CRITICAL = "critical", "Critical"

    class IssueType(models.TextChoices):
        MISSING_FIELD = "missing_field", "Missing field"
        INVALID_FORMAT = "invalid_format", "Invalid format"
        DUPLICATE = "duplicate", "Duplicate"
        STALE = "stale", "Stale"
        CONFLICTING_SOURCE = "conflicting_source", "Conflicting source"
        PARSE_FAILURE = "parse_failure", "Parse failure"
        PERMISSION_WARNING = "permission_warning", "Permission warning"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"
        IGNORED = "ignored", "Ignored"

    ingestion_run = models.ForeignKey(DataIngestionRun, on_delete=models.CASCADE, related_name="quality_issues")
    source_record = models.ForeignKey(
        SourceRecord, null=True, blank=True, on_delete=models.SET_NULL, related_name="quality_issues"
    )
    severity = models.CharField(max_length=32, choices=Severity.choices)
    issue_type = models.CharField(max_length=40, choices=IssueType.choices)
    message = models.TextField()
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["ingestion_run", "created_at"]),
            models.Index(fields=["source_record", "created_at"]),
            models.Index(fields=["severity", "status"]),
            models.Index(fields=["issue_type", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.severity}:{self.issue_type}"


class DataChangeEvent(models.Model):
    class ChangeType(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        RETIRED = "retired", "Retired"
        STALE = "stale", "Stale"
        SOURCE_CHANGED = "source_changed", "Source changed"
        PUBLISHED = "published", "Published"
        REJECTED = "rejected", "Rejected"

    object_type = models.CharField(max_length=120)
    object_id = models.CharField(max_length=80, blank=True)
    change_type = models.CharField(max_length=40, choices=ChangeType.choices)
    old_value = models.JSONField(default=dict, blank=True)
    new_value = models.JSONField(default=dict, blank=True)
    source = models.ForeignKey(
        DataSource, null=True, blank=True, on_delete=models.SET_NULL, related_name="change_events"
    )
    source_record = models.ForeignKey(
        SourceRecord, null=True, blank=True, on_delete=models.SET_NULL, related_name="change_events"
    )
    ingestion_run = models.ForeignKey(
        DataIngestionRun, null=True, blank=True, on_delete=models.SET_NULL, related_name="change_events"
    )
    requires_review = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["change_type", "created_at"]),
            models.Index(fields=["requires_review", "created_at"]),
            models.Index(fields=["source", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.object_type}:{self.object_id}:{self.change_type}"


class Regulator(TimestampedModel):
    name = models.CharField(max_length=180, unique=True)
    abbreviation = models.CharField(max_length=20, unique=True)
    country = models.CharField(max_length=80, default="Kenya")
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["abbreviation"]
        indexes = [models.Index(fields=["abbreviation"]), models.Index(fields=["country"])]

    def __str__(self) -> str:
        return self.abbreviation


class InvestmentProductCategory(TimestampedModel):
    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MODERATE = "moderate", "Moderate"
        HIGH = "high", "High"
        VERY_HIGH = "very_high", "Very high"

    class LiquidityLevel(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"
        LOCKED = "locked", "Locked"

    name = models.CharField(max_length=160, unique=True)
    slug = models.SlugField(max_length=180, unique=True)
    description = models.TextField(blank=True)
    risk_level_default = models.CharField(max_length=32, choices=RiskLevel.choices, default=RiskLevel.MODERATE)
    liquidity_level_default = models.CharField(
        max_length=32, choices=LiquidityLevel.choices, default=LiquidityLevel.MEDIUM
    )
    beginner_summary = models.TextField(blank=True)
    regulatory_notes = models.TextField(blank=True)
    typical_minimum_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    source_references = models.ManyToManyField(SourceReference, blank=True, related_name="product_categories")

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["risk_level_default"]),
            models.Index(fields=["liquidity_level_default"]),
        ]

    def __str__(self) -> str:
        return self.name


class InvestmentProvider(TimestampedModel):
    class ProviderType(models.TextChoices):
        FUND_MANAGER = "fund_manager", "Fund manager"
        STOCKBROKER = "stockbroker", "Stockbroker"
        INVESTMENT_ADVISER = "investment_adviser", "Investment adviser"
        SACCO = "sacco", "SACCO"
        BANK = "bank", "Bank"
        INSURER = "insurer", "Insurer"
        PENSION_PROVIDER = "pension_provider", "Pension provider"
        WEALTH_PLATFORM = "wealth_platform", "Wealth platform"
        GOVERNMENT_PLATFORM = "government_platform", "Government platform"
        EXCHANGE = "exchange", "Exchange"
        OTHER = "other", "Other"

    class PublishedStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    provider_type = models.CharField(max_length=40, choices=ProviderType.choices)
    regulator = models.ForeignKey(Regulator, null=True, blank=True, on_delete=models.SET_NULL, related_name="providers")
    license_number = models.CharField(max_length=120, blank=True)
    license_status = models.CharField(max_length=120, blank=True)
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=80, blank=True)
    email = models.EmailField(blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    source_references = models.ManyToManyField(SourceReference, blank=True, related_name="investment_providers")
    published_status = models.CharField(max_length=32, choices=PublishedStatus.choices, default=PublishedStatus.DRAFT)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["provider_type"]),
            models.Index(fields=["regulator"]),
            models.Index(fields=["published_status"]),
        ]

    def __str__(self) -> str:
        return self.name


class RegulatedEntityStatus(models.Model):
    provider = models.ForeignKey(InvestmentProvider, on_delete=models.CASCADE, related_name="regulated_statuses")
    regulator = models.ForeignKey(Regulator, on_delete=models.PROTECT, related_name="regulated_entity_statuses")
    category = models.CharField(max_length=160)
    license_number = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=120)
    effective_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    source_reference = models.ForeignKey(
        SourceReference, null=True, blank=True, on_delete=models.SET_NULL, related_name="regulated_entity_statuses"
    )
    raw_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["provider__name", "regulator__abbreviation"]
        indexes = [
            models.Index(fields=["provider", "regulator"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["license_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.provider_id}:{self.regulator_id}:{self.status}"


class GovernmentSecurityReference(models.Model):
    class SecurityType(models.TextChoices):
        TREASURY_BILL = "treasury_bill", "Treasury bill"
        TREASURY_BOND = "treasury_bond", "Treasury bond"
        INFRASTRUCTURE_BOND = "infrastructure_bond", "Infrastructure bond"

    security_type = models.CharField(max_length=40, choices=SecurityType.choices)
    tenor_days = models.PositiveIntegerField(null=True, blank=True)
    issue_number = models.CharField(max_length=120, blank=True)
    isin = models.CharField(max_length=60, blank=True)
    auction_date = models.DateField(null=True, blank=True)
    value_date = models.DateField(null=True, blank=True)
    maturity_date = models.DateField(null=True, blank=True)
    average_rate = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    accepted_yield = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    source_reference = models.ForeignKey(
        SourceReference, null=True, blank=True, on_delete=models.SET_NULL, related_name="government_securities"
    )
    status = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-auction_date", "security_type"]
        indexes = [
            models.Index(fields=["security_type", "auction_date"]),
            models.Index(fields=["isin"]),
            models.Index(fields=["issue_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.security_type}:{self.issue_number or self.isin}"


class ListedCompany(TimestampedModel):
    class PublishedStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=180)
    symbol = models.CharField(max_length=20, unique=True)
    isin = models.CharField(max_length=60, blank=True)
    sector = models.CharField(max_length=120, blank=True)
    listing_segment = models.CharField(max_length=120, blank=True)
    website = models.URLField(blank=True)
    source_reference = models.ForeignKey(
        SourceReference, null=True, blank=True, on_delete=models.SET_NULL, related_name="listed_companies"
    )
    last_verified_at = models.DateTimeField(null=True, blank=True)
    published_status = models.CharField(max_length=32, choices=PublishedStatus.choices, default=PublishedStatus.DRAFT)

    class Meta:
        ordering = ["symbol"]
        indexes = [
            models.Index(fields=["symbol"]),
            models.Index(fields=["sector"]),
            models.Index(fields=["published_status"]),
        ]

    def __str__(self) -> str:
        return self.symbol


class SaccoEntity(TimestampedModel):
    class SaccoType(models.TextChoices):
        DEPOSIT_TAKING = "deposit_taking", "Deposit taking"
        NON_WITHDRAWABLE_DEPOSIT_TAKING = "non_withdrawable_deposit_taking", "Non-withdrawable deposit taking"
        OTHER = "other", "Other"

    class PublishedStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=180)
    sacco_type = models.CharField(max_length=60, choices=SaccoType.choices)
    sasra_status = models.CharField(max_length=160)
    county = models.CharField(max_length=120, blank=True)
    source_reference = models.ForeignKey(
        SourceReference, null=True, blank=True, on_delete=models.SET_NULL, related_name="sacco_entities"
    )
    last_verified_at = models.DateTimeField(null=True, blank=True)
    published_status = models.CharField(max_length=32, choices=PublishedStatus.choices, default=PublishedStatus.DRAFT)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name", "sasra_status"]),
            models.Index(fields=["sacco_type", "sasra_status"]),
            models.Index(fields=["published_status"]),
        ]

    def __str__(self) -> str:
        return self.name
