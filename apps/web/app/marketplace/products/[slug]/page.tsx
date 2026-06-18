import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell, AppleLikeNav, PageShell, PremiumCard } from "../../../components/maliprime";
import { getMarketplaceProduct } from "../../../lib/api";
import { FreshnessBadge, Microeducation, NoAdviceNote, SourceBadge } from "../../_components";
import { ProductActions } from "./ProductActions";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getMarketplaceProduct(slug)) as Record<string, unknown> | null;
  if (!product) return { title: "Product not found | PesaRoute" };
  return { title: `${String(product.name)} | PesaRoute Marketplace` };
}

function List({ title, items }: { title: string; items: unknown }) {
  const arr = Array.isArray(items) ? (items as string[]) : [];
  if (!arr.length) return null;
  return (
    <PremiumCard>
      <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
      <ul className="mt-2 list-disc pl-5 text-sm text-textSecondary">
        {arr.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </PremiumCard>
  );
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = (await getMarketplaceProduct(slug)) as Record<string, unknown> | null;
  if (!product) notFound();
  const p = product as Record<string, unknown>;
  const isSacco = p.product_type === "sacco_deposit" || p.product_type === "sacco_share_capital";
  const rate = p.current_rate as Record<string, unknown> | null;
  const fees = (p.fees as Array<Record<string, unknown>>) ?? [];
  const sources = (p.sources as Array<Record<string, unknown>>) ?? [];

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="flex flex-col gap-5">
          <Link href="/marketplace/products" className="text-xs text-accent">All products</Link>
          <header className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-textTertiary">{String(p.category_name ?? "")}</p>
            <h1 className="text-3xl font-semibold text-textPrimary">{String(p.name)}</h1>
            <p className="text-sm text-textSecondary">{String(p.provider_name ?? "Provider not listed")} · {String(p.currency)}</p>
            <div className="flex flex-wrap gap-2">
              <FreshnessBadge status={String(p.freshness_status)} />
              <SourceBadge confidence={String(p.source_confidence)} />
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <PremiumCard>
                <h3 className="text-base font-semibold text-textPrimary">Latest rate and source</h3>
                {rate ? (
                  <p className="mt-2 text-sm text-textSecondary">
                    <span className="text-lg font-semibold text-textPrimary">{String(rate.rate_value)}%</span>{" "}
                    {String(rate.rate_type).replace(/_/g, " ")} · as of {String(rate.snapshot_date)} · {String(rate.confidence).replace(/_/g, " ")}
                  </p>
                ) : (
                  <p className="mt-2 text-sm font-medium text-amber">Latest rate unavailable. Use a custom educational rate when simulating.</p>
                )}
                {p.freshness_status === "stale" ? (
                  <p className="mt-2 text-xs font-semibold text-danger">Data may be stale. Verify before committing money.</p>
                ) : null}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs uppercase text-textTertiary">Minimum</dt><dd>{p.minimum_amount ? `KES ${String(p.minimum_amount)}` : "Verify"}</dd></div>
                  <div><dt className="text-xs uppercase text-textTertiary">Withdrawal</dt><dd>{String(p.withdrawal_timeline || "Verify")}</dd></div>
                  {!isSacco ? <div><dt className="text-xs uppercase text-textTertiary">Management fee</dt><dd>{p.management_fee_rate ? `${String(p.management_fee_rate)}%` : "Verify"}</dd></div> : null}
                  {!isSacco ? <div><dt className="text-xs uppercase text-textTertiary">M-Pesa</dt><dd>{p.mpesa_paybill_available ? `Yes${p.mpesa_paybill_number ? ` (${String(p.mpesa_paybill_number)})` : ""}` : "No"}</dd></div> : null}
                  {isSacco ? <div><dt className="text-xs uppercase text-textTertiary">Dividend</dt><dd>{p.dividend_rate_latest ? `${String(p.dividend_rate_latest)}%` : "-"}</dd></div> : null}
                  {isSacco ? <div><dt className="text-xs uppercase text-textTertiary">Deposit interest</dt><dd>{p.interest_on_deposits_latest ? `${String(p.interest_on_deposits_latest)}%` : "-"}</dd></div> : null}
                  {isSacco ? <div><dt className="text-xs uppercase text-textTertiary">Loan multiplier</dt><dd>{p.loan_multiplier ? `${String(p.loan_multiplier)}x` : "-"}</dd></div> : null}
                  {isSacco ? <div><dt className="text-xs uppercase text-textTertiary">SASRA</dt><dd>{String(p.sasra_status || "Verify")}</dd></div> : null}
                </dl>
                {fees.length ? (
                  <div className="mt-3">
                    <p className="text-xs uppercase text-textTertiary">Fees</p>
                    <ul className="mt-1 text-sm text-textSecondary">
                      {fees.map((f, i) => <li key={i}>{String(f.fee_type).replace(/_/g, " ")}: {String(f.fee_value ?? "?")} {String(f.fee_unit)}</li>)}
                    </ul>
                  </div>
                ) : null}
              </PremiumCard>

              {isSacco && p.membership_eligibility ? (
                <PremiumCard><h3 className="text-base font-semibold text-textPrimary">Membership eligibility</h3><p className="mt-2 text-sm text-textSecondary">{String(p.membership_eligibility)}</p></PremiumCard>
              ) : null}

              <List title="Good for" items={p.typical_use_cases} />
              <List title="Not ideal for" items={p.not_ideal_for} />
              <List title="Beginner mistakes" items={p.beginner_mistakes} />
              <List title="Questions to ask" items={p.questions_to_ask} />

              {sources.length ? (
                <PremiumCard>
                  <h3 className="text-base font-semibold text-textPrimary">Sources and last verified</h3>
                  <ul className="mt-2 text-sm text-accent">
                    {sources.map((s, i) => <li key={i}><a href={String(s.url)} target="_blank" rel="noreferrer" className="hover:underline">{String(s.title)}</a></li>)}
                  </ul>
                  {p.last_verified_at ? <p className="mt-1 text-xs text-textTertiary">Last verified: {String(p.last_verified_at).slice(0, 10)}</p> : null}
                </PremiumCard>
              ) : null}

              <Microeducation />
            </div>

            <div className="flex flex-col gap-4">
              <ProductActions
                slug={String(p.slug)}
                productType={String(p.product_type)}
                annualYield={p.annual_yield ? String(p.annual_yield) : null}
                yieldType={String(p.yield_type)}
                managementFee={p.management_fee_rate ? String(p.management_fee_rate) : "0"}
                withholdingTax={String(p.withholding_tax_rate ?? "15")}
              />
              <NoAdviceNote />
            </div>
          </div>
        </div>
      </PageShell>
    </AppShell>
  );
}
