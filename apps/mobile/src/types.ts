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
  next_review_due_at?: string | null;
  freshness_status?: "fresh" | "acceptable" | "stale" | "unknown";
  data_freshness?: "fresh" | "acceptable" | "stale" | "unknown";
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

export type ProductRateSnapshot = {
  id: number;
  snapshot_date: string;
  rate_type: string;
  rate_value: string;
  rate_period: string;
  currency: string;
  confidence: string;
  is_current: boolean;
  raw_label: string;
  notes: string;
};

export type InvestmentProduct = {
  id: number;
  name: string;
  slug: string;
  category: ProductCategory;
  provider: { id: number; name: string; slug: string; website: string } | null;
  product_type: string;
  currency: string;
  regulator: string;
  regulator_category: string;
  license_status: string;
  minimum_amount: string | null;
  liquidity_level: "high" | "medium" | "low" | "unknown";
  risk_level: "low" | "medium" | "high" | "very_high" | "unknown";
  typical_use_cases: string[];
  not_ideal_for: string[];
  documents_needed: string[];
  beginner_mistakes: string[];
  questions_to_ask: string[];
  public_url: string;
  published_status: string;
  last_verified_at: string | null;
  freshness_status: "fresh" | "acceptable" | "stale" | "unknown";
  source_confidence: "official" | "provider_reported" | "editorial" | "third_party" | "unknown";
  current_rate: ProductRateSnapshot | null;
  educational_disclaimer: string;
};

export type ProductQuery = {
  category?: string;
  provider?: string;
  product_type?: string;
  currency?: string;
  risk_level?: string;
  liquidity_level?: string;
  minimum_amount_lte?: string;
  freshness_status?: string;
  source_confidence?: string;
  has_current_rate?: boolean;
  search?: string;
  published_status?: string;
};

export type ProductSimulationRequest = {
  product_id?: number;
  product_slug?: string;
  input_amount: string;
  monthly_topup?: string;
  timeline_months: number;
  rate_mode: "latest_snapshot" | "conservative" | "optimistic" | "user_custom";
  custom_rate?: string;
  goal?: string;
  liquidity_need?: string;
};

export type ProductSimulationResult = {
  product: { id: number; name: string; slug: string; product_type: string };
  provider: { id: number | null; name: string };
  category: { id: number; name: string; slug: string };
  input_amount: string;
  monthly_topup: string;
  timeline_months: number;
  rate_used: string | null;
  rate_source: string;
  rate_mode: string;
  rate_snapshot_id: number | null;
  freshness_status: string;
  source_confidence: string;
  fee_notes: string[];
  liquidity_notes: string[];
  risk_level: string;
  liquidity_level: string;
  beginner_mistakes: string[];
  questions_to_ask: string[];
  goal: string;
  estimated_outcome: string | null;
  total_contribution: string;
  estimated_growth: string | null;
  warnings: string[];
  disclaimer: string;
  product_simulation_run_id: number;
};

export type ProductSpecificResult = {
  product: { id: number; name: string; slug: string; product_type: string };
  provider: { id: number | null; name: string };
  category: { id: number; name: string; slug: string };
  currency: string;
  rate_used: string | null;
  rate_type: string;
  rate_mode: string;
  rate_source: string;
  rate_source_label: string;
  source_url: string;
  snapshot_date: string | null;
  freshness: string;
  source_confidence: string;
  total_contributions: string | null;
  estimated_gross_value: string | null;
  estimated_net_value: string | null;
  estimated_growth: string | null;
  estimated_interest?: string | null;
  estimated_maturity_value?: string | null;
  estimated_total_coupons?: string | null;
  estimated_dividend?: string | null;
  fees_notes: string[];
  tax_notes: string[];
  liquidity_notes: string[];
  risk_notes: string[];
  beginner_mistakes: string[];
  questions_to_ask: string[];
  warnings: string[];
  assumptions: string[];
  calculator: string;
  disclaimer: string;
  product_simulation_run_id: number;
};

export type ProductCompareItem = {
  id: number;
  name: string;
  slug: string;
  provider: string;
  category: string;
  risk_level: string;
  liquidity_level: string;
  minimum_amount: string | null;
  current_rate: {
    id: number;
    snapshot_date: string;
    rate_type: string;
    rate_value: string;
    rate_period: string;
    confidence: string;
  } | null;
  fees: string[];
  freshness_status: string;
  source_confidence: string;
  documents_needed: string[];
  questions_to_ask: string[];
};

export type ProductCompareResponse = {
  results: ProductCompareItem[];
  disclaimer: string;
};

export type CategoryCompareRequest = {
  amount: string;
  monthly_topup?: string;
  timeline_months: number;
  category?: string;
  product_type?: string;
  goal?: string;
  risk_preference?: string;
  liquidity_need?: string;
};

export type CategoryCompareResponse = {
  results: ProductSimulationResult[];
  disclaimer: string;
};

export type SimulationRateMode =
  | "latest_available_rate"
  | "conservative_scenario"
  | "neutral_scenario"
  | "optimistic_scenario"
  | "custom_educational_rate";

export type ProductSpecificRequest = {
  product_slug: string;
  initial_amount: string;
  monthly_topup?: string;
  timeline_months: number;
  rate_mode: SimulationRateMode;
  custom_rate?: string;
  compounding_frequency?: string;
  include_fees?: boolean;
  include_tax_estimate?: boolean;
  goal?: string;
};

export type CompareProductsRequest = {
  product_slugs: string[];
  initial_amount: string;
  monthly_topup?: string;
  timeline_months: number;
  rate_mode: SimulationRateMode;
  custom_rates?: Record<string, string>;
  goal?: string;
};

export type ReviewPrefill = {
  category?:
    | "mmf"
    | "treasury"
    | "sacco"
    | "chama"
    | "global_investing"
    | "land_literacy"
    | "tax"
    | "diaspora"
    | "general_first_investment";
  amountRange?: string;
  question?: string;
};

// --- Land Decision Safety (Phase 2.12) ---------------------------------------

export type LandSellerType =
  | "individual"
  | "company"
  | "agent"
  | "chama"
  | "family_member"
  | "unknown";

export type LandTitleStatus =
  | "title_seen"
  | "title_not_seen"
  | "mother_title"
  | "allotment_letter"
  | "unknown";

export type LandIntendedUse =
  | "residential"
  | "agricultural"
  | "commercial"
  | "speculation"
  | "chama_project"
  | "diaspora_investment"
  | "unknown";

export type LandDecisionStage =
  | "browsing"
  | "considering"
  | "before_deposit"
  | "deposit_paid"
  | "lawyer_review"
  | "abandoned"
  | "completed";

export type LandRiskLevel = "low" | "medium" | "high" | "very_high" | "unknown";

export type LandItemStatus =
  | "not_started"
  | "requested"
  | "received"
  | "verified_by_user"
  | "reviewed_by_professional"
  | "not_applicable"
  | "failed";

export type LandDueDiligenceItem = {
  id: number;
  item_key: string;
  title: string;
  description: string;
  status: LandItemStatus;
  importance: "low" | "medium" | "high" | "critical";
  professional_type_needed: "lawyer" | "surveyor" | "valuer" | "land_agent" | "tax" | "none";
  source_note: string;
};

export type LandRiskFlag = {
  id?: number;
  flag_type: string;
  severity: "info" | "warning" | "high" | "critical";
  message: string;
  suggested_action: string;
};

export type LandDocumentRecord = {
  id: number;
  document_type: string;
  notes: string;
  visibility: "private" | "shared_with_professional" | "shared_with_chama";
  created_at: string;
};

export type LandOpportunity = {
  id: number;
  title: string;
  location_text: string;
  county?: string;
  area_or_town?: string;
  asking_price?: string | null;
  deposit_requested?: string | null;
  plot_size?: string;
  seller_type: LandSellerType;
  title_status: LandTitleStatus;
  intended_use: LandIntendedUse;
  decision_stage: LandDecisionStage;
  risk_level: LandRiskLevel;
  privacy_mode: string;
  created_at: string;
  updated_at: string;
  due_diligence_items?: LandDueDiligenceItem[];
  risk_flags?: LandRiskFlag[];
  documents?: LandDocumentRecord[];
};

export type LandOpportunityInput = {
  title: string;
  location_text: string;
  county?: string;
  area_or_town?: string;
  asking_price?: string;
  deposit_requested?: string;
  plot_size?: string;
  seller_type?: LandSellerType;
  title_status?: LandTitleStatus;
  intended_use?: LandIntendedUse;
  decision_stage?: LandDecisionStage;
};

export type LandRiskScoreResult = {
  risk_level: LandRiskLevel;
  summary: string;
  risk_flags: LandRiskFlag[];
  missing_critical_items: string[];
  suggested_next_steps: string[];
  disclaimer: string;
};

export type LandComparisonInput = {
  land_price: string;
  deposit?: string;
  holding_period_years: number;
  appreciation_scenario: "conservative" | "neutral" | "optimistic" | "custom";
  custom_rate?: string;
  transaction_cost_estimate?: string;
  liquidity_need?: string;
};

export type LandComparisonResult = {
  land_scenario: Record<string, unknown>;
  alternatives: Array<Record<string, unknown>>;
  liquidity_comparison: string;
  risk_comparison: string;
  due_diligence_complexity: string;
  warning: string;
  disclaimer: string;
};

// --- Marketplace (Phase 2.13 + 2.15) -----------------------------------------

export type MarketplaceProduct = {
  id: number;
  name: string;
  slug: string;
  provider_name: string | null;
  category_name: string | null;
  product_type: string;
  currency: string;
  annual_yield: string | null;
  yield_type: string;
  yield_source_confidence: string;
  yield_freshness: string;
  management_fee_rate: string | null;
  withdrawal_timeline: string;
  minimum_amount: string | null;
  mpesa_paybill_available: boolean;
  dividend_rate_latest: string | null;
  interest_on_deposits_latest: string | null;
  loan_multiplier: string | null;
  minimum_shares: string | null;
  membership_eligibility: string;
  sasra_status: string;
  risk_level: string;
  liquidity_level: string;
  freshness_status: string;
  source_confidence: string;
  current_rate: { rate_value: string; snapshot_date: string; confidence: string } | null;
  sacco_due_diligence_score: number | null;
};
