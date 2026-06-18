from django.conf import settings
from django.db import models


class InvestmentGoal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="investment_goals")
    name = models.CharField(max_length=160)
    target_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "created_at"])]

    def __str__(self) -> str:
        return self.name


class RouteRequest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="route_requests"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    source = models.CharField(max_length=80, default="KES")
    target_category = models.CharField(max_length=120)
    risk_preference = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "created_at"]), models.Index(fields=["target_category", "created_at"])]

    def __str__(self) -> str:
        return f"{self.amount} to {self.target_category}"


class RouteResult(models.Model):
    route_request = models.ForeignKey(RouteRequest, on_delete=models.CASCADE, related_name="results")
    summary = models.TextField()
    steps = models.JSONField(default=list)
    disclaimers = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["route_request", "created_at"])]


class SimulationRun(models.Model):
    class SimulatorType(models.TextChoices):
        MMF = "mmf", "Money market fund"
        TBILL = "tbill", "Treasury bill"
        SACCO = "sacco", "SACCO"
        GLOBAL_ROUTE = "global_route", "Global investing route"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="simulation_runs"
    )
    learning_lesson = models.ForeignKey(
        "learning.LearningLesson",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="simulation_runs",
    )
    simulator_type = models.CharField(max_length=32, choices=SimulatorType.choices)
    inputs = models.JSONField(default=dict)
    outputs = models.JSONField(default=dict)
    disclaimer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["learning_lesson", "created_at"]),
            models.Index(fields=["simulator_type", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.simulator_type}:{self.created_at:%Y-%m-%d}"


class InvestmentProduct(models.Model):
    class ProductType(models.TextChoices):
        MONEY_MARKET_FUND = "money_market_fund", "Money market fund"
        FIXED_INCOME_FUND = "fixed_income_fund", "Fixed income fund"
        BOND_FUND = "bond_fund", "Bond fund"
        BALANCED_FUND = "balanced_fund", "Balanced fund"
        EQUITY_FUND = "equity_fund", "Equity fund"
        ENHANCED_YIELD_FUND = "enhanced_yield_fund", "Enhanced yield fund"
        WEALTH_FUND = "wealth_fund", "Wealth fund"
        SHARIAH_FUND = "shariah_fund", "Shariah fund"
        SPECIAL_FUND = "special_fund", "Special fund"
        MULTI_ASSET_FUND = "multi_asset_fund", "Multi-asset fund"
        ALTERNATIVE_INVESTMENT_FUND = "alternative_investment_fund", "Alternative investment fund"
        REIT = "reit", "REIT"
        TREASURY_BILL = "treasury_bill", "Treasury bill"
        TREASURY_BOND = "treasury_bond", "Treasury bond"
        INFRASTRUCTURE_BOND = "infrastructure_bond", "Infrastructure bond"
        SACCO_DEPOSIT = "sacco_deposit", "SACCO deposit"
        SACCO_SHARE_CAPITAL = "sacco_share_capital", "SACCO share capital"
        FIXED_DEPOSIT = "fixed_deposit", "Fixed deposit"
        NSE_EQUITY = "nse_equity", "NSE equity"
        NSE_SHARE_ROUTE = "nse_share_route", "NSE share route"
        CDS_ACCOUNT_ROUTE = "cds_account_route", "CDS account route"
        GLOBAL_STOCK_ROUTE = "global_stock_route", "Global stock route"
        GLOBAL_ETF_ROUTE = "global_etf_route", "Global ETF route"
        PENSION_PRODUCT = "pension_product", "Pension product"
        INSURANCE_LINKED_INVESTMENT = "insurance_linked_investment", "Insurance-linked investment"
        BITCOIN_ROUTE = "bitcoin_route", "Bitcoin route"
        BITCOIN_CRYPTO_RISK_ROUTE = "bitcoin_crypto_risk_route", "Bitcoin/crypto risk route"
        LAND_DUE_DILIGENCE = "land_due_diligence", "Land due diligence"
        OTHER = "other", "Other"

    class Currency(models.TextChoices):
        KES = "KES", "KES"
        USD = "USD", "USD"
        GBP = "GBP", "GBP"
        EUR = "EUR", "EUR"
        MULTI = "MULTI", "Multi-currency"
        UNKNOWN = "UNKNOWN", "Unknown"

    class LiquidityLevel(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"
        UNKNOWN = "unknown", "Unknown"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        VERY_HIGH = "very_high", "Very high"
        UNKNOWN = "unknown", "Unknown"

    class PublishedStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class FreshnessStatus(models.TextChoices):
        FRESH = "fresh", "Fresh"
        ACCEPTABLE = "acceptable", "Acceptable"
        STALE = "stale", "Stale"
        UNKNOWN = "unknown", "Unknown"

    class SourceConfidence(models.TextChoices):
        OFFICIAL = "official", "Official"
        PROVIDER_REPORTED = "provider_reported", "Provider reported"
        EDITORIAL = "editorial", "Editorial"
        THIRD_PARTY = "third_party", "Third party"
        UNKNOWN = "unknown", "Unknown"

    class YieldType(models.TextChoices):
        GROSS = "gross", "Gross"
        NET_OF_MANAGEMENT_FEE = "net_of_management_fee", "Net of management fee"
        NET_AFTER_TAX = "net_after_tax", "Net after tax"
        UNKNOWN = "unknown", "Unknown"

    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=220, unique=True)
    category = models.ForeignKey(
        "catalog.ProductCategory", on_delete=models.PROTECT, related_name="investment_products"
    )
    provider = models.ForeignKey(
        "catalog.Provider", null=True, blank=True, on_delete=models.SET_NULL, related_name="investment_products"
    )
    product_type = models.CharField(max_length=60, choices=ProductType.choices)
    currency = models.CharField(max_length=12, choices=Currency.choices, default=Currency.KES)
    regulator = models.CharField(max_length=120, blank=True)
    regulator_category = models.CharField(max_length=180, blank=True)
    license_status = models.CharField(max_length=120, blank=True)
    minimum_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    minimum_amount_notes = models.TextField(blank=True)
    liquidity_level = models.CharField(max_length=32, choices=LiquidityLevel.choices, default=LiquidityLevel.UNKNOWN)
    risk_level = models.CharField(max_length=32, choices=RiskLevel.choices, default=RiskLevel.UNKNOWN)
    typical_use_cases = models.JSONField(default=list, blank=True)
    not_ideal_for = models.JSONField(default=list, blank=True)
    documents_needed = models.JSONField(default=list, blank=True)
    beginner_mistakes = models.JSONField(default=list, blank=True)
    questions_to_ask = models.JSONField(default=list, blank=True)
    public_url = models.URLField(blank=True)
    published_status = models.CharField(max_length=32, choices=PublishedStatus.choices, default=PublishedStatus.DRAFT)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    freshness_status = models.CharField(max_length=32, choices=FreshnessStatus.choices, default=FreshnessStatus.UNKNOWN)
    source_confidence = models.CharField(
        max_length=32, choices=SourceConfidence.choices, default=SourceConfidence.UNKNOWN
    )
    source_references = models.ManyToManyField(
        "knowledge.SourceReference", blank=True, related_name="investment_products"
    )
    internal_notes = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)

    # --- MMF attributes (Phase 2.15). Yield VALUES live in ProductRateSnapshot;
    # these are the product attributes that aren't captured elsewhere. ---
    yield_type = models.CharField(max_length=32, choices=YieldType.choices, default=YieldType.UNKNOWN)
    management_fee_rate = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    withdrawal_timeline = models.CharField(max_length=220, blank=True)
    minimum_topup = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    mpesa_paybill_available = models.BooleanField(default=False)
    mpesa_paybill_number = models.CharField(max_length=40, blank=True)
    withholding_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=15)

    # --- SACCO attributes (Phase 2.15). Dividend/interest VALUES live in
    # ProductRateSnapshot; these are SACCO-specific attributes. ---
    dividend_rate_latest = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    interest_on_deposits_latest = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    loan_multiplier = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    minimum_shares = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    membership_eligibility = models.TextField(blank=True)
    sasra_status = models.CharField(max_length=160, blank=True)
    audited_report_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category__name", "name"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["provider"]),
            models.Index(fields=["product_type"]),
            models.Index(fields=["currency"]),
            models.Index(fields=["risk_level"]),
            models.Index(fields=["liquidity_level"]),
            models.Index(fields=["freshness_status"]),
            models.Index(fields=["source_confidence"]),
            models.Index(fields=["published_status"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self) -> str:
        return self.name


class ProductRateSnapshot(models.Model):
    class RateType(models.TextChoices):
        EFFECTIVE_ANNUAL_YIELD = "effective_annual_yield", "Effective annual yield"
        ANNUAL_YIELD = "annual_yield", "Annual yield"
        GROSS_YIELD = "gross_yield", "Gross yield"
        NET_YIELD = "net_yield", "Net yield"
        T_BILL_AVERAGE_RATE = "t_bill_average_rate", "T-bill average rate"
        T_BILL_WEIGHTED_AVERAGE_RATE = "t_bill_weighted_average_rate", "T-bill weighted average rate"
        BOND_COUPON = "bond_coupon", "Bond coupon"
        BOND_YIELD = "bond_yield", "Bond yield"
        DIVIDEND_YIELD = "dividend_yield", "Dividend yield"
        FIXED_DEPOSIT_RATE = "fixed_deposit_rate", "Fixed deposit rate"
        ESTIMATED_RETURN = "estimated_return", "Estimated return"
        UNKNOWN = "unknown", "Unknown"

    class RatePeriod(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"
        ANNUAL = "annual", "Annual"
        AUCTION = "auction", "Auction"
        UNKNOWN = "unknown", "Unknown"

    product = models.ForeignKey(InvestmentProduct, on_delete=models.CASCADE, related_name="rate_snapshots")
    snapshot_date = models.DateField()
    rate_type = models.CharField(max_length=60, choices=RateType.choices, default=RateType.UNKNOWN)
    rate_value = models.DecimalField(max_digits=9, decimal_places=4)
    rate_period = models.CharField(max_length=32, choices=RatePeriod.choices, default=RatePeriod.ANNUAL)
    currency = models.CharField(
        max_length=12, choices=InvestmentProduct.Currency.choices, default=InvestmentProduct.Currency.KES
    )
    source = models.ForeignKey("knowledge.DataSource", null=True, blank=True, on_delete=models.SET_NULL)
    source_reference = models.ForeignKey(
        "knowledge.SourceReference", null=True, blank=True, on_delete=models.SET_NULL, related_name="rate_snapshots"
    )
    confidence = models.CharField(
        max_length=32,
        choices=InvestmentProduct.SourceConfidence.choices,
        default=InvestmentProduct.SourceConfidence.UNKNOWN,
    )
    is_current = models.BooleanField(default=False)
    raw_label = models.CharField(max_length=180, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-snapshot_date", "-created_at"]
        indexes = [
            models.Index(fields=["product", "snapshot_date"]),
            models.Index(fields=["product", "is_current"]),
            models.Index(fields=["rate_type"]),
            models.Index(fields=["is_current"]),
        ]

    def __str__(self) -> str:
        return f"{self.product_id}:{self.rate_type}:{self.snapshot_date}"


class ProductFeeSchedule(models.Model):
    class FeeType(models.TextChoices):
        MANAGEMENT_FEE = "management_fee", "Management fee"
        TRUSTEE_FEE = "trustee_fee", "Trustee fee"
        CUSTODIAN_FEE = "custodian_fee", "Custodian fee"
        WITHDRAWAL_FEE = "withdrawal_fee", "Withdrawal fee"
        TRANSACTION_FEE = "transaction_fee", "Transaction fee"
        BROKERAGE_FEE = "brokerage_fee", "Brokerage fee"
        PLATFORM_FEE = "platform_fee", "Platform fee"
        SPREAD = "spread", "Spread"
        TAX = "tax", "Tax"
        OTHER = "other", "Other"

    class FeeUnit(models.TextChoices):
        PERCENT = "percent", "Percent"
        KES = "kes", "KES"
        USD = "usd", "USD"
        VARIES = "varies", "Varies"
        UNKNOWN = "unknown", "Unknown"

    product = models.ForeignKey(InvestmentProduct, on_delete=models.CASCADE, related_name="fee_schedules")
    fee_type = models.CharField(max_length=40, choices=FeeType.choices)
    fee_value = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    fee_unit = models.CharField(max_length=20, choices=FeeUnit.choices, default=FeeUnit.UNKNOWN)
    notes = models.TextField(blank=True)
    source_reference = models.ForeignKey(
        "knowledge.SourceReference", null=True, blank=True, on_delete=models.SET_NULL, related_name="fee_schedules"
    )
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=True)

    class Meta:
        ordering = ["product__name", "fee_type"]
        indexes = [models.Index(fields=["product", "is_current"])]

    def __str__(self) -> str:
        return f"{self.product_id}:{self.fee_type}"


class ProductLiquidityRule(models.Model):
    product = models.ForeignKey(InvestmentProduct, on_delete=models.CASCADE, related_name="liquidity_rules")
    withdrawal_timeline = models.CharField(max_length=220, blank=True)
    lock_in_period = models.CharField(max_length=180, blank=True)
    maturity_period_days = models.PositiveIntegerField(null=True, blank=True)
    early_withdrawal_notes = models.TextField(blank=True)
    liquidity_level = models.CharField(max_length=32, choices=InvestmentProduct.LiquidityLevel.choices)
    source_reference = models.ForeignKey(
        "knowledge.SourceReference", null=True, blank=True, on_delete=models.SET_NULL, related_name="liquidity_rules"
    )

    class Meta:
        ordering = ["product__name", "id"]
        indexes = [models.Index(fields=["product"]), models.Index(fields=["product", "liquidity_level"])]

    def __str__(self) -> str:
        return f"{self.product_id}:{self.liquidity_level}"


class SimulationProfile(models.Model):
    class Goal(models.TextChoices):
        EMERGENCY_FUND = "emergency_fund", "Emergency fund"
        FIRST_INVESTMENT = "first_investment", "First investment"
        SCHOOL_FEES = "school_fees", "School fees"
        LAND = "land", "Land"
        BUSINESS = "business", "Business"
        RETIREMENT = "retirement", "Retirement"
        GLOBAL_EXPOSURE = "global_exposure", "Global exposure"
        CHAMA = "chama", "Chama"
        SACCO = "sacco", "SACCO"
        DIASPORA = "diaspora", "Diaspora"
        GENERAL = "general", "General"

    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=200, unique=True)
    goal = models.CharField(max_length=40, choices=Goal.choices, default=Goal.GENERAL)
    amount_min = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_max = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    timeline_months_min = models.PositiveIntegerField(null=True, blank=True)
    timeline_months_max = models.PositiveIntegerField(null=True, blank=True)
    risk_preference = models.CharField(max_length=40, blank=True)
    liquidity_need = models.CharField(max_length=40, blank=True)
    preferred_currency = models.CharField(
        max_length=12, choices=InvestmentProduct.Currency.choices, default=InvestmentProduct.Currency.KES
    )
    user_type = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["goal"]), models.Index(fields=["preferred_currency"])]

    def __str__(self) -> str:
        return self.name


class StagedProductUpdate(models.Model):
    class ReviewStatus(models.TextChoices):
        NEEDS_REVIEW = "needs_review", "Needs review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        AUTO_APPROVED = "auto_approved", "Auto approved"

    class ParserConfidence(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    source = models.ForeignKey("knowledge.DataSource", on_delete=models.CASCADE, related_name="staged_product_updates")
    ingestion_run = models.ForeignKey(
        "knowledge.DataIngestionRun",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staged_product_updates",
    )
    product = models.ForeignKey(
        InvestmentProduct, null=True, blank=True, on_delete=models.SET_NULL, related_name="staged_updates"
    )
    provider_name = models.CharField(max_length=180)
    product_name = models.CharField(max_length=180)
    normalized_payload = models.JSONField(default=dict)
    proposed_changes = models.JSONField(default=dict)
    parser_confidence = models.CharField(max_length=32, choices=ParserConfidence.choices, default=ParserConfidence.LOW)
    review_status = models.CharField(max_length=32, choices=ReviewStatus.choices, default=ReviewStatus.NEEDS_REVIEW)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_product_updates",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["review_status", "created_at"]),
            models.Index(fields=["product", "created_at"]),
            models.Index(fields=["source", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.provider_name}:{self.product_name}:{self.review_status}"


class ProductSimulationRun(models.Model):
    class AssumedRateSource(models.TextChoices):
        LATEST_SNAPSHOT = "latest_snapshot", "Latest snapshot"
        MANUAL_USER_INPUT = "manual_user_input", "Manual user input"
        EDITORIAL_DEFAULT = "editorial_default", "Editorial default"
        SCENARIO = "scenario", "Scenario"
        RATE_UNAVAILABLE = "rate_unavailable", "Rate unavailable"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="product_simulation_runs",
    )
    product = models.ForeignKey(
        InvestmentProduct, null=True, blank=True, on_delete=models.SET_NULL, related_name="simulation_runs"
    )
    category = models.ForeignKey(
        "catalog.ProductCategory",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="product_simulation_runs",
    )
    provider = models.ForeignKey(
        "catalog.Provider", null=True, blank=True, on_delete=models.SET_NULL, related_name="product_simulation_runs"
    )
    input_amount = models.DecimalField(max_digits=14, decimal_places=2)
    monthly_topup = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    timeline_months = models.PositiveIntegerField()
    selected_rate_snapshot = models.ForeignKey(
        ProductRateSnapshot, null=True, blank=True, on_delete=models.SET_NULL, related_name="simulation_runs"
    )
    assumed_rate = models.DecimalField(max_digits=9, decimal_places=4, null=True, blank=True)
    assumed_rate_source = models.CharField(
        max_length=40, choices=AssumedRateSource.choices, default=AssumedRateSource.RATE_UNAVAILABLE
    )
    output = models.JSONField(default=dict, blank=True)
    warnings = models.JSONField(default=list, blank=True)
    disclaimer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["product", "created_at"]),
            models.Index(fields=["category", "created_at"]),
            models.Index(fields=["provider", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.product_id or 'category'}:{self.created_at:%Y-%m-%d}"


class VirtualSimulationPortfolio(models.Model):
    """An educational 'what-if' portfolio. NOT real investing, trading, or holdings."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="virtual_portfolios"
    )
    name = models.CharField(max_length=160, default="My what-if portfolio")
    starting_virtual_cash = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(
        max_length=12, choices=InvestmentProduct.Currency.choices, default=InvestmentProduct.Currency.KES
    )
    goal = models.CharField(max_length=180, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"])]

    def __str__(self) -> str:
        return f"{self.name} (virtual)"


class VirtualSimulationPosition(models.Model):
    portfolio = models.ForeignKey(VirtualSimulationPortfolio, on_delete=models.CASCADE, related_name="positions")
    product = models.ForeignKey(
        InvestmentProduct, null=True, blank=True, on_delete=models.SET_NULL, related_name="virtual_positions"
    )
    virtual_amount_allocated = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    rate_mode = models.CharField(max_length=40, default="neutral_scenario")
    custom_rate = models.DecimalField(max_digits=9, decimal_places=4, null=True, blank=True)
    timeline_months = models.PositiveIntegerField(default=12)
    assumptions = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["portfolio", "created_at"])]

    def __str__(self) -> str:
        return f"{self.portfolio_id}:{self.product_id}"


class VirtualSimulationSnapshot(models.Model):
    portfolio = models.ForeignKey(VirtualSimulationPortfolio, on_delete=models.CASCADE, related_name="snapshots")
    snapshot_date = models.DateField()
    estimated_value = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    total_contributions = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    estimated_growth = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    notes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-snapshot_date", "-created_at"]
        indexes = [models.Index(fields=["portfolio", "snapshot_date"])]

    def __str__(self) -> str:
        return f"{self.portfolio_id}:{self.snapshot_date}"


class ProductCatalogImportBatch(models.Model):
    class ImportType(models.TextChoices):
        OFFICIAL_PAGE_PARSE = "official_page_parse", "Official page parse"
        PROVIDER_PAGE_PARSE = "provider_page_parse", "Provider page parse"
        CSV = "csv", "CSV"
        MANUAL_EDITORIAL = "manual_editorial", "Manual editorial"
        BACKFILL = "backfill", "Backfill"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        PARTIAL = "partial", "Partial"
        NEEDS_REVIEW = "needs_review", "Needs review"

    name = models.CharField(max_length=200)
    source = models.ForeignKey(
        "knowledge.DataSource", null=True, blank=True, on_delete=models.SET_NULL, related_name="catalog_import_batches"
    )
    import_type = models.CharField(max_length=40, choices=ImportType.choices, default=ImportType.MANUAL_EDITORIAL)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    records_seen = models.PositiveIntegerField(default=0)
    providers_created = models.PositiveIntegerField(default=0)
    providers_updated = models.PositiveIntegerField(default=0)
    products_created = models.PositiveIntegerField(default=0)
    products_updated = models.PositiveIntegerField(default=0)
    products_needing_review = models.PositiveIntegerField(default=0)
    errors_count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"]), models.Index(fields=["import_type", "created_at"])]

    def __str__(self) -> str:
        return f"{self.name}:{self.status}"


class StagedInvestmentProduct(models.Model):
    class ReviewStatus(models.TextChoices):
        NEEDS_REVIEW = "needs_review", "Needs review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        AUTO_APPROVED = "auto_approved", "Auto approved"

    class ParserConfidence(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    batch = models.ForeignKey(
        ProductCatalogImportBatch, null=True, blank=True, on_delete=models.SET_NULL, related_name="staged_products"
    )
    source = models.ForeignKey(
        "knowledge.DataSource",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staged_investment_products",
    )
    source_record = models.ForeignKey(
        "knowledge.SourceRecord",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staged_investment_products",
    )
    provider_name = models.CharField(max_length=200)
    scheme_name = models.CharField(max_length=200, blank=True)
    product_name = models.CharField(max_length=200)
    product_type = models.CharField(max_length=60, blank=True)
    currency = models.CharField(max_length=12, default="UNKNOWN")
    normalized_payload = models.JSONField(default=dict, blank=True)
    source_url = models.URLField(blank=True)
    source_confidence = models.CharField(max_length=32, default="editorial")
    parser_confidence = models.CharField(max_length=32, choices=ParserConfidence.choices, default=ParserConfidence.LOW)
    review_status = models.CharField(max_length=32, choices=ReviewStatus.choices, default=ReviewStatus.NEEDS_REVIEW)
    matched_provider = models.ForeignKey(
        "catalog.Provider", null=True, blank=True, on_delete=models.SET_NULL, related_name="staged_investment_products"
    )
    matched_product = models.ForeignKey(
        InvestmentProduct, null=True, blank=True, on_delete=models.SET_NULL, related_name="staged_imports"
    )
    proposed_changes = models.JSONField(default=dict, blank=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_staged_products",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["batch", "review_status"]),
            models.Index(fields=["review_status", "created_at"]),
            models.Index(fields=["provider_name", "product_name"]),
        ]

    def __str__(self) -> str:
        return f"{self.provider_name}:{self.product_name}:{self.review_status}"
