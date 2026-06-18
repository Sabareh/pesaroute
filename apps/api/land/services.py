"""Land Decision Safety services: default checklist, risk scoring, and the
land-vs-alternatives educational comparison.

PesaRoute does NOT verify ownership, hold money, or guarantee safety/appreciation.
Nothing here says a land deal is "safe" — it reports *visible* risk from the checklist
and points users to official systems (Ardhisasa / Ministry of Lands) and professionals.
"""

from __future__ import annotations

from decimal import Decimal

from land.models import LandDueDiligenceItem, LandOpportunity, LandRiskFlag

DI = LandDueDiligenceItem
FLAG = LandRiskFlag

DISCLAIMER = (
    "PesaRoute does not verify land ownership, provide legal advice, or guarantee that a land "
    "deal is safe or will appreciate. Always verify through official sources (Ardhisasa / Ministry "
    "of Lands) and qualified professionals before sending money."
)

ARDHISASA_NOTE = (
    "Official ownership and search verification happens through the official land registry "
    "(Ardhisasa / Ministry of Lands) and a qualified advocate — not through PesaRoute."
)

# --- Default due-diligence checklist template -------------------------------
# Each item: key, title, description, importance, professional_type_needed, source_note.
DEFAULT_CHECKLIST: list[dict] = [
    {
        "item_key": "title_seen",
        "title": "Have you seen the title or ownership document?",
        "description": "Ask for the title deed (or lease/certificate) and confirm the parcel number matches the plot.",
        "importance": DI.Importance.CRITICAL,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": ARDHISASA_NOTE,
    },
    {
        "item_key": "official_search",
        "title": "Has an official land search been done?",
        "description": "An official search confirms the registered owner and any encumbrances.",
        "importance": DI.Importance.CRITICAL,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": "Run the search via Ardhisasa or the Ministry of Lands, ideally through an advocate.",
    },
    {
        "item_key": "search_matches_seller",
        "title": "Does the search result match the seller?",
        "description": "The registered owner on the search must match who you are paying.",
        "importance": DI.Importance.CRITICAL,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": ARDHISASA_NOTE,
    },
    {
        "item_key": "encumbrances",
        "title": "Are there encumbrances, cautions, charges, or caveats?",
        "description": "Check whether the land is charged to a bank or has cautions/caveats registered against it.",
        "importance": DI.Importance.CRITICAL,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": "These appear on the official search result.",
    },
    {
        "item_key": "advocate_review",
        "title": "Has a qualified advocate reviewed the transaction?",
        "description": "An advocate should review the title, search, and sale agreement before any payment.",
        "importance": DI.Importance.CRITICAL,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": "",
    },
    {
        "item_key": "boundaries_confirmed",
        "title": "Has a surveyor confirmed boundaries?",
        "description": "A licensed surveyor should confirm the beacons and that the plot matches the map.",
        "importance": DI.Importance.HIGH,
        "professional_type_needed": DI.ProfessionalTypeNeeded.SURVEYOR,
        "source_note": "",
    },
    {
        "item_key": "access_location",
        "title": "Have you confirmed access road and physical location?",
        "description": "Visit the site and confirm road access, neighbours, and that the location is real.",
        "importance": DI.Importance.HIGH,
        "professional_type_needed": DI.ProfessionalTypeNeeded.SURVEYOR,
        "source_note": "",
    },
    {
        "item_key": "zoning",
        "title": "Have you confirmed land use, zoning, or planning constraints where relevant?",
        "description": "Confirm permitted use (residential/agricultural/commercial) with the county where it matters.",
        "importance": DI.Importance.MEDIUM,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAND_AGENT,
        "source_note": "",
    },
    {
        "item_key": "sale_agreement_reviewed",
        "title": "Have you reviewed the sale agreement?",
        "description": "Read the agreement and have an advocate confirm the terms protect you.",
        "importance": DI.Importance.CRITICAL,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": "",
    },
    {
        "item_key": "payment_milestones",
        "title": "Are payment milestones clear?",
        "description": "Payments should be tied to verified milestones, not pressure to pay everything upfront.",
        "importance": DI.Importance.HIGH,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": "",
    },
    {
        "item_key": "deposit_protected",
        "title": "Is the deposit refundable or protected?",
        "description": "Understand whether your deposit is refundable and under what conditions.",
        "importance": DI.Importance.HIGH,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": "PesaRoute does not hold money or deposits.",
    },
    {
        "item_key": "company_documents",
        "title": "Are company seller documents available if the seller is a company?",
        "description": "For a company seller, confirm registration, directors, and authority to sell.",
        "importance": DI.Importance.HIGH,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": "",
    },
    {
        "item_key": "chama_minutes",
        "title": "Has the chama/group approved the decision in minutes if it is a group purchase?",
        "description": "Group purchases should have a recorded decision and mandate in the chama minutes.",
        "importance": DI.Importance.MEDIUM,
        "professional_type_needed": DI.ProfessionalTypeNeeded.NONE,
        "source_note": "",
    },
    {
        "item_key": "diaspora_verify_first",
        "title": "Has a diaspora buyer avoided sending money before verification?",
        "description": "Diaspora buyers should verify through an independent advocate, not only a relative or agent.",
        "importance": DI.Importance.HIGH,
        "professional_type_needed": DI.ProfessionalTypeNeeded.LAWYER,
        "source_note": "",
    },
]

DONE_STATUSES = {DI.Status.RECEIVED, DI.Status.VERIFIED_BY_USER, DI.Status.REVIEWED_BY_PROFESSIONAL}


def create_default_checklist(opportunity: LandOpportunity) -> list[LandDueDiligenceItem]:
    """Idempotently attach the default checklist to an opportunity (by item_key)."""
    items: list[LandDueDiligenceItem] = []
    for spec in DEFAULT_CHECKLIST:
        item, _ = LandDueDiligenceItem.objects.get_or_create(
            land_opportunity=opportunity,
            item_key=spec["item_key"],
            defaults={
                "title": spec["title"],
                "description": spec["description"],
                "importance": spec["importance"],
                "professional_type_needed": spec["professional_type_needed"],
                "source_note": spec["source_note"],
            },
        )
        items.append(item)
    return items


def _item_done(items_by_key: dict, key: str) -> bool:
    item = items_by_key.get(key)
    return bool(item and item.status in DONE_STATUSES)


def _item_failed(items_by_key: dict, key: str) -> bool:
    item = items_by_key.get(key)
    return bool(item and item.status == DI.Status.FAILED)


def score_risk(opportunity: LandOpportunity, signals: dict | None = None) -> dict:
    """Compute visible risk from the opportunity + checklist + optional self-reported signals.

    Persists LandRiskFlag rows (replacing prior ones) and updates opportunity.risk_level.
    Never asserts safety — reports visible risk and next steps only.
    """
    signals = signals or {}
    items = list(opportunity.due_diligence_items.all())
    by_key = {item.item_key: item for item in items}

    flags: list[dict] = []
    score = 0

    def add(flag_type, severity, message, action, points):
        nonlocal score
        flags.append({"flag_type": flag_type, "severity": severity, "message": message, "suggested_action": action})
        score += points

    title_not_seen = opportunity.title_status in {
        LandOpportunity.TitleStatus.TITLE_NOT_SEEN,
        LandOpportunity.TitleStatus.UNKNOWN,
    } and not _item_done(by_key, "title_seen")
    if title_not_seen:
        add(
            FLAG.FlagType.NO_TITLE_SEEN,
            FLAG.Severity.CRITICAL,
            "You have not confirmed seeing the title or ownership document.",
            "Ask for the title and confirm the parcel number before any payment.",
            3,
        )

    search_done = _item_done(by_key, "official_search")
    if not search_done:
        add(
            FLAG.FlagType.NO_SEARCH_DONE,
            FLAG.Severity.CRITICAL,
            "No official land search has been confirmed.",
            "Run an official search via Ardhisasa / Ministry of Lands, ideally through an advocate.",
            3,
        )

    deposit_requested = opportunity.deposit_requested is not None and opportunity.deposit_requested > 0
    deposit_before_search = signals.get("deposit_before_search") or (deposit_requested and not search_done)
    if deposit_before_search:
        add(
            FLAG.FlagType.DEPOSIT_PRESSURE,
            FLAG.Severity.HIGH,
            "A deposit is in play before the search/title are verified.",
            "Do not pay a deposit before the official search and title are confirmed.",
            2,
        )

    if signals.get("pressure_to_pay_quickly"):
        add(
            FLAG.FlagType.DEPOSIT_PRESSURE,
            FLAG.Severity.HIGH,
            "There is pressure to pay quickly.",
            "Pressure to rush payment is a red flag. Slow down and verify first.",
            2,
        )

    if not _item_done(by_key, "advocate_review"):
        add(
            FLAG.FlagType.NO_LAWYER,
            FLAG.Severity.HIGH,
            "No qualified advocate has reviewed the transaction.",
            "Engage an advocate to review the title, search, and sale agreement.",
            2,
        )

    if signals.get("seller_mismatch") or _item_failed(by_key, "search_matches_seller"):
        add(
            FLAG.FlagType.SELLER_MISMATCH,
            FLAG.Severity.CRITICAL,
            "The registered owner may not match the seller.",
            "Confirm the search result names the exact person/company you are paying.",
            3,
        )

    if not _item_done(by_key, "boundaries_confirmed"):
        add(
            FLAG.FlagType.UNCLEAR_BOUNDARIES,
            FLAG.Severity.WARNING,
            "Boundaries have not been confirmed by a surveyor.",
            "Have a licensed surveyor confirm beacons and the plot on the ground.",
            1,
        )

    if signals.get("unrealistic_appreciation_claim"):
        add(
            FLAG.FlagType.UNREALISTIC_APPRECIATION_CLAIM,
            FLAG.Severity.WARNING,
            "The seller claims unrealistic appreciation or guaranteed returns.",
            "Treat guaranteed-appreciation claims with caution; land returns are not guaranteed.",
            1,
        )

    if opportunity.seller_type == LandOpportunity.SellerType.COMPANY and not _item_done(by_key, "company_documents"):
        add(
            FLAG.FlagType.UNCLEAR_COMPANY,
            FLAG.Severity.HIGH,
            "Seller is a company but company documents are not confirmed.",
            "Confirm company registration, directors, and authority to sell.",
            2,
        )

    critical_pending = [
        i
        for i in items
        if i.importance == DI.Importance.CRITICAL
        and i.status in {DI.Status.NOT_STARTED, DI.Status.REQUESTED, DI.Status.FAILED}
    ]
    if critical_pending:
        add(
            FLAG.FlagType.MISSING_DOCUMENTS,
            FLAG.Severity.WARNING,
            f"{len(critical_pending)} critical due-diligence item(s) are still outstanding.",
            "Complete the critical checklist items before committing money.",
            1,
        )

    diaspora = opportunity.intended_use == LandOpportunity.IntendedUse.DIASPORA_INVESTMENT
    diaspora_proxy = signals.get("diaspora_relying_on_proxy") or (
        diaspora
        and opportunity.seller_type in {LandOpportunity.SellerType.AGENT, LandOpportunity.SellerType.FAMILY_MEMBER}
        and not _item_done(by_key, "advocate_review")
    )
    if diaspora_proxy:
        add(
            FLAG.FlagType.DIASPORA_PROXY_RISK,
            FLAG.Severity.HIGH,
            "A diaspora buyer may be relying only on a relative or agent.",
            "Verify independently through an advocate before sending money from abroad.",
            2,
        )

    chama = opportunity.intended_use == LandOpportunity.IntendedUse.CHAMA_PROJECT
    chama_no_minutes = signals.get("chama_lacks_minutes") or (chama and not _item_done(by_key, "chama_minutes"))
    if chama_no_minutes:
        add(
            FLAG.FlagType.GROUP_PRESSURE,
            FLAG.Severity.HIGH,
            "A group purchase lacks a recorded decision/minutes.",
            "Record the chama decision and mandate in minutes before paying.",
            2,
        )

    if score >= 6:
        level = LandOpportunity.RiskLevel.VERY_HIGH
    elif score >= 3:
        level = LandOpportunity.RiskLevel.HIGH
    elif score >= 1:
        level = LandOpportunity.RiskLevel.MEDIUM
    else:
        level = LandOpportunity.RiskLevel.LOW

    # Persist: replace prior auto-generated flags, write the new ones, update level.
    opportunity.risk_flags.all().delete()
    LandRiskFlag.objects.bulk_create(
        [
            LandRiskFlag(
                land_opportunity=opportunity,
                flag_type=f["flag_type"],
                severity=f["severity"],
                message=f["message"],
                suggested_action=f["suggested_action"],
            )
            for f in flags
        ]
    )
    opportunity.risk_level = level
    opportunity.save(update_fields=["risk_level", "updated_at"])

    missing_critical = [i.title for i in critical_pending]
    suggested_next_steps = []
    seen_actions = set()
    for f in flags:
        action = f["suggested_action"]
        if action and action not in seen_actions:
            seen_actions.add(action)
            suggested_next_steps.append(action)

    return {
        "risk_level": level,
        "summary": (
            f"This opportunity has {level.replace('_', ' ')} visible risk based on the checklist. "
            "Verify with official sources and qualified professionals."
        ),
        "risk_flags": flags,
        "missing_critical_items": missing_critical,
        "suggested_next_steps": suggested_next_steps,
        "disclaimer": DISCLAIMER,
    }


# --- Land vs alternatives comparison (educational only) ---------------------

# Educational land appreciation assumptions (NOT a forecast or guarantee).
LAND_APPRECIATION = {"conservative": Decimal("3"), "neutral": Decimal("6"), "optimistic": Decimal("10")}

# Alternatives: (key, label, scenario rates, liquidity, risk, due-diligence complexity).
ALTERNATIVES = [
    {
        "key": "mmf",
        "label": "Money market fund",
        "rates": {"conservative": 8, "neutral": 10, "optimistic": 13},
        "liquidity": "high",
        "risk": "low",
        "due_diligence": "low",
    },
    {
        "key": "treasury_bill",
        "label": "Treasury bill",
        "rates": {"conservative": 9, "neutral": 12, "optimistic": 16},
        "liquidity": "medium",
        "risk": "low",
        "due_diligence": "low",
    },
    {
        "key": "sacco_deposit",
        "label": "SACCO deposits",
        "rates": {"conservative": 3, "neutral": 6, "optimistic": 9},
        "liquidity": "low",
        "risk": "medium",
        "due_diligence": "medium",
    },
    {
        "key": "reit",
        "label": "REIT",
        "rates": {"conservative": 2, "neutral": 7, "optimistic": 12},
        "liquidity": "medium",
        "risk": "high",
        "due_diligence": "low",
    },
    {
        "key": "fixed_deposit",
        "label": "Fixed deposit",
        "rates": {"conservative": 6, "neutral": 9, "optimistic": 12},
        "liquidity": "low",
        "risk": "low",
        "due_diligence": "low",
    },
    {
        "key": "global_etf_route",
        "label": "Global ETF route",
        "rates": {"conservative": 0, "neutral": 7, "optimistic": 12},
        "liquidity": "medium",
        "risk": "high",
        "due_diligence": "medium",
    },
]


def _money(value) -> str:
    return str(Decimal(str(value)).quantize(Decimal("0.01")))


def compare_land_with_alternatives(
    *,
    land_price,
    deposit=None,
    holding_period_years,
    appreciation_scenario: str = "neutral",
    custom_rate=None,
    transaction_cost_estimate=None,
    liquidity_need: str = "",
) -> dict:
    """Educational comparison. No guaranteed returns; land is usually illiquid."""
    from planning.simulation_calculators import grow

    principal = float(land_price)
    years = max(0, int(holding_period_years))
    months = years * 12
    tx_cost = float(transaction_cost_estimate) if transaction_cost_estimate else 0.0

    if appreciation_scenario == "custom" and custom_rate is not None:
        land_rate = float(custom_rate)
        scenario_label = "custom educational assumption"
    else:
        scenario = appreciation_scenario if appreciation_scenario in LAND_APPRECIATION else "neutral"
        land_rate = float(LAND_APPRECIATION[scenario])
        scenario_label = scenario

    land_gross, _ = grow(principal, 0.0, months, land_rate, "annual")
    land_net = land_gross - tx_cost
    land_scenario = {
        "label": "Land",
        "scenario": scenario_label,
        "assumed_appreciation_rate": land_rate,
        "principal": _money(principal),
        "transaction_cost_estimate": _money(tx_cost),
        "estimated_value": _money(land_gross),
        "estimated_value_after_costs": _money(land_net),
        "estimated_gain": _money(land_net - principal),
        "liquidity": "low",
        "risk": "high",
        "due_diligence_complexity": "high",
        "note": "Land appreciation is an educational assumption, not a forecast.",
    }

    scenario_key = (
        appreciation_scenario if appreciation_scenario in {"conservative", "neutral", "optimistic"} else "neutral"
    )
    alternatives = []
    for alt in ALTERNATIVES:
        rate = float(alt["rates"][scenario_key])
        gross, _ = grow(principal, 0.0, months, rate, "annual")
        alternatives.append(
            {
                "key": alt["key"],
                "label": alt["label"],
                "assumed_rate": rate,
                "estimated_value": _money(gross),
                "estimated_gain": _money(gross - principal),
                "liquidity": alt["liquidity"],
                "risk": alt["risk"],
                "due_diligence_complexity": alt["due_diligence"],
            }
        )

    return {
        "inputs": {
            "land_price": _money(principal),
            "deposit": _money(deposit) if deposit is not None else None,
            "holding_period_years": years,
            "appreciation_scenario": scenario_label,
            "transaction_cost_estimate": _money(tx_cost),
            "liquidity_need": liquidity_need,
        },
        "land_scenario": land_scenario,
        "alternatives": alternatives,
        "liquidity_comparison": (
            "Land is usually illiquid — selling can take months or longer. Money market funds and "
            "Treasury bills are far more liquid; SACCO deposits and fixed deposits sit in between."
        ),
        "risk_comparison": (
            "Land carries title, boundary, and fraud risk that needs legal/survey verification. "
            "Regulated funds carry market and provider risk but not title-fraud risk."
        ),
        "due_diligence_complexity": (
            "Land requires the most due diligence (title, search, survey, legal review). "
            "Regulated alternatives require checking the provider and terms."
        ),
        "warning": "Land appreciation is not guaranteed and land is usually illiquid.",
        "disclaimer": DISCLAIMER,
    }
