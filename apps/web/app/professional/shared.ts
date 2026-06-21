// Shared, pure helpers for the Professional Portal views (no JSX) so the leads
// inbox and scoped-context views stay consistent. Safe to import from client
// components.
import type { ConsultationLead, DataGrantScope } from "../lib/api";

const CATEGORY: Record<string, string> = {
  mmf: "Money market funds",
  treasury: "Treasury bills & bonds",
  sacco: "SACCO membership",
  chama: "Chama",
  global_investing: "Global investing",
  land_literacy: "Land literacy",
  tax: "Tax",
  diaspora: "Diaspora investing",
  general_first_investment: "General first investment"
};
const TIMELINE: Record<string, string> = { this_week: "This week", this_month: "This month", flexible: "Flexible" };
const RISK: Record<string, string> = { low: "Low risk", moderate: "Moderate risk", high: "High risk", not_sure: "Risk: not sure" };
const LANGUAGE: Record<string, string> = { en: "English", sw: "Swahili" };

export const labelCategory = (v: string) => CATEGORY[v] ?? v.replace(/_/g, " ");
export const labelTimeline = (v: string) => TIMELINE[v] ?? v.replace(/_/g, " ");
export const labelRisk = (v: string) => RISK[v] ?? `${v.replace(/_/g, " ")} risk`;
export const labelLanguage = (v: string) => LANGUAGE[v] ?? v;

// What a lead's amount looks like to a professional, respecting the display mode.
export function amountLabel(lead: Pick<ConsultationLead, "amount_display_mode" | "amount_range_min" | "amount_range_max">): {
  text: string;
  hidden: boolean;
} {
  if (lead.amount_display_mode === "hidden") return { text: "Amount hidden", hidden: true };
  const fmt = (n: string | null) => (n ? `KES ${Math.round(Number(n)).toLocaleString("en-US")}` : null);
  const min = fmt(lead.amount_range_min);
  const max = fmt(lead.amount_range_max);
  if (min && max) return { text: `${min} – ${max}`, hidden: false };
  if (min || max) return { text: (min ?? max) as string, hidden: false };
  return { text: "Range shared", hidden: false };
}

export type ScopeMeta = { scope: DataGrantScope; title: string; body: string };

// The scope grid shown on the Scoped context view, in display order.
export const SCOPE_META: ScopeMeta[] = [
  {
    scope: "consultation_context",
    title: "Consultation context",
    body: "The review topic and the user's written notes for this consultation only."
  },
  {
    scope: "portfolio_summary",
    title: "Portfolio summary",
    body: "Item count, asset categories, a liquidity score, and a risk note, without any exact values."
  },
  {
    scope: "portfolio_exact_values",
    title: "Exact values",
    body: "Precise balances and holdings. Stays redacted unless the user grants exact-value access."
  },
  {
    scope: "journal_entries",
    title: "Journal notes",
    body: "The user's private reflections. Redacted unless journal access is explicitly granted."
  },
  {
    scope: "contact_info",
    title: "Contact details",
    body: "Phone and email. Hidden until the user shares contact info for a scheduled call."
  }
];
