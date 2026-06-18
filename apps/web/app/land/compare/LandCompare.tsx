"use client";

import { useState } from "react";

import { ErrorState, PremiumCard, TrustBadge } from "../../components/maliprime";
import { postLandCompare, type LandCompareResult } from "../../lib/api";

const SCENARIOS = ["conservative", "neutral", "optimistic"];

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-borderStrong focus:outline-none";
const labelClass = "text-xs font-semibold uppercase text-textTertiary";

export function LandCompare() {
  const [landPrice, setLandPrice] = useState("1500000");
  const [years, setYears] = useState("5");
  const [scenario, setScenario] = useState("neutral");
  const [txCost, setTxCost] = useState("");
  const [liquidityNeed, setLiquidityNeed] = useState("");
  const [result, setResult] = useState<LandCompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const data = await postLandCompare({
        land_price: landPrice || "0",
        holding_period_years: Math.max(1, parseInt(years || "1", 10)),
        appreciation_scenario: scenario,
        transaction_cost_estimate: txCost || undefined,
        liquidity_need: liquidityNeed || undefined
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  const land = (result?.land_scenario ?? {}) as Record<string, unknown>;

  return (
    <div className="flex flex-col gap-5">
      <PremiumCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Land price (KES)</span>
            <input className={inputClass} value={landPrice} inputMode="numeric" onChange={(e) => setLandPrice(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Holding period (years)</span>
            <input className={inputClass} value={years} inputMode="numeric" onChange={(e) => setYears(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Transaction cost estimate (KES, optional)</span>
            <input className={inputClass} value={txCost} inputMode="numeric" onChange={(e) => setTxCost(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Liquidity need (optional)</span>
            <input className={inputClass} value={liquidityNeed} onChange={(e) => setLiquidityNeed(e.target.value)} placeholder="e.g. need access in 1 year" />
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <span className={labelClass}>Appreciation scenario (educational)</span>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setScenario(sc)}
                className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                  scenario === sc ? "border-primary bg-primary text-white" : "border-border hover:border-borderStrong"
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Comparing…" : "Compare"}
        </button>
      </PremiumCard>

      {error ? <ErrorState message={error} /> : null}

      {result ? (
        <div className="flex flex-col gap-4">
          <PremiumCard className="border-amber/20 bg-amber/[0.06]">
            <p className="text-sm font-semibold text-amber">{result.warning}</p>
          </PremiumCard>

          <PremiumCard>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-textPrimary">Land</h3>
              <div className="flex gap-2">
                <TrustBadge tone="muted">liquidity: low</TrustBadge>
                <TrustBadge tone="danger">due diligence: high</TrustBadge>
              </div>
            </div>
            <p className="mt-2 text-sm text-textSecondary">
              Estimated value after {years} year(s): <strong className="text-textPrimary">KES {String(land.estimated_value)}</strong>
              {land.estimated_value_after_costs ? <> · after costs: KES {String(land.estimated_value_after_costs)}</> : null}
            </p>
            <p className="mt-1 text-xs text-textTertiary">{String(land.note)}</p>
          </PremiumCard>

          <div className="grid gap-3 sm:grid-cols-2">
            {result.alternatives.map((alt, idx) => {
              const a = alt as Record<string, unknown>;
              return (
                <PremiumCard key={idx}>
                  <h4 className="text-sm font-semibold text-textPrimary">{String(a.label)}</h4>
                  <p className="mt-1 text-sm text-textSecondary">
                    Estimated value: <strong className="text-textPrimary">KES {String(a.estimated_value)}</strong>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <TrustBadge tone="muted">liquidity: {String(a.liquidity)}</TrustBadge>
                    <TrustBadge tone="muted">risk: {String(a.risk)}</TrustBadge>
                  </div>
                </PremiumCard>
              );
            })}
          </div>

          <PremiumCard>
            <p className="text-sm text-textSecondary">{result.liquidity_comparison}</p>
            <p className="mt-2 text-sm text-textSecondary">{result.risk_comparison}</p>
            <p className="mt-2 text-xs text-textTertiary">{result.disclaimer}</p>
          </PremiumCard>
        </div>
      ) : null}
    </div>
  );
}
