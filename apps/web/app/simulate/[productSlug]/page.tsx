import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AppShell,
  AppleLikeNav,
  LiquidityBadge,
  PageShell,
  PremiumCard,
  RiskBadge,
  TrustBadge
} from "../../components/maliprime";
import { fetchProduct } from "../../lib/api";
import { confidenceLabel, formatKes, freshnessLabel } from "../../lib/labels";
import { SimulationForm } from "./SimulationForm";

export const revalidate = 300;

const freshnessBadgeTone: Record<string, "emerald" | "amber" | "danger" | "muted"> = {
  fresh: "emerald",
  acceptable: "amber",
  stale: "danger",
  unknown: "muted"
};

type PageProps = { params: Promise<{ productSlug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productSlug } = await params;
  const product = await fetchProduct(productSlug);
  if (!product) {
    return { title: "Product not found | PesaRoute" };
  }
  return {
    title: `Simulate ${product.name} | PesaRoute`,
    description: `Educational simulation for ${product.name}${
      product.provider?.name ? ` from ${product.provider.name}` : ""
    }. See the latest source-linked rate, freshness, and what to verify before investing.`,
    alternates: { canonical: `/simulate/${product.slug}` }
  };
}

export default async function ProductSimulatePage({ params }: PageProps) {
  const { productSlug } = await params;
  const product = await fetchProduct(productSlug);
  if (!product) {
    notFound();
  }

  const rate = product.current_rate_snapshot ?? product.current_rate;

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="mb-4 flex items-center gap-2 text-sm text-textSecondary">
          <Link href="/simulate" className="hover:text-textPrimary">
            ← All products
          </Link>
        </div>

        <SimulationForm product={product} hasRate={Boolean(rate)}>
          <div>
            <p className="text-xs font-semibold uppercase text-textTertiary">{product.category?.name ?? product.product_type}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-textPrimary">{product.name}</h1>
            <p className="mt-1 text-base font-medium text-textSecondary">{product.provider?.name ?? "Provider not set"}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <TrustBadge tone={freshnessBadgeTone[product.freshness_status] ?? "muted"}>{freshnessLabel(product.freshness_status)}</TrustBadge>
              <TrustBadge tone="muted">{confidenceLabel(product.source_confidence)}</TrustBadge>
              <RiskBadge level={product.risk_level.replace(/_/g, " ")} />
              <LiquidityBadge level={product.liquidity_level} />
            </div>

            <PremiumCard className="mt-6">
              <h2 className="text-sm font-semibold uppercase text-textTertiary">Latest rate &amp; source</h2>
              {rate ? (
                <>
                  <p className="mt-2 text-2xl font-semibold text-textPrimary">
                    {rate.rate_value}% <span className="text-base font-medium text-textSecondary">{rate.rate_type.replace(/_/g, " ")}</span>
                  </p>
                  <dl className="mt-3 space-y-1 text-sm text-textSecondary">
                    <div className="flex justify-between">
                      <dt>Snapshot date</dt>
                      <dd className="font-medium text-textPrimary">{rate.snapshot_date}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Confidence</dt>
                      <dd className="font-medium text-textPrimary">{confidenceLabel(rate.confidence)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Last verified</dt>
                      <dd className="font-medium text-textPrimary">{product.last_verified_at ? product.last_verified_at.slice(0, 10) : "Not recorded"}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="mt-2 text-sm font-semibold text-amber">
                  Latest rate unavailable. You can still run an educational estimate with a custom rate below.
                </p>
              )}
              {product.freshness_status === "stale" ? (
                <p className="mt-3 rounded-lg border border-danger/20 bg-danger/[0.06] px-3 py-2 text-xs font-semibold text-danger">
                  Data may be stale. Verify the current rate with the provider before relying on this estimate.
                </p>
              ) : null}
              {product.minimum_amount ? (
                <p className="mt-3 text-sm text-textSecondary">
                  Minimum amount to verify: <span className="font-semibold text-textPrimary">{formatKes(product.currency, product.minimum_amount)}</span>
                </p>
              ) : null}
            </PremiumCard>

            {product.source_references && product.source_references.length > 0 ? (
              <PremiumCard className="mt-4" id="sources">
                <h2 className="text-sm font-semibold uppercase text-textTertiary">Sources</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {product.source_references.map((reference) => (
                    <li key={reference.id}>
                      <a href={reference.url} target="_blank" rel="noreferrer" className="font-medium text-emerald underline">
                        {reference.citation_label || reference.title}
                      </a>
                      {reference.notes ? <span className="text-textTertiary"> - {reference.notes}</span> : null}
                    </li>
                  ))}
                </ul>
              </PremiumCard>
            ) : null}

          </div>
        </SimulationForm>
      </PageShell>
    </AppShell>
  );
}
