from __future__ import annotations

# ruff: noqa: E501
import hashlib
from dataclasses import dataclass
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from catalog.models import ProductCategory, ProductPassport, ProductPassportVersion, Provider
from knowledge.models import (
    DataSource,
    GovernmentSecurityReference,
    InvestmentProductCategory,
    InvestmentProvider,
    ListedCompany,
    Regulator,
    SourceRecord,
    SourceReference,
)
from learning.content import EDUCATIONAL_DISCLAIMER, structured_lesson_content, sync_learning_sources
from learning.models import Flashcard, LearningCourse, LearningLesson, LearningResource, LearningTrack, QuizQuestion
from learning.services import ensure_default_badges

SEED_MARKER = "seed_kenya_investment_knowledge"
DISCLAIMER = EDUCATIONAL_DISCLAIMER


@dataclass(frozen=True)
class SourceSpec:
    slug: str
    name: str
    source_type: str
    homepage_url: str
    data_url: str
    update_frequency: str
    parser_strategy: str
    notes: str


SOURCES = [
    SourceSpec(
        slug="cma-licensee-register",
        name="Capital Markets Authority licensee register",
        source_type=DataSource.SourceType.REGULATOR,
        homepage_url="https://www.cma.or.ke/",
        data_url="https://licensees.cma.or.ke/",
        update_frequency=DataSource.UpdateFrequency.MONTHLY,
        parser_strategy=DataSource.ParserStrategy.HTML_TABLE,
        notes=(
            "Official CMA licensee/market-player register covering fund managers, CIS/unit trusts, investment "
            "advisers, stockbrokers, REIT categories, online forex categories, and other capital-market players."
        ),
    ),
    SourceSpec(
        slug="cbk-government-securities",
        name="Central Bank of Kenya government securities",
        source_type=DataSource.SourceType.GOVERNMENT,
        homepage_url="https://www.centralbank.go.ke/",
        data_url="https://www.centralbank.go.ke/securities/",
        update_frequency=DataSource.UpdateFrequency.WEEKLY,
        parser_strategy=DataSource.ParserStrategy.MANUAL,
        notes="Official CBK education and reference pages for Treasury bills, Treasury bonds, auctions, and DhowCSD.",
    ),
    SourceSpec(
        slug="dhowcsd-portal",
        name="DhowCSD investor portal",
        source_type=DataSource.SourceType.GOVERNMENT,
        homepage_url="https://dhowcsd.centralbank.go.ke/",
        data_url="https://dhowcsd.centralbank.go.ke/",
        update_frequency=DataSource.UpdateFrequency.AD_HOC,
        parser_strategy=DataSource.ParserStrategy.MANUAL,
        notes="Official DhowCSD portal for investor access to Kenyan government securities.",
    ),
    SourceSpec(
        slug="nse-listed-companies",
        name="Nairobi Securities Exchange listed companies",
        source_type=DataSource.SourceType.EXCHANGE,
        homepage_url="https://www.nse.co.ke/",
        data_url="https://www.nse.co.ke/listed-companies/",
        update_frequency=DataSource.UpdateFrequency.MONTHLY,
        parser_strategy=DataSource.ParserStrategy.HTML_TABLE,
        notes="Official NSE listed issuers page. Market data products can have license terms and fees.",
    ),
    SourceSpec(
        slug="nse-data-services",
        name="Nairobi Securities Exchange data services",
        source_type=DataSource.SourceType.EXCHANGE,
        homepage_url="https://www.nse.co.ke/",
        data_url="https://www.nse.co.ke/dataservices/nse-licensed-information-vendors/",
        update_frequency=DataSource.UpdateFrequency.AD_HOC,
        parser_strategy=DataSource.ParserStrategy.MANUAL,
        notes="Official NSE data-services reference for licensed information vendors and market-data usage policies.",
    ),
    SourceSpec(
        slug="sasra-licensed-saccos",
        name="SASRA licensed and authorised SACCOs",
        source_type=DataSource.SourceType.REGULATOR,
        homepage_url="https://www.sasra.go.ke/",
        data_url="https://www.sasra.go.ke/licensed-dt-saccos/",
        update_frequency=DataSource.UpdateFrequency.ANNUALLY,
        parser_strategy=DataSource.ParserStrategy.PDF,
        notes="Official SASRA list downloads for licensed and authorised SACCO societies.",
    ),
    SourceSpec(
        slug="rba-registered-fund-managers",
        name="Retirement Benefits Authority registered fund managers",
        source_type=DataSource.SourceType.REGULATOR,
        homepage_url="https://www.rba.go.ke/",
        data_url="https://www.rba.go.ke/registered-fund-managers/",
        update_frequency=DataSource.UpdateFrequency.QUARTERLY,
        parser_strategy=DataSource.ParserStrategy.PDF,
        notes="Official RBA downloads for registered fund managers and service providers in retirement benefits.",
    ),
    SourceSpec(
        slug="ira-entities-registry",
        name="Insurance Regulatory Authority entities registry",
        source_type=DataSource.SourceType.REGULATOR,
        homepage_url="https://ira.go.ke/",
        data_url="https://ira.go.ke/entities-registry/",
        update_frequency=DataSource.UpdateFrequency.ANNUALLY,
        parser_strategy=DataSource.ParserStrategy.MANUAL,
        notes="Official IRA registry area for insurance entities and intermediaries.",
    ),
    SourceSpec(
        slug="cdsc-kenya",
        name="Central Depository and Settlement Corporation Kenya",
        source_type=DataSource.SourceType.OTHER,
        homepage_url="https://cdsckenya.com/",
        data_url="https://cdsckenya.com/",
        update_frequency=DataSource.UpdateFrequency.AD_HOC,
        parser_strategy=DataSource.ParserStrategy.MANUAL,
        notes="Official CDSC reference for CDS account opening, custody, and settlement for listed securities.",
    ),
    SourceSpec(
        slug="kra-tax-education",
        name="Kenya Revenue Authority tax education",
        source_type=DataSource.SourceType.GOVERNMENT,
        homepage_url="https://www.kra.go.ke/",
        data_url="https://www.kra.go.ke/individual/filing-paying/types-of-taxes/individual-withholding-tax",
        update_frequency=DataSource.UpdateFrequency.AD_HOC,
        parser_strategy=DataSource.ParserStrategy.MANUAL,
        notes="Official KRA public tax education pages used only for tax-awareness prompts, not tax advice.",
    ),
]

REGULATORS = [
    (
        "Capital Markets Authority",
        "CMA",
        "https://www.cma.or.ke/",
        "Capital markets regulator for Kenya, including fund managers, collective investment schemes, advisers, brokers, REITs, and market intermediaries.",
    ),
    (
        "Central Bank of Kenya",
        "CBK",
        "https://www.centralbank.go.ke/",
        "Central bank and fiscal agent for Government of Kenya securities, including Treasury bills, Treasury bonds, and DhowCSD references.",
    ),
    (
        "Nairobi Securities Exchange",
        "NSE",
        "https://www.nse.co.ke/",
        "Securities exchange for listed issuers and official exchange market-data services.",
    ),
    (
        "Central Depository and Settlement Corporation",
        "CDSC",
        "https://cdsckenya.com/",
        "Central depository and settlement infrastructure for listed securities, CDS accounts, custody, and settlement.",
    ),
    (
        "Sacco Societies Regulatory Authority",
        "SASRA",
        "https://www.sasra.go.ke/",
        "Regulator for deposit-taking and specified non-withdrawable deposit-taking SACCO societies.",
    ),
    (
        "Retirement Benefits Authority",
        "RBA",
        "https://www.rba.go.ke/",
        "Regulator for retirement benefits schemes and registered service providers.",
    ),
    (
        "Insurance Regulatory Authority",
        "IRA",
        "https://ira.go.ke/",
        "Regulator for insurance companies and intermediaries.",
    ),
    (
        "Kenya Revenue Authority",
        "KRA",
        "https://www.kra.go.ke/",
        "Tax authority used by PesaRoute for general tax-awareness references only, not tax advice.",
    ),
]

CATEGORIES = [
    {
        "name": "Money Market Funds",
        "risk": InvestmentProductCategory.RiskLevel.MODERATE,
        "liquidity": InvestmentProductCategory.LiquidityLevel.HIGH,
        "minimum": Decimal("1000.00"),
        "source_slugs": ["cma-licensee-register"],
        "summary": "Used by many Kenyan beginners for emergency funds, short-term savings, and cash parking.",
        "notes": "Check fund manager licensing, fund documents, fees, withdrawal timing, trustee/custodian details, and whether the product is a CIS/unit trust.",
        "mistakes": [
            "Chasing the highest quoted yield only.",
            "Ignoring fees and tax treatment.",
            "Assuming returns are guaranteed.",
            "Not checking fund manager and regulatory status.",
        ],
    },
    {
        "name": "Treasury Bills",
        "risk": InvestmentProductCategory.RiskLevel.LOW,
        "liquidity": InvestmentProductCategory.LiquidityLevel.MEDIUM,
        "minimum": Decimal("50000.00"),
        "source_slugs": ["cbk-government-securities", "dhowcsd-portal"],
        "summary": "Short-term Government of Kenya securities with 91, 182, and 364-day tenors.",
        "notes": "Learn DhowCSD, auctions, discounted purchase price, value date, maturity, and tax before applying.",
        "mistakes": [
            "Using money needed before maturity.",
            "Confusing discount rate with net return.",
            "Ignoring auction timing and settlement instructions.",
        ],
    },
    {
        "name": "Treasury Bonds",
        "risk": InvestmentProductCategory.RiskLevel.MODERATE,
        "liquidity": InvestmentProductCategory.LiquidityLevel.LOW,
        "minimum": Decimal("50000.00"),
        "source_slugs": ["cbk-government-securities", "dhowcsd-portal"],
        "summary": "Medium to long-term Government of Kenya securities with coupon, yield, maturity, and secondary-market concepts.",
        "notes": "Understand interest-rate risk, coupon dates, maturity, and whether a beginner can exit before maturity.",
        "mistakes": [
            "Ignoring price movement when selling before maturity.",
            "Confusing coupon with total return.",
            "Treating long-term bonds as emergency money.",
        ],
    },
    {
        "name": "SACCOs",
        "risk": InvestmentProductCategory.RiskLevel.MODERATE,
        "liquidity": InvestmentProductCategory.LiquidityLevel.LOW,
        "minimum": None,
        "source_slugs": ["sasra-licensed-saccos"],
        "summary": "Member-owned cooperatives where deposits, share capital, dividends, rebates, and loan rules must be understood.",
        "notes": "Check SASRA status where relevant, bylaws, share capital, deposit rules, guarantor obligations, governance, and audited reports.",
        "mistakes": [
            "Treating deposits as instantly liquid.",
            "Ignoring guarantor risk.",
            "Not reading bylaws and exit timelines.",
        ],
    },
    {
        "name": "Chamas",
        "risk": InvestmentProductCategory.RiskLevel.MODERATE,
        "liquidity": InvestmentProductCategory.LiquidityLevel.MEDIUM,
        "minimum": None,
        "source_slugs": ["cma-licensee-register", "sasra-licensed-saccos"],
        "summary": "Group saving or investing arrangements where governance and written rules matter more than hype.",
        "notes": "Use minutes, contribution policy, signatory rules, investment policy, member exit rules, and independent due diligence for land or private deals.",
        "mistakes": [
            "No written investment policy.",
            "No minutes or approval trail.",
            "Pressure to invest in land without independent checks.",
        ],
    },
    {
        "name": "NSE Stocks",
        "risk": InvestmentProductCategory.RiskLevel.HIGH,
        "liquidity": InvestmentProductCategory.LiquidityLevel.MEDIUM,
        "minimum": None,
        "source_slugs": ["nse-listed-companies", "cdsc-kenya"],
        "summary": "Shares listed on the NSE can pay dividends or change in price, but they can also lose value.",
        "notes": "Understand CDS accounts, stockbrokers, settlement, diversification, company announcements, and why shares are not emergency money.",
        "mistakes": [
            "Buying because of tips or screenshots.",
            "Putting emergency money into volatile shares.",
            "Ignoring broker and CDS account checks.",
        ],
    },
    {
        "name": "US Stocks and ETFs",
        "risk": InvestmentProductCategory.RiskLevel.HIGH,
        "liquidity": InvestmentProductCategory.LiquidityLevel.MEDIUM,
        "minimum": None,
        "source_slugs": ["kra-tax-education"],
        "summary": "Global exposure can involve ETFs, individual stocks, USD/KES currency risk, foreign platform risk, and tax questions.",
        "notes": "Verify foreign broker regulation, custody, transfer fees, FX spreads, withholding tax, reporting obligations, and long-term horizon fit.",
        "mistakes": [
            "Ignoring FX spreads and transfer fees.",
            "Treating foreign access as automatically safer.",
            "Skipping tax and estate questions.",
        ],
    },
    {
        "name": "REITs",
        "risk": InvestmentProductCategory.RiskLevel.MODERATE,
        "liquidity": InvestmentProductCategory.LiquidityLevel.MEDIUM,
        "minimum": None,
        "source_slugs": ["cma-licensee-register", "nse-listed-companies"],
        "summary": "Real estate investment trusts expose investors to property income or assets without directly buying land.",
        "notes": "Check the REIT, trustee, manager, listing status, distributions, property risk, and trading liquidity.",
        "mistakes": [
            "Assuming listed property exposure cannot fall in price.",
            "Ignoring manager/trustee structure.",
            "Treating distributions as guaranteed.",
        ],
    },
    {
        "name": "Land",
        "risk": InvestmentProductCategory.RiskLevel.HIGH,
        "liquidity": InvestmentProductCategory.LiquidityLevel.LOW,
        "minimum": None,
        "source_slugs": ["kra-tax-education"],
        "summary": "Land can be illiquid and fraud-prone; due diligence comes before deposits.",
        "notes": "Use title search, survey and beacon checks, seller identity checks, lawyer review, valuation, tax/fee awareness, and pressure-sale caution.",
        "mistakes": [
            "Paying a deposit before independent verification.",
            "Trusting urgency or group pressure.",
            "Skipping lawyer and survey checks.",
        ],
    },
    {
        "name": "Bitcoin and Crypto Risk",
        "risk": InvestmentProductCategory.RiskLevel.VERY_HIGH,
        "liquidity": InvestmentProductCategory.LiquidityLevel.MEDIUM,
        "minimum": None,
        "source_slugs": ["kra-tax-education"],
        "summary": "Crypto assets can be highly volatile and operationally risky; they are not MMFs or Treasury bills.",
        "notes": "Learn volatility, self-custody, exchange risk, scams, tax uncertainty, and regulatory uncertainty before touching money.",
        "mistakes": [
            "Believing a bot cannot lose.",
            "Confusing wallet screenshots with proof.",
            "Treating crypto as low-risk savings.",
        ],
    },
    {
        "name": "Fixed Deposits",
        "risk": InvestmentProductCategory.RiskLevel.MODERATE,
        "liquidity": InvestmentProductCategory.LiquidityLevel.LOW,
        "minimum": None,
        "source_slugs": ["kra-tax-education"],
        "summary": "Bank fixed deposits can lock money for a term in exchange for agreed interest terms.",
        "notes": "Compare lock-in period, early withdrawal rules, interest rate basis, withholding tax, and bank terms.",
        "mistakes": [
            "Ignoring early withdrawal rules.",
            "Not comparing net return after tax.",
            "Locking emergency money.",
        ],
    },
    {
        "name": "Pension Products",
        "risk": InvestmentProductCategory.RiskLevel.MODERATE,
        "liquidity": InvestmentProductCategory.LiquidityLevel.LOCKED,
        "minimum": None,
        "source_slugs": ["rba-registered-fund-managers", "kra-tax-education"],
        "summary": "Retirement products are long-horizon vehicles with scheme rules, service providers, and regulatory context.",
        "notes": "Check RBA registration context, fund manager/custodian/administrator roles, fees, withdrawal rules, and tax treatment.",
        "mistakes": [
            "Treating retirement savings as short-term money.",
            "Not reading scheme rules.",
            "Ignoring provider roles and fees.",
        ],
    },
]

PASSPORTS = [
    (
        "Generic Money Market Fund",
        "Money Market Funds",
        "Good for emergency fund learning and short-term cash planning.",
        "Not ideal for guaranteed returns or money needed instantly.",
        "Often one to three business days, but provider rules vary.",
        "Fund management, trustee, custody, and administration costs may be reflected in net yield.",
        "CMA",
        ["National ID or passport", "KRA PIN", "Bank or mobile money details requested by provider"],
        [
            "What fund manager is licensed?",
            "What fees are charged?",
            "How long do withdrawals take?",
            "Who is trustee and custodian?",
        ],
        ["cma-licensee-register"],
    ),
    (
        "Treasury Bill via DhowCSD",
        "Treasury Bills",
        "Good for learning short-term government security auctions and maturity.",
        "Not ideal for money needed before maturity.",
        "Matures after 91, 182, or 364 days depending on tenor.",
        "Verify auction and settlement instructions from CBK/DhowCSD.",
        "CBK / DhowCSD",
        ["National ID or passport", "KRA PIN", "DhowCSD or CDS details", "Bank settlement details"],
        [
            "Which tenor fits my timeline?",
            "What is the purchase price?",
            "When is value date and maturity?",
            "What tax applies?",
        ],
        ["cbk-government-securities", "dhowcsd-portal"],
    ),
    (
        "Treasury Bond via DhowCSD",
        "Treasury Bonds",
        "Good for learning coupon, maturity, and long-term government security concepts.",
        "Not ideal for short-term emergency money or users who do not understand interest-rate risk.",
        "Maturity can run for years; secondary-market exit can involve price movement.",
        "Verify prospectus, coupon dates, and settlement instructions.",
        "CBK / DhowCSD",
        ["National ID or passport", "KRA PIN", "DhowCSD or CDS details", "Bank settlement details"],
        [
            "What coupon and maturity apply?",
            "What happens if I sell early?",
            "How often is interest paid?",
            "What tax applies?",
        ],
        ["cbk-government-securities", "dhowcsd-portal"],
    ),
    (
        "SACCO Deposits",
        "SACCOs",
        "Good for member savings discipline and learning SACCO rules.",
        "Not ideal where fast withdrawal is required.",
        "Withdrawal timelines depend on bylaws and exit procedures.",
        "Membership, deposits, loan, and account charges may apply.",
        "SASRA where regulated",
        ["Membership form", "National ID", "KRA PIN", "Joining fee or share capital proof"],
        [
            "Is the SACCO licensed or authorised?",
            "What are withdrawal rules?",
            "What are loan and guarantor obligations?",
            "Are audited accounts available?",
        ],
        ["sasra-licensed-saccos"],
    ),
    (
        "SACCO Share Capital",
        "SACCOs",
        "Good for understanding member ownership and dividend concepts.",
        "Not ideal for liquid emergency money.",
        "Share capital can be hard or slow to exit depending on rules.",
        "Joining, transfer, and member account fees may apply.",
        "SASRA where regulated",
        ["Membership form", "National ID", "KRA PIN", "Share capital payment evidence"],
        [
            "Can share capital be withdrawn or only transferred?",
            "What dividend history exists?",
            "What governance controls exist?",
        ],
        ["sasra-licensed-saccos"],
    ),
    (
        "Chama Investment Pool",
        "Chamas",
        "Good for structured group learning and collective planning.",
        "Not ideal without written rules, records, and conflict controls.",
        "Liquidity depends on group policy and asset choices.",
        "Bank, legal, recordkeeping, and transaction costs can apply.",
        "Group governance / product-specific regulator",
        ["Group minutes", "Contribution records", "Bank mandate", "Investment policy"],
        [
            "Who approves investments?",
            "How are exits handled?",
            "What documents prove ownership?",
            "What happens if members disagree?",
        ],
        ["sasra-licensed-saccos", "cma-licensee-register"],
    ),
    (
        "NSE Shares",
        "NSE Stocks",
        "Good for learning listed equity ownership, dividends, volatility, and diversification.",
        "Not ideal for emergency money or short-term certainty.",
        "Market liquidity varies by counter and market conditions.",
        "Brokerage, exchange, statutory, and settlement costs may apply.",
        "NSE / CMA / CDSC",
        ["CDS account", "National ID", "KRA PIN", "Broker onboarding documents"],
        [
            "Is the broker licensed?",
            "What company risk am I taking?",
            "Can I tolerate price falls?",
            "Am I diversified?",
        ],
        ["nse-listed-companies", "cdsc-kenya"],
    ),
    (
        "US ETF Route",
        "US Stocks and ETFs",
        "Good for learning diversification, FX, custody, and long-term global exposure concepts.",
        "Not ideal for users who do not understand currency, foreign broker, and tax risk.",
        "Broker and transfer liquidity vary; FX and bank settlement add delay.",
        "FX spreads, broker fees, custody fees, and transfer charges can apply.",
        "Foreign broker and tax checks",
        ["Identity verification", "Tax details", "Source-of-funds details", "Broker onboarding documents"],
        [
            "Is the broker regulated?",
            "What FX spread applies?",
            "What withholding tax applies?",
            "How is custody handled?",
        ],
        ["kra-tax-education"],
    ),
    (
        "REIT Exposure",
        "REITs",
        "Good for learning listed/property exposure and distribution concepts.",
        "Not ideal when property risk or market liquidity is not understood.",
        "Liquidity depends on listing/trading and REIT structure.",
        "Brokerage, trust, manager, and statutory costs may apply.",
        "CMA / NSE",
        ["CDS account if listed", "National ID", "KRA PIN", "Broker onboarding documents"],
        [
            "Who is manager and trustee?",
            "Is it listed?",
            "How are distributions decided?",
            "What property risks exist?",
        ],
        ["cma-licensee-register", "nse-listed-companies"],
    ),
    (
        "Land Due Diligence Checklist",
        "Land",
        "Good for learning what to verify before a land deposit.",
        "Not ideal for quick liquidity or decisions based on pressure.",
        "Selling land can take months or longer.",
        "Search, survey, valuation, legal, stamp duty, and transfer costs may apply.",
        "Land registry / KRA tax awareness",
        ["Title document", "Seller ID", "Official search", "Survey map", "Sale agreement reviewed by lawyer"],
        [
            "Has an independent title search been done?",
            "Has a surveyor verified boundaries?",
            "Has a lawyer reviewed documents?",
            "What taxes and fees apply?",
        ],
        ["kra-tax-education"],
    ),
    (
        "Bitcoin Self-Custody Risk Card",
        "Bitcoin and Crypto Risk",
        "Good for learning volatility, custody, and scam risk before exposure.",
        "Not ideal as emergency savings, guaranteed income, or low-risk investment.",
        "Liquidity depends on exchanges, wallets, network conditions, and regulation.",
        "Exchange, spread, withdrawal, wallet, and network fees may apply.",
        "Regulatory and tax uncertainty",
        ["Exchange KYC if applicable", "Wallet recovery procedure", "Tax records"],
        [
            "Who controls the private keys?",
            "What if the platform fails?",
            "Can I handle a large price fall?",
            "Is this actually a scam pitch?",
        ],
        ["kra-tax-education"],
    ),
    (
        "Fixed Deposit",
        "Fixed Deposits",
        "Good for learning lock-in savings and agreed interest terms.",
        "Not ideal for money needed before term ends.",
        "Funds are commonly locked for the agreed term; early withdrawal rules vary.",
        "Bank fees and withholding tax can affect net return.",
        "Bank terms / KRA tax awareness",
        ["National ID", "KRA PIN", "Bank account details"],
        [
            "What is the early withdrawal rule?",
            "Is interest quoted gross or net?",
            "What is the term?",
            "What happens at maturity?",
        ],
        ["kra-tax-education"],
    ),
    (
        "Pension/Retirement Product",
        "Pension Products",
        "Good for long-term retirement planning education.",
        "Not ideal for short-term liquidity.",
        "Access is governed by scheme and retirement-benefit rules.",
        "Administration, fund management, custody, and advisory costs can apply.",
        "RBA / KRA tax awareness",
        ["Scheme forms", "National ID", "KRA PIN", "Beneficiary details"],
        [
            "Is the provider registered?",
            "What fees apply?",
            "What are withdrawal rules?",
            "What tax treatment applies?",
        ],
        ["rba-registered-fund-managers", "kra-tax-education"],
    ),
]

LEARNING_TRACKS = [
    (
        "Money Foundations",
        LearningTrack.TargetUserType.GENERAL,
        45,
        False,
        [
            "Why financial access is not the same as financial health",
            "Emergency fund basics",
            "Risk vs return",
            "Liquidity explained",
            "Why promised high payouts are dangerous",
        ],
    ),
    (
        "First Salary Money Plan",
        LearningTrack.TargetUserType.FIRST_JOBBER,
        40,
        False,
        [
            "First salary mistakes",
            "Budget buckets",
            "Emergency fund before risky investing",
            "Black tax planning basics",
            "First KES 10,000 route exercise",
        ],
    ),
    (
        "Money Market Funds",
        LearningTrack.TargetUserType.GENERAL,
        45,
        False,
        [
            "What is an MMF?",
            "Why highest yield is not always best",
            "Fees, withdrawal time, and regulation",
            "MMF simulator practice",
            "Journal prompt: Why am I choosing an MMF?",
        ],
    ),
    (
        "Treasury Bills and Bonds",
        LearningTrack.TargetUserType.GENERAL,
        55,
        False,
        [
            "What is a T-bill?",
            "91, 182, and 364-day tenors",
            "What is a bond coupon?",
            "What is DhowCSD?",
            "T-bill simulator practice",
        ],
    ),
    (
        "SACCO Smart Member",
        LearningTrack.TargetUserType.CHAMA_MEMBER,
        45,
        False,
        [
            "Deposits vs share capital",
            "Loan multiplier",
            "Guarantor risk",
            "Checking SACCO status",
            "SACCO simulator practice",
        ],
    ),
    (
        "Chama Investment Basics",
        LearningTrack.TargetUserType.CHAMA_MEMBER,
        45,
        False,
        [
            "Chama governance",
            "Contribution discipline",
            "Investment policy",
            "Land due diligence for chamas",
            "Voting and minutes",
        ],
    ),
    (
        "NSE Stocks for Beginners",
        LearningTrack.TargetUserType.GENERAL,
        50,
        False,
        [
            "What is a share?",
            "Dividends and capital gains",
            "CDS account basics",
            "Why diversification matters",
            "Why stocks are not emergency funds",
        ],
    ),
    (
        "Global Stocks and ETFs",
        LearningTrack.TargetUserType.DIASPORA,
        60,
        True,
        [
            "What is an ETF?",
            "Individual stocks vs ETFs",
            "USD/KES currency risk",
            "Platform/custody risk",
            "Global route simulator practice",
        ],
    ),
    (
        "Land Due Diligence Basics",
        LearningTrack.TargetUserType.GENERAL,
        50,
        True,
        [
            "Land is not liquid",
            "Before deposit checklist",
            "Title, survey, lawyer basics",
            "Pressure tactics",
            "Journal prompt",
        ],
    ),
    (
        "Scam Defense",
        LearningTrack.TargetUserType.GENERAL,
        40,
        False,
        [
            "Promised high payouts",
            "Recruitment schemes",
            "Fake forex/crypto bots",
            "Pressure to send deposit",
            "Scam checker practice",
        ],
    ),
    (
        "Diaspora Investing in Kenya",
        LearningTrack.TargetUserType.DIASPORA,
        45,
        True,
        [
            "Why diaspora investors need verification",
            "MMF/T-bill/SACCO/land comparison",
            "Professional review",
            "Document vault concept",
        ],
    ),
    (
        "Farmer Seasonal Money Plan",
        LearningTrack.TargetUserType.FARMER,
        35,
        False,
        ["Seasonal income", "Keeping money liquid", "SACCO/chama education", "Input costs and school fees planning"],
    ),
    (
        "Jua Kali Daily Income Plan",
        LearningTrack.TargetUserType.JUA_KALI,
        35,
        False,
        ["Daily income buckets", "Business reinvestment", "Emergency buffer", "Avoiding expensive debt"],
    ),
]

GLOSSARY = [
    ("liquidity", "How quickly and predictably money can be accessed without breaking the plan."),
    ("risk", "The chance of loss, delay, volatility, fraud, or an outcome worse than expected."),
    ("return", "Money earned or lost from an investment after costs and taxes."),
    ("diversification", "Spreading exposure so one provider, asset, or event does not carry the whole plan."),
    ("fund manager", "A licensed firm or person responsible for investing fund assets according to fund documents."),
    ("custodian", "An institution that holds assets or records for safekeeping under the product structure."),
    ("trustee", "A party with oversight duties for certain collective structures."),
    ("unit trust", "A pooled investment scheme where investors hold units in the fund."),
    ("MMF", "Money market fund; a pooled fund that usually focuses on short-term instruments."),
    ("Treasury bill", "A short-term government security sold at a discount and redeemed at face value on maturity."),
    ("Treasury bond", "A government security with a longer maturity and usually periodic coupon payments."),
    ("coupon", "Scheduled interest paid by many bonds."),
    ("yield", "A return measure that must be interpreted with price, costs, tax, and timing."),
    ("maturity", "The date when a security is due to be repaid or redeemed."),
    ("DhowCSD", "CBK's government securities investor portal and mobile application route."),
    (
        "CDS account",
        "An account used to hold securities electronically for listed securities or government securities contexts.",
    ),
    ("CDSC", "Central Depository and Settlement Corporation for listed securities custody and settlement."),
    ("NSE", "Nairobi Securities Exchange."),
    ("SACCO share capital", "Member ownership capital that may not be as liquid as deposits."),
    ("SACCO deposits", "Member savings/deposit balances governed by SACCO rules."),
    ("dividend", "Distribution paid to shareholders or members when declared under applicable rules."),
    ("interest rebate", "A SACCO-related return concept often linked to member deposits or loan interest rules."),
    ("guarantor", "A person who agrees to support another member's loan obligation."),
    ("chama", "A group savings or investment arrangement requiring clear governance and records."),
    ("REIT", "Real estate investment trust, a structure for property exposure."),
    ("ETF", "Exchange-traded fund, often used for diversified market exposure."),
    ("currency risk", "Risk that exchange-rate movement changes the value of an investment or transfer."),
    ("withholding tax", "Tax deducted at source for some payments, depending on law and status."),
    ("capital gain", "Gain from selling an asset above its adjusted cost, subject to tax rules where applicable."),
    ("scam red flag", "A warning sign that an offer may be unsafe or fraudulent."),
    ("due diligence", "Independent checks before committing money or signing documents."),
    ("regulator", "Public authority responsible for oversight of a sector or activity."),
]

ROUTE_CARDS = [
    (
        "KES 1k-5k first investment route",
        "Start with learning, an emergency buffer, and scam checks before comparing products.",
    ),
    ("KES 5k-20k beginner route", "Compare MMF, savings, and learning routes while keeping amounts as ranges."),
    (
        "KES 20k-100k emergency fund route",
        "Prioritise liquidity, withdrawal timing, and provider checks before chasing yield.",
    ),
    (
        "KES 100k-500k T-bill/MMF comparison route",
        "Compare maturity, liquidity, tax, and auction timing before choosing a route.",
    ),
    (
        "Global investing from Kenya route",
        "Learn FX, custody, broker regulation, transfer costs, tax, and long horizon first.",
    ),
    (
        "SACCO/chama route",
        "Check governance, bylaws, contribution rules, and exit terms before committing group or member money.",
    ),
    ("Land due diligence route", "Use title, survey, lawyer, seller identity, and tax checks before any deposit."),
    (
        "Diaspora route",
        "Verify providers from official sources and use professional review for document-heavy decisions.",
    ),
]

SCAM_FLAGS = [
    (
        "guaranteed high returns",
        "Legitimate investments carry risk; guaranteed high-return language is a major warning sign.",
    ),
    (
        "monthly returns above normal market claims",
        "Very high fixed monthly claims need independent verification and usually signal danger.",
    ),
    (
        "recruitment/referral requirement",
        "Returns driven by recruiting others can indicate pyramid or Ponzi-like risk.",
    ),
    ("pressure to send money quickly", "Urgency reduces verification time and increases fraud risk."),
    ("no clear regulator", "A real provider should explain the relevant regulator or why regulation does not apply."),
    ("no named custodian/trustee", "Missing custody or oversight details are unsafe for pooled products."),
    ("unclear withdrawal terms", "If exit rules are vague, the user may not recover money when needed."),
    ("refusal to share documents", "A provider that avoids documents should not receive money."),
    ("fake screenshots/testimonials", "Screenshots and testimonials are not proof of regulated activity."),
    ("land doubling claims", "Land value claims need independent valuation and legal verification."),
    ("forex/crypto bot cannot lose", "No trading bot can truthfully promise no losses."),
    ("celebrity/influencer-only proof", "Influencer promotion is not licensing or due diligence."),
    (
        "WhatsApp-only investment scheme",
        "WhatsApp-only onboarding without official documents and verification is a red flag.",
    ),
]

LISTED_COMPANY_SAMPLES = [
    ("KCB Group Ltd", "KCB", "KE0000000315", "Banking"),
    ("NCBA Group PLC", "NCBA", "KE0000000406", "Banking"),
    ("Equity Group Holdings", "EQTY", "KE0000000554", "Banking"),
    ("The Co-operative Bank of Kenya Ltd", "COOP", "KE1000001568", "Banking"),
    ("Safaricom PLC", "SCOM", "KE1000001402", "Telecommunication and Technology"),
    ("East African Breweries Ltd", "EABL", "KE0000000216", "Manufacturing and Allied"),
    ("Nairobi Securities Exchange Ltd", "NSE", "KE3000009674", "Investment Services"),
    ("Laptrust Imara I-REIT", "LAPR", "KE9100008870", "Real Estate Investment Trust"),
]


def content_hash(payload: dict) -> str:
    return hashlib.sha256(repr(sorted(payload.items())).encode("utf-8")).hexdigest()


def get_or_update_reference(source: DataSource, title: str, url: str, notes: str) -> tuple[SourceReference, bool]:
    now = timezone.now()
    reference = SourceReference.objects.filter(source=source, title=title, url=url).first()
    defaults = {
        "retrieved_at": now,
        "citation_label": f"PesaRoute seed: {title}",
        "notes": notes,
    }
    if reference:
        for field, value in defaults.items():
            setattr(reference, field, value)
        reference.save(update_fields=[*defaults.keys()])
        return reference, False
    return SourceReference.objects.create(source=source, title=title, url=url, **defaults), True


def lesson_type_for(title: str) -> str:
    lowered = title.lower()
    if "quiz" in lowered or "risk vs return" in lowered:
        return LearningLesson.LessonType.QUIZ
    if "flashcard" in lowered:
        return LearningLesson.LessonType.FLASHCARD
    if "simulator" in lowered:
        return LearningLesson.LessonType.SIMULATION
    if "journal" in lowered:
        return LearningLesson.LessonType.JOURNAL_PROMPT
    if "checklist" in lowered or "checking" in lowered:
        return LearningLesson.LessonType.CHECKLIST
    if "professional review" in lowered:
        return LearningLesson.LessonType.PROFESSIONAL_REVIEW_PROMPT
    return LearningLesson.LessonType.ARTICLE


class Command(BaseCommand):
    help = "Seed curated Kenyan investment knowledge, product passports, learning content, and source references."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Build the seed plan and roll it back.")
        parser.add_argument(
            "--reset-safe-demo-data",
            action="store_true",
            help="Remove safe seed-owned catalog passports, source records, and generic providers before reseeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        reset_safe_demo_data = options["reset_safe_demo_data"]
        counters = {
            "sources": 0,
            "references": 0,
            "regulators": 0,
            "categories": 0,
            "passports": 0,
            "providers": 0,
            "listed_companies": 0,
            "government_security_refs": 0,
            "tracks": 0,
            "lessons": 0,
            "resources": 0,
            "source_records": 0,
        }

        if reset_safe_demo_data:
            ProductPassport.objects.filter(editorial_notes__contains=SEED_MARKER).delete()
            Provider.objects.filter(editorial_notes__contains=SEED_MARKER).delete()
            SourceRecord.objects.filter(source_record_key__startswith=f"{SEED_MARKER}:").delete()

        sources = {}
        references = {}
        for spec in SOURCES:
            source, created = DataSource.objects.update_or_create(
                slug=spec.slug,
                defaults={
                    "name": spec.name,
                    "source_type": spec.source_type,
                    "authority_level": DataSource.AuthorityLevel.OFFICIAL,
                    "homepage_url": spec.homepage_url,
                    "data_url": spec.data_url,
                    "robots_notes": "Curated manual seeding only; do not scrape aggressively.",
                    "license_notes": "Store source links and paraphrased educational summaries; do not redistribute restricted data.",
                    "update_frequency": spec.update_frequency,
                    "parser_strategy": spec.parser_strategy,
                    "is_active": True,
                    "last_checked_at": timezone.now(),
                    "last_success_at": timezone.now(),
                },
            )
            counters["sources"] += int(created)
            sources[spec.slug] = source
            reference, reference_created = get_or_update_reference(source, spec.name, spec.data_url, spec.notes)
            references[spec.slug] = reference
            counters["references"] += int(reference_created)

        regulators = {}
        for name, abbreviation, website, description in REGULATORS:
            regulator, created = Regulator.objects.update_or_create(
                abbreviation=abbreviation,
                defaults={"name": name, "website": website, "description": description},
            )
            regulators[abbreviation] = regulator
            counters["regulators"] += int(created)

        catalog_categories = {}
        knowledge_categories = {}
        for category in CATEGORIES:
            slug = slugify(category["name"])
            source_refs = [references[source_slug] for source_slug in category["source_slugs"]]
            catalog_category, created = ProductCategory.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": category["name"],
                    "description": (
                        f"{category['summary']} Beginner mistakes: {'; '.join(category['mistakes'])}. {DISCLAIMER}"
                    ),
                    "status": ProductCategory.Status.ACTIVE,
                },
            )
            counters["categories"] += int(created)
            catalog_categories[category["name"]] = catalog_category

            knowledge_category, created = InvestmentProductCategory.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": category["name"],
                    "description": f"{category['summary']} {category['notes']}",
                    "risk_level_default": category["risk"],
                    "liquidity_level_default": category["liquidity"],
                    "beginner_summary": category["summary"],
                    "regulatory_notes": category["notes"],
                    "typical_minimum_amount": category["minimum"],
                },
            )
            knowledge_category.source_references.set(source_refs)
            knowledge_categories[category["name"]] = knowledge_category

        catalog_provider, created = Provider.objects.update_or_create(
            name="Generic educational provider",
            defaults={
                "slug": "generic-educational-provider",
                "regulator_category": "Educational placeholder",
                "regulator_status": "Not a regulated investment provider",
                "public_source_url": "https://www.pesaroute.local/education",
                "data_freshness": Provider.DataFreshness.ACCEPTABLE,
                "verification_status": Provider.VerificationStatus.MANUALLY_REVIEWED,
                "published_status": Provider.PublishedStatus.PUBLISHED,
                "editorial_notes": SEED_MARKER,
                "status": Provider.Status.ACTIVE,
            },
        )
        counters["providers"] += int(created)

        official_providers = [
            (
                "DhowCSD Portal",
                "dhowcsd-portal",
                InvestmentProvider.ProviderType.GOVERNMENT_PLATFORM,
                "CBK",
                "Official portal reference",
            ),
            (
                "Nairobi Securities Exchange",
                "nse-listed-companies",
                InvestmentProvider.ProviderType.EXCHANGE,
                "CMA",
                "Official exchange reference",
            ),
            (
                "Central Depository and Settlement Corporation",
                "cdsc-kenya",
                InvestmentProvider.ProviderType.OTHER,
                "CMA",
                "Official depository reference",
            ),
        ]
        for name, source_slug, provider_type, regulator_abbrev, license_status in official_providers:
            provider, created = InvestmentProvider.objects.update_or_create(
                slug=slugify(name),
                defaults={
                    "name": name,
                    "provider_type": provider_type,
                    "regulator": regulators.get(regulator_abbrev),
                    "license_status": license_status,
                    "website": sources[source_slug].homepage_url,
                    "last_verified_at": timezone.now(),
                    "published_status": InvestmentProvider.PublishedStatus.PUBLISHED,
                },
            )
            provider.source_references.set([references[source_slug]])
            counters["providers"] += int(created)

        for passport_data in PASSPORTS:
            (
                name,
                category_name,
                good_for,
                not_ideal_for,
                withdrawal_timeline,
                fees_summary,
                regulator_category,
                documents,
                questions,
                source_slugs,
            ) = passport_data
            category = next(item for item in CATEGORIES if item["name"] == category_name)
            source_refs = [references[source_slug] for source_slug in source_slugs]
            description = f"What it is: {category['summary']} Good for: {good_for} Not ideal for: {not_ideal_for}"
            passport, created = ProductPassport.objects.update_or_create(
                slug=slugify(name),
                defaults={
                    "name": name,
                    "category": catalog_categories[category_name],
                    "provider": catalog_provider,
                    "description": description,
                    "regulator_category": regulator_category,
                    "regulator_status": "Verify current status from official source before acting.",
                    "minimum_amount": category["minimum"],
                    "liquidity_level": category["liquidity"],
                    "risk_level": category["risk"],
                    "withdrawal_timeline": withdrawal_timeline,
                    "fees_summary": fees_summary,
                    "tax_notes": "Tax treatment can change. Use KRA/public tax references for awareness and consult a tax professional when needed.",
                    "beginner_mistakes": category["mistakes"],
                    "documents_needed": documents,
                    "execution_route_external": (
                        f"Learn and compare in PesaRoute, then verify directly with official sources or licensed providers. Questions to ask: {'; '.join(questions)}"
                    ),
                    "disclosures": DISCLAIMER,
                    "public_source_url": source_refs[0].url if source_refs else "",
                    "last_verified_at": timezone.now(),
                    "data_freshness": ProductPassport.DataFreshness.ACCEPTABLE,
                    "verification_status": ProductPassport.VerificationStatus.MANUALLY_REVIEWED,
                    "published_status": ProductPassport.Status.PUBLISHED,
                    "editorial_notes": SEED_MARKER,
                    "is_sponsored": False,
                    "status": ProductPassport.Status.PUBLISHED,
                },
            )
            passport.source_references.set(source_refs)
            ProductPassportVersion.objects.update_or_create(
                passport=passport,
                version_number=1,
                defaults={
                    "content": {
                        "seeded_by": SEED_MARKER,
                        "good_for": good_for,
                        "not_ideal_for": not_ideal_for,
                        "questions_to_ask": questions,
                        "source_urls": [reference.url for reference in source_refs],
                    },
                    "status": ProductPassport.Status.PUBLISHED,
                },
            )
            counters["passports"] += int(created)

        for security_type, tenor_days in [
            (GovernmentSecurityReference.SecurityType.TREASURY_BILL, 91),
            (GovernmentSecurityReference.SecurityType.TREASURY_BILL, 182),
            (GovernmentSecurityReference.SecurityType.TREASURY_BILL, 364),
            (GovernmentSecurityReference.SecurityType.TREASURY_BOND, None),
        ]:
            reference, created = GovernmentSecurityReference.objects.update_or_create(
                security_type=security_type,
                tenor_days=tenor_days,
                issue_number=f"{SEED_MARKER}:{security_type}:{tenor_days or 'bond'}",
                defaults={
                    "source_reference": references["cbk-government-securities"],
                    "status": "Educational tenor reference. Verify live auction details on CBK before acting.",
                },
            )
            counters["government_security_refs"] += int(created)

        nse_reference = references["nse-listed-companies"]
        for name, symbol, isin, sector in LISTED_COMPANY_SAMPLES:
            _company, created = ListedCompany.objects.update_or_create(
                symbol=symbol,
                defaults={
                    "name": name,
                    "isin": isin,
                    "sector": sector,
                    "listing_segment": "",
                    "source_reference": nse_reference,
                    "last_verified_at": timezone.now(),
                    "published_status": ListedCompany.PublishedStatus.PUBLISHED,
                },
            )
            counters["listed_companies"] += int(created)

        ensure_default_badges()
        catalog_category_by_first_word = {
            category.name.split()[0].lower(): category for category in catalog_categories.values()
        }
        for order, (track_title, target_user_type, minutes, is_premium, lessons) in enumerate(LEARNING_TRACKS, start=1):
            track_slug = slugify(track_title)
            track, created = LearningTrack.objects.update_or_create(
                slug=track_slug,
                defaults={
                    "title": track_title,
                    "description": (
                        f"Kenya-first learning track for {track_title.lower()}. For education only; compare before committing money."
                    ),
                    "level": LearningTrack.Level.BEGINNER if not is_premium else LearningTrack.Level.INTERMEDIATE,
                    "target_user_type": target_user_type,
                    "estimated_minutes": minutes,
                    "is_premium": is_premium,
                    "status": LearningTrack.Status.PUBLISHED,
                    "order": order,
                },
            )
            counters["tracks"] += int(created)
            course, _created = LearningCourse.objects.update_or_create(
                slug=f"{track_slug}-core",
                defaults={
                    "track": track,
                    "title": f"{track_title}: Core route",
                    "description": "Short lessons connect reading, practice, simulation, journaling, and review.",
                    "order": 1,
                    "estimated_minutes": minutes,
                    "is_premium": is_premium,
                    "status": LearningCourse.Status.PUBLISHED,
                },
            )
            if LearningLesson.objects.filter(
                course=course,
                reviewer_notes__startswith="content-pack:kenya-investment-lessons",
            ).exists():
                continue
            for lesson_order, lesson_title in enumerate(lessons, start=1):
                lesson_type = lesson_type_for(lesson_title)
                content = structured_lesson_content(lesson_title, track.title, lesson_type)
                lesson, created = LearningLesson.objects.update_or_create(
                    course=course,
                    order=lesson_order,
                    defaults={
                        "title": lesson_title,
                        "slug": slugify(lesson_title),
                        "lesson_type": lesson_type,
                        "body": content["body"],
                        "summary": content["summary"],
                        "structured_content": content["structured_content"],
                        "estimated_minutes": content["estimated_minutes"],
                        "difficulty": content["difficulty"],
                        "xp_reward": (
                            15
                            if lesson_type in {LearningLesson.LessonType.QUIZ, LearningLesson.LessonType.SIMULATION}
                            else 10
                        ),
                        "is_premium": is_premium,
                        "status": LearningLesson.Status.PUBLISHED,
                        "editorial_status": content["editorial_status"],
                        "last_reviewed_at": content["last_reviewed_at"],
                        "next_review_due_at": content["next_review_due_at"],
                        "reviewer_notes": content["reviewer_notes"],
                    },
                )
                sync_learning_sources(lesson, content["source_keys"])
                counters["lessons"] += int(created)
                if lesson_type == LearningLesson.LessonType.QUIZ:
                    QuizQuestion.objects.update_or_create(
                        lesson=lesson,
                        prompt="Which PesaRoute action is safest before sending money?",
                        defaults={
                            "options": [
                                "Send money quickly before the offer closes",
                                "Compare risk, liquidity, fees, provider status, and documents",
                                "Trust screenshots if returns look high",
                                "Share an M-Pesa PIN for faster verification",
                            ],
                            "correct_answer": "Compare risk, liquidity, fees, provider status, and documents",
                            "explanation": "PesaRoute rewards learning behavior, not risky action.",
                            "difficulty": QuizQuestion.Difficulty.EASY,
                        },
                    )
                if lesson_order == 1 or lesson_type == LearningLesson.LessonType.FLASHCARD:
                    Flashcard.objects.update_or_create(
                        lesson=lesson,
                        front=f"What should you verify for {lesson_title.lower()}?",
                        defaults={
                            "back": "Goal fit, risk, liquidity, fees, provider/regulator status, documents, and pressure signals.",
                            "example": "Keep the amount as a range until you are comfortable sharing exact details.",
                            "tag": track_slug,
                        },
                    )

            matching_category = catalog_category_by_first_word.get(track_title.split()[0].lower())
            resource, created = LearningResource.objects.update_or_create(
                title=f"{track_title} source-aware checklist",
                defaults={
                    "resource_type": LearningResource.ResourceType.CHECKLIST,
                    "body": (
                        "Use this checklist before money moves. Confirm official or provider source links, compare fees, "
                        f"liquidity, documents, and downside scenarios, then keep private notes. {DISCLAIMER}"
                    ),
                    "structured_content": [
                        {"type": "heading", "text": f"{track_title} source-aware checklist"},
                        {
                            "type": "checklist",
                            "title": "Before money moves",
                            "items": [
                                "Check whether an official regulator, exchange, government, or provider source exists.",
                                "Write the liquidity rule in plain language.",
                                "List fees, tax questions, documents, and what can go wrong.",
                                "Use a private journal entry before sharing exact amounts.",
                            ],
                        },
                        {"type": "disclaimer", "text": DISCLAIMER},
                    ],
                    "related_track": track,
                    "related_product_category": matching_category,
                    "is_premium": is_premium,
                    "status": LearningResource.Status.PUBLISHED,
                    "editorial_status": LearningResource.EditorialStatus.REVIEWED,
                },
            )
            sync_learning_sources(resource, ["pesaroute_editorial"])
            counters["resources"] += int(created)

        editorial_source = sources["cma-licensee-register"]
        for term, definition in GLOSSARY:
            resource, created = LearningResource.objects.update_or_create(
                title=f"Glossary: {term}",
                defaults={
                    "resource_type": LearningResource.ResourceType.GLOSSARY,
                    "body": f"{definition} Editorial educational content. {DISCLAIMER}",
                    "structured_content": [
                        {"type": "definition", "term": term, "text": definition},
                        {
                            "type": "scenario",
                            "title": "Kenyan example",
                            "text": f"A PesaRoute learner sees '{term}' while comparing a route and writes what it means before money moves.",
                        },
                        {"type": "disclaimer", "text": DISCLAIMER},
                    ],
                    "is_premium": False,
                    "status": LearningResource.Status.PUBLISHED,
                    "editorial_status": LearningResource.EditorialStatus.REVIEWED,
                },
            )
            sync_learning_sources(resource, ["pesaroute_editorial"])
            counters["resources"] += int(created)
            payload = {"term": term, "definition": definition}
            _record, created = SourceRecord.objects.update_or_create(
                source=editorial_source,
                source_record_key=f"{SEED_MARKER}:glossary:{slugify(term)}",
                defaults={
                    "source_record_type": SourceRecord.RecordType.LEARNING_REFERENCE,
                    "raw_payload": payload,
                    "normalized_payload": payload,
                    "content_hash": content_hash(payload),
                    "status": SourceRecord.Status.UNCHANGED,
                    "review_status": SourceRecord.ReviewStatus.APPROVED,
                },
            )
            counters["source_records"] += int(created)

        for route_title, route_body in ROUTE_CARDS:
            payload = {
                "title": route_title,
                "body": f"{route_body} Learn first, compare, understand risks, and speak to a licensed professional if needed.",
                "avoid": ["invest here", "this is best", "guaranteed", "recommended allocation"],
            }
            _record, created = SourceRecord.objects.update_or_create(
                source=editorial_source,
                source_record_key=f"{SEED_MARKER}:route-card:{slugify(route_title)}",
                defaults={
                    "source_record_type": SourceRecord.RecordType.LEARNING_REFERENCE,
                    "raw_payload": payload,
                    "normalized_payload": payload,
                    "content_hash": content_hash(payload),
                    "status": SourceRecord.Status.UNCHANGED,
                    "review_status": SourceRecord.ReviewStatus.APPROVED,
                },
            )
            counters["source_records"] += int(created)

        for phrase, reason in SCAM_FLAGS:
            payload = {
                "phrase": phrase,
                "reason": reason,
                "questions_to_ask": [
                    "Which regulator applies?",
                    "Can I verify this through an official channel?",
                    "What documents prove the terms?",
                ],
            }
            _record, created = SourceRecord.objects.update_or_create(
                source=editorial_source,
                source_record_key=f"{SEED_MARKER}:scam-red-flag:{slugify(phrase)}",
                defaults={
                    "source_record_type": SourceRecord.RecordType.LEARNING_REFERENCE,
                    "raw_payload": payload,
                    "normalized_payload": payload,
                    "content_hash": content_hash(payload),
                    "status": SourceRecord.Status.UNCHANGED,
                    "review_status": SourceRecord.ReviewStatus.APPROVED,
                },
            )
            counters["source_records"] += int(created)

        summary = ", ".join(f"{key}={value}" for key, value in counters.items())
        if dry_run:
            transaction.set_rollback(True)
            self.stdout.write(self.style.WARNING(f"Dry run complete; rolled back. Planned new records: {summary}"))
            return

        self.stdout.write(self.style.SUCCESS(f"Seeded Kenya investment knowledge. New records: {summary}"))
