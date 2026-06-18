"use client";

import Link from "next/link";
import { useState } from "react";
import { PremiumCard, TrustBadge } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import {
  postProductSpecific,
  requestSimulationReview,
  saveSimulationToJournal,
  type ProductSpecificResult,
  type WebRateMode
} from "../../lib/api";
import { confidenceLabel, formatKes, freshnessLabel } from "../../lib/labels";
import type { InvestmentProductDetail } from "../../lib/types";
import { SignInModal } from "../../learn/ui";

const freshnessBadgeTone: Record<string, "emerald" | "amber" | "danger" | "muted"> = {
  fresh: "emerald",
  acceptable: "amber",
  stale: "danger",
  unknown: "muted"
};

const WEB_RATE_MODES: { key: WebRateMode; label: string }[] = [
  { key: "latest_available_rate", label: "Latest available rate" },
  { key: "conservative_scenario", label: "Conservative" },
  { key: "neutral_scenario", label: "Neutral" },
  { key: "optimistic_scenario", label: "Optimistic" },
  { key: "custom_educational_rate", label: "Custom rate" }
];

export function SimulationForm({
  product,
  hasRate,
  children
}: {
  product: InvestmentProductDetail;
  hasRate: boolean;
  children?: React.ReactNode;
}) {
  const { token, isAuthenticated } = useAuth();
  const [amount, setAmount] = useState("50000");
  const [monthlyTopup, setMonthlyTopup] = useState("0");
  const [timeline, setTimeline] = useState("12");
  const [rateMode, setRateMode] = useState<WebRateMode>(hasRate ? "latest_available_rate" : "neutral_scenario");
  const [customRate, setCustomRate] = useState("10");
  const [includeFees, setIncludeFees] = useState(true);
  const [includeTax, setIncludeTax] = useState(false);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductSpecificResult | null>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const simulation = await postProductSpecific(
        {
          product_slug: product.slug,
          initial_amount: Number(amount || "0").toFixed(2),
          monthly_topup: Number(monthlyTopup || "0").toFixed(2),
          timeline_months: Math.max(1, Math.round(Number(timeline || "12"))),
          rate_mode: rateMode,
          include_fees: includeFees,
          include_tax_estimate: includeTax,
          ...(rateMode === "custom_educational_rate" ? { custom_rate: Number(customRate || "0").toFixed(4) } : {}),
          ...(goal ? { goal } : {})
        },
        token
      );
      setResult(simulation);
    } catch {
      setError("Simulation failed. Try again, or use a custom educational rate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>{children}</div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <PremiumCard>
        <h2 className="text-base font-semibold text-textPrimary">Run an educational simulation</h2>
        <p className="mt-1 text-xs text-textSecondary">Estimated growth, not guaranteed returns.</p>
        <form className="mt-4 space-y-4" onSubmit={run}>
          <Field label={`Initial amount (${product.currency})`} value={amount} onChange={setAmount} type="number" />
          <Field label={`Monthly top-up (${product.currency})`} value={monthlyTopup} onChange={setMonthlyTopup} type="number" />
          <Field label="Timeline (months)" value={timeline} onChange={setTimeline} type="number" />

          <div>
            <p className="text-xs font-semibold uppercase text-textTertiary">Rate mode</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEB_RATE_MODES.map((mode) => {
                const active = rateMode === mode.key;
                const disabled = mode.key === "latest_available_rate" && !hasRate;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setRateMode(mode.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active ? "border-primary bg-primary text-white" : "border-border bg-surface text-textSecondary hover:border-borderStrong"
                    } ${disabled ? "opacity-40" : ""}`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            {!hasRate ? (
              <p className="mt-2 text-xs font-semibold text-amber">Latest rate unavailable - use a scenario or custom educational rate.</p>
            ) : null}
          </div>

          {rateMode === "custom_educational_rate" ? (
            <Field label="Custom educational rate (% per year)" value={customRate} onChange={setCustomRate} type="number" />
          ) : null}

          <div className="flex flex-wrap gap-4">
            <Toggle label="Include fees" checked={includeFees} onChange={setIncludeFees} />
            <Toggle label="Estimate tax" checked={includeTax} onChange={setIncludeTax} />
          </div>

          <Field label="Goal (optional)" value={goal} onChange={setGoal} placeholder="e.g. emergency fund" />

          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark focus:outline-none focus:ring-4 focus:ring-accent/20 disabled:opacity-60"
          >
            {loading ? "Running..." : "Run simulation"}
          </button>
        </form>
          </PremiumCard>
        </div>
      </div>

      {result ? (
        <div className="mt-8">
          <ResultCard result={result} productSlug={product.slug} token={token} isAuthenticated={isAuthenticated} />
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-textTertiary">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-textPrimary focus:border-borderStrong focus:outline-none"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-textSecondary">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-border" />
      {label}
    </label>
  );
}

function ResultCard({
  result,
  productSlug,
  token,
  isAuthenticated
}: {
  result: ProductSpecificResult;
  productSlug: string;
  token: string | null;
  isAuthenticated: boolean;
}) {
  const currency = result.currency;
  const estimatedValue = result.estimated_maturity_value ?? result.estimated_gross_value;
  const [status, setStatus] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!token) {
      setSignInOpen(true);
      return;
    }
    setBusy(true);
    try {
      await saveSimulationToJournal(result.product_simulation_run_id, token);
      setStatus("Saved to your journal as an amount range (not exact).");
    } catch {
      setStatus("Could not save to journal. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function review() {
    if (!token) {
      setSignInOpen(true);
      return;
    }
    setBusy(true);
    try {
      await requestSimulationReview(result.product_simulation_run_id, token);
      setStatus("Professional review requested with an amount range (exact amount not shared).");
    } catch {
      setStatus("Could not request review. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <PremiumCard className="border-emerald/20 bg-mint md:col-span-2 xl:col-span-3">
        <p className="text-xs font-semibold uppercase text-textTertiary">Estimated value (not guaranteed)</p>
        <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-emerald">
          {estimatedValue ? formatKes(currency, estimatedValue) : "Not available"}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Total contributions" value={formatKes(currency, result.total_contributions)} />
          <Row label="Estimated growth" value={formatKes(currency, result.estimated_growth)} />
          {result.estimated_net_value ? <Row label="Estimated value after fees/tax" value={formatKes(currency, result.estimated_net_value)} /> : null}
          {result.estimated_interest ? <Row label="Estimated interest" value={formatKes(currency, result.estimated_interest)} /> : null}
          {result.estimated_total_coupons ? <Row label="Estimated total coupons" value={formatKes(currency, result.estimated_total_coupons)} /> : null}
          {result.estimated_dividend ? <Row label="Estimated dividend" value={formatKes(currency, result.estimated_dividend)} /> : null}
          <Row label="Rate used" value={result.rate_used ? `${result.rate_used}%` : "None applied"} />
        </dl>
      </PremiumCard>

      <PremiumCard>
        <p className="text-xs font-semibold uppercase text-textTertiary">Source &amp; freshness</p>
        <p className="mt-2 text-sm text-textSecondary">{result.rate_source_label}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <TrustBadge tone={freshnessBadgeTone[result.freshness] ?? "muted"}>{freshnessLabel(result.freshness)}</TrustBadge>
          <TrustBadge tone="muted">{confidenceLabel(result.source_confidence)}</TrustBadge>
          {result.snapshot_date ? <TrustBadge tone="muted">as of {result.snapshot_date}</TrustBadge> : null}
        </div>
        {result.source_url ? (
          <a href={result.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-accent underline">
            View source
          </a>
        ) : null}
      </PremiumCard>

      {result.warnings.length > 0 ? (
        <PremiumCard className="border-amber/30 bg-surfaceSubtle">
          <p className="text-xs font-semibold uppercase text-textTertiary">What to watch</p>
          <ul className="mt-2 space-y-1 text-sm text-textSecondary">
            {result.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </PremiumCard>
      ) : null}

      <ListCard title="Assumptions" items={result.assumptions} />
      <ListCard title="Fee notes" items={result.fees_notes} />
      <ListCard title="Tax notes" items={result.tax_notes} />
      <ListCard title="Withdrawal & liquidity" items={result.liquidity_notes} />
      <ListCard title="Risk" items={result.risk_notes} />
      <ListCard title="Beginner mistakes" items={result.beginner_mistakes} />
      <ListCard title="Questions to ask the provider or a professional" items={result.questions_to_ask} />

      <PremiumCard className="md:col-span-2 xl:col-span-3">
        <p className="text-xs font-semibold uppercase text-textTertiary">Next steps</p>
        {status ? <p className="mt-2 text-sm font-medium text-emerald">{status}</p> : null}
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={save} disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:opacity-60">
            Save to journal
          </button>
          <button type="button" onClick={review} disabled={busy} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
            Request professional review
          </button>
          <Link href="/simulate/virtual-portfolio" className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
            Add to a what-if portfolio
          </Link>
          <Link href="/simulate" className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
            Compare another product
          </Link>
          <Link href="/learn" className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
            Related learning
          </Link>
        </div>
        {!isAuthenticated ? (
          <p className="mt-3 text-xs text-textTertiary">Sign in to save to your journal or request a review. Browsing and simulating stay open to everyone.</p>
        ) : null}
        <Link href={`/simulate/${productSlug}#sources`} className="mt-3 inline-block text-sm font-semibold text-accent underline">
          View sources
        </Link>
      </PremiumCard>

      <p className="text-xs leading-5 text-textTertiary md:col-span-2 xl:col-span-3">{result.disclaimer}</p>
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-textSecondary">{label}</dt>
      <dd className="font-semibold text-textPrimary">{value}</dd>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <PremiumCard>
      <p className="text-xs font-semibold uppercase text-textTertiary">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-textSecondary">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </PremiumCard>
  );
}
