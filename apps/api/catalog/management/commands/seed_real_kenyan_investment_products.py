"""
Seed real Kenyan investment providers and products so users can search and
simulate specific products (Etica, Stanbic, Standard Investment Bank / Mansa-X,
CBK Treasury securities, NSE/CDSC education routes) instead of only generic ones.

Safety rules baked in:
- No live rate is invented. A ProductRateSnapshot is created ONLY when a spec
  carries explicit `rate` data with a snapshot date + source. Otherwise the
  product shows "Latest rate unavailable" and simulations use a custom rate.
- Idempotent. Without --overwrite, existing records are never modified (manual
  edits are preserved); only missing records are created.
- Incomplete products (no confirmed source) are kept as draft / needs_review.
- No "best"/"recommended" language. No execution, no payments, no credentials.

Usage:
  python manage.py seed_real_kenyan_investment_products --dry-run
  python manage.py seed_real_kenyan_investment_products --publish
  python manage.py seed_real_kenyan_investment_products --publish --overwrite
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from catalog.models import ProductCategory, ProductPassport, Provider
from knowledge.models import DataSource, SourceReference
from planning.models import (
    InvestmentProduct,
    ProductFeeSchedule,
    ProductLiquidityRule,
    ProductRateSnapshot,
)

SEED_MARKER = "seed:real-kenyan-products"

FUND_DOCS = ["National ID", "KRA PIN", "Passport photo or proof of address", "The provider's own onboarding form"]
GOV_DOCS = ["National ID", "KRA PIN", "CBK DhowCSD or CDSC account details"]
FUND_MISTAKES = [
    "Choosing by the headline yield without checking fees and withdrawal time",
    "Assuming a quoted yield is guaranteed or current",
]
FUND_QUESTIONS = [
    "Is the quoted yield gross or net of fees and tax?",
    "How long do withdrawals take, and is there a minimum holding period?",
    "Which regulator licenses this fund, and what is the licence number?",
]


@dataclass
class SourceSpec:
    ds_slug: str
    ds_name: str
    ds_type: str
    authority_level: str
    title: str
    url: str
    label: str
    homepage: str = ""


@dataclass
class ProductSpec:
    name: str
    product_type: str
    category: str
    currency: str
    regulator: str
    regulator_category: str
    license_status: str
    minimum_amount: Decimal | None
    minimum_amount_notes: str
    liquidity_level: str
    risk_level: str
    source_confidence: str
    complete: bool
    documents_needed: list = field(default_factory=lambda: list(FUND_DOCS))
    beginner_mistakes: list = field(default_factory=lambda: list(FUND_MISTAKES))
    questions_to_ask: list = field(default_factory=lambda: list(FUND_QUESTIONS))
    fees: list = field(default_factory=list)
    withdrawal_timeline: str = ""
    lock_in_period: str = ""
    maturity_days: int | None = None
    early_withdrawal_notes: str = ""
    # Only set when a real, dated source figure exists. Never faked.
    rate: dict | None = None


@dataclass
class ProviderSpec:
    name: str
    regulator_category: str
    regulator_license_number: str
    regulator_status: str
    website: str
    verification_status: str
    source: SourceSpec
    products: list


P = InvestmentProduct
FEE = ProductFeeSchedule


def _fund(name, ptype, category, currency, conf, *, minimum=None, risk="low", liquidity="high", complete=True, withdrawal="", notes=""):
    return ProductSpec(
        name=name,
        product_type=ptype,
        category=category,
        currency=currency,
        regulator="CMA",
        regulator_category="Collective Investment Scheme (CMA)",
        license_status="Verify the current CMA licence with the provider",
        minimum_amount=minimum,
        minimum_amount_notes=notes or "Verify the current minimum and top-up directly with the provider.",
        liquidity_level=liquidity,
        risk_level=risk,
        source_confidence=conf,
        complete=complete,
        fees=[{"type": FEE.FeeType.MANAGEMENT_FEE, "unit": FEE.FeeUnit.VARIES, "value": None,
               "notes": "Annual management fee is reflected in the quoted yield. Confirm the exact rate with the provider."}],
        withdrawal_timeline=withdrawal or "Typically a few business days after a redemption request; confirm with the provider.",
    )


SEED_PROVIDERS: list[ProviderSpec] = [
    ProviderSpec(
        name="Etica Capital Ltd",
        regulator_category="Fund Manager (CMA)",
        regulator_license_number="",
        regulator_status="Verify on the CMA licensees register",
        website="https://www.eticacap.com/",
        verification_status=Provider.VerificationStatus.SOURCE_VERIFIED,
        source=SourceSpec(
            ds_slug="etica-capital-site", ds_name="Etica Capital website",
            ds_type=DataSource.SourceType.PROVIDER, authority_level=DataSource.AuthorityLevel.PROVIDER_SELF_REPORTED,
            title="Etica Capital unit trust funds", url="https://www.eticacap.com/", label="Etica Capital (provider page)",
            homepage="https://www.eticacap.com/",
        ),
        products=[
            _fund("Etica Money Market Fund (KES)", P.ProductType.MONEY_MARKET_FUND, "Money Market Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, minimum=Decimal("100.00")),
            _fund("Etica Money Market Fund (USD)", P.ProductType.MONEY_MARKET_FUND, "Money Market Funds", P.Currency.USD, P.SourceConfidence.PROVIDER_REPORTED),
            _fund("Etica Fixed Income Fund (KES)", P.ProductType.FIXED_INCOME_FUND, "Fixed Income Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, risk="medium", liquidity="medium"),
            _fund("Etica Fixed Income Fund (USD)", P.ProductType.FIXED_INCOME_FUND, "Fixed Income Funds", P.Currency.USD, P.SourceConfidence.PROVIDER_REPORTED, risk="medium", liquidity="medium"),
            _fund("Etica Special Shariah Fund (KES)", P.ProductType.SPECIAL_FUND, "Special Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, risk="medium", liquidity="medium"),
            _fund("Etica Special Shariah Fund (USD)", P.ProductType.SPECIAL_FUND, "Special Funds", P.Currency.USD, P.SourceConfidence.PROVIDER_REPORTED, risk="medium", liquidity="medium"),
            _fund("Etica Special Wealth Fund (KES)", P.ProductType.SPECIAL_FUND, "Special Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, risk="high", liquidity="medium"),
            _fund("Etica Special Multi Asset Fund (KES)", P.ProductType.BALANCED_FUND, "Balanced Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, risk="medium", liquidity="medium"),
        ],
    ),
    ProviderSpec(
        name="Stanbic Asset Management (Stanbic Unit Trust Funds)",
        regulator_category="Fund Manager / Asset Management (CMA)",
        regulator_license_number="",
        regulator_status="Verify on the CMA licensees register",
        website="https://www.stanbicbank.co.ke/",
        verification_status=Provider.VerificationStatus.SOURCE_VERIFIED,
        source=SourceSpec(
            ds_slug="stanbic-asset-management-site", ds_name="Stanbic Asset Management website",
            ds_type=DataSource.SourceType.PROVIDER, authority_level=DataSource.AuthorityLevel.PROVIDER_SELF_REPORTED,
            title="Stanbic Unit Trust Funds", url="https://www.stanbicbank.co.ke/", label="Stanbic Asset Management (provider page)",
            homepage="https://www.stanbicbank.co.ke/",
        ),
        products=[
            _fund("Stanbic Money Market Fund", P.ProductType.MONEY_MARKET_FUND, "Money Market Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, minimum=Decimal("1000.00")),
            _fund("Stanbic Fixed Income Fund (KES)", P.ProductType.FIXED_INCOME_FUND, "Fixed Income Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, risk="medium", liquidity="medium"),
            _fund("Stanbic Fixed Income Fund (USD)", P.ProductType.FIXED_INCOME_FUND, "Fixed Income Funds", P.Currency.USD, P.SourceConfidence.PROVIDER_REPORTED, risk="medium", liquidity="medium"),
            _fund("Stanbic Balanced Fund", P.ProductType.BALANCED_FUND, "Balanced Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, risk="medium", liquidity="medium"),
            _fund("Stanbic Equity Fund", P.ProductType.EQUITY_FUND, "Equity Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, risk="high", liquidity="medium"),
        ],
    ),
    ProviderSpec(
        name="Standard Investment Bank (Mansa-X)",
        regulator_category="Investment Bank / Special CIS (CMA)",
        regulator_license_number="",
        regulator_status="Verify on the CMA licensees register",
        website="https://www.sib.co.ke/",
        verification_status=Provider.VerificationStatus.SOURCE_VERIFIED,
        source=SourceSpec(
            ds_slug="standard-investment-bank-site", ds_name="Standard Investment Bank website",
            ds_type=DataSource.SourceType.PROVIDER, authority_level=DataSource.AuthorityLevel.PROVIDER_SELF_REPORTED,
            title="Mansa-X Special Fund (Standard Investment Bank)", url="https://www.sib.co.ke/", label="Standard Investment Bank (provider page)",
            homepage="https://www.sib.co.ke/",
        ),
        products=[
            _fund("Mansa-X Special Fund (KES)", P.ProductType.SPECIAL_FUND, "Special Funds", P.Currency.KES, P.SourceConfidence.PROVIDER_REPORTED, risk="high", liquidity="medium", minimum=Decimal("250000.00")),
            # No confirmed standalone source page yet -> keep as draft / needs review.
            _fund("Mansa-X Shariah Fund (KES)", P.ProductType.SPECIAL_FUND, "Special Funds", P.Currency.KES, P.SourceConfidence.UNKNOWN, risk="high", liquidity="medium", complete=False),
            _fund("Mansa-X USD Fund", P.ProductType.SPECIAL_FUND, "Special Funds", P.Currency.USD, P.SourceConfidence.UNKNOWN, risk="high", liquidity="medium", complete=False),
        ],
    ),
    ProviderSpec(
        name="Central Bank of Kenya (DhowCSD)",
        regulator_category="Government securities platform",
        regulator_license_number="",
        regulator_status="Official government issuer",
        website="https://www.centralbank.go.ke/",
        verification_status=Provider.VerificationStatus.SOURCE_VERIFIED,
        source=SourceSpec(
            ds_slug="cbk-government-securities", ds_name="CBK Government Securities",
            ds_type=DataSource.SourceType.GOVERNMENT, authority_level=DataSource.AuthorityLevel.OFFICIAL,
            title="CBK Treasury bills and bonds", url="https://www.centralbank.go.ke/securities/", label="Central Bank of Kenya (official)",
            homepage="https://www.centralbank.go.ke/",
        ),
        products=[
            ProductSpec("91-Day Treasury Bill", P.ProductType.TREASURY_BILL, "Treasury Bills", P.Currency.KES, "CBK", "Government security",
                        "Issued through the official government securities process", Decimal("100000.00"),
                        "Minimum face value is typically KES 100,000; verify with CBK/DhowCSD.", P.LiquidityLevel.MEDIUM, P.RiskLevel.LOW,
                        P.SourceConfidence.OFFICIAL, True, documents_needed=list(GOV_DOCS),
                        beginner_mistakes=["Confusing the discounted purchase price with the face value", "Ignoring the maturity date"],
                        questions_to_ask=["Which tenor am I comparing?", "What happens if I need cash before maturity?"],
                        withdrawal_timeline="Held to maturity (91 days) unless sold on a secondary route.", maturity_days=91),
            ProductSpec("182-Day Treasury Bill", P.ProductType.TREASURY_BILL, "Treasury Bills", P.Currency.KES, "CBK", "Government security",
                        "Issued through the official government securities process", Decimal("100000.00"),
                        "Minimum face value is typically KES 100,000; verify with CBK/DhowCSD.", P.LiquidityLevel.MEDIUM, P.RiskLevel.LOW,
                        P.SourceConfidence.OFFICIAL, True, documents_needed=list(GOV_DOCS),
                        beginner_mistakes=["Confusing the discounted purchase price with the face value", "Ignoring the maturity date"],
                        questions_to_ask=["Which tenor am I comparing?", "What happens if I need cash before maturity?"],
                        withdrawal_timeline="Held to maturity (182 days) unless sold on a secondary route.", maturity_days=182),
            ProductSpec("364-Day Treasury Bill", P.ProductType.TREASURY_BILL, "Treasury Bills", P.Currency.KES, "CBK", "Government security",
                        "Issued through the official government securities process", Decimal("100000.00"),
                        "Minimum face value is typically KES 100,000; verify with CBK/DhowCSD.", P.LiquidityLevel.MEDIUM, P.RiskLevel.LOW,
                        P.SourceConfidence.OFFICIAL, True, documents_needed=list(GOV_DOCS),
                        beginner_mistakes=["Confusing the discounted purchase price with the face value", "Ignoring the maturity date"],
                        questions_to_ask=["Which tenor am I comparing?", "What happens if I need cash before maturity?"],
                        withdrawal_timeline="Held to maturity (364 days) unless sold on a secondary route.", maturity_days=364),
            ProductSpec("Treasury Bond", P.ProductType.TREASURY_BOND, "Treasury Bonds", P.Currency.KES, "CBK", "Government security",
                        "Issued through the official government securities process", Decimal("50000.00"),
                        "Minimum face value is typically KES 50,000; verify with CBK/DhowCSD.", P.LiquidityLevel.MEDIUM, P.RiskLevel.LOW,
                        P.SourceConfidence.OFFICIAL, True, documents_needed=list(GOV_DOCS),
                        beginner_mistakes=["Assuming the coupon equals total return", "Ignoring price/yield movement before maturity"],
                        questions_to_ask=["What is the maturity and coupon?", "How does selling before maturity work?"],
                        withdrawal_timeline="Maturity can be several years away; secondary sale depends on the market."),
            ProductSpec("Infrastructure Bond", P.ProductType.INFRASTRUCTURE_BOND, "Treasury Bonds", P.Currency.KES, "CBK", "Government security",
                        "Issued through the official government securities process", Decimal("50000.00"),
                        "Minimum face value varies by issue; verify with CBK/DhowCSD.", P.LiquidityLevel.MEDIUM, P.RiskLevel.LOW,
                        P.SourceConfidence.OFFICIAL, True, documents_needed=list(GOV_DOCS),
                        beginner_mistakes=["Assuming tax treatment without checking the prospectus"],
                        questions_to_ask=["Is the interest tax-exempt for this issue?", "What is the tenor?"],
                        withdrawal_timeline="Longer tenor; secondary sale depends on the market."),
            ProductSpec("DhowCSD Government Securities Route", P.ProductType.TREASURY_BILL, "Treasury Bills", P.Currency.KES, "CBK", "Government securities access route",
                        "Retail access via the official DhowCSD platform", None,
                        "No fixed minimum for the route itself; per-security minimums apply.", P.LiquidityLevel.MEDIUM, P.RiskLevel.LOW,
                        P.SourceConfidence.OFFICIAL, True, documents_needed=list(GOV_DOCS),
                        beginner_mistakes=["Skipping DhowCSD onboarding steps", "Confusing the route with a single product"],
                        questions_to_ask=["How do I open a DhowCSD account?", "Which securities are available now?"],
                        withdrawal_timeline="Depends on the specific security held."),
        ],
    ),
    ProviderSpec(
        name="Nairobi Securities Exchange",
        regulator_category="Securities exchange",
        regulator_license_number="",
        regulator_status="Licensed securities exchange",
        website="https://www.nse.co.ke/",
        verification_status=Provider.VerificationStatus.SOURCE_VERIFIED,
        source=SourceSpec(
            ds_slug="nse-listed-companies", ds_name="NSE listed companies",
            ds_type=DataSource.SourceType.EXCHANGE, authority_level=DataSource.AuthorityLevel.OFFICIAL,
            title="NSE listed companies directory", url="https://www.nse.co.ke/listed-companies/", label="Nairobi Securities Exchange (directory)",
            homepage="https://www.nse.co.ke/",
        ),
        products=[
            ProductSpec("NSE Listed Share Route", P.ProductType.NSE_EQUITY, "NSE Stocks", P.Currency.KES, "CMA/NSE", "Listed equity (education route)",
                        "Trade only through a CMA-licensed stockbroker", Decimal("1000.00"),
                        "No fixed minimum; depends on share price and broker rules. Live prices are not shown here.",
                        P.LiquidityLevel.MEDIUM, P.RiskLevel.HIGH, P.SourceConfidence.EDITORIAL, True,
                        documents_needed=["National ID", "KRA PIN", "CDS account", "Stockbroker account"],
                        beginner_mistakes=["Treating price movement as predictable", "Ignoring brokerage and statutory fees"],
                        questions_to_ask=["What total fees apply?", "Can I handle price declines?"],
                        fees=[{"type": FEE.FeeType.BROKERAGE_FEE, "unit": FEE.FeeUnit.VARIES, "value": None,
                               "notes": "Brokerage and statutory fees apply; verify with your broker and the NSE/CMA."}],
                        withdrawal_timeline="Liquidity depends on market activity and broker settlement."),
        ],
    ),
    ProviderSpec(
        name="Central Depository & Settlement Corporation (CDSC)",
        regulator_category="Central securities depository",
        regulator_license_number="",
        regulator_status="Licensed depository",
        website="https://www.cdsckenya.com/",
        verification_status=Provider.VerificationStatus.SOURCE_VERIFIED,
        source=SourceSpec(
            ds_slug="cdsc-kenya", ds_name="CDSC Kenya",
            ds_type=DataSource.SourceType.OTHER, authority_level=DataSource.AuthorityLevel.OFFICIAL,
            title="CDS account information", url="https://www.cdsckenya.com/", label="CDSC Kenya (official)",
            homepage="https://www.cdsckenya.com/",
        ),
        products=[],
    ),
]


# ---- seed engine -----------------------------------------------------------

def _category(name: str, dry_run: bool) -> ProductCategory | None:
    slug = slugify(name)
    existing = ProductCategory.objects.filter(slug=slug).first()
    if existing:
        return existing
    if dry_run:
        return None
    category, _ = ProductCategory.objects.get_or_create(
        slug=slug,
        defaults={"name": name, "description": f"Educational overview for {name}.", "status": ProductCategory.Status.ACTIVE},
    )
    return category


def _data_source(spec: SourceSpec, dry_run: bool) -> DataSource | None:
    existing = DataSource.objects.filter(slug=spec.ds_slug).first()
    if existing:
        return existing
    if dry_run:
        return None
    source, _ = DataSource.objects.get_or_create(
        slug=spec.ds_slug,
        defaults={
            "name": spec.ds_name,
            "source_type": spec.ds_type,
            "authority_level": spec.authority_level,
            "homepage_url": spec.homepage,
            "is_active": False,
            "license_notes": "Seeded reference for PesaRoute education/simulation. Verify with the source before acting.",
        },
    )
    return source


def _source_reference(source: DataSource, spec: SourceSpec, dry_run: bool) -> SourceReference | None:
    if dry_run or source is None:
        return None
    reference, _ = SourceReference.objects.get_or_create(
        source=source,
        title=spec.title[:240],
        url=spec.url,
        defaults={
            "retrieved_at": timezone.now(),
            "citation_label": spec.label[:160],
            "notes": "Seeded by seed_real_kenyan_investment_products. Verify current details with the source before investing.",
        },
    )
    return reference


def maybe_create_rate_snapshot(product: InvestmentProduct, rate: dict | None, source_reference, source) -> ProductRateSnapshot | None:
    """Create a rate snapshot ONLY when the spec carries dated source data. Never fakes a rate."""
    if not rate:
        return None
    snapshot_date = rate["snapshot_date"]
    ProductRateSnapshot.objects.filter(
        product=product, rate_type=rate["rate_type"], currency=product.currency, is_current=True
    ).update(is_current=False)
    snapshot, _ = ProductRateSnapshot.objects.update_or_create(
        product=product,
        snapshot_date=snapshot_date,
        rate_type=rate["rate_type"],
        currency=product.currency,
        defaults={
            "rate_value": Decimal(str(rate["rate_value"])),
            "rate_period": rate.get("rate_period", ProductRateSnapshot.RatePeriod.ANNUAL),
            "source": source,
            "source_reference": source_reference,
            "confidence": rate.get("confidence", product.source_confidence),
            "is_current": True,
            "raw_label": rate.get("raw_label", ""),
            "notes": rate.get("notes", ""),
        },
    )
    return snapshot


@dataclass
class SeedCounts:
    providers_created: int = 0
    products_created: int = 0
    passports_created: int = 0
    rate_snapshots_created: int = 0
    skipped_existing: int = 0


def run_seed(*, dry_run: bool = True, publish: bool = False, overwrite: bool = False) -> SeedCounts:
    counts = SeedCounts()
    now = timezone.now()

    for pspec in SEED_PROVIDERS:
        provider_slug = slugify(pspec.name)
        data_source = _data_source(pspec.source, dry_run)
        source_reference = _source_reference(data_source, pspec.source, dry_run)

        existing_provider = Provider.objects.filter(slug=provider_slug).first() or Provider.objects.filter(name=pspec.name).first()
        provider = existing_provider
        provider_defaults = {
            "name": pspec.name,
            "slug": provider_slug,
            "regulator_category": pspec.regulator_category,
            "regulator_license_number": pspec.regulator_license_number,
            "regulator_status": pspec.regulator_status,
            "website": pspec.website,
            "public_source_url": pspec.source.url,
            "last_verified_at": now,
            "verification_status": pspec.verification_status,
            "published_status": Provider.PublishedStatus.PUBLISHED if publish else Provider.PublishedStatus.DRAFT,
            "editorial_notes": f"{SEED_MARKER}\nProvider type: {pspec.regulator_category}",
            "status": Provider.Status.ACTIVE,
        }
        if existing_provider is None:
            if not dry_run:
                provider = Provider.objects.create(**provider_defaults)
                if source_reference:
                    provider.source_references.add(source_reference)
            counts.providers_created += 1
        elif overwrite and not dry_run:
            for key, value in provider_defaults.items():
                setattr(provider, key, value)
            provider.save()
            if source_reference:
                provider.source_references.add(source_reference)
        else:
            counts.skipped_existing += 1

        for spec in pspec.products:
            product_slug = slugify(spec.name)
            target_status = (
                InvestmentProduct.PublishedStatus.PUBLISHED
                if (publish and spec.complete)
                else InvestmentProduct.PublishedStatus.DRAFT
            )
            category = _category(spec.category, dry_run)
            existing_product = InvestmentProduct.objects.filter(slug=product_slug).first()

            if existing_product is not None and not overwrite:
                counts.skipped_existing += 1
                continue
            if dry_run:
                counts.products_created += 1 if existing_product is None else 0
                if spec.rate:
                    counts.rate_snapshots_created += 1
                continue
            if category is None or provider is None:
                continue

            product_defaults = {
                "name": spec.name,
                "category": category,
                "provider": provider,
                "product_type": spec.product_type,
                "currency": spec.currency,
                "regulator": spec.regulator,
                "regulator_category": spec.regulator_category,
                "license_status": spec.license_status,
                "minimum_amount": spec.minimum_amount,
                "minimum_amount_notes": spec.minimum_amount_notes,
                "liquidity_level": spec.liquidity_level,
                "risk_level": spec.risk_level,
                "documents_needed": spec.documents_needed,
                "beginner_mistakes": spec.beginner_mistakes,
                "questions_to_ask": spec.questions_to_ask,
                "public_url": pspec.source.url,
                "published_status": target_status,
                "last_verified_at": now,
                # No live rate -> freshness is unknown until a dated snapshot exists.
                "freshness_status": (
                    InvestmentProduct.FreshnessStatus.FRESH if spec.rate else InvestmentProduct.FreshnessStatus.UNKNOWN
                ),
                "source_confidence": spec.source_confidence,
                "internal_notes": f"{SEED_MARKER}. Educational simulation product. Verify rates/fees with the provider.",
            }
            product, created = InvestmentProduct.objects.update_or_create(slug=product_slug, defaults=product_defaults)
            if created:
                counts.products_created += 1
            if source_reference:
                product.source_references.add(source_reference)

            for fee in spec.fees:
                ProductFeeSchedule.objects.update_or_create(
                    product=product,
                    fee_type=fee["type"],
                    defaults={"fee_value": fee.get("value"), "fee_unit": fee.get("unit", FEE.FeeUnit.VARIES),
                              "notes": fee.get("notes", ""), "is_current": True, "source_reference": source_reference},
                )
            if spec.withdrawal_timeline or spec.lock_in_period or spec.maturity_days:
                ProductLiquidityRule.objects.update_or_create(
                    product=product,
                    liquidity_level=spec.liquidity_level,
                    defaults={
                        "withdrawal_timeline": spec.withdrawal_timeline,
                        "lock_in_period": spec.lock_in_period,
                        "maturity_period_days": spec.maturity_days,
                        "early_withdrawal_notes": spec.early_withdrawal_notes or "Verify exit rules with the provider or official source.",
                        "source_reference": source_reference,
                    },
                )

            snapshot = maybe_create_rate_snapshot(product, spec.rate, source_reference, data_source)
            if snapshot:
                counts.rate_snapshots_created += 1

            # Product passport (education card).
            passport_slug = f"{product_slug}-passport"
            _, passport_created = ProductPassport.objects.update_or_create(
                slug=passport_slug,
                defaults={
                    "name": spec.name,
                    "category": category,
                    "provider": provider,
                    "description": f"Educational passport for {spec.name}. Compare before committing money; verify rates with the provider.",
                    "regulator_category": spec.regulator_category,
                    "minimum_amount": spec.minimum_amount,
                    "liquidity_level": _passport_liquidity(spec.liquidity_level),
                    "risk_level": _passport_risk(spec.risk_level),
                    "withdrawal_timeline": spec.withdrawal_timeline,
                    "fees_summary": spec.fees[0]["notes"] if spec.fees else "Verify fees with the provider.",
                    "public_source_url": pspec.source.url,
                    "last_verified_at": now,
                    "next_review_due_at": now + timedelta(days=180),
                    "freshness_status": ProductPassport.FreshnessStatus.UNKNOWN if not spec.rate else ProductPassport.FreshnessStatus.FRESH,
                    "verification_status": ProductPassport.VerificationStatus.SOURCE_VERIFIED,
                    "published_status": target_status,
                    "status": target_status,
                    "editorial_notes": SEED_MARKER,
                    "disclosures": "Educational only. PesaRoute does not hold money, execute investments, or promise returns.",
                },
            )
            if passport_created:
                counts.passports_created += 1

    return counts


def _passport_liquidity(level: str) -> str:
    return {"high": ProductPassport.LiquidityLevel.HIGH, "medium": ProductPassport.LiquidityLevel.MEDIUM,
            "low": ProductPassport.LiquidityLevel.LOW}.get(level, ProductPassport.LiquidityLevel.MEDIUM)


def _passport_risk(level: str) -> str:
    return {"low": ProductPassport.RiskLevel.LOW, "medium": ProductPassport.RiskLevel.MODERATE,
            "high": ProductPassport.RiskLevel.HIGH, "very_high": ProductPassport.RiskLevel.VERY_HIGH}.get(level, ProductPassport.RiskLevel.MODERATE)


class Command(BaseCommand):
    help = "Seed real Kenyan investment providers and products for search and simulation."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report what would change; write nothing.")
        parser.add_argument("--publish", action="store_true", help="Publish complete products/providers (else draft).")
        parser.add_argument("--overwrite", action="store_true", help="Overwrite existing records (default: create-only).")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        publish = options["publish"]
        overwrite = options["overwrite"]

        if dry_run:
            counts = run_seed(dry_run=True, publish=publish, overwrite=overwrite)
        else:
            with transaction.atomic():
                counts = run_seed(dry_run=False, publish=publish, overwrite=overwrite)

        mode = "DRY RUN" if dry_run else ("PUBLISH" if publish else "DRAFT")
        self.stdout.write(self.style.SUCCESS(
            f"[{mode}] providers_created={counts.providers_created} products_created={counts.products_created} "
            f"passports_created={counts.passports_created} rate_snapshots_created={counts.rate_snapshots_created} "
            f"skipped_existing={counts.skipped_existing}"
        ))
        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run — no records written."))
        else:
            real_providers = Provider.objects.filter(editorial_notes__contains=SEED_MARKER).count()
            real_products = InvestmentProduct.objects.filter(internal_notes__contains=SEED_MARKER).count()
            self.stdout.write(f"Real seeded providers in DB: {real_providers}")
            self.stdout.write(f"Real seeded products in DB: {real_products}")
            self.stdout.write(self.style.WARNING(
                "Rates are unavailable until a dated source snapshot is imported. Products show "
                "'Latest rate unavailable' and simulations use a custom educational rate."
            ))
