import type {
  InvestmentProduct,
  InvestmentProductDetail,
  ProductCategory,
  ProductCompareItem,
  ProductFilters,
  ProductSimulationResult
} from "./types";

export function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  return configured.replace(/\/+$/, "");
}

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function buildQuery(filters: ProductFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "" || value === false) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

// Server-side fetch helpers. These revalidate every 5 minutes to match the
// API's Cache-Control header. They return null/[] on failure so pages can show
// a graceful fallback instead of crashing.

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/catalog/categories/`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return [];
    const data: Paginated<ProductCategory> = await response.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function fetchProducts(filters: ProductFilters = {}): Promise<{ products: InvestmentProduct[]; ok: boolean }> {
  try {
    // Follow pagination so every category is represented, not just the first page
    // (the API paginates at 20; the catalogue has 300+ products).
    const products: InvestmentProduct[] = [];
    let url: string | null = `${apiBaseUrl()}/api/products/${buildQuery(filters)}`;
    while (url) {
      const response: Response = await fetch(url, {
        next: { revalidate: 300 },
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return { products: [], ok: false };
      const data: Paginated<InvestmentProduct> = await response.json();
      products.push(...(data.results ?? []));
      url = data.next ?? null;
    }
    return { products, ok: true };
  } catch {
    return { products: [], ok: false };
  }
}

export async function fetchProduct(slug: string): Promise<InvestmentProductDetail | null> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/products/${encodeURIComponent(slug)}/`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;
    return (await response.json()) as InvestmentProductDetail;
  } catch {
    return null;
  }
}

export async function fetchCompare(productIds: Array<number | string>): Promise<ProductCompareItem[]> {
  if (productIds.length === 0) return [];
  try {
    const response = await fetch(`${apiBaseUrl()}/api/products/compare/?product_ids=${productIds.join(",")}`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return [];
    const data: { results: ProductCompareItem[] } = await response.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

// Client-side simulation POST (no auth required; anonymous educational use).
export type ProductSimulationPayload = {
  product_slug: string;
  input_amount: string;
  monthly_topup?: string;
  timeline_months: number;
  rate_mode: "latest_snapshot" | "conservative" | "optimistic" | "user_custom";
  custom_rate?: string;
  goal?: string;
  liquidity_need?: string;
};

export async function postProductSimulation(payload: ProductSimulationPayload): Promise<ProductSimulationResult> {
  const response = await fetch(`${apiBaseUrl()}/api/simulations/product/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Simulation failed (${response.status})`);
  }
  return (await response.json()) as ProductSimulationResult;
}

// ---- Provider-specific simulation engine (Phase 2.10.2 endpoints) ----------

export type WebRateMode =
  | "latest_available_rate"
  | "conservative_scenario"
  | "neutral_scenario"
  | "optimistic_scenario"
  | "custom_educational_rate";

export type ProductSpecificPayload = {
  product_slug: string;
  initial_amount: string;
  monthly_topup?: string;
  timeline_months: number;
  rate_mode: WebRateMode;
  custom_rate?: string;
  compounding_frequency?: string;
  include_fees?: boolean;
  include_tax_estimate?: boolean;
  goal?: string;
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
  maturity_date?: string | null;
  estimated_dividend?: string | null;
  possible_loan_eligibility?: string | null;
  estimated_total_coupons?: string | null;
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

function authHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Token ${token}`;
  return headers;
}

export async function postProductSpecific(payload: ProductSpecificPayload, token?: string | null): Promise<ProductSpecificResult> {
  const response = await fetch(`${apiBaseUrl()}/api/simulations/product-specific/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Simulation failed (${response.status})`);
  }
  return (await response.json()) as ProductSpecificResult;
}

export type CompareProductsPayload = {
  product_slugs: string[];
  initial_amount: string;
  monthly_topup?: string;
  timeline_months: number;
  rate_mode: WebRateMode;
  custom_rates?: Record<string, string>;
  goal?: string;
};

export type CompareProductsResult = {
  comparison_note: string;
  disclaimer: string;
  rows: Array<{
    product: { id: number; name: string; slug: string; product_type: string };
    provider: string;
    rate_used: string | null;
    rate_source: string;
    rate_source_label: string;
    estimated_value: string | null;
    estimated_growth: string | null;
    risk: string;
    liquidity: string;
    freshness: string;
    source_confidence: string;
    warnings: string[];
  }>;
};

export async function postCompareProducts(payload: CompareProductsPayload, token?: string | null): Promise<CompareProductsResult> {
  const response = await fetch(`${apiBaseUrl()}/api/simulations/compare-products/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Compare failed (${response.status})`);
  }
  return (await response.json()) as CompareProductsResult;
}

export async function saveSimulationToJournal(runId: number, token: string, goal?: string): Promise<{ journal_entry_id: number; note: string }> {
  const response = await fetch(`${apiBaseUrl()}/api/simulations/${runId}/save-to-journal/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(goal ? { goal } : {})
  });
  if (!response.ok) throw new Error(`Save failed (${response.status})`);
  return await response.json();
}

export async function requestSimulationReview(runId: number, token: string): Promise<{ consultation_request_id: number; note: string }> {
  const response = await fetch(`${apiBaseUrl()}/api/simulations/${runId}/request-professional-review/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({})
  });
  if (!response.ok) throw new Error(`Review request failed (${response.status})`);
  return await response.json();
}

// ---- Virtual (educational) portfolios --------------------------------------

export type VirtualPortfolio = {
  id: number;
  name: string;
  starting_virtual_cash: string;
  currency: string;
  goal: string;
  positions: Array<{
    id: number;
    product_name: string;
    product_slug: string;
    virtual_amount_allocated: string;
    rate_mode: string;
    timeline_months: number;
  }>;
};

export async function createVirtualPortfolio(body: { name?: string; starting_virtual_cash: string; currency?: string; goal?: string }, token: string): Promise<VirtualPortfolio> {
  const response = await fetch(`${apiBaseUrl()}/api/simulations/virtual-portfolios/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Create failed (${response.status})`);
  return await response.json();
}

export async function addVirtualPosition(portfolioId: number, body: { product_slug: string; virtual_amount_allocated: string; rate_mode: WebRateMode; custom_rate?: string; timeline_months: number }, token: string): Promise<VirtualPortfolio> {
  const response = await fetch(`${apiBaseUrl()}/api/simulations/virtual-portfolios/${portfolioId}/positions/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Add position failed (${response.status})`);
  return await response.json();
}

export type VirtualRunResult = {
  portfolio_id: number;
  snapshot_id: number;
  label: string;
  estimated_value: string;
  total_contributions: string;
  estimated_growth: string;
  rows: Array<{ product: string; provider: string; allocated: string; rate_mode: string; estimated_value: string | null; estimated_growth: string | null; warnings: string[] }>;
  disclaimer: string;
};

export async function runVirtualPortfolio(portfolioId: number, token: string): Promise<VirtualRunResult> {
  const response = await fetch(`${apiBaseUrl()}/api/simulations/virtual-portfolios/${portfolioId}/run/`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify({})
  });
  if (!response.ok) throw new Error(`Run failed (${response.status})`);
  return await response.json();
}

// --- Land Decision Safety (Phase 2.12) ---------------------------------------

export type LandDueDiligenceItem = {
  id: number;
  item_key: string;
  title: string;
  description: string;
  status: string;
  importance: "low" | "medium" | "high" | "critical";
  professional_type_needed: string;
  source_note: string;
};

export type LandRiskFlag = {
  flag_type: string;
  severity: "info" | "warning" | "high" | "critical";
  message: string;
  suggested_action: string;
};

export type LandOpportunity = {
  id: number;
  title: string;
  location_text: string;
  county?: string;
  asking_price?: string | null;
  deposit_requested?: string | null;
  seller_type: string;
  title_status: string;
  intended_use: string;
  decision_stage: string;
  risk_level: string;
  privacy_mode: string;
  due_diligence_items?: LandDueDiligenceItem[];
  risk_flags?: LandRiskFlag[];
  documents?: Array<{ id: number; document_type: string; visibility: string; notes: string }>;
};

export type LandRiskResult = {
  risk_level: string;
  summary: string;
  risk_flags: LandRiskFlag[];
  missing_critical_items: string[];
  suggested_next_steps: string[];
  disclaimer: string;
};

export type LandCompareResult = {
  land_scenario: Record<string, unknown>;
  alternatives: Array<Record<string, unknown>>;
  liquidity_comparison: string;
  risk_comparison: string;
  due_diligence_complexity: string;
  warning: string;
  disclaimer: string;
};

export async function fetchLandDefaultChecklist(): Promise<{ items: LandDueDiligenceItem[]; disclaimer: string }> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/land/default-checklist/`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return { items: [], disclaimer: "" };
    return (await response.json()) as { items: LandDueDiligenceItem[]; disclaimer: string };
  } catch {
    return { items: [], disclaimer: "" };
  }
}

export async function postLandCompare(payload: {
  land_price: string;
  deposit?: string;
  holding_period_years: number;
  appreciation_scenario: string;
  custom_rate?: string;
  transaction_cost_estimate?: string;
  liquidity_need?: string;
}): Promise<LandCompareResult> {
  const response = await fetch(`${apiBaseUrl()}/api/land/compare/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Comparison failed (${response.status})`);
  return (await response.json()) as LandCompareResult;
}

export async function getLandOpportunity(id: number, token: string): Promise<LandOpportunity> {
  const response = await fetch(`${apiBaseUrl()}/api/land/opportunities/${id}/`, { headers: authHeaders(token) });
  if (!response.ok) throw new Error(`Could not load opportunity (${response.status})`);
  return (await response.json()) as LandOpportunity;
}

export async function scoreLandRisk(id: number, token: string): Promise<LandRiskResult> {
  const response = await fetch(`${apiBaseUrl()}/api/land/opportunities/${id}/risk-score/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({})
  });
  if (!response.ok) throw new Error(`Risk score failed (${response.status})`);
  return (await response.json()) as LandRiskResult;
}

export async function updateLandChecklistItem(itemId: number, status: string, token: string): Promise<LandDueDiligenceItem> {
  const response = await fetch(`${apiBaseUrl()}/api/land/checklist-items/${itemId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error(`Update failed (${response.status})`);
  return (await response.json()) as LandDueDiligenceItem;
}

export async function saveLandToJournal(id: number, note: string, token: string): Promise<{ journal_entry_id: number }> {
  const response = await fetch(`${apiBaseUrl()}/api/land/opportunities/${id}/save-to-journal/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ note })
  });
  if (!response.ok) throw new Error(`Save failed (${response.status})`);
  return (await response.json()) as { journal_entry_id: number };
}

export async function requestLandReview(
  id: number,
  body: { professional_type: string; share_amount?: boolean; question?: string },
  token: string
): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBaseUrl()}/api/land/opportunities/${id}/request-professional-review/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Review request failed (${response.status})`);
  return (await response.json()) as Record<string, unknown>;
}

// --- Marketplace decision layer (Phase 2.13 + 2.15) -------------------------

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
  yield_snapshot_date: string | null;
  yield_source_url: string;
  yield_source_confidence: string;
  yield_freshness: string;
  management_fee_rate: string | null;
  withdrawal_timeline: string;
  minimum_amount: string | null;
  minimum_topup: string | null;
  mpesa_paybill_available: boolean;
  mpesa_paybill_number: string;
  withholding_tax_rate: string;
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
  regulator_category: string;
  current_rate: { rate_value: string; rate_type: string; snapshot_date: string; confidence: string; source_url: string } | null;
  sacco_due_diligence_score: number | null;
};

export type MarketplaceListResponse = {
  count: number;
  results: MarketplaceProduct[];
  land_notice?: { headline: string; steps: string[]; url: string };
};

function mpBase(): string {
  return `${apiBaseUrl()}/api/marketplace`;
}

export async function getMarketplaceProducts(params: Record<string, string> = {}): Promise<MarketplaceListResponse> {
  const qs = new URLSearchParams({ ...params, page_size: "60" }).toString();
  const res = await fetch(`${mpBase()}/products/?${qs}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) return { count: 0, results: [] };
  return (await res.json()) as MarketplaceListResponse;
}

export async function getMarketplaceProduct(slug: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${mpBase()}/products/${encodeURIComponent(slug)}/`, { next: { revalidate: 120 }, headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

export async function postFinder(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/finder/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  return (await res.json()) as Record<string, unknown>;
}

export async function postMmfFinder(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/mmf-finder/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  return (await res.json()) as Record<string, unknown>;
}

export async function postNetAfterTax(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/net-after-tax/`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Calculation failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

export async function getMarketplaceCompare(slugs: string[], amount?: string): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ slugs: slugs.join(",") });
  if (amount) qs.set("amount", amount);
  const res = await fetch(`${mpBase()}/products/compare/?${qs.toString()}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  return (await res.json()) as Record<string, unknown>;
}

export async function getQuickScenarios(): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/quick-scenarios/`, { next: { revalidate: 600 }, headers: { Accept: "application/json" } });
  return (await res.json()) as Record<string, unknown>;
}

export async function getMarketplaceIntelligence(): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/intelligence/`, { cache: "no-store", headers: { Accept: "application/json" } });
  return (await res.json()) as Record<string, unknown>;
}

export async function getSaccoScore(slug: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/products/${encodeURIComponent(slug)}/sacco-score/`, { cache: "no-store", headers: { Accept: "application/json" } });
  return (await res.json()) as Record<string, unknown>;
}

export async function listWatchlist(token: string): Promise<{ count: number; results: Array<Record<string, unknown>> }> {
  const res = await fetch(`${mpBase()}/watchlist/`, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) return { count: 0, results: [] };
  return (await res.json()) as { count: number; results: Array<Record<string, unknown>> };
}

export async function addToWatchlist(slug: string, note: string, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/watchlist/`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ product_slug: slug, note }) });
  if (!res.ok) throw new Error(`Could not watch (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

export async function removeFromWatchlist(id: number, token: string): Promise<void> {
  await fetch(`${mpBase()}/watchlist/${id}/`, { method: "DELETE", headers: authHeaders(token) });
}

export async function getPersonalBrief(token: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/personal-brief/`, { headers: authHeaders(token), cache: "no-store" });
  return (await res.json()) as Record<string, unknown>;
}

export async function saveProductToJournal(slug: string, note: string, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/products/${encodeURIComponent(slug)}/save-to-journal/`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ note }) });
  if (!res.ok) throw new Error(`Save failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

export async function requestProductReview(slug: string, body: Record<string, unknown>, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${mpBase()}/products/${encodeURIComponent(slug)}/request-review/`, { method: "POST", headers: authHeaders(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Review request failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

// --- Professional portal: leads, scoped context, consultations ---------------
// Scope keys a user can grant a professional. The portal redacts any field whose
// scope is not present in a lead context's `allowed_scopes`.
export type DataGrantScope =
  | "consultation_context"
  | "portfolio_summary"
  | "portfolio_exact_values"
  | "journal_entries"
  | "contact_info"
  | "selected_documents";

export type ConsultationLead = {
  id: number;
  category: string;
  amount_display_mode: "exact" | "rounded" | "range" | "hidden";
  amount_range_min: string | null;
  amount_range_max: string | null;
  user_question: string; // "" until the professional is selected on this lead
  timeline: string;
  risk_preference: string;
  preferred_language: string;
  status: string;
  selected_professional: number | null;
  selected_professional_name: string;
  created_at: string;
  response_count: number;
  offer_count: number;
};

export type ConsultationContext = {
  consultation: {
    id: number;
    category: string;
    topic: string;
    user_question: string;
    timeline: string;
    risk_preference: string;
    preferred_language: string;
    status: string;
    created_at: string;
  };
  allowed_scopes: DataGrantScope[];
  contact_info?: { username: string; email: string; first_name: string; last_name: string } | null;
  portfolio_summary?: {
    asset_categories?: Record<string, number>;
    asset_allocation?: Record<string, string>;
    liquidity_score: number;
    risk_concentration_note: string;
    items_count: number;
  } | null;
  portfolio_exact_values?: Array<{ asset_type: string; provider_name: string; amount_exact: string | null }> | null;
  journal_entries?: Array<{ id: number; goal: string; decision: string; reason: string; created_at: string }> | null;
};

export type ConsultationListItem = {
  id: number;
  category: string;
  status: string;
  platform_fee_amount: string | null;
  scheduled_at: string | null;
  created_at: string;
};

export async function getProfessionalLeads(token: string): Promise<ConsultationLead[]> {
  const res = await fetch(`${mpBase()}/professional/leads/`, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : (data.results ?? [])) as ConsultationLead[];
}

export async function getProfessionalConsultations(token: string): Promise<ConsultationListItem[]> {
  const res = await fetch(`${mpBase()}/professional/consultations/`, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : (data.results ?? [])) as ConsultationListItem[];
}

export async function getConsultationContext(leadId: number, token: string): Promise<ConsultationContext | null> {
  const res = await fetch(`${mpBase()}/consultation-requests/${leadId}/context/`, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as ConsultationContext;
}

export async function respondToLead(
  leadId: number,
  body: { response_text: string; next_steps?: string; proposed_fee?: string; estimated_duration?: string; available_slots_text?: string },
  token: string
): Promise<{ response: Record<string, unknown>; offer: Record<string, unknown> | null }> {
  const res = await fetch(`${mpBase()}/professional/leads/${leadId}/respond/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Could not send offer (${res.status})`);
  return (await res.json()) as { response: Record<string, unknown>; offer: Record<string, unknown> | null };
}

// --- Land county market (indicative averages joined to real county boundaries) ---
export type CountyMarketSub = { name: string; avg_price_per_acre: string; appreciation_pct: string };
export type CountyMarket = {
  code: string;
  name: string;
  region: string;
  tier: string;
  avg_price_per_acre: string;
  appreciation_pct: string;
  rental_yield_pct: string;
  subcounties: CountyMarketSub[];
};

export async function getLandCountyMarket(): Promise<CountyMarket[]> {
  const res = await fetch(`${apiBaseUrl()}/api/land/county-market/`, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : (data.results ?? [])) as CountyMarket[];
}
