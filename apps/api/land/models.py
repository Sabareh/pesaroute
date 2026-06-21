from django.conf import settings
from django.db import models


class LandOpportunity(models.Model):
    """A specific land opportunity a user is evaluating before sending money.

    PesaRoute does NOT verify ownership, hold money, or guarantee safety. This is a
    private decision workspace for documenting due diligence and visible risk.
    """

    class SellerType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        COMPANY = "company", "Company"
        AGENT = "agent", "Agent"
        CHAMA = "chama", "Chama"
        FAMILY_MEMBER = "family_member", "Family member"
        UNKNOWN = "unknown", "Unknown"

    class TitleStatus(models.TextChoices):
        TITLE_SEEN = "title_seen", "Title seen"
        TITLE_NOT_SEEN = "title_not_seen", "Title not seen"
        MOTHER_TITLE = "mother_title", "Mother title"
        ALLOTMENT_LETTER = "allotment_letter", "Allotment letter"
        UNKNOWN = "unknown", "Unknown"

    class IntendedUse(models.TextChoices):
        RESIDENTIAL = "residential", "Residential"
        AGRICULTURAL = "agricultural", "Agricultural"
        COMMERCIAL = "commercial", "Commercial"
        SPECULATION = "speculation", "Speculation"
        CHAMA_PROJECT = "chama_project", "Chama project"
        DIASPORA_INVESTMENT = "diaspora_investment", "Diaspora investment"
        UNKNOWN = "unknown", "Unknown"

    class DecisionStage(models.TextChoices):
        BROWSING = "browsing", "Browsing"
        CONSIDERING = "considering", "Considering"
        BEFORE_DEPOSIT = "before_deposit", "Before deposit"
        DEPOSIT_PAID = "deposit_paid", "Deposit paid"
        LAWYER_REVIEW = "lawyer_review", "Lawyer review"
        ABANDONED = "abandoned", "Abandoned"
        COMPLETED = "completed", "Completed"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        VERY_HIGH = "very_high", "Very high"
        UNKNOWN = "unknown", "Unknown"

    class PrivacyMode(models.TextChoices):
        PRIVATE = "private", "Private"
        SHARED_WITH_PROFESSIONAL = "shared_with_professional", "Shared with professional"
        SHARED_WITH_CHAMA = "shared_with_chama", "Shared with chama"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="land_opportunities")
    title = models.CharField(max_length=200)
    location_text = models.CharField(max_length=255)
    county = models.CharField(max_length=120, blank=True)
    area_or_town = models.CharField(max_length=160, blank=True)
    asking_price = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    deposit_requested = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    plot_size = models.CharField(max_length=120, blank=True)
    seller_type = models.CharField(max_length=32, choices=SellerType.choices, default=SellerType.UNKNOWN)
    title_status = models.CharField(max_length=32, choices=TitleStatus.choices, default=TitleStatus.UNKNOWN)
    intended_use = models.CharField(max_length=32, choices=IntendedUse.choices, default=IntendedUse.UNKNOWN)
    decision_stage = models.CharField(max_length=32, choices=DecisionStage.choices, default=DecisionStage.CONSIDERING)
    risk_level = models.CharField(max_length=32, choices=RiskLevel.choices, default=RiskLevel.UNKNOWN)
    privacy_mode = models.CharField(max_length=32, choices=PrivacyMode.choices, default=PrivacyMode.PRIVATE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["decision_stage", "created_at"]),
            models.Index(fields=["risk_level"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.user_id})"


class LandDueDiligenceItem(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not started"
        REQUESTED = "requested", "Requested"
        RECEIVED = "received", "Received"
        VERIFIED_BY_USER = "verified_by_user", "Verified by user"
        REVIEWED_BY_PROFESSIONAL = "reviewed_by_professional", "Reviewed by professional"
        NOT_APPLICABLE = "not_applicable", "Not applicable"
        FAILED = "failed", "Failed"

    class Importance(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class ProfessionalTypeNeeded(models.TextChoices):
        LAWYER = "lawyer", "Lawyer"
        SURVEYOR = "surveyor", "Surveyor"
        VALUER = "valuer", "Valuer"
        LAND_AGENT = "land_agent", "Land agent"
        TAX = "tax", "Tax"
        NONE = "none", "None"

    land_opportunity = models.ForeignKey(LandOpportunity, on_delete=models.CASCADE, related_name="due_diligence_items")
    item_key = models.CharField(max_length=80)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.NOT_STARTED)
    importance = models.CharField(max_length=20, choices=Importance.choices, default=Importance.MEDIUM)
    professional_type_needed = models.CharField(
        max_length=20, choices=ProfessionalTypeNeeded.choices, default=ProfessionalTypeNeeded.NONE
    )
    source_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["land_opportunity", "id"]
        indexes = [
            models.Index(fields=["land_opportunity", "status"]),
            models.Index(fields=["importance"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["land_opportunity", "item_key"], name="uniq_land_item_key"),
        ]

    def __str__(self) -> str:
        return f"{self.item_key}:{self.status}"


class LandDocumentRecord(models.Model):
    class DocumentType(models.TextChoices):
        TITLE_COPY = "title_copy", "Title copy"
        SEARCH_RESULT = "search_result", "Search result"
        SELLER_ID = "seller_id", "Seller ID"
        COMPANY_DOCUMENTS = "company_documents", "Company documents"
        SALE_AGREEMENT = "sale_agreement", "Sale agreement"
        SURVEY_MAP = "survey_map", "Survey map"
        MUTATION_FORM = "mutation_form", "Mutation form"
        CONSENT = "consent", "Consent"
        RATES_RENT_CLEARANCE = "rates_rent_clearance", "Rates/rent clearance"
        PAYMENT_RECEIPT = "payment_receipt", "Payment receipt"
        SITE_VISIT_PHOTO = "site_visit_photo", "Site visit photo"
        OTHER = "other", "Other"

    class Visibility(models.TextChoices):
        PRIVATE = "private", "Private"
        SHARED_WITH_PROFESSIONAL = "shared_with_professional", "Shared with professional"
        SHARED_WITH_CHAMA = "shared_with_chama", "Shared with chama"

    land_opportunity = models.ForeignKey(LandOpportunity, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=40, choices=DocumentType.choices, default=DocumentType.OTHER)
    file = models.FileField(upload_to="land_documents/", null=True, blank=True)
    notes = models.TextField(blank=True)
    # Private by default — the user explicitly chooses what to share, and with whom.
    visibility = models.CharField(max_length=40, choices=Visibility.choices, default=Visibility.PRIVATE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["land_opportunity", "created_at"]),
            models.Index(fields=["document_type"]),
            models.Index(fields=["visibility"]),
        ]

    def __str__(self) -> str:
        return f"{self.document_type}:{self.land_opportunity_id}"


class LandRiskFlag(models.Model):
    class FlagType(models.TextChoices):
        DEPOSIT_PRESSURE = "deposit_pressure", "Deposit pressure"
        NO_TITLE_SEEN = "no_title_seen", "No title seen"
        SELLER_MISMATCH = "seller_mismatch", "Seller mismatch"
        UNCLEAR_BOUNDARIES = "unclear_boundaries", "Unclear boundaries"
        NO_LAWYER = "no_lawyer", "No lawyer"
        NO_SEARCH_DONE = "no_search_done", "No search done"
        UNREALISTIC_APPRECIATION_CLAIM = "unrealistic_appreciation_claim", "Unrealistic appreciation claim"
        UNCLEAR_COMPANY = "unclear_company", "Unclear company"
        MISSING_DOCUMENTS = "missing_documents", "Missing documents"
        GROUP_PRESSURE = "group_pressure", "Group pressure"
        DIASPORA_PROXY_RISK = "diaspora_proxy_risk", "Diaspora proxy risk"
        OTHER = "other", "Other"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    land_opportunity = models.ForeignKey(LandOpportunity, on_delete=models.CASCADE, related_name="risk_flags")
    flag_type = models.CharField(max_length=48, choices=FlagType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.WARNING)
    message = models.TextField()
    suggested_action = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["land_opportunity", "created_at"]),
            models.Index(fields=["severity"]),
        ]

    def __str__(self) -> str:
        return f"{self.flag_type}:{self.severity}"


class LandDecisionJournalLink(models.Model):
    land_opportunity = models.ForeignKey(LandOpportunity, on_delete=models.CASCADE, related_name="journal_links")
    journal_entry = models.ForeignKey("journal.JournalEntry", on_delete=models.CASCADE, related_name="land_links")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["land_opportunity", "created_at"])]

    def __str__(self) -> str:
        return f"{self.land_opportunity_id}:{self.journal_entry_id}"


class LandCountyMarket(models.Model):
    """Indicative county-level land-market averages for the Explore map.

    Educational learning data only - NOT a valuation. Joined to the real Kenya
    county boundaries (geoBoundaries ADM1) on the web by `name`/`code`.
    """

    class Tier(models.TextChoices):
        PRIME = "Prime", "Prime"
        HOTSPOT = "Hotspot", "Hotspot"
        STABLE = "Stable", "Stable"
        EMERGING = "Emerging", "Emerging"

    code = models.CharField(max_length=12, unique=True)  # ISO 3166-2, e.g. KE-22
    name = models.CharField(max_length=80, unique=True)
    region = models.CharField(max_length=60)
    tier = models.CharField(max_length=12, choices=Tier.choices, default=Tier.STABLE)
    # KES millions per acre (indicative average).
    avg_price_per_acre = models.DecimalField(max_digits=8, decimal_places=2)
    appreciation_pct = models.DecimalField(max_digits=5, decimal_places=2)
    rental_yield_pct = models.DecimalField(max_digits=5, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class LandSubcountyMarket(models.Model):
    """Indicative subcounty averages within a county (geoBoundaries ADM2 names)."""

    county = models.ForeignKey(LandCountyMarket, related_name="subcounties", on_delete=models.CASCADE)
    name = models.CharField(max_length=80)
    avg_price_per_acre = models.DecimalField(max_digits=8, decimal_places=2)
    appreciation_pct = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        ordering = ["-avg_price_per_acre"]
        unique_together = [("county", "name")]

    def __str__(self) -> str:
        return f"{self.county.name} / {self.name}"


class LandListing(models.Model):
    """A sponsored land/property development advertised in a county.

    Always clearly labelled Sponsored. PesaRoute does NOT endorse listings; this
    is an advertising surface kept separate from neutral county market data and it
    never reorders the map.
    """

    county = models.ForeignKey(LandCountyMarket, related_name="listings", on_delete=models.CASCADE)
    name = models.CharField(max_length=160)
    kind = models.CharField(max_length=80)  # e.g. "Serviced plots", "Apartments"
    place = models.CharField(max_length=160)
    price_kes = models.DecimalField(max_digits=14, decimal_places=2)
    tag1 = models.CharField(max_length=60, blank=True)
    tag2 = models.CharField(max_length=60, blank=True)
    advertiser = models.CharField(max_length=160, blank=True)
    listing_url = models.URLField(blank=True)
    is_sponsored = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["county", "is_active"])]

    def __str__(self) -> str:
        return f"{self.county.name} / {self.name}"
