# ruff: noqa: E501
from datetime import timedelta
from typing import Any

from django.utils import timezone

EDUCATIONAL_DISCLAIMER = (
    "Educational information only. PesaRoute does not hold money, execute investments, promise returns, "
    "or ask for M-Pesa PINs, bank passwords, broker credentials, or MMF credentials. Verify current details "
    "with official sources and licensed professionals where needed."
)

BANNED_LEARNING_PHRASES = (
    "guaranteed return",
    "best investment",
    "recommended allocation",
    "risk-free",
    "buy now",
    "invest here now",
)

ALLOWED_RED_FLAG_CONTEXTS = (
    "guaranteed returns are a red flag",
    "guaranteed high returns are dangerous",
)

PLACEHOLDER_MARKERS = (
    "Educational content:",
    "Learn first, compare clearly, understand risks and liquidity",
    "This lesson is educational only. Compare risks, costs, liquidity",
    "Use official source links where available, compare risks and liquidity",
)

SOURCE_CATALOG: dict[str, dict[str, str]] = {
    "cbk_treasury_bills": {
        "title": "Treasury Bills",
        "organization": "Central Bank of Kenya",
        "source_type": "government",
        "url": "https://www.centralbank.go.ke/securities/treasury-bills/",
        "notes": "Official CBK education page for Treasury bills, tenors, auction process, and minimum face value.",
        "reliability_level": "official",
    },
    "cbk_securities": {
        "title": "Government Securities",
        "organization": "Central Bank of Kenya",
        "source_type": "government",
        "url": "https://www.centralbank.go.ke/securities/",
        "notes": "Official CBK overview of Treasury bills, bonds, DhowCSD, and government securities access.",
        "reliability_level": "official",
    },
    "cbk_treasury_bonds": {
        "title": "Treasury Bonds",
        "organization": "Central Bank of Kenya",
        "source_type": "government",
        "url": "https://www.centralbank.go.ke/securities/treasury-bonds/",
        "notes": "Official CBK education page for Treasury bonds, coupons, auctions, and maturity concepts.",
        "reliability_level": "official",
    },
    "dhowcsd": {
        "title": "DhowCSD",
        "organization": "Central Bank of Kenya",
        "source_type": "government",
        "url": "https://dhowcsd.centralbank.go.ke/",
        "notes": "Official DhowCSD investor portal for Kenyan government securities access.",
        "reliability_level": "official",
    },
    "cma_licensees": {
        "title": "Licensees and Market Players",
        "organization": "Capital Markets Authority Kenya",
        "source_type": "regulator",
        "url": "https://licensees.cma.or.ke/",
        "notes": "Official CMA register for approved capital-market intermediaries and market players.",
        "reliability_level": "official",
    },
    "cma_approved_cis": {
        "title": "Approved Collective Investment Schemes",
        "organization": "Capital Markets Authority Kenya",
        "source_type": "regulator",
        "url": "https://licensees.cma.or.ke/licenses/15/",
        "notes": "Official CMA list of approved collective investment schemes and unit-trust schemes.",
        "reliability_level": "official",
    },
    "cma_investor_education": {
        "title": "Capital Markets Investor Education Handbook",
        "organization": "Capital Markets Authority Kenya",
        "source_type": "regulator",
        "url": "https://handbook.cma.or.ke/",
        "notes": "CMA investor education material for capital markets, intermediaries, and investor protection.",
        "reliability_level": "official",
    },
    "nse_faqs": {
        "title": "Nairobi Securities Exchange FAQs",
        "organization": "Nairobi Securities Exchange",
        "source_type": "exchange",
        "url": "https://www.nse.co.ke/faqs/",
        "notes": "NSE public education and market participation information.",
        "reliability_level": "official",
    },
    "nse_trading_participants": {
        "title": "List of Trading Participants",
        "organization": "Nairobi Securities Exchange",
        "source_type": "exchange",
        "url": "https://www.nse.co.ke/list-of-trading-participants/",
        "notes": "NSE list of trading participants users can verify before opening market accounts.",
        "reliability_level": "official",
    },
    "cdsc_account_opening": {
        "title": "CDS Account Opening and Maintenance",
        "organization": "Central Depository & Settlement Corporation",
        "source_type": "regulator",
        "url": "https://cdsckenya.com/account-opening/",
        "notes": "CDSC account-opening reference for CDS accounts and central depository agents.",
        "reliability_level": "official",
    },
    "sasra_licensed_dt": {
        "title": "Licensed Deposit Taking SACCOs",
        "organization": "Sacco Societies Regulatory Authority",
        "source_type": "regulator",
        "url": "https://www.sasra.go.ke/licensed-dt-saccos/",
        "notes": "SASRA list and warning to verify a SACCO before financial transactions.",
        "reliability_level": "official",
    },
    "sasra_regulated_saccos": {
        "title": "Regulated SACCOs",
        "organization": "Sacco Societies Regulatory Authority",
        "source_type": "regulator",
        "url": "https://www.sasra.go.ke/regulated-saccos/",
        "notes": "SASRA portal for regulated deposit-taking and non-withdrawable deposit-taking SACCO lists.",
        "reliability_level": "official",
    },
    "rba_service_providers": {
        "title": "Registered Service Providers",
        "organization": "Retirement Benefits Authority",
        "source_type": "regulator",
        "url": "https://www.rba.go.ke/rba-publishes-list-of-registered-service-providers-in-the-retirement-benefits-industry/",
        "notes": "RBA public reference for registered retirement-benefits service providers.",
        "reliability_level": "official",
    },
    "ira_entities_registry": {
        "title": "Licensed Entities",
        "organization": "Insurance Regulatory Authority Kenya",
        "source_type": "regulator",
        "url": "https://ira.go.ke/entities-registry/",
        "notes": "IRA public registry for licensed insurance-sector entities.",
        "reliability_level": "official",
    },
    "kra_withholding_tax": {
        "title": "Withholding Tax",
        "organization": "Kenya Revenue Authority",
        "source_type": "government",
        "url": "https://www.kra.go.ke/individual/filing-paying/types-of-taxes/individual-withholding-tax",
        "notes": "KRA public education reference for withholding tax concepts. PesaRoute does not give tax advice.",
        "reliability_level": "official",
    },
    "kra_capital_gains_tax": {
        "title": "Capital Gains Tax",
        "organization": "Kenya Revenue Authority",
        "source_type": "government",
        "url": "https://www.kra.go.ke/individual/filing-paying/types-of-taxes/capital-gains-tax",
        "notes": "KRA public education reference for capital gains tax concepts. PesaRoute does not give tax advice.",
        "reliability_level": "official",
    },
    "ardhisasa": {
        "title": "Ardhisasa",
        "organization": "Ministry of Lands and Physical Planning",
        "source_type": "government",
        "url": "https://ardhisasa.lands.go.ke/",
        "notes": "Official Kenyan digital platform for land information and land-service interactions.",
        "reliability_level": "official",
    },
    "national_land_commission": {
        "title": "National Land Commission",
        "organization": "National Land Commission",
        "source_type": "government",
        "url": "https://landcommission.go.ke/",
        "notes": "Public land commission reference for public-land oversight and land-governance context.",
        "reliability_level": "official",
    },
    "pesaroute_editorial": {
        "title": "PesaRoute Editorial Literacy Standard",
        "organization": "PesaRoute",
        "source_type": "editorial",
        "url": "",
        "notes": "Internal education standard: explain risk, liquidity, verification, privacy, and no execution.",
        "reliability_level": "editorial",
    },
}


def is_generic_placeholder(text: str | None) -> bool:
    if not text:
        return False
    return any(marker.lower() in text.lower() for marker in PLACEHOLDER_MARKERS)


def flatten_structured_content(blocks: list[dict[str, Any]] | None) -> str:
    if not blocks:
        return ""
    parts: list[str] = []
    for block in blocks:
        for key in ("text", "title", "term"):
            value = block.get(key)
            if value:
                parts.append(str(value))
        for item in block.get("items", []) or []:
            parts.append(str(item))
        for row in block.get("rows", []) or []:
            parts.extend(str(cell) for cell in row)
    return " ".join(parts)


def find_banned_learning_phrase(*values: str) -> str | None:
    text = " ".join(value or "" for value in values).lower()
    for allowed_context in ALLOWED_RED_FLAG_CONTEXTS:
        text = text.replace(allowed_context, "")
    for phrase in BANNED_LEARNING_PHRASES:
        if phrase in text:
            return phrase
    return None


def has_disclaimer_block(blocks: list[dict[str, Any]] | None) -> bool:
    return any(block.get("type") == "disclaimer" and block.get("text") for block in blocks or [])


def _body_from_blocks(blocks: list[dict[str, Any]]) -> str:
    paragraphs: list[str] = []
    for block in blocks:
        block_type = block.get("type")
        if block_type in {"heading", "paragraph", "key_takeaway", "caution", "source_note", "disclaimer"}:
            text = block.get("text")
            if text:
                paragraphs.append(str(text))
        elif block_type == "scenario":
            paragraphs.append(f"{block.get('title')}: {block.get('text')}")
        elif block_type == "definition":
            paragraphs.append(f"{block.get('term')}: {block.get('text')}")
        elif block_type == "checklist":
            items = "; ".join(str(item) for item in block.get("items", []))
            paragraphs.append(f"{block.get('title', 'Checklist')}: {items}")
        elif block_type == "comparison_table":
            rows = [" | ".join(str(cell) for cell in row) for row in block.get("rows", [])]
            if rows:
                paragraphs.append(f"{block.get('title', 'Comparison')}: {'; '.join(rows)}")
    return "\n\n".join(paragraph for paragraph in paragraphs if paragraph and paragraph != "None")


def body_from_structured_content(blocks: list[dict[str, Any]]) -> str:
    return _body_from_blocks(blocks)


def _profile_for_lesson(title: str, track_title: str) -> dict[str, Any]:
    text = f"{title} {track_title}".lower()
    default_sources = ["pesaroute_editorial"]

    if "money market fund" in text or "mmf" in text:
        return {
            "difficulty": "beginner",
            "sources": ["cma_investor_education", *default_sources],
            "summary": "Understand how MMFs pool money, why yield changes, and what to check before using one.",
            "intro": (
                "A Money Market Fund pools money from many investors and invests mainly in short-term instruments. "
                "For a Kenyan user, the practical question is not only the displayed yield. It is also withdrawal time, "
                "fees, fund manager status, and whether the money is needed soon."
            ),
            "scenario_title": "First salary example",
            "scenario": (
                "You have KES 8,000 left after rent and transport. Before placing it anywhere, separate emergency cash "
                "from learning money, then compare how quickly the fund can return your money and what fees apply."
            ),
            "definition": ("Liquidity", "How quickly and predictably you can access your money without a large cost."),
            "checklist": [
                "Check the fund manager and trustee details against official or provider documents.",
                "Ask how withdrawals work, including cut-off times and settlement timelines.",
                "Compare net yield after fees instead of chasing the highest headline number.",
                "Keep emergency money separate from money you can leave for longer.",
            ],
            "caution": "A yield shown today can change. Treat it as a learning input, not a fixed promise.",
            "takeaway": "Use MMFs for short-term liquidity education first; compare provider details before committing money.",
        }

    if "treasury bill" in text or "t-bill" in text or "dhowcsd" in text or "treasury bond" in text:
        is_bond = "bond" in text and "bill" not in text
        return {
            "difficulty": "beginner" if not is_bond else "intermediate",
            "sources": ["cbk_treasury_bills", "cbk_securities", *default_sources],
            "summary": (
                "Learn how Kenyan government securities work, including face value, purchase price, auction timing, "
                "maturity, and why liquidity matters."
            ),
            "intro": (
                "Treasury bills are short-term government securities sold at a discount and paid back at face value "
                "at maturity. Treasury bonds are longer-term government securities with coupon payments in most cases. "
                "The key learning step is to separate face value, purchase price, maturity date, tax treatment, and cash needs."
            ),
            "scenario_title": "DhowCSD practice scenario",
            "scenario": (
                "A user wants to place KES 50,000 in a 91-day bill but may need school-fee money in two months. "
                "The route is not only about return. They must check auction dates, maturity timing, and whether early access is realistic."
            ),
            "definition": ("Face value", "The amount paid back at maturity before any applicable tax or charges."),
            "checklist": [
                "Confirm current minimums, auction dates, and instructions from CBK or DhowCSD.",
                "Know whether you are making a competitive or non-competitive bid.",
                "Calculate purchase price separately from face value.",
                "Avoid using money needed before maturity unless you understand the exit route.",
            ],
            "caution": "A simulator estimate is not an auction result. Actual rates and tax treatment can differ.",
            "takeaway": "Treasury securities require timing discipline: know the date money leaves, the maturity date, and the access risk.",
        }

    if "sacco" in text or "guarantor" in text or "loan multiplier" in text or "share capital" in text:
        return {
            "difficulty": "beginner",
            "sources": ["sasra_licensed_dt", "sasra_regulated_saccos", *default_sources],
            "summary": "Understand SACCO deposits, share capital, guarantor exposure, and status verification.",
            "intro": (
                "A SACCO can help members save, borrow, and build discipline, but the terms matter. Deposits, share capital, "
                "loan eligibility, guarantor rules, and exit timelines do not behave the same way."
            ),
            "scenario_title": "Member decision scenario",
            "scenario": (
                "A member is told contributions can qualify them for a loan three times their deposits. Before joining, "
                "they should ask how deposits are withdrawn, what share capital means, who regulates the SACCO, and what happens if a borrower defaults."
            ),
            "definition": (
                "Guarantor risk",
                "The risk that you may be called on to support another member's loan obligation.",
            ),
            "checklist": [
                "Verify the SACCO's regulated status on SASRA lists where applicable.",
                "Separate withdrawable deposits from share capital and other locked contributions.",
                "Ask for written loan, guarantor, dividend, and exit rules.",
                "Do not guarantee a loan you cannot afford to support.",
            ],
            "caution": "A dividend history is not a promise. Governance and member obligations matter.",
            "takeaway": "A good SACCO decision starts with rules, regulation status, and exit terms, not only loan access.",
        }

    if "chama" in text:
        return {
            "difficulty": "beginner",
            "sources": default_sources,
            "summary": "Set chama goals, records, approvals, and member risk rules before pooling money.",
            "intro": (
                "A chama is strongest when members agree the purpose before money accumulates. Education comes before buying land, stocks, livestock, "
                "or lending to members because group pressure can hide risk."
            ),
            "scenario_title": "Monthly contribution scenario",
            "scenario": (
                "Ten members contribute KES 5,000 each month. Before choosing an asset, they write down the goal, who approves spending, "
                "how minutes are stored, and what happens when a member misses contributions."
            ),
            "definition": (
                "Investment policy",
                "A simple written agreement on what the group can and cannot do with pooled money.",
            ),
            "checklist": [
                "Keep minutes, member balances, approvals, and receipts in one place.",
                "Agree voting thresholds before pressure appears.",
                "Define whether members can borrow from the pool.",
                "Use professional review for land, tax, or complex products.",
            ],
            "caution": "A group can lose money faster when social trust replaces documentation.",
            "takeaway": "For a chama, governance is part of the investment route.",
        }

    if any(keyword in text for keyword in ["share", "dividend", "cds", "nse", "stock", "diversification"]):
        return {
            "difficulty": "beginner",
            "sources": ["cma_investor_education", "nse_faqs", "nse_trading_participants", *default_sources],
            "summary": "Learn shares through ownership, price movement, dividends, CDS accounts, and broker checks.",
            "intro": (
                "Buying a listed share means owning a small part of a listed company. The price can rise or fall, dividends are not automatic, "
                "and the route usually involves a licensed trading participant and a CDS account."
            ),
            "scenario_title": "Hot tip scenario",
            "scenario": (
                "A friend says a stock will double quickly. A safer learning response is to check the company, broker route, fees, time horizon, "
                "and whether this money can remain invested if the market falls."
            ),
            "definition": (
                "Diversification",
                "Spreading exposure so one company or sector does not decide the whole outcome.",
            ),
            "checklist": [
                "Verify the broker or trading participant before opening an account.",
                "Understand that share prices can fall and dividends may change.",
                "Avoid using rent, school fees, or emergency money for volatile assets.",
                "Write down why you are buying before you buy.",
            ],
            "caution": "Market excitement is not due diligence.",
            "takeaway": "For NSE learning, start with account route, fees, risk, and time horizon before any stock name.",
        }

    if any(keyword in text for keyword in ["global", "etf", "usd", "currency", "platform", "custody"]):
        return {
            "difficulty": "intermediate",
            "sources": ["cma_investor_education", *default_sources],
            "summary": "Compare global exposure with FX cost, platform risk, custody questions, and tax/documentation needs.",
            "intro": (
                "Global stocks and ETFs add currency, platform, custody, tax, and transfer questions. The learning route is to understand the wrapper "
                "and the provider before looking at brand names or social media performance screenshots."
            ),
            "scenario_title": "Diaspora or card-funded account scenario",
            "scenario": (
                "A user wants to buy a US ETF from Kenya. They first list exchange-rate spread, deposit and withdrawal routes, custody arrangement, "
                "tax forms, and what happens if the platform restricts accounts."
            ),
            "definition": (
                "FX risk",
                "The chance that exchange-rate movement changes your outcome when converting between KES and another currency.",
            ),
            "checklist": [
                "Understand the legal provider route and custody arrangement.",
                "Estimate FX spread, transfer fees, platform fees, and withdrawal costs.",
                "Check tax questions before assuming returns are comparable.",
                "Keep emergency money in a more liquid local route.",
            ],
            "caution": "A familiar global brand does not remove platform, tax, or currency risk.",
            "takeaway": "Global investing education starts with route safety and FX math, not screenshots of past performance.",
        }

    if any(keyword in text for keyword in ["land", "title", "survey", "lawyer", "deposit"]):
        return {
            "difficulty": "intermediate",
            "sources": default_sources,
            "summary": "Treat land as a due-diligence process with documents, site checks, legal review, and liquidity risk.",
            "intro": (
                "Land can feel familiar, but it is not automatically simple or liquid. A serious route checks documents, survey details, seller authority, "
                "county issues, physical access, and legal review before any deposit."
            ),
            "scenario_title": "Deposit pressure scenario",
            "scenario": (
                "A seller says the price is available only today. The user pauses, records the offer, asks for documents, and gets independent legal review "
                "instead of sending money under pressure."
            ),
            "definition": (
                "Liquidity risk",
                "The risk that you cannot turn the asset back into cash quickly when you need money.",
            ),
            "checklist": [
                "Do not pay a deposit before independent verification.",
                "Use written documents, site visits, survey checks, and legal review.",
                "Confirm who has authority to sell.",
                "Budget for taxes, legal fees, transfer costs, and time delays.",
            ],
            "caution": "Pressure to pay first and verify later is a red flag.",
            "takeaway": "Land due diligence is a sequence. Skipping steps can be more expensive than waiting.",
        }

    if any(
        keyword in text
        for keyword in ["scam", "pressure", "recruitment", "forex", "crypto bot", "high returns", "deposit"]
    ):
        return {
            "difficulty": "beginner",
            "sources": ["cma_investor_education", *default_sources],
            "summary": "Identify red flags such as urgency, secrecy, recruitment pressure, missing regulator details, and unrealistic promises.",
            "intro": (
                "A suspicious pitch often tries to move faster than your questions. PesaRoute teaches users to slow down, write the pitch down, "
                "check who is regulated, and ask what can go wrong before sending money."
            ),
            "scenario_title": "WhatsApp pitch scenario",
            "scenario": (
                "Someone sends a screenshot showing large profits and asks for a deposit today. The user copies the message into the scam checker, "
                "asks for registration details, and refuses to send PINs, passwords, or money under pressure."
            ),
            "definition": (
                "Red flag",
                "A warning sign that the offer may be unsafe, unclear, or unsuitable for your situation.",
            ),
            "checklist": [
                "Ask who regulates the provider and verify independently.",
                "Reject requests for PINs, passwords, OTPs, or remote-control apps.",
                "Watch for urgency, secrecy, referral rewards, and unclear withdrawal rules.",
                "Talk to a licensed professional where the decision is material.",
            ],
            "caution": "If the pitch punishes you for asking basic questions, stop.",
            "takeaway": "A scam check is not paranoia. It is a normal step before money moves.",
        }

    if "diaspora" in text or "abroad" in text or "behalf" in text:
        return {
            "difficulty": "intermediate",
            "sources": ["cma_investor_education", "cbk_securities", *default_sources],
            "summary": "Verify Kenyan providers from abroad and limit what representatives can do on your behalf.",
            "intro": (
                "Diaspora users often make decisions from far away, which increases document, representative, FX, and verification risk. "
                "The safest learning route is to separate who can advise, who can act, and what proof is required."
            ),
            "scenario_title": "Family representative scenario",
            "scenario": (
                "A relative offers to handle a land or investment transaction. The user defines documents needed, payment controls, expiry dates, "
                "and independent professional review before granting authority."
            ),
            "definition": (
                "Limited authority",
                "Permission for another person to do a specific task, not open-ended control over money or documents.",
            ),
            "checklist": [
                "Verify provider or professional status from official public lists where possible.",
                "Use scoped, written authority and keep copies of documents.",
                "Avoid sending exact portfolio details until you know why they are needed.",
                "Track FX conversion assumptions separately from product risk.",
            ],
            "caution": "Distance can make pressure harder to see. Slow the decision down.",
            "takeaway": "Diaspora investing needs verification discipline and scoped sharing.",
        }

    if any(keyword in text for keyword in ["farmer", "harvest", "planting", "seasonal", "input costs"]):
        return {
            "difficulty": "beginner",
            "sources": default_sources,
            "summary": "Plan seasonal money by separating household needs, inputs, emergency cash, and longer-term goals.",
            "intro": (
                "Seasonal income can look large on the day it arrives and disappear before the next planting period. The route is to divide it by time, "
                "not by excitement."
            ),
            "scenario_title": "Harvest income scenario",
            "scenario": (
                "After selling produce, a farmer separates school fees, household costs, inputs for the next season, emergency cash, and only then learning money."
            ),
            "definition": ("Seasonal buffer", "Money kept liquid to cover needs between income cycles."),
            "checklist": [
                "Mark next planting or input dates before choosing any product.",
                "Keep emergency and school-fee money liquid.",
                "Avoid locking money needed before the next harvest.",
                "Record every decision in simple language.",
            ],
            "caution": "A product can be good generally and still wrong for seasonal cash timing.",
            "takeaway": "For farmers, timing and liquidity are as important as return.",
        }

    if any(keyword in text for keyword in ["jua kali", "daily income", "business reinvestment", "weekly plan"]):
        return {
            "difficulty": "beginner",
            "sources": default_sources,
            "summary": "Turn daily income into weekly decisions for stock, rent, emergency money, and learning.",
            "intro": (
                "Daily income needs a simple weekly rhythm because business cash and household cash can mix quickly. The learning route is to protect float, "
                "separate emergency money, and reinvest only after the week is visible."
            ),
            "scenario_title": "Workshop income scenario",
            "scenario": (
                "A fundi earns different amounts each day. On Sunday evening, they count stock money, rent, food, transport, emergency cash, and a small learning amount."
            ),
            "definition": ("Business float", "Money needed to keep the business operating before you count profit."),
            "checklist": [
                "Separate stock or tool money from personal spending.",
                "Keep an emergency amount that is easy to access.",
                "Write down one reinvestment reason before spending on the business.",
                "Avoid expensive debt for wants disguised as business needs.",
            ],
            "caution": "Reinvestment is not any business purchase. It should protect or improve earning ability.",
            "takeaway": "A weekly plan turns irregular income into decisions you can review.",
        }

    if any(keyword in text for keyword in ["salary", "budget", "black tax", "first kes", "payday", "first investment"]):
        return {
            "difficulty": "beginner",
            "sources": default_sources,
            "summary": "Plan first salary money by separating needs, family support, emergency cash, learning money, and pressure.",
            "intro": (
                "The first salary can attract many claims: rent, transport, family support, friends, lifestyle, debt, and investing pressure. "
                "A useful route starts by deciding what must be protected before any product choice."
            ),
            "scenario_title": "Payday scenario",
            "scenario": (
                "A first-jobber has KES 12,000 after rent and transport. They reserve emergency money, decide a clear family-support amount, "
                "and use only a small range for learning until they understand liquidity and risk."
            ),
            "definition": (
                "Learning money",
                "A small amount used to understand a route without risking essential needs.",
            ),
            "checklist": [
                "Separate needs, emergency buffer, debt, family support, and learning money.",
                "Use ranges if exact amounts feel too private.",
                "Do not let social pressure choose the product.",
                "Write the reason before committing money.",
            ],
            "caution": "A bigger salary does not remove the need for a buffer.",
            "takeaway": "Your first salary plan should protect stability before chasing growth.",
        }

    return {
        "difficulty": "beginner",
        "sources": default_sources,
        "summary": "Build the money foundation: goals, liquidity, risk, pressure checks, and clear decisions before money moves.",
        "intro": (
            "A money decision becomes easier when you name the goal, timeline, liquidity need, downside risk, and provider route. "
            "PesaRoute treats learning as the first step before any financial action."
        ),
        "scenario_title": "KES range scenario",
        "scenario": (
            "A user chooses a range instead of an exact amount. They compare emergency needs, withdrawal timing, and what could go wrong before looking at products."
        ),
        "definition": (
            "Risk",
            "The chance that the outcome is worse than expected, including loss, delay, cost, or inability to exit.",
        ),
        "checklist": [
            "Name the goal and deadline.",
            "Decide how quickly the money may be needed.",
            "List what can go wrong before listing possible upside.",
            "Check whether you need professional review.",
        ],
        "caution": "A product label does not make a decision safe for your timeline.",
        "takeaway": "Good money decisions start with purpose, timing, and exit before return.",
    }


def structured_lesson_content(title: str, track_title: str, lesson_type: str) -> dict[str, Any]:
    profile = _profile_for_lesson(title, track_title)
    blocks: list[dict[str, Any]] = [
        {"type": "heading", "text": title},
        {"type": "paragraph", "text": profile["intro"]},
        {"type": "scenario", "title": profile["scenario_title"], "text": profile["scenario"]},
        {"type": "definition", "term": profile["definition"][0], "text": profile["definition"][1]},
        {"type": "checklist", "title": "Before money moves", "items": profile["checklist"]},
        {"type": "caution", "title": "What can go wrong", "text": profile["caution"]},
        {"type": "key_takeaway", "text": profile["takeaway"]},
    ]
    if lesson_type == "simulation":
        blocks.append(
            {
                "type": "simulator_cta",
                "title": "Practice with a simulator",
                "text": "Run the matching simulator, then write down what changed in your understanding.",
            }
        )
    elif lesson_type == "journal_prompt":
        blocks.append(
            {
                "type": "journal_prompt",
                "title": "Private reflection",
                "text": "Write the decision, the amount mode you prefer, and one reason you might wait.",
            }
        )
    elif lesson_type == "professional_review_prompt":
        blocks.append(
            {
                "type": "professional_review_cta",
                "title": "Ask for scoped review",
                "text": "Share only the context needed for review. Exact values stay hidden unless you choose otherwise.",
            }
        )
    elif lesson_type == "quiz":
        blocks.append(
            {
                "type": "quiz_prompt",
                "title": "Practice question",
                "text": "Which factor should you understand before committing money: liquidity, pressure, costs, or all of them?",
            }
        )
    blocks.extend(
        [
            {
                "type": "source_note",
                "text": "Use official source links where available and treat PesaRoute editorial notes as learning guidance, not instructions to invest.",
            },
            {"type": "disclaimer", "text": EDUCATIONAL_DISCLAIMER},
        ]
    )
    now = timezone.now()
    return {
        "summary": profile["summary"],
        "body": _body_from_blocks(blocks),
        "structured_content": blocks,
        "estimated_minutes": 4 if lesson_type in {"checklist", "journal_prompt"} else 6,
        "difficulty": profile["difficulty"],
        "editorial_status": "reviewed",
        "last_reviewed_at": now,
        "next_review_due_at": now + timedelta(days=180),
        "reviewer_notes": "Seeded structured educational content. Keep verified before publishing to beta users.",
        "source_keys": profile["sources"],
    }


def sync_learning_sources(instance: Any, source_keys: list[str]) -> None:
    from learning.models import LearningContentSource

    sources = []
    now = timezone.now()
    for key in dict.fromkeys(source_keys):
        data = SOURCE_CATALOG[key]
        source, _created = LearningContentSource.objects.update_or_create(
            title=data["title"],
            organization=data["organization"],
            defaults={
                "source_type": data["source_type"],
                "url": data["url"],
                "retrieved_at": now,
                "notes": data["notes"],
                "reliability_level": data["reliability_level"],
            },
        )
        sources.append(source)
    instance.content_sources.set(sources)
