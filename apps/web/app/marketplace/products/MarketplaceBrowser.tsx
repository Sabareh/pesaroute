"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, Star } from "lucide-react";

import { EmptyState, LoadingState } from "../../components/maliprime";
import { getMarketplaceProducts, type MarketplaceProduct } from "../../lib/api";
import { Microeducation, NoAdviceNote } from "../_components";

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "money_market_fund", label: "Money market" },
  { value: "treasury_bill", label: "Treasury" },
  { value: "sacco_deposit", label: "SACCOs" },
  { value: "reit", label: "Land & REITs" },
  { value: "fixed_deposit", label: "Fixed deposit" }
];

// Decorative sparkline paths (no historical series in the API yet) - chosen
// deterministically per product so a card's line is stable across renders.
const SPARKS = [
  "M0,22 L12,18 L24,20 L36,12 L48,14 L60,7 L72,9 L80,4",
  "M0,20 L12,21 L24,15 L36,17 L48,10 L60,12 L72,6 L80,5",
  "M0,24 L12,19 L24,21 L36,13 L48,11 L60,8 L72,6 L80,3",
  "M0,16 L12,15 L24,18 L36,14 L48,16 L60,13 L72,15 L80,12",
  "M0,18 L12,22 L24,14 L36,18 L48,9 L60,15 L72,8 L80,10",
  "M0,20 L12,18 L24,19 L36,16 L48,17 L60,14 L72,15 L80,13"
];

const SACCO_TYPES = new Set(["sacco_deposit", "sacco_share_capital"]);

const FRESH: Record<string, { label: string; cls: string; dot: string }> = {
  fresh: { label: "Fresh", cls: "bg-primary/10 text-primary", dot: "bg-primary" },
  acceptable: { label: "Acceptable", cls: "bg-amber/[0.14] text-amber", dot: "bg-amber" },
  stale: { label: "Data may be stale", cls: "bg-danger/10 text-danger", dot: "bg-danger" },
  unknown: { label: "Freshness unknown", cls: "bg-surfaceSubtle text-textTertiary", dot: "bg-textTertiary" }
};

function sourceLabel(c: string): string {
  if (c === "official") return "Official";
  if (c === "provider_reported") return "Provider-reported";
  return c.replace(/_/g, " ");
}

function deriveCard(p: MarketplaceProduct) {
  const isSacco = SACCO_TYPES.has(p.product_type);
  const yieldValue = isSacco ? p.dividend_rate_latest : p.annual_yield;
  const yieldType = isSacco ? "dividend estimate" : p.yield_type.replace(/_/g, " ");
  const fee = isSacco ? "-" : p.management_fee_rate ? `${p.management_fee_rate}%` : "Verify";
  const min = isSacco
    ? p.minimum_shares
      ? `KES ${p.minimum_shares}`
      : "Verify"
    : p.minimum_amount
      ? `KES ${p.minimum_amount}`
      : "Verify";
  const withdrawal = isSacco ? "Notice period" : p.withdrawal_timeline || "Verify";
  return { yieldValue, yieldType, fee, min, withdrawal };
}

export function MarketplaceBrowser() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [count, setCount] = useState(0);
  const [allProducts, setAllProducts] = useState<MarketplaceProduct[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [landNotice, setLandNotice] = useState<{ headline: string; steps: string[]; url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { sort: "name" };
    if (search) params.search = search;
    if (type) params.product_type = type;
    const data = await getMarketplaceProducts(params);
    setProducts(data.results);
    setCount(data.count);
    setLandNotice(data.land_notice ?? null);
    setLoading(false);
  }, [search, type]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  // One unfiltered fetch powers the market-pulse strip + "recently updated".
  useEffect(() => {
    void getMarketplaceProducts({ sort: "recently_updated" }).then((d) => {
      setAllProducts(d.results);
      setAllCount(d.count);
    });
  }, []);

  const pulse = useMemo(() => {
    const mmf = allProducts.filter((p) => p.product_type === "money_market_fund" && p.annual_yield);
    const topMmf = mmf.length ? Math.max(...mmf.map((p) => Number(p.annual_yield))) : null;
    const tbill = allProducts.find((p) => p.product_type === "treasury_bill" && p.annual_yield);
    const categories = new Set(allProducts.map((p) => p.category_name)).size;
    return { topMmf, tbill: tbill?.annual_yield ?? null, tracked: allCount, categories };
  }, [allProducts, allCount]);

  const movers = allProducts.slice(0, 4);

  function toggleCompare(slug: string) {
    setCompareSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 5 ? prev : [...prev, slug]));
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Banner with embedded search */}
      <section className="relative overflow-hidden rounded-2xl bg-bannerBg px-7 py-7">
        <svg viewBox="0 0 160 130" className="pointer-events-none absolute right-6 top-8 h-28 w-36 opacity-40" fill="none" stroke="rgb(var(--c-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M30 112h104" opacity="0.5" />
          <rect x="44" y="70" width="16" height="42" rx="2" opacity="0.5" />
          <rect x="72" y="46" width="16" height="66" rx="2" />
          <rect x="100" y="84" width="16" height="28" rx="2" opacity="0.5" />
        </svg>
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bannerMuted">Marketplace</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-bannerText">A guided decision layer, not a hype feed.</h1>
          <p className="mt-2 max-w-[560px] text-sm leading-[1.6] text-bannerMuted">
            Search, filter, compare, and simulate Kenyan investment products, source-linked and calm.
          </p>
          <div className="mt-[18px] flex max-w-[560px] items-center gap-2.5 rounded-xl bg-surface py-1.5 pl-3.5 pr-1.5">
            <Search className="h-[18px] w-[18px] shrink-0 text-textTertiary" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or providers, e.g. money market, SACCO, T-bill"
              className="flex-1 border-none bg-transparent py-2 text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none"
              aria-label="Search products or providers"
            />
            <span className="rounded-lg bg-primary px-[18px] py-2.5 text-[13px] font-semibold text-white">Search</span>
          </div>
        </div>
      </section>

      {/* Market pulse strip */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        <PulseCard label="Top MMF yield" value={pulse.topMmf != null ? `${pulse.topMmf}%` : "-"} delta="net annual" up />
        <PulseCard label="91-day T-bill" value={pulse.tbill != null ? `${pulse.tbill}%` : "-"} delta="discount" up />
        <PulseCard label="Products tracked" value={String(pulse.tracked || count)} delta={`${pulse.categories || 0} categories`} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        {/* LEFT: filters + grid */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {TYPE_FILTERS.map((t) => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-full border px-3.5 py-[7px] text-[13px] font-semibold transition ${
                    active ? "border-primary bg-primary text-white" : "border-border text-textSecondary hover:border-borderStrong"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
            <span className="ml-auto text-[13px] font-medium text-textSecondary">{count} results</span>
          </div>

          {loading ? (
            <div className="mt-4">
              <LoadingState label="Loading products..." />
            </div>
          ) : products.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No products match" body="Try a different search or category. Products with missing data are never hidden." />
            </div>
          ) : (
            <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
              {products.map((p, i) => (
                <ProductCard key={p.slug} product={p} spark={SPARKS[i % SPARKS.length]} selected={compareSlugs.includes(p.slug)} onToggleCompare={() => toggleCompare(p.slug)} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: widgets */}
        <div className="flex flex-col gap-3.5">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-textPrimary">Recently updated</h3>
              <Link href="/marketplace/products" className="text-xs font-semibold text-primary">
                See all
              </Link>
            </div>
            <div className="mt-2.5 flex flex-col">
              {movers.length === 0 ? (
                <p className="py-2 text-sm text-textTertiary">Loading...</p>
              ) : (
                movers.map((p, i) => {
                  const f = FRESH[p.freshness_status] ?? FRESH.unknown;
                  const arrow = p.freshness_status === "fresh" ? "▲" : p.freshness_status === "stale" ? "▼" : "—";
                  const arrowCls = p.freshness_status === "fresh" ? "text-primary" : p.freshness_status === "stale" ? "text-danger" : "text-textTertiary";
                  return (
                    <Link
                      href={`/marketplace/products/${p.slug}`}
                      key={p.slug}
                      className={`flex items-center justify-between py-2.5 text-sm ${i < movers.length - 1 ? "border-b border-border" : ""}`}
                    >
                      <span className="truncate font-medium text-textPrimary">{p.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-bold text-textPrimary">{p.annual_yield ? `${p.annual_yield}%` : "-"}</span>
                        <span className={`text-[11px] font-semibold ${arrowCls}`}>{arrow}</span>
                        <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} aria-hidden />
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <Microeducation />

          <div className="rounded-2xl border border-accent/25 bg-accent/[0.08] p-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/[0.14] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-amber">
              Thinking about land?
            </span>
            <p className="mt-3 text-[13.5px] leading-[1.55] text-textSecondary">
              {landNotice?.headline ??
                "Price comparison isn't enough. Run a before-deposit checklist and compare land against MMF, T-bill, SACCO and REIT first."}
            </p>
            <Link href={landNotice?.url ?? "/land-decision-safety"} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
              Open Land Decision Safety <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <NoAdviceNote />

      {/* Fixed compare bar */}
      {compareSlugs.length >= 2 ? (
        <div className="fixed bottom-7 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-4 rounded-full bg-bannerBg py-2.5 pl-[22px] pr-3 shadow-soft">
          <span className="text-[13px] font-semibold text-bannerText">{compareSlugs.length} selected to compare</span>
          <Link href={`/marketplace/compare?slugs=${compareSlugs.join(",")}`} className="flex items-center gap-1 rounded-full bg-surface px-[18px] py-2.5 text-[13px] font-semibold text-textPrimary">
            Compare now <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function PulseCard({ label, value, delta, up }: { label: string; value: string; delta: string; up?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-[18px] py-4 shadow-card">
      <div>
        <p className="text-xs font-semibold text-textTertiary">{label}</p>
        <p className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-textPrimary">{value}</p>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          up ? "bg-primary/10 text-primary" : "border border-border bg-surfaceSubtle text-textSecondary"
        }`}
      >
        {delta}
      </span>
    </div>
  );
}

function ProductCard({
  product: p,
  spark,
  selected,
  onToggleCompare
}: {
  product: MarketplaceProduct;
  spark: string;
  selected?: boolean;
  onToggleCompare?: () => void;
}) {
  const { yieldValue, yieldType, fee, min, withdrawal } = deriveCard(p);
  const f = FRESH[p.freshness_status] ?? FRESH.unknown;
  const sparkFresh = p.freshness_status === "fresh";

  return (
    <div className="pr-card-hover flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-textTertiary">{p.category_name}</p>
          <h3 className="mt-1 text-base font-semibold tracking-[-0.01em] text-textPrimary">{p.name}</h3>
          <p className="mt-0.5 text-[13px] font-medium text-textSecondary">{p.provider_name ?? "Provider not listed"}</p>
        </div>
        <Link href={`/marketplace/products/${p.slug}`} aria-label="View and save" className="shrink-0 p-0.5 text-textTertiary transition hover:text-primary">
          <Star className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <div className="mt-3.5 flex items-end justify-between gap-2.5">
        <div>
          <p className="text-[26px] font-bold leading-none tracking-[-0.02em] text-primary">{yieldValue ? `${yieldValue}%` : "-"}</p>
          <p className="mt-1 text-[11px] text-textTertiary">{yieldType}</p>
        </div>
        <svg viewBox="0 0 80 28" className="h-7 w-20 shrink-0" fill="none" stroke={sparkFresh ? "rgb(var(--c-primary))" : "rgb(var(--c-textTertiary))"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={spark} />
        </svg>
      </div>

      <dl className="mt-3.5 grid grid-cols-2 gap-x-3.5 gap-y-2.5 border-t border-border pt-3.5">
        <Cell label="Fee" value={fee} />
        <Cell label="Minimum" value={min} />
        <Cell label="Withdrawal" value={withdrawal} />
        <Cell label="Risk · liquidity" value={`${p.risk_level.replace(/_/g, " ")} · ${p.liquidity_level}`} />
      </dl>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${f.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} aria-hidden />
          {f.label}
        </span>
        <span className="rounded-full border border-border bg-surfaceSubtle px-2.5 py-1 text-[11px] font-semibold text-textSecondary">{sourceLabel(p.source_confidence)}</span>
        {p.mpesa_paybill_available ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">M-Pesa</span> : null}
      </div>

      <div className="mt-4 flex gap-2">
        <Link href={`/marketplace/products/${p.slug}`} className="flex-1 rounded-full border border-border py-2 text-center text-[13px] font-semibold text-textPrimary transition hover:border-borderStrong">
          Details
        </Link>
        <Link href={`/simulate/${p.slug}`} className="flex-1 rounded-full bg-primary py-2 text-center text-[13px] font-semibold text-white transition hover:bg-primaryDark">
          Simulate
        </Link>
        {onToggleCompare ? (
          <button
            type="button"
            onClick={onToggleCompare}
            aria-pressed={selected}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
              selected ? "border-primary bg-primary text-white" : "border-border text-textSecondary hover:border-borderStrong"
            }`}
          >
            {selected ? "✓" : "Compare"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-textTertiary">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold capitalize text-textPrimary">{value}</p>
    </div>
  );
}
