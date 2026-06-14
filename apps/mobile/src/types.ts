export type AmountRangeId = "1k-5k" | "5k-20k" | "20k-100k" | "100k-500k" | "500k-plus";

export type GoalId =
  | "emergency-fund"
  | "first-investment"
  | "sacco-chama"
  | "treasury-bills"
  | "global-stocks"
  | "land"
  | "scam-check"
  | "speak-to-professional";

export type AmountDisplayMode = "exact" | "rounded" | "range" | "hidden";

export type RouteProfile = {
  amountRangeId: AmountRangeId;
  amountLabel: string;
  goalId: GoalId;
  goalLabel: string;
  path: string[];
  learnFirst: string[];
  avoid: string[];
  riskNotes: string[];
  liquidityNotes: string[];
};

export type JournalEntry = {
  id: string;
  goal: string;
  decision: string;
  amountDisplayMode: AmountDisplayMode;
  amountText: string;
  reason: string;
  createdAt: string;
};

export type PortfolioItem = {
  id: string;
  assetType: string;
  providerName: string;
  amountDisplayMode: AmountDisplayMode;
  amountText: string;
  liquidityLevel: "high" | "medium" | "low" | "locked";
  riskLevel: "low" | "moderate" | "high" | "very_high";
  createdAt: string;
};

export type AuthCredentials = {
  username: string;
  password: string;
};

export type ProductCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
};

export type ProductPassport = {
  id: number;
  name: string;
  slug: string;
  category: ProductCategory;
  provider?: {
    id: number;
    name: string;
    regulator_category: string;
    website: string;
    status: string;
  } | null;
  regulator_category: string;
  minimum_amount: string | null;
  liquidity_level: string;
  risk_level: string;
  withdrawal_timeline: string;
  fees_summary: string;
  tax_notes: string;
  beginner_mistakes: string[];
  documents_needed: string[];
  execution_route_external: string;
  disclosures: string;
  is_sponsored: boolean;
  status: string;
};

export type CatalogState = {
  categories: ProductCategory[];
  passports: ProductPassport[];
  loading: boolean;
  error: string | null;
  source: "api" | "cache" | "mock";
  lastUpdated: string | null;
};
