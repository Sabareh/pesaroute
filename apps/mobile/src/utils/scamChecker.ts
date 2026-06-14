export type ScamFlag = {
  phrase: string;
  reason: string;
  weight: number;
};

export type ScamCheckResult = {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "severe";
  flags: ScamFlag[];
  questionsToAsk: string[];
};

const redFlags: Record<string, string> = {
  "guaranteed return": "Legitimate investments do not promise risk-free returns.",
  "20% monthly": "Very high fixed monthly returns are a common fraud signal.",
  "recruit people": "Recruitment-driven returns can indicate a pyramid scheme.",
  "limited slots": "Artificial scarcity can pressure rushed decisions.",
  "send deposit now": "Urgent deposit requests should be independently verified.",
  "forex bot cannot lose": "No trading bot can honestly claim it cannot lose.",
  "double your money": "Doubling-money promises are a major scam warning."
};

const questionsToAsk = [
  "Which regulator licenses this provider or product?",
  "Can I verify this offer through an official provider channel?",
  "How exactly does the investment generate returns?",
  "Where are the written terms, fees, and withdrawal rules?",
  "What happens if I refuse to send money today?"
];

function riskLevelForScore(score: number): ScamCheckResult["riskLevel"] {
  if (score >= 80) return "severe";
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
}

export function runScamCheck(text: string): ScamCheckResult {
  const normalized = text.toLowerCase();
  const flags = Object.entries(redFlags)
    .filter(([phrase]) => normalized.includes(phrase))
    .map(([phrase, reason]) => ({ phrase, reason, weight: 20 }));
  const riskScore = Math.min(100, flags.reduce((score, flag) => score + flag.weight, 0));

  return {
    riskScore,
    riskLevel: riskLevelForScore(riskScore),
    flags,
    questionsToAsk
  };
}
