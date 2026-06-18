export const routeCategories = [
  { name: "Money Market Funds", liquidity: "High", risk: "Low", minimum: "KES 1,000" },
  { name: "Treasury Bills", liquidity: "Medium", risk: "Low", minimum: "KES 100,000" },
  { name: "SACCOs", liquidity: "Low", risk: "Moderate", minimum: "Varies" },
  { name: "NSE Stocks", liquidity: "Medium", risk: "High", minimum: "Varies" },
  { name: "US ETFs", liquidity: "Medium", risk: "High", minimum: "Varies" }
];

export const lessons = [
  "What we mean by compare options",
  "How MMFs quote yield",
  "Treasury bill auction basics",
  "Why liquidity matters before returns",
  "How to document an investment decision"
];

export const portfolioItems = [
  { assetType: "Money Market Funds", amount: "KES 10k - 25k", liquidity: "High", risk: "Low" },
  { assetType: "SACCO Deposits", amount: "Hidden", liquidity: "Low", risk: "Moderate" }
];

export const scamPhrases = [
  "guaranteed return",
  "20% monthly",
  "recruit people",
  "limited slots",
  "send deposit now",
  "forex bot cannot lose",
  "double your money"
];

export const mockProductCategories = [
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
  "Pension Products"
].map((name, index) => ({
  id: index + 1,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  description: `Educational overview for ${name}.`,
  status: "active"
}));

export const mockProductPassports = [
  { name: "Generic MMF", category: "Money Market Funds", liquidity: "high", risk: "low", minimum: "1000.00" },
  { name: "Generic Treasury Bill via DhowCSD", category: "Treasury Bills", liquidity: "medium", risk: "low", minimum: "100000.00" },
  { name: "Generic SACCO Deposits", category: "SACCOs", liquidity: "low", risk: "moderate", minimum: "500.00" },
  { name: "Generic NSE Shares", category: "NSE Stocks", liquidity: "medium", risk: "high", minimum: "1000.00" },
  { name: "Generic US ETF route", category: "US Stocks and ETFs", liquidity: "medium", risk: "high", minimum: "5000.00" },
  { name: "Generic Land Due Diligence Checklist", category: "Land", liquidity: "low", risk: "high", minimum: null },
  {
    name: "Generic Bitcoin Self-Custody Risk Card",
    category: "Bitcoin and Crypto Risk",
    liquidity: "medium",
    risk: "very_high",
    minimum: null
  }
].map((passport, index) => {
  const category = mockProductCategories.find((item) => item.name === passport.category) ?? mockProductCategories[0];
  return {
    id: index + 1,
    name: passport.name,
    slug: passport.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    category,
    provider: {
      id: 1,
      name: "Generic educational provider",
      regulator_category: "Educational placeholder",
      website: "",
      status: "active"
    },
    description: `Educational passport for ${passport.category}.`,
    regulator_category: passport.category,
    minimum_amount: passport.minimum,
    liquidity_level: passport.liquidity,
    risk_level: passport.risk,
    withdrawal_timeline: "Check provider terms before acting.",
    fees_summary: "Fees vary by provider and route.",
    tax_notes: "Speak to a licensed professional about tax treatment.",
    beginner_mistakes: ["Assuming past returns promise future outcomes.", "Skipping provider and regulator checks."],
    documents_needed: ["National ID", "KRA PIN"],
    execution_route_external: "Complete any investment directly with the regulated provider.",
    disclosures: "",
    public_source_url: "",
    last_verified_at: new Date().toISOString(),
    next_review_due_at: new Date().toISOString(),
    freshness_status: "acceptable" as const,
    data_freshness: "acceptable" as const,
    is_sponsored: false,
    status: "published"
  };
});
