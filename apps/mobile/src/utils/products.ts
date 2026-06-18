import type { InvestmentProduct, ProductQuery } from "../types";

export type SimCategory = {
  key: string;
  label: string;
  productType: string;
  categorySlug: string;
  defaultRisk: string;
  defaultLiquidity: string;
  blurb: string;
};

// Top-level educational categories shown on the Simulate tab.
// defaultRisk/defaultLiquidity are educational generalisations used only when
// no live product data is available; live products always override these.
export const SIM_CATEGORIES: SimCategory[] = [
  {
    key: "mmf",
    label: "Money Market Funds",
    productType: "money_market_fund",
    categorySlug: "money-market-funds",
    defaultRisk: "low",
    defaultLiquidity: "high",
    blurb: "Pooled short-term funds. Compare yield, fees, and withdrawal time."
  },
  {
    key: "tbill",
    label: "Treasury Bills",
    productType: "treasury_bill",
    categorySlug: "treasury-bills",
    defaultRisk: "low",
    defaultLiquidity: "medium",
    blurb: "Short government securities sold at a discount via CBK/DhowCSD."
  },
  {
    key: "tbond",
    label: "Treasury Bonds",
    productType: "treasury_bond",
    categorySlug: "treasury-bonds",
    defaultRisk: "low",
    defaultLiquidity: "medium",
    blurb: "Longer government securities paying periodic coupons."
  },
  {
    key: "sacco",
    label: "SACCOs",
    productType: "sacco_deposit",
    categorySlug: "saccos",
    defaultRisk: "medium",
    defaultLiquidity: "low",
    blurb: "Member deposits and dividends. Check bylaws and exit rules."
  },
  {
    key: "fixed_deposit",
    label: "Fixed Deposits",
    productType: "fixed_deposit",
    categorySlug: "fixed-deposits",
    defaultRisk: "low",
    defaultLiquidity: "low",
    blurb: "Bank deposits locked for a fixed term at an agreed rate."
  },
  {
    key: "nse",
    label: "NSE Stocks",
    productType: "nse_share_route",
    categorySlug: "nse-stocks",
    defaultRisk: "high",
    defaultLiquidity: "medium",
    blurb: "Listed Kenyan shares. We show the directory, never live prices."
  },
  {
    key: "global",
    label: "Global Stocks / ETFs",
    productType: "global_etf_route",
    categorySlug: "global-stocks-and-etfs",
    defaultRisk: "high",
    defaultLiquidity: "medium",
    blurb: "Global routes via regulated brokers. Mind FX, custody, and tax."
  },
  {
    key: "reit",
    label: "REITs",
    productType: "reit",
    categorySlug: "reits",
    defaultRisk: "medium",
    defaultLiquidity: "medium",
    blurb: "Listed property trusts. Income and value can both move."
  },
  {
    key: "land",
    label: "Land",
    productType: "land_due_diligence",
    categorySlug: "land",
    defaultRisk: "medium",
    defaultLiquidity: "low",
    blurb: "Due-diligence literacy. No rate exists; this is a checklist route."
  },
  {
    key: "crypto",
    label: "Bitcoin / Crypto Risk",
    productType: "bitcoin_crypto_risk_route",
    categorySlug: "bitcoin-and-crypto-risk",
    defaultRisk: "very_high",
    defaultLiquidity: "medium",
    blurb: "High-risk literacy card. Focus on volatility, custody, and exit questions."
  }
];

export type ProductFilters = {
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
};

export const FRESHNESS_OPTIONS = ["fresh", "acceptable", "stale", "unknown"] as const;
export const CONFIDENCE_OPTIONS = [
  "official",
  "provider_reported",
  "editorial",
  "third_party",
  "unknown"
] as const;
export const RISK_OPTIONS = ["low", "medium", "high", "very_high"] as const;
export const LIQUIDITY_OPTIONS = ["high", "medium", "low"] as const;
export const CURRENCY_OPTIONS = ["KES", "USD", "GBP", "EUR", "MULTI"] as const;

// Build a clean ProductQuery, dropping empty/undefined values so we never send
// blank query params to the API.
export function buildProductQuery(filters: ProductFilters): ProductQuery {
  const query: ProductQuery = {};
  if (filters.category) query.category = filters.category;
  if (filters.provider) query.provider = filters.provider;
  if (filters.product_type) query.product_type = filters.product_type;
  if (filters.currency) query.currency = filters.currency;
  if (filters.risk_level) query.risk_level = filters.risk_level;
  if (filters.liquidity_level) query.liquidity_level = filters.liquidity_level;
  if (filters.minimum_amount_lte) query.minimum_amount_lte = filters.minimum_amount_lte;
  if (filters.freshness_status) query.freshness_status = filters.freshness_status;
  if (filters.source_confidence) query.source_confidence = filters.source_confidence;
  if (filters.has_current_rate) query.has_current_rate = true;
  return query;
}

export function activeFilterCount(filters: ProductFilters): number {
  return Object.values(buildProductQuery(filters)).filter(
    (value) => value !== undefined && value !== ""
  ).length;
}

// 2 to 4 products may be compared at once.
export function canCompare(selectedIds: number[]): boolean {
  return selectedIds.length >= 2 && selectedIds.length <= 4;
}

export function toggleCompareSelection(selectedIds: number[], id: number): number[] {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((value) => value !== id);
  }
  if (selectedIds.length >= 4) {
    return selectedIds;
  }
  return [...selectedIds, id];
}

export function freshnessLabel(status: string | null | undefined): string {
  switch (status) {
    case "fresh":
      return "Fresh data";
    case "acceptable":
      return "Acceptable age";
    case "stale":
      return "Data may be stale";
    default:
      return "Freshness unknown";
  }
}

export function freshnessTone(status: string | null | undefined): "emerald" | "amber" | "danger" | "muted" {
  switch (status) {
    case "fresh":
      return "emerald";
    case "acceptable":
      return "amber";
    case "stale":
      return "danger";
    default:
      return "muted";
  }
}

export function confidenceLabel(confidence: string | null | undefined): string {
  switch (confidence) {
    case "official":
      return "Official source";
    case "provider_reported":
      return "Provider reported";
    case "editorial":
      return "Editorial entry";
    case "third_party":
      return "Third-party data";
    default:
      return "Source unconfirmed";
  }
}

export const RATE_MODES = [
  { key: "latest_snapshot", label: "Latest available rate" },
  { key: "conservative", label: "Conservative scenario" },
  { key: "optimistic", label: "Optimistic scenario" },
  { key: "user_custom", label: "Custom educational rate" }
] as const;

export type RateModeKey = (typeof RATE_MODES)[number]["key"];

export function rateModeLabel(mode: string): string {
  return RATE_MODES.find((item) => item.key === mode)?.label ?? "Educational rate";
}

// Rate modes for the provider-specific simulation engine (Phase 2.10.2).
export const PRODUCT_SPECIFIC_RATE_MODES = [
  { key: "latest_available_rate", label: "Latest available rate" },
  { key: "conservative_scenario", label: "Conservative" },
  { key: "neutral_scenario", label: "Neutral" },
  { key: "optimistic_scenario", label: "Optimistic" },
  { key: "custom_educational_rate", label: "Custom rate" }
] as const;

export type ProductSpecificRateModeKey = (typeof PRODUCT_SPECIFIC_RATE_MODES)[number]["key"];

// Plain-language description of where the rate came from. Never implies the rate
// is verified or guaranteed.
export function rateSourceNote(result: {
  rate_mode: string;
  rate_used: string | null;
  rate_snapshot_id: number | null;
  source_confidence: string;
}): string {
  if (result.rate_used === null) {
    return "Latest rate unavailable. Enter a custom educational rate to explore assumptions.";
  }
  if (result.rate_mode === "user_custom") {
    return "User custom educational assumption. Not verified by PesaRoute.";
  }
  if (result.rate_mode === "conservative" || result.rate_mode === "optimistic") {
    return `${rateModeLabel(result.rate_mode)} — an educational assumption, not a live rate.`;
  }
  if (result.rate_snapshot_id) {
    return `Latest snapshot (${confidenceLabel(result.source_confidence)}).`;
  }
  return "Educational estimate only.";
}

export function hasCurrentRate(product: Pick<InvestmentProduct, "current_rate">): boolean {
  return Boolean(product.current_rate);
}

// Map an investment product type to the closest professional-review category.
export function consultationCategoryForProductType(productType: string): string {
  switch (productType) {
    case "money_market_fund":
    case "fixed_income_fund":
    case "balanced_fund":
    case "equity_fund":
      return "mmf";
    case "treasury_bill":
    case "treasury_bond":
    case "infrastructure_bond":
      return "treasury";
    case "sacco_deposit":
    case "sacco_share_capital":
      return "sacco";
    case "global_etf_route":
    case "global_stock_route":
    case "bitcoin_route":
      return "global_investing";
    case "land_due_diligence":
      return "land_literacy";
    default:
      return "general_first_investment";
  }
}

// Count products in a category and whether any have a current rate snapshot.
export function summariseCategory(
  products: InvestmentProduct[],
  category: SimCategory
): { count: number; providers: number; hasData: boolean } {
  const matching = products.filter(
    (product) =>
      product.product_type === category.productType ||
      product.category?.slug === category.categorySlug
  );
  const providers = new Set(
    matching.map((product) => product.provider?.id).filter((value): value is number => value != null)
  );
  return {
    count: matching.length,
    providers: providers.size,
    hasData: matching.some((product) => Boolean(product.current_rate))
  };
}
