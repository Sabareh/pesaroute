import type { AmountRangeId, GoalId, RouteProfile } from "../types";

export const amountRanges: Array<{ id: AmountRangeId; label: string; midpoint: number }> = [
  { id: "1k-5k", label: "I have KES 1k-5k", midpoint: 3000 },
  { id: "5k-20k", label: "KES 5k-20k", midpoint: 12500 },
  { id: "20k-100k", label: "KES 20k-100k", midpoint: 60000 },
  { id: "100k-500k", label: "KES 100k-500k", midpoint: 300000 },
  { id: "500k-plus", label: "KES 500k+", midpoint: 500000 },
  { id: "prefer-not-to-say", label: "Prefer not to say", midpoint: 0 }
];

export const goalChips: Array<{ id: GoalId; label: string }> = [
  { id: "emergency-fund", label: "Emergency fund" },
  { id: "first-investment", label: "First investment" },
  { id: "sacco-chama", label: "SACCO/chama" },
  { id: "treasury-bills", label: "Treasury bills" },
  { id: "global-stocks", label: "Global stocks" },
  { id: "land", label: "Land" },
  { id: "scam-check", label: "Scam check" },
  { id: "speak-to-professional", label: "Speak to professional" }
];

const goalProfiles: Record<GoalId, Omit<RouteProfile, "amountRangeId" | "amountLabel" | "goalId" | "goalLabel">> = {
  "emergency-fund": {
    path: ["Build a cash buffer", "Compare MMFs and fixed deposits", "Keep withdrawal access visible"],
    learnFirst: ["Liquidity", "Fees and net yield", "Provider and regulator checks"],
    avoid: ["Locking all emergency money", "Chasing the highest yield only", "Using rent or school fees for experiments"],
    riskNotes: ["Lower-risk routes can still change yield.", "Provider due diligence matters."],
    liquidityNotes: ["Prefer routes with clear one to three business day withdrawal timelines."]
  },
  "first-investment": {
    path: ["Start with learning", "Compare MMF, T-bill, and SACCO routes", "Write the reason before sending money"],
    learnFirst: ["Risk vs liquidity", "Minimum amounts", "How returns are quoted"],
    avoid: ["Copying friends blindly", "Skipping documents", "Treating simulations as promises"],
    riskNotes: ["Start small until the route is familiar.", "Use ranges if exact amounts feel sensitive."],
    liquidityNotes: ["Keep some money accessible before trying longer lockups."]
  },
  "sacco-chama": {
    path: ["Check membership rules", "Compare deposits, shares, and loan terms", "Document exit timelines"],
    learnFirst: ["Bylaws", "Share capital vs deposits", "Dividend history and governance"],
    avoid: ["Joining without reading bylaws", "Ignoring exit rules", "Assuming dividends are guaranteed"],
    riskNotes: ["Governance and concentration risk matter.", "Dividends depend on performance."],
    liquidityNotes: ["Withdrawals may require notice or member exit processes."]
  },
  "treasury-bills": {
    path: ["Learn auction basics", "Compare DhowCSD and bank routes", "Plan around maturity"],
    learnFirst: ["Face value vs purchase price", "Auction rates", "91, 182, and 364 day terms"],
    avoid: ["Using money needed before maturity", "Confusing discount interest with monthly income", "Ignoring tax treatment"],
    riskNotes: ["Government securities are lower risk, not zero-admin.", "Rates move between auctions."],
    liquidityNotes: ["Best for money you can leave until maturity."]
  },
  "global-stocks": {
    path: ["Learn FX and custody", "Compare broker and transfer routes", "Start with broad ETFs before single stocks"],
    learnFirst: ["FX spreads", "Broker custody", "Foreign withholding tax"],
    avoid: ["Using unverified brokers", "Ignoring exchange-rate risk", "Buying hype names without a plan"],
    riskNotes: ["Currency and market volatility can both affect outcomes."],
    liquidityNotes: ["Withdrawals depend on broker, bank, and FX settlement timelines."]
  },
  land: {
    path: ["Do due diligence first", "Verify title, survey, access, and seller authority", "Use licensed professionals"],
    learnFirst: ["Land search", "Survey and boundaries", "Legal transfer costs"],
    avoid: ["Paying deposits under pressure", "Skipping searches", "Trusting screenshots or verbal promises"],
    riskNotes: ["Fraud, liquidity, and legal risk can be high."],
    liquidityNotes: ["Land is usually illiquid; selling can take months or longer."]
  },
  "scam-check": {
    path: ["Pause before sending money", "Paste the pitch into Scam Checker", "Verify provider and regulator independently"],
    learnFirst: ["Common pressure phrases", "Licensing checks", "How returns are supposedly generated"],
    avoid: ["Guaranteed returns", "Recruitment payouts", "Urgent deposits"],
    riskNotes: ["High-pressure offers deserve extra verification."],
    liquidityNotes: ["A real route should explain withdrawal rules before taking money."]
  },
  "speak-to-professional": {
    path: ["Write your question", "Prepare your ranges and goals", "Share only what you choose later"],
    learnFirst: ["What advice you need", "What documents are safe to share", "Professional licensing"],
    avoid: ["Sharing passwords or PINs", "Sending full statements before consent controls", "Paying unverified people"],
    riskNotes: ["A professional should explain scope, license, and conflicts."],
    liquidityNotes: ["Keep control of your money; PesaRoute does not execute investments."]
  }
};

export function buildRouteProfile(amountRangeId: AmountRangeId, goalId: GoalId): RouteProfile {
  const amount = amountRanges.find((item) => item.id === amountRangeId) ?? amountRanges[1];
  const goal = goalChips.find((item) => item.id === goalId) ?? goalChips[1];
  return {
    amountRangeId: amount.id,
    amountLabel: amount.label,
    goalId: goal.id,
    goalLabel: goal.label,
    ...goalProfiles[goal.id]
  };
}
