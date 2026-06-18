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

export function rateModeLabel(mode: string): string {
  return RATE_MODES.find((item) => item.key === mode)?.label ?? "Educational rate";
}

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
    return `${rateModeLabel(result.rate_mode)} - an educational assumption, not a live rate.`;
  }
  if (result.rate_snapshot_id) {
    return `Latest snapshot (${confidenceLabel(result.source_confidence)}).`;
  }
  return "Educational estimate only.";
}

export function formatKes(currency: string, value: string | null): string {
  if (value === null) return "Not available";
  const numeric = Number(value);
  if (currency === "KES" && Number.isFinite(numeric)) {
    return `KES ${Math.round(numeric).toLocaleString("en-KE")}`;
  }
  return `${currency} ${value}`;
}

export const SIM_CATEGORY_FILTERS = [
  { key: "money_market_fund", label: "Money Market Funds" },
  { key: "treasury_bill", label: "Treasury Bills" },
  { key: "treasury_bond", label: "Treasury Bonds" },
  { key: "sacco_deposit", label: "SACCOs" },
  { key: "fixed_deposit", label: "Fixed Deposits" },
  { key: "nse_equity", label: "NSE Stocks" },
  { key: "global_etf_route", label: "US Stocks / ETFs" },
  { key: "reit", label: "REITs" },
  { key: "land_due_diligence", label: "Land" },
  { key: "bitcoin_route", label: "Bitcoin / Crypto Risk" }
] as const;

export const RISK_FILTERS = ["low", "medium", "high", "very_high"] as const;
export const LIQUIDITY_FILTERS = ["high", "medium", "low"] as const;
export const FRESHNESS_FILTERS = ["fresh", "acceptable", "stale", "unknown"] as const;
export const CONFIDENCE_FILTERS = ["official", "provider_reported", "editorial", "third_party", "unknown"] as const;
export const CURRENCY_FILTERS = ["KES", "USD", "GBP", "EUR", "MULTI"] as const;
