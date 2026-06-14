from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import ProductCategory, ProductPassport, ProductPassportVersion, Provider

CATEGORY_NAMES = [
    "Money Market Funds",
    "Treasury Bills",
    "Treasury Bonds",
    "SACCOs",
    "Chamas",
    "NSE Stocks",
    "US Stocks and ETFs",
    "Land",
    "REITs",
    "Bitcoin and Crypto Risk",
    "Fixed Deposits",
    "Pension Products",
]

PASSPORTS = [
    {
        "name": "Generic MMF",
        "category": "Money Market Funds",
        "minimum_amount": Decimal("1000.00"),
        "liquidity_level": ProductPassport.LiquidityLevel.HIGH,
        "risk_level": ProductPassport.RiskLevel.LOW,
        "withdrawal_timeline": "Often one to three business days, depending on provider processes.",
        "fees_summary": "Fund management and trustee fees may be reflected in quoted yields.",
        "tax_notes": "Withholding tax treatment can change; verify current treatment with a licensed professional.",
    },
    {
        "name": "Generic Treasury Bill via DhowCSD",
        "category": "Treasury Bills",
        "minimum_amount": Decimal("100000.00"),
        "liquidity_level": ProductPassport.LiquidityLevel.MEDIUM,
        "risk_level": ProductPassport.RiskLevel.LOW,
        "withdrawal_timeline": "Held to maturity unless sold through an available secondary route.",
        "fees_summary": "Auction and settlement costs may apply depending on channel.",
        "tax_notes": "Discount interest can be subject to withholding tax.",
    },
    {
        "name": "Generic SACCO Deposits",
        "category": "SACCOs",
        "minimum_amount": Decimal("500.00"),
        "liquidity_level": ProductPassport.LiquidityLevel.LOW,
        "risk_level": ProductPassport.RiskLevel.MODERATE,
        "withdrawal_timeline": "Withdrawals may require notice or member exit processes.",
        "fees_summary": "Membership fees, share capital rules, and loan-related charges may apply.",
        "tax_notes": "Dividends and rebates can have tax implications.",
    },
    {
        "name": "Generic NSE Shares",
        "category": "NSE Stocks",
        "minimum_amount": Decimal("1000.00"),
        "liquidity_level": ProductPassport.LiquidityLevel.MEDIUM,
        "risk_level": ProductPassport.RiskLevel.HIGH,
        "withdrawal_timeline": "Settlement timelines depend on broker and market rules.",
        "fees_summary": "Brokerage, statutory, and exchange fees may apply.",
        "tax_notes": "Dividends and capital activity can have tax consequences.",
    },
    {
        "name": "Generic US ETF route",
        "category": "US Stocks and ETFs",
        "minimum_amount": Decimal("5000.00"),
        "liquidity_level": ProductPassport.LiquidityLevel.MEDIUM,
        "risk_level": ProductPassport.RiskLevel.HIGH,
        "withdrawal_timeline": "Depends on offshore broker, FX provider, and bank settlement.",
        "fees_summary": "FX spreads, broker fees, custody fees, and transfer costs may apply.",
        "tax_notes": "Foreign withholding tax and local reporting rules may apply.",
    },
    {
        "name": "Generic Land Due Diligence Checklist",
        "category": "Land",
        "minimum_amount": None,
        "liquidity_level": ProductPassport.LiquidityLevel.LOW,
        "risk_level": ProductPassport.RiskLevel.HIGH,
        "withdrawal_timeline": "Illiquid; selling can take months or longer.",
        "fees_summary": "Legal, valuation, search, survey, stamp duty, and transfer costs may apply.",
        "tax_notes": "Land transactions can trigger taxes and statutory fees.",
    },
    {
        "name": "Generic Bitcoin Self-Custody Risk Card",
        "category": "Bitcoin and Crypto Risk",
        "minimum_amount": None,
        "liquidity_level": ProductPassport.LiquidityLevel.MEDIUM,
        "risk_level": ProductPassport.RiskLevel.VERY_HIGH,
        "withdrawal_timeline": "Depends on exchange, wallet custody, and network conditions.",
        "fees_summary": "Exchange fees, spreads, withdrawal fees, and network fees may apply.",
        "tax_notes": "Tax treatment and regulatory requirements can change.",
    },
]


class Command(BaseCommand):
    help = "Seed PesaRoute categories and generic product passports."

    def handle(self, *args, **options):
        categories: dict[str, ProductCategory] = {}
        for name in CATEGORY_NAMES:
            category, _created = ProductCategory.objects.update_or_create(
                slug=slugify(name),
                defaults={
                    "name": name,
                    "description": f"Educational overview for {name}.",
                    "status": ProductCategory.Status.ACTIVE,
                },
            )
            categories[name] = category

        provider, _created = Provider.objects.update_or_create(
            name="Generic educational provider",
            defaults={"regulator_category": "Educational placeholder", "status": Provider.Status.ACTIVE},
        )

        for data in PASSPORTS:
            passport, _created = ProductPassport.objects.update_or_create(
                slug=slugify(data["name"]),
                defaults={
                    "name": data["name"],
                    "category": categories[data["category"]],
                    "provider": provider,
                    "regulator_category": data["category"],
                    "minimum_amount": data["minimum_amount"],
                    "liquidity_level": data["liquidity_level"],
                    "risk_level": data["risk_level"],
                    "withdrawal_timeline": data["withdrawal_timeline"],
                    "fees_summary": data["fees_summary"],
                    "tax_notes": data["tax_notes"],
                    "beginner_mistakes": [
                        "Assuming past returns promise future outcomes.",
                        "Skipping provider and regulator checks.",
                    ],
                    "documents_needed": [
                        "National ID",
                        "KRA PIN",
                        "Bank or mobile money details if opening externally",
                    ],
                    "execution_route_external": (
                        "Compare options here, then complete any investment directly with the regulated provider."
                    ),
                    "disclosures": (
                        "Educational simulation only. We do not hold your money, "
                        "execute investments, or promise returns."
                    ),
                    "is_sponsored": False,
                    "status": ProductPassport.Status.PUBLISHED,
                },
            )
            ProductPassportVersion.objects.update_or_create(
                passport=passport,
                version_number=1,
                defaults={
                    "content": {"seeded": True, "name": passport.name},
                    "status": ProductPassport.Status.PUBLISHED,
                },
            )

        self.stdout.write(self.style.SUCCESS("Seeded PesaRoute catalog data."))
