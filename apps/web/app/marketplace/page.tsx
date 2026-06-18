import type { Metadata } from "next";
import Link from "next/link";

import { AppShell, AppleLikeNav, PageBanner, PageShell, PremiumCard, PrimaryButton, SecondaryButton, TrustBadge } from "../components/maliprime";
import { getMarketplaceIntelligence } from "../lib/api";
import { Microeducation, NoAdviceNote } from "./_components";

export const metadata: Metadata = {
  title: "Marketplace | PesaRoute",
  description: "A guided decision layer: search, filter, compare, simulate, learn, journal, and request professional review."
};

const FLOW = [
  { step: "Search", body: "Find Kenyan investment products with clean filters." },
  { step: "Compare", body: "Put 2-5 side by side - assumptions, not a winner." },
  { step: "Simulate", body: "Estimate outcomes with source-linked or custom rates." },
  { step: "Learn", body: "Understand yield, fees, tax, and liquidity first." },
  { step: "Journal", body: "Save your reasoning privately before you decide." },
  { step: "Review", body: "Hand off to a verified professional, your data scoped." }
];

export default async function MarketplacePage() {
  const intelligence = (await getMarketplaceIntelligence().catch(() => ({}))) as Record<string, unknown>;
  const latest = (intelligence.latest_updated_products as Array<Record<string, unknown>>) ?? [];

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="flex flex-col gap-8">
          <PageBanner accent="green" badge="Guided decisions" art="bars"
            eyebrow="Marketplace"
            title="A guided decision layer, not a hype feed."
            description='Search products, filter, compare, simulate, learn, save to your journal, and request a professional review - all in one calm, source-linked flow. We never rank a "best" product or hide paid placements.'
          >
            <div className="flex flex-wrap gap-3">
              <PrimaryButton href="/marketplace/finder">Find products to understand</PrimaryButton>
              <SecondaryButton href="/marketplace/products">Browse all products</SecondaryButton>
              <SecondaryButton href="/marketplace/compare">Compare products</SecondaryButton>
            </div>
          </PageBanner>

          <div className="grid gap-3 sm:grid-cols-3">
            {FLOW.map((f) => (
              <PremiumCard key={f.step}>
                <h3 className="text-sm font-semibold text-textPrimary">{f.step}</h3>
                <p className="mt-1 text-sm text-textSecondary">{f.body}</p>
              </PremiumCard>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <PremiumCard className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-textPrimary">Recently updated</h3>
                <Link href="/marketplace/products?sort=recently_updated" className="text-xs text-accent">See all</Link>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {latest.slice(0, 6).map((p) => (
                  <li key={String(p.slug)} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/marketplace/products/${String(p.slug)}`} className="text-textPrimary hover:underline">
                      {String(p.name)}
                    </Link>
                    <span className="flex items-center gap-2">
                      {p.current_rate ? <span className="text-textSecondary">{String(p.current_rate)}%</span> : null}
                      <TrustBadge tone={p.freshness_status === "stale" ? "danger" : "muted"}>{String(p.freshness_status)}</TrustBadge>
                    </span>
                  </li>
                ))}
                {latest.length === 0 ? <li className="py-2 text-sm text-textTertiary">No data yet.</li> : null}
              </ul>
              <div className="mt-3 flex gap-3 text-xs">
                <Link href="/marketplace/watchlist" className="text-accent">Your watchlist</Link>
                <Link href="/marketplace/brief" className="text-accent">Your money brief</Link>
              </div>
            </PremiumCard>
            <Microeducation />
          </div>

          <PremiumCard>
            <div className="flex flex-wrap items-center gap-2">
              <TrustBadge tone="amber">Thinking about land?</TrustBadge>
            </div>
            <p className="mt-2 text-sm text-textSecondary">
              Land price comparison is not enough. Complete a Before Deposit Checklist, compare land with MMF /
              Treasury bill / SACCO / REIT, and request a lawyer or surveyor review.
            </p>
            <div className="mt-3">
              <SecondaryButton href="/land-decision-safety">Open Land Decision Safety</SecondaryButton>
            </div>
          </PremiumCard>

          <NoAdviceNote />
        </div>
      </PageShell>
    </AppShell>
  );
}
