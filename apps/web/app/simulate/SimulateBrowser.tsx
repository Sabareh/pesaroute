"use client";

import { useMemo, useState } from "react";
import { LiquidityBadge, PremiumCard, PrimaryButton, RiskBadge, TrustBadge } from "../components/maliprime";
import {
  CONFIDENCE_FILTERS,
  CURRENCY_FILTERS,
  FRESHNESS_FILTERS,
  LIQUIDITY_FILTERS,
  RISK_FILTERS,
  SIM_CATEGORY_FILTERS,
  confidenceLabel,
  formatKes,
  freshnessLabel
} from "../lib/labels";
import type { InvestmentProduct, ProductFilters } from "../lib/types";

const freshnessBadgeTone: Record<string, "emerald" | "amber" | "danger" | "muted"> = {
  fresh: "emerald",
  acceptable: "amber",
  stale: "danger",
  unknown: "muted"
};

function FilterGroup({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: readonly { key: string; label: string }[] | readonly string[];
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { key: option, label: option.replace(/_/g, " ") } : option
  );
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-textTertiary">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {normalized.map((option) => {
          const active = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(active ? undefined : option.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-textSecondary hover:border-borderStrong"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isGeneric(product: InvestmentProduct): boolean {
  return product.name.toLowerCase().startsWith("generic") || (product.provider?.name ?? "").toLowerCase().includes("generic educational");
}

export function SimulateBrowser({ products }: { products: InvestmentProduct[] }) {
  const [filters, setFilters] = useState<ProductFilters>({});
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const set = (patch: Partial<ProductFilters>) => setFilters((current) => ({ ...current, ...patch }));

  const filtered = useMemo(() => {
    const matched = products.filter((product) => {
      if (filters.product_type && product.product_type !== filters.product_type) return false;
      if (filters.risk_level && product.risk_level !== filters.risk_level) return false;
      if (filters.liquidity_level && product.liquidity_level !== filters.liquidity_level) return false;
      if (filters.currency && product.currency !== filters.currency) return false;
      if (filters.freshness_status && product.freshness_status !== filters.freshness_status) return false;
      if (filters.source_confidence && product.source_confidence !== filters.source_confidence) return false;
      if (filters.has_current_rate && !product.current_rate) return false;
      if (filters.provider && !(product.provider?.name ?? "").toLowerCase().includes(filters.provider.toLowerCase()))
        return false;
      if (filters.minimum_amount_lte) {
        const cap = Number(filters.minimum_amount_lte);
        if (Number.isFinite(cap) && product.minimum_amount && Number(product.minimum_amount) > cap) return false;
      }
      if (filters.search) {
        const haystack = `${product.name} ${product.provider?.name ?? ""} ${product.category?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) return false;
      }
      return true;
    });
    // Real provider products first; generic educational routes last (never dominate).
    return matched.sort((a, b) => Number(isGeneric(a)) - Number(isGeneric(b)));
  }, [products, filters]);

  const compareProducts = products.filter((product) => compareIds.includes(product.id));

  function toggleCompare(id: number) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  const canCompare = compareIds.length >= 2 && compareIds.length <= 4;

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-5">
        <PremiumCard className="space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase text-textTertiary" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              type="search"
              placeholder="Product or provider"
              value={filters.search ?? ""}
              onChange={(event) => set({ search: event.target.value || undefined })}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-borderStrong focus:outline-none"
            />
          </div>
          <FilterGroup label="Category" options={SIM_CATEGORY_FILTERS} value={filters.product_type} onChange={(next) => set({ product_type: next })} />
          <FilterGroup label="Risk level" options={RISK_FILTERS} value={filters.risk_level} onChange={(next) => set({ risk_level: next })} />
          <FilterGroup label="Liquidity" options={LIQUIDITY_FILTERS} value={filters.liquidity_level} onChange={(next) => set({ liquidity_level: next })} />
          <FilterGroup label="Currency" options={CURRENCY_FILTERS} value={filters.currency} onChange={(next) => set({ currency: next })} />
          <FilterGroup label="Freshness" options={FRESHNESS_FILTERS} value={filters.freshness_status} onChange={(next) => set({ freshness_status: next })} />
          <FilterGroup label="Source confidence" options={CONFIDENCE_FILTERS} value={filters.source_confidence} onChange={(next) => set({ source_confidence: next })} />
          <div>
            <label className="text-xs font-semibold uppercase text-textTertiary" htmlFor="min-amount">
              Max minimum amount (KES)
            </label>
            <input
              id="min-amount"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 5000"
              value={filters.minimum_amount_lte ?? ""}
              onChange={(event) => set({ minimum_amount_lte: event.target.value || undefined })}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-borderStrong focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-textSecondary">
            <input
              type="checkbox"
              checked={Boolean(filters.has_current_rate)}
              onChange={(event) => set({ has_current_rate: event.target.checked || undefined })}
              className="h-4 w-4 rounded border-border"
            />
            Has current rate only
          </label>
          <button
            type="button"
            onClick={() => setFilters({})}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-textPrimary transition hover:border-borderStrong hover:bg-surfaceSubtle"
          >
            Clear filters
          </button>
        </PremiumCard>
      </aside>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-textSecondary">
            {filtered.length} product{filtered.length === 1 ? "" : "s"}
          </p>
          {compareIds.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowCompare((value) => !value)}
              disabled={!canCompare}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                canCompare ? "border-primary bg-primary text-white" : "border-border bg-surface text-textTertiary"
              }`}
            >
              {showCompare ? "Hide comparison" : canCompare ? `Compare ${compareIds.length}` : "Select 2-4 to compare"}
            </button>
          ) : null}
        </div>

        {showCompare && canCompare ? (
          <div className="mt-4 overflow-x-auto">
            <CompareTable products={compareProducts} />
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <PremiumCard className="mt-4 text-center">
            <h3 className="text-base font-semibold text-textPrimary">No products match these filters</h3>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Try removing a filter. Products with missing or stale data are never hidden.
            </p>
          </PremiumCard>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={compareIds.includes(product.id)}
                onToggleCompare={() => toggleCompare(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  selected,
  onToggleCompare
}: {
  product: InvestmentProduct;
  selected: boolean;
  onToggleCompare: () => void;
}) {
  return (
    <PremiumCard className="flex h-full flex-col">
      <p className="text-xs font-semibold uppercase text-textTertiary">{product.category?.name ?? product.product_type}</p>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em] text-textPrimary">{product.name}</h3>
      <p className="mt-1 text-sm font-medium text-textSecondary">{product.provider?.name ?? "Provider not set"}</p>

      {product.current_rate ? (
        <p className="mt-3 text-sm font-semibold text-textPrimary">
          {product.current_rate.rate_value}% {product.current_rate.rate_type.replace(/_/g, " ")}
          <span className="font-normal text-textTertiary"> · as of {product.current_rate.snapshot_date}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm font-semibold text-amber">Latest rate unavailable - simulate with a custom educational rate.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <TrustBadge tone={freshnessBadgeTone[product.freshness_status] ?? "muted"}>{freshnessLabel(product.freshness_status)}</TrustBadge>
        <TrustBadge tone="muted">{confidenceLabel(product.source_confidence)}</TrustBadge>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <RiskBadge level={product.risk_level.replace(/_/g, " ")} />
        <LiquidityBadge level={product.liquidity_level} />
        {product.minimum_amount ? <TrustBadge tone="muted">Min {formatKes(product.currency, product.minimum_amount)}</TrustBadge> : null}
      </div>

      {product.freshness_status === "stale" ? (
        <p className="mt-3 text-xs font-semibold text-danger">
          Data may be stale.{product.last_verified_at ? ` Last verified ${product.last_verified_at.slice(0, 10)}.` : ""}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-3 pt-5">
        <PrimaryButton href={`/simulate/${product.slug}`} className="flex-1">
          Simulate this product
        </PrimaryButton>
        <button
          type="button"
          onClick={onToggleCompare}
          aria-pressed={selected}
          className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition ${
            selected ? "border-primary bg-surfaceSubtle text-primary" : "border-border bg-surface text-textSecondary hover:border-borderStrong"
          }`}
        >
          {selected ? "✓ Compare" : "Compare"}
        </button>
      </div>
    </PremiumCard>
  );
}

function CompareTable({ products }: { products: InvestmentProduct[] }) {
  const rows: Array<{ label: string; render: (product: InvestmentProduct) => string }> = [
    { label: "Provider", render: (p) => p.provider?.name ?? "Not set" },
    { label: "Rate used", render: (p) => (p.current_rate ? `${p.current_rate.rate_value}%` : "Unavailable") },
    {
      label: "Rate source",
      render: (p) => (p.current_rate ? `${confidenceLabel(p.source_confidence)} · ${p.current_rate.snapshot_date}` : "No latest rate")
    },
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
