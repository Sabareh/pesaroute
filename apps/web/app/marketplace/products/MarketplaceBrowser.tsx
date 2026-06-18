"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState, LoadingState, PageBanner, PremiumCard } from "../../components/maliprime";
import { getMarketplaceProducts, type MarketplaceProduct } from "../../lib/api";
import { MarketplaceCard, NoAdviceNote } from "../_components";

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "money_market_fund", label: "Money market" },
  { value: "sacco_deposit", label: "SACCO" },
  { value: "treasury_bill", label: "T-bill" },
  { value: "fixed_deposit", label: "Fixed deposit" },
  { value: "reit", label: "REIT" }
];

const SORTS = [
  { value: "name", label: "Name" },
  { value: "yield", label: "Yield" },
  { value: "minimum", label: "Minimum" },
  { value: "freshness", label: "Freshness" },
  { value: "liquidity", label: "Liquidity" },
  { value: "risk", label: "Risk" },
  { value: "recently_updated", label: "Recently updated" },
  { value: "most_simulated", label: "Most simulated" },
  { value: "most_saved", label: "Most saved" },
  { value: "beginner_friendly", label: "Beginner-friendly" }
];

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-primary bg-primary text-white" : "border-border hover:border-borderStrong"}`;

export function MarketplaceBrowser() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [count, setCount] = useState(0);
  const [landNotice, setLandNotice] = useState<{ headline: string; steps: string[]; url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("name");
  const [mpesaOnly, setMpesaOnly] = useState(false);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { sort };
    if (search) params.search = search;
    if (type) params.product_type = type;
    if (mpesaOnly) params.mpesa = "true";
    const data = await getMarketplaceProducts(params);
    setProducts(data.results);
    setCount(data.count);
    setLandNotice(data.land_notice ?? null);
    setLoading(false);
  }, [search, type, sort, mpesaOnly]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  function toggleCompare(slug: string) {
    setCompareSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 5 ? prev : [...prev, slug]));
  }

  return (
    <div className="flex flex-col gap-5">
      <PageBanner accent="green" badge="Browse" art="search"
        eyebrow="Marketplace"
        title="Products"
        description='Source-linked Kenyan investment products. Labels show freshness and source confidence. No "best" rankings.'
      />

      <PremiumCard>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product or provider"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-borderStrong focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {TYPE_FILTERS.map((t) => (
            <button key={t.value} type="button" onClick={() => setType(t.value)} className={chip(type === t.value)}>
              {t.label}
            </button>
          ))}
          <button type="button" onClick={() => setMpesaOnly((v) => !v)} className={chip(mpesaOnly)}>
            M-Pesa
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase text-textTertiary">Sort</span>
          {SORTS.map((s) => (
            <button key={s.value} type="button" onClick={() => setSort(s.value)} className={chip(sort === s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </PremiumCard>

      {landNotice ? (
        <PremiumCard className="border-amber/20 bg-amber/[0.06]">
          <p className="text-sm font-semibold text-amber">{landNotice.headline}</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-textSecondary">
            {landNotice.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <Link href={landNotice.url} className="mt-2 inline-block text-sm text-accent">
            Open Land Decision Safety
          </Link>
        </PremiumCard>
      ) : null}

      {compareSlugs.length >= 2 ? (
        <PremiumCard className="border-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-textPrimary">{compareSlugs.length} selected to compare</span>
            <Link href={`/marketplace/compare?slugs=${compareSlugs.join(",")}`} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white">
              Compare assumptions
            </Link>
          </div>
        </PremiumCard>
      ) : null}

      {loading ? (
        <LoadingState label="Loading products..." />
      ) : products.length === 0 ? (
        <EmptyState title="No products match" body="Try clearing filters or a different search." />
      ) : (
        <>
          <p className="text-xs text-textTertiary">{count} products</p>
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((p) => (
              <MarketplaceCard key={p.slug} product={p} selected={compareSlugs.includes(p.slug)} onToggleCompare={() => toggleCompare(p.slug)} />
            ))}
          </div>
        </>
      )}

      <NoAdviceNote />
    </div>
  );
}
