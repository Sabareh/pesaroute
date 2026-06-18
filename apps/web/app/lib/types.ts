export type ProductCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
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
  source_reference?: {
    id: number;
    title: string;
    url: string;
    citation_label: string;
  } | null;
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
  minimum_amount_notes?: string;
  liquidity_level: string;
  risk_level: string;
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

export type InvestmentProductDetail = InvestmentProduct & {
  source_references: Array<{
    id: number;
    title: string;
    url: string;
    citation_label: string;
    notes: string;
  }>;
  current_rate_snapshot: ProductRateSnapshot | null;
  previous_rate_snapshots: ProductRateSnapshot[];
  fee_schedule: Array<{
    id: number;
    fee_type: string;
    fee_value: string | null;
    fee_unit: string;
    notes: string;
    is_current: boolean;
  }>;
  liquidity_rules: Array<{
    id: number;
    withdrawal_timeline: string;
    lock_in_period: string;
    maturity_period_days: number | null;
    early_withdrawal_notes: string;
    liquidity_level: string;
  }>;
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

export type ProductFilters = {
  product_type?: string;
  currency?: string;
  risk_level?: string;
  liquidity_level?: string;
  freshness_status?: string;
  source_confidence?: string;
  minimum_amount_lte?: string;
  provider?: string;
  has_current_rate?: boolean;
  search?: string;
};
