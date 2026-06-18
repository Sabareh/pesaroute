"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, AppleLikeNav, PageBanner, PageShell, PremiumCard, TrustBadge } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import {
  addVirtualPosition,
  createVirtualPortfolio,
  fetchProducts,
  runVirtualPortfolio,
  type VirtualPortfolio,
  type VirtualRunResult,
  type WebRateMode
} from "../../lib/api";
import { formatKes } from "../../lib/labels";
import type { InvestmentProduct } from "../../lib/types";
import { SignInModal } from "../../learn/ui";

const RATE_MODES: { key: WebRateMode; label: string }[] = [
  { key: "neutral_scenario", label: "Neutral" },
  { key: "conservative_scenario", label: "Conservative" },
  { key: "optimistic_scenario", label: "Optimistic" },
  { key: "latest_available_rate", label: "Latest rate" }
];

export default function VirtualPortfolioPage() {
  const { token, ready, isAuthenticated } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [portfolio, setPortfolio] = useState<VirtualPortfolio | null>(null);
  const [name, setName] = useState("My what-if plan");
  const [cash, setCash] = useState("100000");
  const [goal, setGoal] = useState("");
  const [slug, setSlug] = useState("");
  const [allocation, setAllocation] = useState("40000");
  const [rateMode, setRateMode] = useState<WebRateMode>("neutral_scenario");
  const [timeline, setTimeline] = useState("12");
  const [runResult, setRunResult] = useState<VirtualRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts({}).then(({ products }) => {
      setProducts(products);
      if (products[0]) setSlug(products[0].slug);
    });
  }, []);

  async function create() {
    if (!token) return setSignInOpen(true);
    setBusy(true);
    setError(null);
    try {
      const created = await createVirtualPortfolio({ name, starting_virtual_cash: Number(cash || "0").toFixed(2), goal }, token);
      setPortfolio(created);
    } catch {
      setError("Could not create the portfolio.");
    } finally {
      setBusy(false);
    }
  }

  async function addPosition() {
    if (!token || !portfolio || !slug) return;
    setBusy(true);
    try {
      const updated = await addVirtualPosition(
        portfolio.id,
        { product_slug: slug, virtual_amount_allocated: Number(allocation || "0").toFixed(2), rate_mode: rateMode, timeline_months: Math.max(1, Math.round(Number(timeline || "12"))) },
        token
      );
      setPortfolio(updated);
      setRunResult(null);
    } catch {
      setError("Could not add the product.");
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!token || !portfolio) return;
    setBusy(true);
    try {
      setRunResult(await runVirtualPortfolio(portfolio.id, token));
    } catch {
      setError("Could not run the portfolio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <Link href="/simulate" className="text-sm text-textSecondary hover:text-textPrimary">
          ← Simulate
        </Link>
        <div className="mt-4">
          <PageBanner accent="violet" badge="What-if" art="layers"
            eyebrow="Educational what-if portfolio"
            title="Create a what-if portfolio"
            description="Allocate virtual money across real Kenyan products and see an estimated outcome. This is a learning portfolio, not real money - no buying, selling, or execution."
          />
        </div>

        {!ready ? null : !isAuthenticated ? (
          <PremiumCard className="mt-6 max-w-lg">
            <p className="text-sm text-textSecondary">Sign in to build and save a what-if portfolio. Simulating single products stays open to everyone.</p>
            <button type="button" onClick={() => setSignInOpen(true)} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white">
              Sign in
            </button>
          </PremiumCard>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {!portfolio ? (
                <PremiumCard>
                  <h2 className="text-base font-semibold">1. Start your plan</h2>
                  <div className="mt-3 space-y-3">
                    <Field label="Plan name" value={name} onChange={setName} />
                    <Field label="Virtual starting amount (KES)" value={cash} onChange={setCash} type="number" />
                    <Field label="Goal (optional)" value={goal} onChange={setGoal} placeholder="e.g. learn to balance liquidity and yield" />
                    <button type="button" onClick={create} disabled={busy} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                      Create what-if portfolio
                    </button>
                  </div>
                </PremiumCard>
              ) : (
                <>
                  <PremiumCard>
                    <h2 className="text-base font-semibold">2. Add products</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="text-xs font-semibold uppercase text-textTertiary">Product</span>
                        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary">
                          {products.map((p) => (
                            <option key={p.id} value={p.slug}>
                              {p.name} {p.provider?.name ? `- ${p.provider.name}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field label="Allocation (KES)" value={allocation} onChange={setAllocation} type="number" />
                      <Field label="Timeline (months)" value={timeline} onChange={setTimeline} type="number" />
                      <label className="block sm:col-span-2">
                        <span className="text-xs font-semibold uppercase text-textTertiary">Rate mode</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {RATE_MODES.map((mode) => (
                            <button key={mode.key} type="button" onClick={() => setRateMode(mode.key)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${rateMode === mode.key ? "border-primary bg-primary text-white" : "border-border bg-surface text-textSecondary"}`}>
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </label>
                    </div>
                    <button type="button" onClick={addPosition} disabled={busy} className="mt-3 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-textPrimary disabled:opacity-60">
                      Add to portfolio
                    </button>
                  </PremiumCard>

                  <PremiumCard>
                    <h2 className="text-base font-semibold">3. Your allocations</h2>
                    {portfolio.positions.length === 0 ? (
                      <p className="mt-2 text-sm text-textSecondary">No products added yet.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {portfolio.positions.map((pos) => (
                          <li key={pos.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2 text-sm">
                            <span className="text-textPrimary">{pos.product_name}</span>
                            <span className="text-textSecondary">{formatKes("KES", pos.virtual_amount_allocated)} · {pos.rate_mode.replace(/_/g, " ")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button type="button" onClick={run} disabled={busy || portfolio.positions.length === 0} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      Run what-if simulation
                    </button>
                  </PremiumCard>

                  {runResult ? (
                    <PremiumCard className="border-emerald/20 bg-mint">
                      <p className="text-xs font-semibold uppercase text-textTertiary">Estimated portfolio value (not guaranteed)</p>
                      <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-emerald">{formatKes("KES", runResult.estimated_value)}</p>
                      <p className="mt-1 text-sm text-textSecondary">Contributions {formatKes("KES", runResult.total_contributions)} · estimated growth {formatKes("KES", runResult.estimated_growth)}</p>
                      <ul className="mt-3 space-y-1 text-sm text-textSecondary">
                        {runResult.rows.map((row, i) => (
                          <li key={i}>• {row.product}: {row.estimated_value ? formatKes("KES", row.estimated_value) : "rate unavailable"}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs font-semibold text-textTertiary">{runResult.label}</p>
                    </PremiumCard>
                  ) : null}
                </>
              )}
              {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            </div>

            <aside className="space-y-4">
              <PremiumCard>
                <TrustBadge tone="emerald">Learning only</TrustBadge>
                <p className="mt-3 text-sm text-textSecondary">
                  This is a learning portfolio, not real money. PesaRoute does not hold funds, execute investments,
                  or place orders. Verify rates with the provider before committing real money.
                </p>
              </PremiumCard>
            </aside>
          </div>
        )}
      </PageShell>
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </AppShell>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-textTertiary">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-textPrimary focus:border-borderStrong focus:outline-none"
      />
    </label>
  );
}
