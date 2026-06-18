"""Reseed the educational product passports — without any generic provider.

These replace the old "Generic ..." passports that were purged. They are attached to
real regulator/route providers where one fits (CBK/DhowCSD, NSE, SASRA, etc.) and left
provider-less for category-level education (e.g. money market funds) so we never imply
endorsement of a single commercial provider. All are marked ``audience=FREE`` — the
free-tier educational baseline — and remain visible to every user.

Usage:
    python manage.py seed_education_passports --dry-run
    python manage.py seed_education_passports --publish
"""

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from catalog.models import ProductCategory, ProductPassport, ProductPassportVersion, Provider

DISCLAIMER = (
    "Educational information only. PesaRoute does not hold money, execute investments, "
    "recommend providers, or promise returns. Verify details with the provider, regulator, "
    "and licensed professionals before committing money."
)

PP = ProductPassport

# provider_name is looked up against real catalog providers; None = no provider (category-level).
PASSPORTS = [
    {
        "name": "Money Market Fund Education Route",
        "category": "Money Market Funds",
        "provider": None,
        "minimum_amount": Decimal("1000.00"),
        "liquidity": PP.LiquidityLevel.HIGH,
        "risk": PP.RiskLevel.LOW,
        "description": "Learn how money market funds work in Kenya: liquidity, quoted yields, and fees.",
        "withdrawal_timeline": "Often one to three business days, depending on provider processes.",
        "fees_summary": "Fund management and trustee fees may be reflected in quoted yields.",
        "tax_notes": "Withholding tax treatment can change; verify current treatment with a licensed professional.",
        "regulator_category": "Approved Collective Investment Scheme",
    },
    {
        "name": "Treasury Bill via DhowCSD Education Route",
        "category": "Treasury Bills",
        "provider": "Central Bank of Kenya (DhowCSD)",
        "minimum_amount": Decimal("100000.00"),
        "liquidity": PP.LiquidityLevel.MEDIUM,
        "risk": PP.RiskLevel.LOW,
        "description": "Learn Treasury bills through DhowCSD: auctions, maturities, discounting, and settlement steps.",
        "withdrawal_timeline": "Held to maturity unless sold through an available secondary route.",
        "fees_summary": "Auction and settlement costs may apply depending on channel.",
        "tax_notes": "Discount interest can be subject to withholding tax.",
        "regulator_category": "Government security",
    },
    {
        "name": "Treasury Bond via DhowCSD Education Route",
        "category": "Treasury Bonds",
        "provider": "Central Bank of Kenya (DhowCSD)",
        "minimum_amount": Decimal("50000.00"),
        "liquidity": PP.LiquidityLevel.MEDIUM,
        "risk": PP.RiskLevel.LOW,
        "description": "Learn Treasury and infrastructure bonds: coupons, tenors, reopening, and DhowCSD access.",
        "withdrawal_timeline": "Held to maturity unless sold through the secondary market.",
        "fees_summary": "Settlement and secondary-market costs may apply.",
        "tax_notes": "Coupon interest may be taxable; infrastructure bonds can differ. Verify with KRA.",
        "regulator_category": "Government security",
    },
    {
        "name": "SACCO Deposits Education Route",
        "category": "SACCOs",
        "provider": "SASRA-Regulated SACCOs",
        "minimum_amount": Decimal("500.00"),
        "liquidity": PP.LiquidityLevel.LOW,
        "risk": PP.RiskLevel.MODERATE,
        "description": "Learn SACCO membership, deposits, dividends, and how to verify SASRA status.",
        "withdrawal_timeline": "Withdrawals may require notice or member exit processes.",
        "fees_summary": "Membership fees, share capital rules, and loan-related charges may apply.",
        "tax_notes": "Dividends and rebates can have tax implications.",
        "regulator_category": "SASRA-regulated SACCO",
    },
    {
        "name": "SACCO Share Capital Education Route",
        "category": "SACCOs",
        "provider": "SASRA-Regulated SACCOs",
        "minimum_amount": None,
        "liquidity": PP.LiquidityLevel.LOW,
        "risk": PP.RiskLevel.MODERATE,
        "description": "Learn how SACCO share capital differs from deposits, including transfer and lock-in rules.",
        "withdrawal_timeline": "Share capital is often locked or transferable only under SACCO rules.",
        "fees_summary": "Transfer rules and member exit processes vary by SACCO.",
        "tax_notes": "Dividends on share capital can have tax implications.",
        "regulator_category": "SASRA-regulated SACCO",
    },
    {
        "name": "NSE Listed Shares Education Route",
        "category": "NSE Stocks",
        "provider": "Nairobi Securities Exchange",
        "minimum_amount": Decimal("1000.00"),
        "liquidity": PP.LiquidityLevel.MEDIUM,
        "risk": PP.RiskLevel.HIGH,
        "description": "Learn how to research NSE-listed shares: brokers, CDS accounts, fees, and volatility.",
        "withdrawal_timeline": "Settlement timelines depend on broker and market rules.",
        "fees_summary": "Brokerage, statutory, and exchange fees may apply.",
        "tax_notes": "Dividends and capital activity can have tax consequences.",
        "regulator_category": "Listed equity",
    },
    {
        "name": "NSE REIT Education Route",
        "category": "REITs",
        "provider": "Nairobi Securities Exchange",
        "minimum_amount": None,
        "liquidity": PP.LiquidityLevel.MEDIUM,
        "risk": PP.RiskLevel.HIGH,
        "description": "Learn how listed REITs give property exposure on the NSE, with distributions and price risk.",
        "withdrawal_timeline": "Traded on the NSE; price and liquidity vary with the market.",
        "fees_summary": "Brokerage and exchange fees may apply.",
        "tax_notes": "REIT distributions can have specific tax treatment; verify with KRA.",
        "regulator_category": "Listed REIT",
    },
    {
        "name": "Global Stocks and ETFs Education Route",
        "category": "Global Stocks and ETFs",
        "provider": "Global Investing Routes",
        "minimum_amount": Decimal("5000.00"),
        "liquidity": PP.LiquidityLevel.MEDIUM,
        "risk": PP.RiskLevel.HIGH,
        "description": "Learn global investing routes: FX, offshore custody, platform risk, tax, and transfer costs.",
        "withdrawal_timeline": "Depends on the offshore broker, FX provider, and bank settlement.",
        "fees_summary": "FX spreads, broker fees, custody fees, and transfer costs may apply.",
        "tax_notes": "Foreign withholding tax and local reporting rules may apply.",
        "regulator_category": "Global investing route",
    },
    {
        "name": "Fixed Deposit Education Route",
        "category": "Fixed Deposits",
        "provider": "Kenyan Banks (Fixed Deposits)",
        "minimum_amount": None,
        "liquidity": PP.LiquidityLevel.LOW,
        "risk": PP.RiskLevel.LOW,
        "description": "Learn how bank fixed deposits work: tenors, rates, and early-withdrawal penalties.",
        "withdrawal_timeline": "Locked for the agreed term; early withdrawal usually carries a penalty.",
        "fees_summary": "Early withdrawal penalties and account charges may apply.",
        "tax_notes": "Interest can be subject to withholding tax.",
        "regulator_category": "Bank deposit",
    },
    {
        "name": "Pension and Retirement Education Route",
        "category": "Pension Products",
        "provider": "RBA-Registered Retirement Providers",
        "minimum_amount": None,
        "liquidity": PP.LiquidityLevel.LOW,
        "risk": PP.RiskLevel.MODERATE,
        "description": "Learn how RBA-registered pension and individual retirement plans work.",
        "withdrawal_timeline": "Access is typically restricted until retirement age or under scheme rules.",
        "fees_summary": "Administration and fund management fees may apply.",
        "tax_notes": "Pension contributions and withdrawals have specific tax treatment; verify with RBA/KRA.",
        "regulator_category": "RBA-registered retirement scheme",
    },
    {
        "name": "Land Due Diligence Education Route",
        "category": "Land",
        "provider": "Land Investing Literacy",
        "minimum_amount": None,
        "liquidity": PP.LiquidityLevel.LOW,
        "risk": PP.RiskLevel.HIGH,
        "description": "A due-diligence literacy route for land: searches, valuation, surveys, and legal review.",
        "withdrawal_timeline": "Illiquid; selling can take months or longer.",
        "fees_summary": "Legal, valuation, search, survey, stamp duty, and transfer costs may apply.",
        "tax_notes": "Land transactions can trigger taxes and statutory fees.",
        "regulator_category": "Land due diligence",
    },
    {
        "name": "Bitcoin and Crypto Risk Education Route",
        "category": "Bitcoin and Crypto Risk",
        "provider": "Crypto Risk Literacy",
        "minimum_amount": None,
        "liquidity": PP.LiquidityLevel.MEDIUM,
        "risk": PP.RiskLevel.VERY_HIGH,
        "description": "A risk-literacy route for crypto: self-custody, exchange, volatility, and regulatory risks.",
        "withdrawal_timeline": "Depends on exchange, wallet custody, and network conditions.",
        "fees_summary": "Exchange fees, spreads, withdrawal fees, and network fees may apply.",
        "tax_notes": "Tax treatment and regulatory requirements can change.",
        "regulator_category": "Crypto risk literacy",
    },
]

BEGINNER_MISTAKES = [
    "Skipping provider and regulator checks before committing money.",
    "Assuming past or quoted returns are guaranteed.",
]
DOCUMENTS_NEEDED = ["ID and KRA PIN (where required)", "Provider/regulator disclosures if used externally"]


def run_seed(*, dry_run: bool, publish: bool):
    created = updated = 0
    target_status = PP.Status.PUBLISHED if publish else PP.Status.DRAFT
    for spec in PASSPORTS:
        category, _ = ProductCategory.objects.get_or_create(
            slug=slugify(spec["category"]),
            defaults={"name": spec["category"], "status": ProductCategory.Status.ACTIVE},
        )
        provider = Provider.objects.filter(name=spec["provider"]).first() if spec["provider"] else None
        slug = slugify(spec["name"])
        if dry_run:
            created += 0 if ProductPassport.objects.filter(slug=slug).exists() else 1
            continue
        passport, was_created = ProductPassport.objects.update_or_create(
            slug=slug,
            defaults={
                "name": spec["name"],
                "category": category,
                "provider": provider,
                "description": spec["description"],
                "regulator_category": spec.get("regulator_category", ""),
                "minimum_amount": spec["minimum_amount"],
                "liquidity_level": spec["liquidity"],
                "risk_level": spec["risk"],
                "withdrawal_timeline": spec["withdrawal_timeline"],
                "fees_summary": spec["fees_summary"],
                "tax_notes": spec["tax_notes"],
                "beginner_mistakes": BEGINNER_MISTAKES,
                "documents_needed": DOCUMENTS_NEEDED,
                "execution_route_external": "Complete any investment directly with the regulated provider.",
                "disclosures": DISCLAIMER,
                "freshness_status": PP.FreshnessStatus.FRESH,
                "data_freshness": PP.DataFreshness.FRESH,
                "verification_status": PP.VerificationStatus.MANUALLY_REVIEWED,
                "audience": PP.Audience.FREE,
                "is_sponsored": False,
                "published_status": target_status,
                "status": target_status,
                "last_verified_at": timezone.now(),
                "editorial_notes": "seed:education-passports",
            },
        )
        ProductPassportVersion.objects.update_or_create(
            passport=passport,
            version_number=1,
            defaults={"content": {"name": passport.name, "audience": passport.audience}, "status": target_status},
        )
        created += 1 if was_created else 0
        updated += 0 if was_created else 1
    return created, updated


class Command(BaseCommand):
    help = "Reseed educational product passports (free-tier, no generic provider)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--publish", action="store_true")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        publish = options["publish"] and not dry_run
        mode = "DRY-RUN" if dry_run else ("PUBLISH" if publish else "DRAFT")
        self.stdout.write(self.style.MIGRATE_HEADING(f"Seeding education passports [{mode}]"))
        created, updated = run_seed(dry_run=dry_run, publish=publish)
        self.stdout.write(self.style.SUCCESS(f"  Passports created: {created}"))
        self.stdout.write(f"  Passports updated: {updated}")
        if dry_run:
            self.stdout.write(self.style.NOTICE("  Dry run - nothing written."))
