export type AmountRangeId =
  | "1k-5k"
  | "5k-20k"
  | "20k-100k"
  | "100k-500k"
  | "500k-plus"
  | "prefer-not-to-say";

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
export type SyncStatus = "local_only" | "pending" | "synced" | "failed" | "conflict";
export type SyncEntity = "journal" | "portfolio";
export type SyncAction = "create" | "update" | "delete";

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
  localId: string;
  serverId?: number;
  syncStatus: SyncStatus;
  syncError?: string;
  version?: number;
  goal: string;
  decision: string;
  amountDisplayMode: AmountDisplayMode;
  amountText: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  pendingDelete?: boolean;
};

export type PortfolioItem = {
  localId: string;
  serverId?: number;
  syncStatus: SyncStatus;
  syncError?: string;
  version?: number;
  assetType: string;
  providerName: string;
  amountDisplayMode: AmountDisplayMode;
  amountText: string;
  liquidityLevel: "high" | "medium" | "low" | "locked";
  riskLevel: "low" | "moderate" | "high" | "very_high";
  maturityDate?: string;
  createdAt: string;
  updatedAt: string;
  pendingDelete?: boolean;
};

export type JournalEntryDraft = Pick<JournalEntry, "goal" | "decision" | "amountDisplayMode" | "amountText" | "reason">;

export type PortfolioItemDraft = Pick<
  PortfolioItem,
  "assetType" | "providerName" | "amountDisplayMode" | "amountText" | "liquidityLevel" | "riskLevel" | "maturityDate"
>;

export type SyncQueueItem = {
  id: string;
  entity: SyncEntity;
  action: SyncAction;
  localId: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

export type AuthCredentials = {
  username: string;
  password?: string;
  token?: string;
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
  description: string;
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
  public_source_url?: string;
  last_verified_at?: string | null;
  source_references?: Array<{
    id: number;
    title: string;
    url: string;
    citation_label: string;
    notes: string;
    source?: {
      id: number;
      name: string;
      slug: string;
      homepage_url: string;
      data_url: string;
    };
  }>;
  is_sponsored: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type CatalogState = {
  categories: ProductCategory[];
  passports: ProductPassport[];
  loading: boolean;
  error: string | null;
  source: "api" | "cache" | "mock";
  lastUpdated: string | null;
};
