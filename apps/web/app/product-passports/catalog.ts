export type PublicPassport = {
  slug: string;
  name: string;
  category: string;
  provider: string;
  description: string;
  riskLevel: string;
  liquidityLevel: string;
  minimumAmount: string;
  regulatorCategory: string;
  checks: string[];
  beginnerMistakes: string[];
  documentsNeeded: string[];
  disclosures: string[];
  externalRoute: string;
  sourceLabel: string;
  sourceUrl: string;
  learningTrackTitle: string;
  learningTrackHref: string;
  lastVerified: string;
};

export const publicPassports: PublicPassport[] = [
  {
    slug: "generic-mmf",
    name: "Generic MMF",
    category: "Money Market Funds",
    provider: "Generic educational provider",
    description: "Learn how Kenyan money market funds quote yield, handle withdrawals, charge fees, and disclose risk.",
    riskLevel: "Low",
    liquidityLevel: "High",
    minimumAmount: "KES 1,000",
    regulatorCategory: "CMA",
    checks: ["Provider and fund manager licensing", "Current yield basis", "Fees and withdrawal timelines"],
    beginnerMistakes: ["Treating quoted yield as a promised return", "Ignoring withdrawal processing time"],
    documentsNeeded: ["National ID or passport", "KRA PIN", "Bank or M-Pesa details as requested by provider"],
    disclosures: ["Returns vary daily", "Fees can reduce net yield", "Withdrawals may not be instant"],
    externalRoute: "Compare here, then verify directly with a licensed provider before opening externally.",
    sourceLabel: "Capital Markets Authority licensee register",
    sourceUrl: "https://licensees.cma.or.ke/",
    learningTrackTitle: "Money Market Funds",
    learningTrackHref: "/learning",
    lastVerified: "15 Jun 2026"
  },
  {
    slug: "generic-treasury-bill-via-dhowcsd",
    name: "Generic Treasury Bill via DhowCSD",
    category: "Treasury Bills",
    provider: "Generic educational provider",
    description: "Learn DhowCSD basics, auction timing, maturities, discount pricing, and settlement considerations.",
    riskLevel: "Low",
    liquidityLevel: "Medium",
    minimumAmount: "KES 100,000",
    regulatorCategory: "CBK",
    checks: ["Auction calendar", "Maturity date", "Settlement and tax treatment"],
    beginnerMistakes: ["Using money needed before maturity", "Confusing discount rate with net return"],
    documentsNeeded: ["National ID or passport", "KRA PIN", "CDS/DhowCSD account setup details"],
    disclosures: ["Auction outcomes vary", "Funds can be locked until maturity", "Tax treatment can change"],
    externalRoute: "Use official channels and verify current CBK/DhowCSD instructions before acting.",
    sourceLabel: "CBK government securities and DhowCSD",
    sourceUrl: "https://www.centralbank.go.ke/securities/",
    learningTrackTitle: "Treasury Bills and Bonds",
    learningTrackHref: "/learning",
    lastVerified: "15 Jun 2026"
  },
  {
    slug: "generic-sacco-deposits",
    name: "Generic SACCO Deposits",
    category: "SACCOs",
    provider: "Generic educational provider",
    description: "Learn SACCO membership, deposits, share capital, dividends, rebates, and withdrawal constraints.",
    riskLevel: "Moderate",
    liquidityLevel: "Low",
    minimumAmount: "Varies",
    regulatorCategory: "SASRA or cooperative oversight",
    checks: ["Registration and supervision", "Share capital rules", "Withdrawal and loan obligations"],
    beginnerMistakes: ["Assuming deposits are instantly liquid", "Skipping governance and audited accounts"],
    documentsNeeded: ["Membership form", "National ID", "KRA PIN", "Share capital or joining fee evidence"],
    disclosures: ["Liquidity depends on bylaws", "Governance quality varies", "Loan obligations can affect deposits"],
    externalRoute: "Review documents and speak directly with the SACCO before joining externally.",
    sourceLabel: "SASRA licensed SACCO lists",
    sourceUrl: "https://www.sasra.go.ke/licensed-dt-saccos/",
    learningTrackTitle: "SACCO Smart Member",
    learningTrackHref: "/learning",
    lastVerified: "15 Jun 2026"
  },
  {
    slug: "generic-us-etf-route",
    name: "Generic US ETF route",
    category: "US Stocks and ETFs",
    provider: "Generic educational provider",
    description: "Learn FX, offshore brokerage, custody, tax, transfer costs, and volatility before using global routes.",
    riskLevel: "High",
    liquidityLevel: "Medium",
    minimumAmount: "Varies",
    regulatorCategory: "Foreign broker and local tax checks",
    checks: ["Broker regulation", "FX and transfer fees", "Tax and estate considerations"],
    beginnerMistakes: ["Ignoring FX spreads", "Treating global access as lower risk"],
    documentsNeeded: ["Identity verification", "Tax details", "Source of funds details", "Broker onboarding documents"],
    disclosures: ["Currency risk applies", "Foreign tax and estate rules may apply", "Broker custody risk varies"],
    externalRoute: "Verify broker status, tax obligations, and transfer costs independently before acting.",
    sourceLabel: "KRA tax education reference",
    sourceUrl: "https://www.kra.go.ke/",
    learningTrackTitle: "Global Stocks and ETFs",
    learningTrackHref: "/learning",
    lastVerified: "15 Jun 2026"
  },
  {
    slug: "generic-land-due-diligence-checklist",
    name: "Generic Land Due Diligence Checklist",
    category: "Land",
    provider: "Generic educational provider",
    description: "Learn title searches, survey checks, valuation, legal review, taxes, and fraud red flags.",
    riskLevel: "High",
    liquidityLevel: "Low",
    minimumAmount: "Varies",
    regulatorCategory: "Land registry and professional due diligence",
    checks: ["Title search", "Survey and beacon verification", "Independent legal review"],
    beginnerMistakes: ["Paying before verification", "Skipping seller identity checks"],
    documentsNeeded: ["Title documents", "Seller identity documents", "Survey map", "Official search results"],
    disclosures: ["Fraud risk can be high", "Liquidity is low", "Independent legal review is important"],
    externalRoute: "Use independent legal and official registry checks before any external transaction.",
    sourceLabel: "Ardhisasa land services",
    sourceUrl: "https://ardhisasa.lands.go.ke/",
    learningTrackTitle: "Land Due Diligence Basics",
    learningTrackHref: "/learning",
    lastVerified: "15 Jun 2026"
  }
];

export function findPublicPassport(slug: string) {
  return publicPassports.find((passport) => passport.slug === slug);
}
