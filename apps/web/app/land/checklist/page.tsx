import type { Metadata } from "next";

import { AppShell, AppleLikeNav, PageBanner, PageShell, PremiumCard, SecondaryButton, TrustBadge } from "../../components/maliprime";
import { fetchLandDefaultChecklist } from "../../lib/api";

export const metadata: Metadata = {
  title: "Land due-diligence checklist | PesaRoute",
  description: "The checklist to work through before paying for land in Kenya."
};

const IMPORTANCE_TONE: Record<string, "danger" | "amber" | "muted"> = {
  critical: "danger",
  high: "amber",
  medium: "muted",
  low: "muted"
};

export default async function LandChecklistPage() {
  const { items, disclaimer } = await fetchLandDefaultChecklist();

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="flex flex-col gap-6">
          <PageBanner accent="amber" badge="Due diligence" art="shield"
            eyebrow="Land due diligence"
            title="The land checklist"
            description="Work through every item before sending money. Critical items should be verified by a qualified advocate and an official land search."
          >
            <div className="flex flex-wrap gap-3">
              <SecondaryButton href="/land/compare">Compare land vs alternatives</SecondaryButton>
              <SecondaryButton href="/land-decision-safety">Back to Land Decision Safety</SecondaryButton>
            </div>
          </PageBanner>

          {items.length === 0 ? (
            <PremiumCard>
              <p className="text-sm text-textSecondary">Checklist is temporarily unavailable. Please try again later.</p>
            </PremiumCard>
          ) : (
            <ol className="flex flex-col gap-3">
              {items.map((item, index) => (
                <PremiumCard key={item.item_key}>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-semibold text-textTertiary">{index + 1}.</span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-textPrimary">{item.title}</h3>
                        <TrustBadge tone={IMPORTANCE_TONE[item.importance] ?? "muted"}>{item.importance}</TrustBadge>
                        {item.professional_type_needed !== "none" ? (
                          <TrustBadge tone="muted">needs {item.professional_type_needed.replace(/_/g, " ")}</TrustBadge>
                        ) : null}
                      </div>
                      {item.description ? <p className="mt-2 text-sm text-textSecondary">{item.description}</p> : null}
                      {item.source_note ? (
                        <p className="mt-2 text-xs text-textTertiary">{item.source_note}</p>
                      ) : null}
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </ol>
          )}

          {disclaimer ? (
            <PremiumCard>
              <p className="text-xs text-textSecondary">{disclaimer}</p>
            </PremiumCard>
          ) : null}
        </div>
      </PageShell>
    </AppShell>
  );
}
