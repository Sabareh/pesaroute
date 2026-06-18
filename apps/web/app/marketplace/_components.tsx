"use client";

import Link from "next/link";
import { useState } from "react";

import { PremiumCard, TrustBadge } from "../components/maliprime";
import type { MarketplaceProduct } from "../lib/api";

type Tone = "primary" | "emerald" | "amber" | "danger" | "muted";

const FRESHNESS_TONE: Record<string, Tone> = { fresh: "emerald", acceptable: "amber", stale: "danger", unknown: "muted" };
const FRESHNESS_LABEL: Record<string, string> = {
  fresh: "Fresh",
  acceptable: "Acceptable",
  stale: "Data may be stale",
  unknown: "Freshness unknown"
};

export function FreshnessBadge({ status }: { status: string }) {
  return <TrustBadge tone={FRESHNESS_TONE[status] ?? "muted"}>{FRESHNESS_LABEL[status] ?? status}</TrustBadge>;
}

export function SourceBadge({ confidence }: { confidence: string }) {
  if (confidence === "official") return <TrustBadge tone="emerald">Official source</TrustBadge>;
  if (confidence === "provider_reported") return <TrustBadge tone="muted">Provider-reported</TrustBadge>;
  return <TrustBadge tone="muted">{confidence.replace(/_/g, " ")}</TrustBadge>;
}

export function NoAdviceNote() {
  return (
    <p className="text-xs text-textTertiary">
      Educational information only. PesaRoute does not hold money, execute investments, recommend providers, or
      promise returns. Verify with the provider, regulator, and a licensed professional before committing money.
    </p>
  );
}

const SACCO_TYPES = new Set(["sacco_deposit", "sacco_share_capital"]);

export function MarketplaceCard({
  product,
  selected,
  onToggleCompare
}: {
  product: MarketplaceProduct;
  selected?: boolean;
  onToggleCompare?: () => void;
}) {
  const isSacco = SACCO_TYPES.has(product.product_type);
  return (
    <PremiumCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-textTertiary">{product.category_name}</p>
          <h3 className="text-base font-semibold text-textPrimary">{product.name}</h3>
          <p className="text-sm text-textSecondary">{product.provider_name ?? "Provider not listed"}</p>
        </div>
        <span className="text-xs font-semibold text-textTertiary">{product.currency}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <FreshnessBadge status={product.freshness_status} />
        <SourceBadge confidence={product.source_confidence} />
        {product.mpesa_paybill_available ? <TrustBadge tone="emerald">M-Pesa</TrustBadge> : null}
        <TrustBadge tone={product.risk_level === "low" ? "muted" : "amber"}>{product.risk_level.replace(/_/g, " ")} risk</TrustBadge>
        <TrustBadge tone={product.liquidity_level === "high" ? "emerald" : "muted"}>{product.liquidity_level} liquidity</TrustBadge>
      </div>

      {isSacco ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Field label="Dividend" value={product.dividend_rate_latest ? `${product.dividend_rate_latest}%` : "-"} />
          <Field label="Deposit interest" value={product.interest_on_deposits_latest ? `${product.interest_on_deposits_latest}%` : "-"} />
          <Field label="Loan multiplier" value={product.loan_multiplier ? `${product.loan_multiplier}x` : "-"} />
          <Field label="Min shares" value={product.minimum_shares ? `KES ${product.minimum_shares}` : "-"} />
          <Field label="SASRA" value={product.sasra_status || "Verify"} />
          <Field label="Due-diligence" value={product.sacco_due_diligence_score != null ? `${product.sacco_due_diligence_score}/100` : "-"} />
        </dl>
      ) : (
        <div className="mt-3">
          {product.annual_yield ? (
            <p className="text-sm text-textPrimary">
              <span className="text-lg font-semibold">{product.annual_yield}%</span> annual yield
              {product.current_rate ? <span className="text-textTertiary"> · as of {product.current_rate.snapshot_date}</span> : null}
            </p>
          ) : (
            <p className="text-sm font-medium text-amber">Latest rate unavailable. Use a custom educational rate.</p>
          )}
          {product.freshness_status === "stale" ? (
            <p className="mt-1 text-xs font-semibold text-danger">Data may be stale. Verify before committing money.</p>
          ) : null}
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <Field label="Management fee" value={product.management_fee_rate ? `${product.management_fee_rate}%` : "Verify"} />
            <Field label="Minimum" value={product.minimum_amount ? `KES ${product.minimum_amount}` : "Verify"} />
            <Field label="Withdrawal" value={product.withdrawal_timeline || "Verify"} />
            <Field label="Yield basis" value={product.yield_type.replace(/_/g, " ")} />
          </dl>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/marketplace/products/${product.slug}`} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-borderStrong">
          Details
        </Link>
        <Link href={`/simulate/${product.slug}`} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-borderStrong">
          Simulate
        </Link>
        {onToggleCompare ? (
          <button
            type="button"
            onClick={onToggleCompare}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              selected ? "border border-primary bg-primary text-white" : "border border-border hover:border-borderStrong"
            }`}
          >
            {selected ? "In compare" : "Compare"}
          </button>
        ) : null}
      </div>
    </PremiumCard>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-textTertiary">{label}</dt>
      <dd className="text-textPrimary">{value}</dd>
    </div>
  );
}

const MICRO_EDUCATION = [
  { q: "What is annual yield?", a: "The yearly return a fund reports. It can be quoted gross, net of management fee, or net after tax - always check which." },
  { q: "What is a management fee?", a: "The annual fee the fund manager charges, usually a percentage of assets. It reduces your net return." },
  { q: "What is withholding tax?", a: "In Kenya, MMF interest is typically subject to 15% withholding tax on the growth, not your contributions." },
  { q: "What does T+2 mean?", a: "Withdrawals settle a number of business days after you request them - T+2 means about two business days." },
  { q: "Why is highest yield not always best?", a: "A higher headline yield can come with higher fees, less liquidity, or weaker disclosure. Compare net-after-tax and terms, not just the headline." },
  { q: "What is a SACCO dividend?", a: "A share of a SACCO's surplus paid on your share capital, declared after the SACCO's audited results." },
  { q: "What is interest on deposits?", a: "Interest a SACCO pays on member deposits (distinct from dividends on share capital)." },
  { q: "What is a loan multiplier?", a: "How many times your deposits a SACCO may lend you - e.g. 3x deposits. It varies by SACCO." },
  { q: "What is SASRA status?", a: "Whether a SACCO is licensed/regulated by SASRA. Always verify current status with SASRA." }
];

export function Microeducation() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <PremiumCard>
      <h3 className="text-base font-semibold text-textPrimary">How to read this</h3>
      <div className="mt-2 divide-y divide-border">
        {MICRO_EDUCATION.map((item, i) => (
          <div key={item.q} className="py-2">
            <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between text-left text-sm font-medium text-textPrimary">
              <span>{item.q}</span>
              <span className="text-textTertiary">{open === i ? "-" : "+"}</span>
            </button>
            {open === i ? <p className="mt-2 text-sm text-textSecondary">{item.a}</p> : null}
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}
