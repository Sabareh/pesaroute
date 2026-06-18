import type { Metadata } from "next";

import {
  AppShell,
  AppleLikeNav,
  PageBanner,
  PageShell,
  PremiumCard,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  TrustBadge
} from "../components/maliprime";

export const metadata: Metadata = {
  title: "Land Decision Safety | PesaRoute",
  description:
    "Before you pay a land deposit in Kenya, check the route. A due-diligence checklist, visible risk flags, and a handoff to a verified professional."
};

const DISCLAIMERS = [
  "PesaRoute does not verify land ownership.",
  "PesaRoute does not provide legal advice.",
  "PesaRoute does not guarantee land safety or appreciation.",
  "Always verify through official sources and qualified professionals."
];

export default function LandDecisionSafetyPage() {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="flex flex-col gap-8">
          <PageBanner accent="amber" badge="Before you pay" art="shield"
            eyebrow="Land Decision Safety"
            title="Before you pay a land deposit, check the route."
            description="Price-comparison platforms help you compare market data. PesaRoute helps you make a safe, documented, reviewed land decision before you send money - with a due-diligence checklist, visible risk flags, a private decision journal, and a handoff to a verified lawyer, surveyor, or valuer."
          >
            <div className="flex flex-wrap gap-3">
              <PrimaryButton href="/land/checklist">See the checklist</PrimaryButton>
              <SecondaryButton href="/land/compare">Compare land vs alternatives</SecondaryButton>
              <SecondaryButton href="/land/before-you-pay">Before paying a deposit</SecondaryButton>
            </div>
          </PageBanner>

          <PremiumCard>
            <SectionHeader
              eyebrow="The core question"
              title="“I am about to send money for land. What should I check before I pay?”"
              body="PesaRoute turns that question into a concrete checklist, a visible-risk read-out, and the right professional to involve - without ever claiming a deal is safe."
            />
          </PremiumCard>

          <div className="grid gap-4 sm:grid-cols-3">
            <PremiumCard>
              <h3 className="text-base font-semibold text-textPrimary">1. Document the opportunity</h3>
              <p className="mt-2 text-sm text-textSecondary">
                Capture the plot, seller, price, deposit, and title status in a private workspace.
              </p>
            </PremiumCard>
            <PremiumCard>
              <h3 className="text-base font-semibold text-textPrimary">2. Work the checklist</h3>
              <p className="mt-2 text-sm text-textSecondary">
                Title, official search, encumbrances, survey, sale agreement, deposit protection - track each item.
              </p>
            </PremiumCard>
            <PremiumCard>
              <h3 className="text-base font-semibold text-textPrimary">3. See risk &amp; get review</h3>
              <p className="mt-2 text-sm text-textSecondary">
                Visible risk flags and a scoped handoff to a verified professional - your documents stay private.
              </p>
            </PremiumCard>
          </div>

          <PremiumCard>
            <div className="flex flex-wrap items-center gap-2">
              <TrustBadge tone="amber">Official verification happens elsewhere</TrustBadge>
            </div>
            <p className="mt-3 text-sm text-textSecondary">
              Ownership and search verification happen through the official land registry (Ardhisasa / Ministry of
              Lands) and a qualified advocate - not through PesaRoute.
            </p>
          </PremiumCard>

          <PremiumCard>
            <h3 className="text-base font-semibold text-textPrimary">What PesaRoute does not do</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-textSecondary">
              {DISCLAIMERS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </PremiumCard>
        </div>
      </PageShell>
    </AppShell>
  );
}
