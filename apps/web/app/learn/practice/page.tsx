"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageBanner, PremiumCard, TrustBadge } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import { learningApi, type PracticeSetListItem } from "../../lib/learning";

const KIND_LABELS: Record<string, string> = {
  review_recent: "Recent review",
  weak_area: "Weak area",
  scenario_practice: "Scenario",
  flashcards: "Flashcards",
  simulator_practice: "Simulator",
  scam_red_flag_practice: "Scam red flags"
};

export default function PracticeIndexPage() {
  const { token, ready } = useAuth();
  const [sets, setSets] = useState<PracticeSetListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    learningApi
      .practiceList(token)
      .then((data) => active && setSets(data))
      .catch(() => active && setSets([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, token]);

  return (
    <div className="space-y-6">
      <PageBanner accent="blue" badge="Reinforce" art="rings"
        eyebrow="Practice"
        title="Practise money decisions"
        description="Short, no-time-limit sets. Earn XP for getting them right. These are money-decision scenarios, not trading."
      />

      {loading ? (
        <p className="text-sm text-textSecondary">Loading practice…</p>
      ) : sets.length === 0 ? (
        <PremiumCard className="text-center">
          <p className="text-sm text-textSecondary">No practice sets yet.</p>
        </PremiumCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sets.map((set) => (
            <Link
              key={set.id}
              href={`/learn/practice/${set.id}`}
              className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-borderStrong"
            >
              <div className="flex items-center justify-between">
                <TrustBadge tone="muted">{KIND_LABELS[set.kind] || set.kind}</TrustBadge>
                {set.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
              </div>
              <h3 className="mt-2 text-base font-semibold">{set.title}</h3>
              <p className="mt-1 flex-1 text-sm text-textSecondary">{set.description}</p>
              <p className="mt-3 text-xs text-textTertiary">
                {set.question_count} question{set.question_count === 1 ? "" : "s"} · {set.xp_reward} XP
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
