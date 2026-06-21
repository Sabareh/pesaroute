"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { LiquidityBadge, PremiumCard, RiskBadge, TrustBadge } from "../components/maliprime";
import { RISK_FILTERS, confidenceLabel, formatKes, freshnessLabel } from "../lib/labels";
import type { InvestmentProduct, ProductFilters } from "../lib/types";

const freshnessBadgeTone: Record<string, "emerald" | "amber" | "danger" | "muted"> = {
  fresh: "emerald",
  acceptable: "amber",
  stale: "danger",
  unknown: "muted"
};

const RISK_OPTIONS = RISK_FILTERS.map((option) =>
  typeof option === "string" ? { key: option, label: option.replace(/_/g, " ") } : option
);

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-[7px] text-[13px] font-semibold capitalize transition ${
        active ? "border-primary bg-primary text-white" : "border-border bg-surface text-textSecondary hover:border-borderStrong"
      }`}
    >
      {children}
    </button>
  );
}

function isGeneric(product: InvestmentProduct): boolean {
  return product.name.toLowerCase().startsWith("generic") || (product.provider?.name ?? "").toLowerCase().includes("generic educational");
}

export function SimulateBrowser({ products }: { products: InvestmentProduct[] }) {
  const [filters, setFilters] = useState<ProductFilters>({});
  const [search, setSearch] = useState("");
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const set = (patch: Partial<ProductFilters>) => setFilters((current) => ({ ...current, ...patch }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = products.filter((product) => {
      if (filters.risk_level && product.risk_level !== filters.risk_level) return false;
      if (filters.liquidity_level && product.liquidity_level !== filters.liquidity_level) return false;
      if (filters.has_current_rate && !product.current_rate) return false;
      if (q) {
        const haystack = `${product.name} ${product.provider?.name ?? ""} ${product.category?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return matched.sort((a, b) => Number(isGeneric(a)) - Number(isGeneric(b)));
  }, [products, filters, search]);

  const compareProducts = products.filter((product) => compareIds.includes(product.id));
  const canCompare = compareIds.length >= 2 && compareIds.length <= 4;

  function toggleCompare(id: number) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* search + filter chips */}
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a product or provider"
          aria-label="Search products"
          className="w-full max-w-md rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-textPrimary focus:border-primary/50 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Risk</span>
          <Chip active={!filters.risk_level} onClick={() => set({ risk_level: undefined })}>
            All
          </Chip>
          {RISK_OPTIONS.map((option) => (
            <Chip key={option.key} active={filters.risk_level === option.key} onClick={() => set({ risk_level: filters.risk_level === option.key ? undefined : option.key })}>
              {option.label}
            </Chip>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Chip active={filters.liquidity_level === "high"} onClick={() => set({ liquidity_level: filters.liquidity_level === "high" ? undefined : "high" })}>
            High liquidity
          </Chip>
          <Chip active={Boolean(filters.has_current_rate)} onClick={() => set({ has_current_rate: filters.has_current_rate ? undefined : true })}>
            Has current rate
          </Chip>
          <span className="ml-auto text-[13px] font-medium text-textSecondary">{filtered.length} product{filtered.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {compareIds.length > 0 ? (
        <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-surface px-4 py-3 shadow-card">
          <span className="text-sm text-textPrimary">{compareIds.length} selected to compare</span>
          <button
            type="button"
            onClick={() => setShowCompare((v) => !v)}
            disabled={!canCompare}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${canCompare ? "bg-primary text-white" : "border border-border bg-surface text-textTertiary"}`}
          >
            {showCompare ? "Hide comparison" : canCompare ? `Compare ${compareIds.length}` : "Select 2-4"}
          </button>
        </div>
      ) : null}

      {showCompare && canCompare ? (
        <div className="overflow-x-auto">
          <CompareTable products={compareProducts} />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <PremiumCard className="text-center">
          <h3 className="text-base font-semibold text-textPrimary">No products match these filters</h3>
          <p className="mt-2 text-sm leading-6 text-textSecondary">Try removing a filter. Products with missing or stale data are never hidden.</p>
        </PremiumCard>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} selected={compareIds.includes(product.id)} onToggleCompare={() => toggleCompare(product.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, selected, onToggleCompare }: { product: InvestmentProduct; selected: boolean; onToggleCompare: () => void }) {
  return (
    <div className="pr-card-hover flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-textTertiary">{product.category?.name ?? product.product_type}</p>
          <h3 className="mt-1.5 text-[17px] font-semibold tracking-[-0.01em] text-textPrimary">{product.name}</h3>
          <p className="mt-1 text-[13px] font-medium text-textSecondary">{product.provider?.name ?? "Provider not set"}</p>
        </div>
        {product.current_rate ? (
          <div className="flex-none text-right">
            <p className="text-[22px] font-bold leading-none tracking-[-0.02em] text-primary">{product.current_rate.rate_value}%</p>
            <p className="mt-1 text-[11px] text-textTertiary">{product.current_rate.rate_type.replace(/_/g, " ")}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <TrustBadge tone={freshnessBadgeTone[product.freshness_status] ?? "muted"}>{freshnessLabel(product.freshness_status)}</TrustBadge>
        <RiskBadge level={product.risk_level.replace(/_/g, " ")} />
        <LiquidityBadge level={product.liquidity_level} />
        {product.minimum_amount ? <TrustBadge tone="muted">Min {formatKes(product.currency, product.minimum_amount)}</TrustBadge> : null}
      </div>

      {!product.current_rate ? (
        <p className="mt-3 text-[13px] font-semibold text-amber">Latest rate unavailable, simulate with a custom educational rate.</p>
      ) : product.freshness_status === "stale" ? (
        <p className="mt-3 text-xs font-semibold text-danger">Data may be stale.{product.last_verified_at ? ` Last verified ${product.last_verified_at.slice(0, 10)}.` : ""}</p>
      ) : null}

      <div className="mt-auto flex items-center gap-2.5 pt-4">
        <Link
          href={`/simulate/${product.slug}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-primaryDark"
        >
          Simulate →
        </Link>
        <button
          type="button"
          onClick={onToggleCompare}
          aria-pressed={selected}
          className={`rounded-full border px-4 py-2.5 text-[13px] font-semibold transition ${
            selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-textSecondary hover:border-borderStrong"
          }`}
        >
          {selected ? "✓ Compare" : "Compare"}
        </button>
      </div>
    </div>
  );
}

function CompareTable({ products }: { products: InvestmentProduct[] }) {
  const rows: Array<{ label: string; render: (product: InvestmentProduct) => string }> = [
    { label: "Provider", render: (p) => p.provider?.name ?? "Not set" },
    { label: "Rate used", render: (p) => (p.current_rate ? `${p.current_rate.rate_value}%` : "Unavailable") },
    { label: "Rate source", render: (p) => (p.current_rate ? `${confidenceLabel(p.source_confidence)} · ${p.current_rate.snapshot_date}` : "No latest rate") },
    { label: "Freshness", render: (p) => freshnessLabel(p.freshness_status) },
    { label: "Risk", render: (p) => p.risk_level.replace(/_/g, " ") },
    { label: "Liquidity", render: (p) => p.liquidity_level },
    { label: "Minimum", render: (p) => (p.minimum_amount ? formatKes(p.currency, p.minimum_amount) : "Varies") }
  ];
  return (
    <PremiumCard>
      <p className="text-sm font-semibold text-textPrimary">Compare before committing money</p>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border py-2 text-left text-xs font-semibold uppercase text-textTertiary">Field</th>
            {products.map((product) => (
              <th key={product.id} className="border-b border-border py-2 text-left font-semibold text-textPrimary">
                {product.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="border-b border-border py-2 pr-4 text-textSecondary">{row.label}</td>
              {products.map((product) => (
                <td key={product.id} className="border-b border-border py-2 pr-4 capitalize text-textPrimary">
                  {row.render(product)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </PremiumCard>
  );
}
