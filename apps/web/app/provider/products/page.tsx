import Link from "next/link";
import { ArrowLeft, Edit3, Eye } from "lucide-react";
import { AppleLikeNav, AppShell, PageShell, PremiumCard, SecondaryButton, SectionHeader, TrustBadge } from "../../components/maliprime";
import { publicPassports } from "../../product-passports/catalog";

export default function ProviderProductsPage() {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <Link href="/provider/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-textSecondary transition hover:text-textPrimary">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Provider dashboard
        </Link>

        <div className="mt-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            eyebrow="Product list"
            title="Provider passport inventory"
            body="Each passport is reviewed for clear category, risk, liquidity, source, and external verification context."
          />
          <TrustBadge tone="emerald">Educational pages</TrustBadge>
        </div>

        <section className="mt-6 grid gap-4">
          {publicPassports.map((passport) => (
            <PremiumCard key={passport.slug}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <TrustBadge tone="muted">{passport.category}</TrustBadge>
                    <TrustBadge tone={passport.riskLevel === "High" ? "danger" : "muted"}>{passport.riskLevel} risk</TrustBadge>
                    <TrustBadge tone={passport.liquidityLevel === "High" ? "emerald" : "muted"}>
                      {passport.liquidityLevel} liquidity
                    </TrustBadge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.01em]">{passport.name}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">{passport.description}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <SecondaryButton href={`/product-passports/${passport.slug}`}>
                    <Eye className="h-5 w-5" aria-hidden />
                    View public page
                  </SecondaryButton>
                  <SecondaryButton href="/provider/product-passport-editor">
                    <Edit3 className="h-5 w-5" aria-hidden />
                    Edit draft
                  </SecondaryButton>
                </div>
              </div>
            </PremiumCard>
          ))}
        </section>
      </PageShell>
    </AppShell>
  );
}
