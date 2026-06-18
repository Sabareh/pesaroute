"use client";

import { useEffect, useMemo, useState } from "react";
import { PageBanner, PremiumCard, TrustBadge } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import { confidenceLabel } from "../../lib/labels";
import { learningApi, type LearningResource } from "../../lib/learning";

const TYPE_LABELS: Record<string, string> = {
  guide: "Guide",
  cheat_sheet: "Cheat sheet",
  tutorial: "Tutorial",
  glossary: "Glossary",
  market_brief: "Market brief",
  checklist: "Checklist"
};

export default function ResourcesPage() {
  const { token, ready } = useAuth();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    learningApi
      .resources(token)
      .then((data) => active && setResources(data))
      .catch(() => active && setResources([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, token]);

  const grouped = useMemo(() => {
    const map = new Map<string, LearningResource[]>();
    for (const resource of resources) {
      const key = resource.resource_type;
      map.set(key, [...(map.get(key) || []), resource]);
    }
    return map;
  }, [resources]);

  return (
    <div className="space-y-6">
      <PageBanner accent="blue" badge="Reference" art="search"
        eyebrow="Resources"
        title="Guides, checklists & glossary"
        description="Reference material with sources, confidence labels, and review dates."
      />

      {loading ? (
        <p className="text-sm text-textSecondary">Loading resources…</p>
      ) : resources.length === 0 ? (
        <PremiumCard className="text-center">
          <p className="text-sm text-textSecondary">No resources published yet.</p>
        </PremiumCard>
      ) : (
        Array.from(grouped.entries()).map(([type, items]) => (
          <section key={type}>
            <h2 className="text-sm font-semibold uppercase text-textTertiary">{TYPE_LABELS[type] || type}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {items.map((resource) => (
                <PremiumCard key={resource.id} className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <TrustBadge tone="muted">{TYPE_LABELS[resource.resource_type] || resource.resource_type}</TrustBadge>
                    {resource.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
                  </div>
                  <h3 className="mt-2 text-base font-semibold">{resource.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-textSecondary">
                    {resource.locked ? "Premium resource - sign in with Premium to read." : resource.body.slice(0, 160)}
                    {!resource.locked && resource.body.length > 160 ? "…" : ""}
                  </p>
                  <p className="mt-3 text-xs text-textTertiary">{confidenceLabel(resource.source_confidence)}</p>
                </PremiumCard>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
