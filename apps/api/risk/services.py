from __future__ import annotations

DISCLAIMER = (
    "This red-flag check is educational and deterministic. It is not legal, financial, or investment advice. "
    "Speak to a licensed professional before sending money."
)

RED_FLAGS = {
    "guaranteed return": "Legitimate investments do not promise risk-free returns.",
    "20% monthly": "Very high fixed monthly returns are a common fraud signal.",
    "recruit people": "Recruitment-driven returns can indicate a pyramid scheme.",
    "limited slots": "Artificial scarcity can pressure rushed decisions.",
    "send deposit now": "Urgent deposit requests should be independently verified.",
    "forex bot cannot lose": "No trading bot can honestly claim it cannot lose.",
    "double your money": "Doubling-money promises are a major scam warning.",
}

QUESTIONS_TO_ASK = [
    "Which regulator licenses this provider or product?",
    "Where is the official prospectus, terms document, or audited report?",
    "How exactly does the investment generate returns?",
    "Can I verify this offer through an official provider channel?",
    "What happens if I need to withdraw early?",
]


def risk_level_for_score(score: int) -> str:
    if score >= 80:
        return "severe"
    if score >= 50:
        return "high"
    if score >= 20:
        return "medium"
    return "low"


def check_scam_red_flags(text: str) -> dict:
    normalized = text.lower()
    flags = []
    for phrase, reason in RED_FLAGS.items():
        if phrase in normalized:
            flags.append({"phrase": phrase, "reason": reason, "weight": 20})
    risk_score = min(100, sum(flag["weight"] for flag in flags))
    return {
        "risk_score": risk_score,
        "risk_level": risk_level_for_score(risk_score),
        "flags": flags,
        "questions_to_ask": QUESTIONS_TO_ASK,
        "disclaimer": DISCLAIMER,
    }
