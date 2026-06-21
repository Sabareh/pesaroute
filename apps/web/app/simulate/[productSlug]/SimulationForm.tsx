"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TrustBadge } from "../../components/maliprime";
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

const RATE_MODES: { key: WebRateMode; label: string; requiresRate?: boolean }[] = [
  { key: "latest_available_rate", label: "Latest", requiresRate: true },
  { key: "conservative_scenario", label: "Conservative" },
  { key: "neutral_scenario", label: "Neutral" },
  { key: "optimistic_scenario", label: "Optimistic" },
  { key: "custom_educational_rate", label: "Custom" }
];

function fmtShort(currency: string, n: number): string {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1000) return `${currency} ${Math.round(n / 1000)}k`;
  return `${currency} ${Math.round(n)}`;
}

// Client-side projection curve, scaled so its endpoint matches the backend's
// headline estimate. The chart is illustrative; the numbers come from the API.
function buildChart(P: number, PMT: number, months: number, annualRate: number, estValue: number) {
  const W = 620;
  const H = 190;
  const topPad = 14;
  const rm = annualRate / 100 / 12;
  const valueAt = (m: number) => (rm > 0 ? P * Math.pow(1 + rm, m) + PMT * ((Math.pow(1 + rm, m) - 1) / rm) : P + PMT * m);
  const contribAt = (m: number) => P + PMT * m;
  const rawEnd = valueAt(months) || 1;
  const scale = estValue > 0 && rawEnd > 0 ? estValue / rawEnd : 1;
  const step = Math.max(1, Math.ceil(months / 60));
  const ms: number[] = [];
  for (let m = 0; m <= months; m += step) ms.push(m);
  if (ms[ms.length - 1] !== months) ms.push(months);
  const maxY = Math.max(valueAt(months) * scale, contribAt(months)) * 1.06 || 1;
  const X = (m: number) => (m / Math.max(1, months)) * W;
  const Y = (v: number) => H - topPad - (v / maxY) * (H - topPad);
  const line = ms.map((m) => `${X(m).toFixed(1)},${Y(valueAt(m) * scale).toFixed(1)}`);
  const contrib = ms.map((m) => `${X(m).toFixed(1)},${Y(contribAt(m)).toFixed(1)}`);
  return {
    line: "M" + line.join(" L"),
    contrib: "M" + contrib.join(" L"),
    area: `M0,${H} L` + line.join(" L") + ` L${W},${H} Z`
  };
}

export function SimulationForm({ product, hasRate }: { product: InvestmentProductDetail; hasRate: boolean }) {
  const { token, isAuthenticated } = useAuth();
  const [amount, setAmount] = useState(50000);
  const [topup, setTopup] = useState(2000);
  const [months, setMonths] = useState(36);
  const [rateMode, setRateMode] = useState<WebRateMode>(hasRate ? "latest_available_rate" : "neutral_scenario");
  const [customRate, setCustomRate] = useState("10");
  const [includeFees, setIncludeFees] = useState(true);
  const [includeTax, setIncludeTax] = useState(false);

  const [result, setResult] = useState<ProductSpecificResult | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rate = product.current_rate_snapshot ?? product.current_rate;
  const baseRate = rate?.rate_value;

  const run = useCallback(async () => {
    setUpdating(true);
    setError(null);
    try {
      const simulation = await postProductSpecific(
        {
          product_slug: product.slug,
          initial_amount: amount.toFixed(2),
          monthly_topup: topup.toFixed(2),
          timeline_months: Math.max(1, Math.round(months)),
          rate_mode: rateMode,
          include_fees: includeFees,
          include_tax_estimate: includeTax,
          ...(rateMode === "custom_educational_rate" ? { custom_rate: Number(customRate || "0").toFixed(4) } : {})
        },
        token
      );
      setResult(simulation);
    } catch {
      setError("Could not update the estimate. Try a custom educational rate.");
    } finally {
      setUpdating(false);
    }
  }, [product.slug, amount, topup, months, rateMode, customRate, includeFees, includeTax, token]);

  // Live: recompute (debounced) whenever any input changes - no run button.
  useEffect(() => {
    const t = setTimeout(() => void run(), 350);
    return () => clearTimeout(t);
  }, [run]);

  const yearsLabel = months < 12 ? `${months} months` : `${(months / 12).toFixed(months % 12 === 0 ? 0 : 1)} years`;

  const estValueStr = result
    ? result.estimated_maturity_value ?? result.estimated_net_value ?? result.estimated_gross_value ?? "0"
    : "0";
  const estValue = Number(estValueStr);
  const chart = useMemo(
    () => buildChart(amount, topup, Math.max(1, Math.round(months)), result?.rate_used ? Number(result.rate_used) : 0, estValue),
    [amount, topup, months, result?.rate_used, estValue]
  );

  return (
    <div className="flex flex-col gap-4 pb-10">
      <Link href="/simulate" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-textSecondary transition hover:text-textPrimary">
        ← Back to compare
      </Link>

      {/* product header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-textTertiary">{product.category?.name ?? product.product_type}</p>
          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-textPrimary">{product.name}</h1>
          <p className="mt-1 text-[13px] font-medium text-textSecondary">{product.provider?.name ?? "Provider not listed"}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <TrustBadge tone={freshnessBadgeTone[product.freshness_status] ?? "muted"}>{freshnessLabel(product.freshness_status)}</TrustBadge>
          <TrustBadge tone="muted">{product.risk_level.replace(/_/g, " ")} risk</TrustBadge>
          <TrustBadge tone="muted">{product.liquidity_level} liquidity</TrustBadge>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[380px_1fr]">
        {/* INPUT PANEL */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-textPrimary">Your plan</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <span className={`h-1.5 w-1.5 rounded-full bg-primary ${updating ? "animate-pulse" : ""}`} aria-hidden />
              {updating ? "Updating" : "Live estimate"}
            </span>
          </div>

          <Slider label="Initial amount" value={fmtShort(product.currency, amount)} min={0} max={1_000_000} step={1000} raw={amount} onChange={setAmount} />
          <Slider label="Monthly top-up" value={topup > 0 ? `${fmtShort(product.currency, topup)}/mo` : "None"} min={0} max={50_000} step={500} raw={topup} onChange={setTopup} />
          <Slider label="Timeline" value={yearsLabel} min={3} max={120} step={1} raw={months} onChange={setMonths} />

          <div className="mt-5">
            <span className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Rate mode</span>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {RATE_MODES.map((m) => {
                const active = rateMode === m.key;
                const disabled = m.requiresRate && !hasRate;
                const label = m.key === "latest_available_rate" && baseRate ? `Latest ${baseRate}%` : m.label;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setRateMode(m.key)}
                    className={`rounded-full border px-3 py-[7px] text-xs font-semibold transition ${
                      active ? "border-primary bg-primary text-white" : "border-border bg-surface text-textSecondary hover:border-borderStrong"
                    } ${disabled ? "opacity-40" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {rateMode === "custom_educational_rate" ? (
              <div className="mt-3">
                <span className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Custom rate (% / yr)</span>
                <input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="mt-2 w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-textPrimary focus:border-borderStrong focus:outline-none"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex gap-2.5">
            <ToggleBtn label="Include fees" on={includeFees} onClick={() => setIncludeFees((v) => !v)} />
            <ToggleBtn label="Estimate tax" on={includeTax} onClick={() => setIncludeTax((v) => !v)} />
          </div>
        </div>

        {/* RESULTS */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {error ? <p className="rounded-2xl border border-danger/20 bg-danger/[0.06] px-4 py-3 text-sm font-medium text-danger">{error}</p> : null}

          {/* hero result + chart */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Estimated value in {yearsLabel} · not guaranteed</p>
                <p className="mt-1.5 text-[38px] font-bold leading-none tracking-[-0.025em] text-primary">
                  {result ? formatKes(result.currency, estValueStr) : "—"}
                </p>
                <p className="mt-2 text-[13px] font-semibold text-textSecondary">
                  {result ? `${formatKes(result.currency, result.estimated_growth)} growth on ${formatKes(result.currency, result.total_contributions)} contributed` : "Adjust your plan to see an estimate."}
                </p>
              </div>
              <div className="flex gap-4">
                <Legend swatch={<span className="h-[3px] w-3.5 rounded-sm bg-primary" />}>Projected value</Legend>
                <Legend swatch={<span className="h-0 w-3.5 border-t-2 border-dashed border-textTertiary" />}>Contributions</Legend>
              </div>
            </div>
            <div className="mt-[18px]">
              <svg viewBox="0 0 620 190" preserveAspectRatio="none" className="block h-[190px] w-full" aria-hidden>
                <defs>
                  <linearGradient id="sim-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--c-primary))" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="rgb(var(--c-primary))" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="63" x2="620" y2="63" stroke="rgb(var(--c-border) / 0.5)" strokeWidth="1" />
                <line x1="0" y1="126" x2="620" y2="126" stroke="rgb(var(--c-border) / 0.5)" strokeWidth="1" />
                <path d={chart.area} fill="url(#sim-fill)" />
                <path d={chart.contrib} fill="none" stroke="rgb(var(--c-textTertiary))" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round" />
                <path d={chart.line} fill="none" stroke="rgb(var(--c-primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mt-2 flex justify-between text-[11px] text-textTertiary">
                <span>Now</span>
                <span>{yearsLabel}</span>
              </div>
            </div>
          </div>

          {/* breakdown */}
          <div className="grid gap-3.5 sm:grid-cols-3">
            <Stat label="Total contributions" value={result ? formatKes(result.currency, result.total_contributions) : "—"} />
            <Stat label="Estimated growth" value={result ? formatKes(result.currency, result.estimated_growth) : "—"} accent />
            <Stat label="Rate applied" value={result?.rate_used ? `${result.rate_used}%` : "—"} />
          </div>

          {/* source + watch */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Source &amp; freshness</p>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-textSecondary">{result?.rate_source_label ?? "Source-linked rate applied once available."}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {result ? <TrustBadge tone={freshnessBadgeTone[result.freshness] ?? "muted"}>{freshnessLabel(result.freshness)}</TrustBadge> : null}
                {result ? <TrustBadge tone="muted">{confidenceLabel(result.source_confidence)}</TrustBadge> : null}
                {result?.snapshot_date ? <TrustBadge tone="muted">as of {result.snapshot_date}</TrustBadge> : null}
              </div>
              {result?.source_url ? (
                <a href={result.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[13px] font-semibold text-accent">
                  View source ↗
                </a>
              ) : null}
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">What to watch</p>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {(result?.warnings ?? ["Past performance does not guarantee future returns."]).map((w) => (
                  <li key={w} className="flex gap-2 text-[13px] leading-[1.5] text-textSecondary">
                    <span className="shrink-0 text-amber">•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {result ? <NextSteps result={result} isAuthenticated={isAuthenticated} token={token} /> : null}

          {result ? <MoreDetail result={result} /> : null}

          {result?.disclaimer ? <p className="text-[11.5px] leading-[1.5] text-textTertiary">{result.disclaimer}</p> : null}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  raw,
  onChange
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  raw: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mt-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">{label}</span>
        <span className="text-sm font-bold text-textPrimary">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={raw}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-2.5 w-full accent-primary"
      />
    </div>
  );
}

function ToggleBtn({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex-1 rounded-[10px] border px-3 py-2.5 text-[13px] font-semibold transition ${
        on ? "border-primary bg-primary text-white" : "border-border bg-surface text-textSecondary hover:border-borderStrong"
      }`}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}

function Legend({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-textSecondary">
      {swatch}
      {children}
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-[18px] py-4 shadow-card">
      <p className="text-xs font-semibold text-textTertiary">{label}</p>
      <p className={`mt-1.5 text-[19px] font-bold tracking-[-0.01em] ${accent ? "text-primary" : "text-textPrimary"}`}>{value}</p>
    </div>
  );
}

function NextSteps({ result, isAuthenticated, token }: { result: ProductSpecificResult; isAuthenticated: boolean; token: string | null }) {
  const [status, setStatus] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const runIdRef = useRef(result.product_simulation_run_id);
  runIdRef.current = result.product_simulation_run_id;

  async function save() {
    if (!token) {
      setSignInOpen(true);
      return;
    }
    setBusy(true);
    try {
      await saveSimulationToJournal(runIdRef.current, token);
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
      await requestSimulationReview(runIdRef.current, token);
      setStatus("Professional review requested with an amount range (exact amount not shared).");
    } catch {
      setStatus("Could not request review. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Next steps</p>
      {status ? <p className="mt-2 text-sm font-medium text-primary">{status}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2.5">
        <button type="button" onClick={save} disabled={busy} className="rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-primaryDark disabled:opacity-60">
          Save to journal
        </button>
        <button type="button" onClick={review} disabled={busy} className="rounded-full border border-border bg-surface px-4 py-2.5 text-[13px] font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
          Request professional review
        </button>
        <Link href="/simulate/virtual-portfolio" className="rounded-full border border-border bg-surface px-4 py-2.5 text-[13px] font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
          Add to what-if portfolio
        </Link>
      </div>
      <p className="mt-3.5 text-[11.5px] leading-[1.5] text-textTertiary">
        Saved to your journal as an amount range, never the exact figure. Estimates only, verify the rate with the provider or regulator before committing real money.
      </p>
      {!isAuthenticated ? (
        <p className="mt-2 text-[11.5px] text-textTertiary">Sign in to save or request a review. Browsing and simulating stay open to everyone.</p>
      ) : null}
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}

function MoreDetail({ result }: { result: ProductSpecificResult }) {
  const groups: Array<[string, string[]]> = [
    ["Assumptions", result.assumptions],
    ["Fee notes", result.fees_notes],
    ["Tax notes", result.tax_notes],
    ["Withdrawal & liquidity", result.liquidity_notes],
    ["Risk", result.risk_notes],
    ["Beginner mistakes", result.beginner_mistakes],
    ["Questions to ask the provider or a professional", result.questions_to_ask]
  ];
  const visible = groups.filter(([, items]) => items && items.length > 0);
  if (visible.length === 0) return null;
  return (
    <details className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <summary className="cursor-pointer text-sm font-semibold text-textPrimary">More detail (assumptions, fees, tax, risk)</summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {visible.map(([title, items]) => (
          <div key={title}>
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">{title}</p>
            <ul className="mt-2 space-y-1 text-sm text-textSecondary">
              {items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
