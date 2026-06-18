"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState, LoadingState, PageBanner, PremiumCard } from "../../components/maliprime";
import { getMarketplaceCompare, getMarketplaceProducts, type MarketplaceProduct } from "../../lib/api";
import { NoAdviceNote } from "../_components";

type Row = { product: MarketplaceProduct; questions_to_ask: string[]; net_after_tax_estimate: Record<string, unknown> | null };

const FIELDS: Array<{ key: string; label: string; get: (p: MarketplaceProduct) => string }> = [
  { key: "provider", label: "Provider", get: (p) => p.provider_name ?? "-" },
  { key: "category", label: "Category", get: (p) => p.category_name ?? "-" },
  { key: "currency", label: "Currency", get: (p) => p.currency },
  { key: "yield", label: "Annual yield", get: (p) => (p.annual_yield ? `${p.annual_yield}%` : "Unavailable") },
  { key: "source_date", label: "Source date", get: (p) => p.current_rate?.snapshot_date ?? "-" },
  { key: "source", label: "Source", get: (p) => p.yield_source_confidence || p.source_confidence },
  { key: "freshness", label: "Freshness", get: (p) => p.freshness_status },
  { key: "fee", label: "Management fee", get: (p) => (p.management_fee_rate ? `${p.management_fee_rate}%` : "Verify") },
  { key: "min", label: "Minimum", get: (p) => (p.minimum_amount ? `KES ${p.minimum_amount}` : "Verify") },
  { key: "withdrawal", label: "Withdrawal", get: (p) => p.withdrawal_timeline || "Verify" },
  { key: "mpesa", label: "M-Pesa", get: (p) => (p.mpesa_paybill_available ? "Yes" : "No") },
  { key: "liquidity", label: "Liquidity", get: (p) => p.liquidity_level },
  { key: "risk", label: "Risk", get: (p) => p.risk_level.replace(/_/g, " ") },
  { key: "dividend", label: "Dividend (SACCO)", get: (p) => (p.dividend_rate_latest ? `${p.dividend_rate_latest}%` : "-") },
  { key: "deposit_interest", label: "Deposit interest (SACCO)", get: (p) => (p.interest_on_deposits_latest ? `${p.interest_on_deposits_latest}%` : "-") },
  { key: "loan_multiplier", label: "Loan multiplier (SACCO)", get: (p) => (p.loan_multiplier ? `${p.loan_multiplier}x` : "-") },
  { key: "sasra", label: "SASRA status (SACCO)", get: (p) => p.sasra_status || "-" }
];

export function CompareBuilder({ initialSlugs }: { initialSlugs: string[] }) {
  const [slugs, setSlugs] = useState<string[]>(initialSlugs.slice(0, 5));
  const [amount, setAmount] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");
  const [options, setOptions] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (slugs.length < 2) {
      setRows([]);
      return;
    }
    setLoading(true);
    const data = await getMarketplaceCompare(slugs, amount || undefined);
    setRows((data.rows as Row[]) ?? []);
    setNote(String(data.comparison_note ?? ""));
    setLoading(false);
  }, [slugs, amount]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getMarketplaceProducts({ sort: "name" }).then((d) => setOptions(d.results.slice(0, 40)));
  }, []);

  function toggle(slug: string) {
    setSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 5 ? prev : [...prev, slug]));
  }

  return (
    <div className="flex flex-col gap-5">
      <PageBanner accent="green" badge="Side by side" art="compare"
        eyebrow="Compare"
        title="Compare assumptions before committing money"
        description="Pick 2 to 5 products. We show their assumptions side by side. We do not pick a winner."
      />

      <PremiumCard>
        <p className="text-xs uppercase text-textTertiary">Select products (2-5)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.slug}
              type="button"
              onClick={() => toggle(o.slug)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${slugs.includes(o.slug) ? "border-primary bg-primary text-white" : "border-border hover:border-borderStrong"}`}
            >
              {o.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs uppercase text-textTertiary">Amount for net-after-tax (MMF)</label>
          <input value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value)} placeholder="100000" className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-borderStrong focus:outline-none" />
        </div>
      </PremiumCard>

      {loading ? (
        <LoadingState label="Comparing..." />
      ) : rows.length < 2 ? (
        <EmptyState title="Pick at least 2 products" body="Select products above to compare their assumptions." />
      ) : (
        <PremiumCard className="overflow-x-auto">
          <p className="mb-3 text-sm font-semibold text-amber">{note}</p>
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-border p-2 text-left text-xs uppercase text-textTertiary">Field</th>
                {rows.map((r) => (
                  <th key={r.product.slug} className="border-b border-border p-2 text-left font-semibold text-textPrimary">{r.product.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.key}>
                  <td className="border-b border-border p-2 text-textTertiary">{f.label}</td>
                  {rows.map((r) => (
                    <td key={r.product.slug} className="border-b border-border p-2 text-textPrimary">{f.get(r.product)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="border-b border-border p-2 text-textTertiary">Net-after-tax (1yr)</td>
                {rows.map((r) => (
                  <td key={r.product.slug} className="border-b border-border p-2 text-textPrimary">
                    {r.net_after_tax_estimate ? `KES ${String(r.net_after_tax_estimate.net_estimated_total_value)}` : "-"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 align-top text-textTertiary">Questions to ask</td>
                {rows.map((r) => (
                  <td key={r.product.slug} className="p-2 align-top text-xs text-textSecondary">
                    {(r.questions_to_ask ?? []).slice(0, 4).map((q) => <div key={q}>- {q}</div>)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </PremiumCard>
      )}

      <NoAdviceNote />
    </div>
  );
}
