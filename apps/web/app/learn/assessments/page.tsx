"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageBanner, PremiumCard, TrustBadge } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import { learningApi, type AssessmentListItem } from "../../lib/learning";

export default function AssessmentsPage() {
  const { token, ready } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    learningApi
      .assessments(token)
      .then((data) => active && setAssessments(data))
      .catch(() => active && setAssessments([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, token]);

  return (
    <div className="space-y-6">
      <PageBanner accent="blue" badge="Know your level" art="rings"
        eyebrow="Assess"
        title="Know where you stand"
        description="Short, private self-checks for money habits, risk comfort, scam awareness, and liquidity needs. These do not recommend any product."
      />

      {loading ? (
        <p className="text-sm text-textSecondary">Loading assessments…</p>
      ) : assessments.length === 0 ? (
        <PremiumCard className="text-center">
          <p className="text-sm text-textSecondary">No assessments yet.</p>
        </PremiumCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assessments.map((assessment) => (
            <Link
              key={assessment.id}
              href={`/learn/assessments/${assessment.slug}`}
              className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-borderStrong"
            >
              <div className="flex items-center justify-between">
                <TrustBadge tone="muted">{assessment.scoring === "knowledge" ? "Knowledge" : "Profile"}</TrustBadge>
                {assessment.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
              </div>
              <h3 className="mt-2 text-base font-semibold">{assessment.title}</h3>
              <p className="mt-1 flex-1 text-sm text-textSecondary">{assessment.description}</p>
              <p className="mt-3 text-xs text-textTertiary">
                {assessment.question_count} question{assessment.question_count === 1 ? "" : "s"} · {assessment.xp_reward} XP
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
