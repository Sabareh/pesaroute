import type { Metadata } from "next";
import { AppShell, AppleLikeNav, PageBanner, PageShell, PremiumCard, SecondaryButton } from "../components/maliprime";
import { fetchProducts } from "../lib/api";
import { SimulateBrowser } from "./SimulateBrowser";
import { SimulateIntro } from "./SimulateIntro";

export const metadata: Metadata = {
  title: "Simulate investments | PesaRoute",
  description:
    "Filter Kenyan investment products by category, provider, risk, liquidity, currency, freshness, and source confidence, then run a planning simulation.",
  alternates: { canonical: "/simulate" }
};

export const revalidate = 300;

export default async function SimulatePage() {
  const { products, ok } = await fetchProducts({});

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <PageBanner accent="violet" badge="Educational" art="bars"
          eyebrow="Educational simulation"
          title="Compare before committing money"
          description="Filter products, compare 2-4 side by side, and simulate with the latest available source-linked data. PesaRoute does not recommend providers, call any product best, guarantee returns, execute investments, or collect money."
        />

        <SimulateIntro />

        {!ok ? (
          <div className="mt-6">
            <PremiumCard className="border-amber/30 bg-surfaceSubtle">
              <h3 className="text-base font-semibold text-textPrimary">Live product data is unavailable right now</h3>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                You can still browse educational product passports, or try again shortly. We never show fake or
                placeholder rates in place of missing data.
              </p>
              <div className="mt-4">
                <SecondaryButton href="/product-passports">Browse product passports</SecondaryButton>
              </div>
            </PremiumCard>
          </div>
        ) : (
          <div className="mt-8">
            <SimulateBrowser products={products} />
          </div>
        )}

      </PageShell>
    </AppShell>
  );
}
