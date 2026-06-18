"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PremiumCard, TrustBadge } from "../../../components/maliprime";
import { useAuth } from "../../../lib/auth";
import {
  addToWatchlist,
  getSaccoScore,
  postNetAfterTax,
  requestProductReview,
  saveProductToJournal
} from "../../../lib/api";

const SACCO_TYPES = new Set(["sacco_deposit", "sacco_share_capital"]);

export function ProductActions({
  slug,
  productType,
  annualYield,
  yieldType,
  managementFee,
  withholdingTax
}: {
  slug: string;
  productType: string;
  annualYield: string | null;
  yieldType: string;
  managementFee: string;
  withholdingTax: string;
}) {
  const { token, isAuthenticated } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const isSacco = SACCO_TYPES.has(productType);

  // Net-after-tax (MMF)
  const [amount, setAmount] = useState("100000");
  const [calc, setCalc] = useState<Record<string, unknown> | null>(null);
  const [calcErr, setCalcErr] = useState<string | null>(null);

  // SACCO score
  const [score, setScore] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (isSacco) void getSaccoScore(slug).then(setScore);
  }, [isSacco, slug]);

  async function runCalc() {
    setCalcErr(null);
    try {
      const result = await postNetAfterTax({
        initial_amount: amount || "0",
        timeline_months: 12,
        annual_yield: annualYield ?? "10",
        yield_treatment: yieldType === "net_of_management_fee" ? "net_of_management_fee" : yieldType === "gross" ? "fee_separate" : "unknown",
        management_fee: managementFee,
        withholding_tax_rate: withholdingTax
      });
      setCalc(result);
    } catch (e) {
      setCalcErr(e instanceof Error ? e.message : "Calculation failed.");
    }
  }

  async function watch() {
    if (!token) return;
    await addToWatchlist(slug, "", token);
    setMsg("Added to your watchlist.");
  }
  async function journal() {
    if (!token) return;
    await saveProductToJournal(slug, "Considering this product.", token);
    setMsg("Saved to your private journal with assumptions.");
  }
  async function review() {
    if (!token) return;
    await requestProductReview(slug, { question: "Please review my assumptions.", goal: "first_investment" }, token);
    setMsg("Review requested. Amount shared as a range; documents stay private; access expires.");
  }

  return (
    <>
      {!isSacco ? (
        <PremiumCard>
          <h3 className="text-base font-semibold text-textPrimary">Net-after-tax estimate</h3>
          <p className="mt-1 text-xs text-textTertiary">Educational estimate over 12 months. 15% withholding tax applies to growth.</p>
          <div className="mt-2 flex items-center gap-2">
            <input value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value)} className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-borderStrong focus:outline-none" />
            <button type="button" onClick={runCalc} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white">Estimate</button>
          </div>
          {calcErr ? <p className="mt-2 text-xs text-danger">{calcErr}</p> : null}
          {calc ? (
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-xs uppercase text-textTertiary">Gross</dt><dd>KES {String(calc.gross_estimate)}</dd></div>
              <div><dt className="text-xs uppercase text-textTertiary">Fee</dt><dd>KES {String(calc.fee_estimate)}</dd></div>
              <div><dt className="text-xs uppercase text-textTertiary">Tax (15%)</dt><dd>KES {String(calc.tax_estimate)}</dd></div>
              <div><dt className="text-xs uppercase text-textTertiary">Net total</dt><dd className="font-semibold">KES {String(calc.net_estimated_total_value)}</dd></div>
              <div className="col-span-2"><dt className="text-xs uppercase text-textTertiary">Effective annual return</dt><dd>{String(calc.effective_annual_return)}%</dd></div>
            </dl>
          ) : null}
          {calc?.warnings && Array.isArray(calc.warnings) && (calc.warnings as string[]).length ? (
            <p className="mt-2 text-xs text-amber">{(calc.warnings as string[]).join(" ")}</p>
          ) : null}
        </PremiumCard>
      ) : null}

      {isSacco && score ? (
        <PremiumCard>
          <h3 className="text-base font-semibold text-textPrimary">SACCO due-diligence score</h3>
          <p className="mt-1 text-2xl font-semibold text-textPrimary">{String(score.score)}<span className="text-sm text-textTertiary">/100</span></p>
          <ul className="mt-2 space-y-1 text-sm">
            {(score.sub_scores as Array<Record<string, unknown>>).map((s) => (
              <li key={String(s.key)} className="flex items-center justify-between">
                <span className="text-textSecondary">{String(s.label)}</span>
                <TrustBadge tone={Number(s.points) > 0 ? "emerald" : "muted"}>{Number(s.points) > 0 ? "available" : "missing"}</TrustBadge>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-textTertiary">{String(score.note)}</p>
        </PremiumCard>
      ) : null}

      <PremiumCard>
        <h3 className="text-base font-semibold text-textPrimary">Decide with care</h3>
        <div className="mt-3 flex flex-col gap-2">
          <Link href={`/simulate/${slug}`} className="rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-white">Simulate this product</Link>
          <Link href={`/marketplace/compare?slugs=${slug}`} className="rounded-full border border-border px-4 py-2 text-center text-sm hover:border-borderStrong">Add to compare</Link>
          {isAuthenticated ? (
            <>
              <button type="button" onClick={watch} className="rounded-full border border-border px-4 py-2 text-sm hover:border-borderStrong">Save to watchlist</button>
              <button type="button" onClick={journal} className="rounded-full border border-border px-4 py-2 text-sm hover:border-borderStrong">Save to journal</button>
              <button type="button" onClick={review} className="rounded-full border border-border px-4 py-2 text-sm hover:border-borderStrong">Request professional review</button>
            </>
          ) : (
            <p className="text-xs text-textTertiary">Sign in to watch, journal, or request a review.</p>
          )}
          {msg ? <p className="text-xs text-emerald">{msg}</p> : null}
        </div>
      </PremiumCard>
    </>
  );
}
