"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageBanner, PremiumCard, TrustBadge } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import { learningApi, type Activity, type ProgressSummary } from "../../lib/learning";

export default function MyActivityPage() {
  const { token, ready, isAuthenticated } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([learningApi.activity(token), learningApi.progress(token)])
      .then(([activityData, progressData]) => {
        if (!active) return;
        setActivity(activityData);
        setProgress(progressData);
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, token]);

  if (!ready) return <p className="text-sm text-textSecondary">Loading…</p>;

  if (!isAuthenticated) {
    return (
      <PremiumCard className="mx-auto max-w-lg text-center">
        <h1 className="text-xl font-semibold">My activity</h1>
        <p className="mt-2 text-sm text-textSecondary">
          Sign in to see XP, streaks, badges, completed lessons, simulations, and journal reflections. Browsing tracks
          stays open to everyone.
        </p>
        <Link href="/learn/tracks" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
          Browse tracks
        </Link>
      </PremiumCard>
    );
  }

  if (loading) return <p className="text-sm text-textSecondary">Loading your activity…</p>;

  const stats = [
    { label: "Total XP", value: progress?.total_xp ?? activity?.total_xp ?? 0 },
    { label: "Day streak", value: progress?.streak.current_streak_days ?? 0 },
    { label: "Lessons completed", value: progress?.completed_lessons.length ?? 0 },
    { label: "Simulations", value: progress?.simulations_completed ?? 0 },
    { label: "Journal reflections", value: progress?.journal_reflections_completed ?? 0 },
    { label: "Badges", value: progress?.badges.length ?? 0 }
  ];

  return (
    <div className="space-y-6">
      <PageBanner accent="blue" badge="Your progress" art="bars" eyebrow="Review" title="My activity & progress" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <PremiumCard key={stat.label}>
            <p className="text-2xl font-semibold tracking-[-0.02em]">{stat.value}</p>
            <p className="text-xs text-textSecondary">{stat.label}</p>
          </PremiumCard>
        ))}
      </div>

      {progress && progress.badges.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold uppercase text-textTertiary">Badges</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {progress.badges.map((item) => (
              <TrustBadge key={item.id} tone="emerald">
                {item.badge.name}
              </TrustBadge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase text-textTertiary">Completed lessons</h2>
          {progress && progress.completed_lessons.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {progress.completed_lessons.slice(0, 12).map((lesson) => (
                <li key={lesson.id} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-textPrimary">
                  {lesson.lesson_title}
                  <span className="ml-2 text-xs text-textTertiary">{lesson.track_slug}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-textSecondary">No completed lessons yet.</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase text-textTertiary">Recent XP</h2>
          {activity && activity.xp_events.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {activity.xp_events.slice(0, 12).map((event) => (
                <li key={event.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2 text-sm">
                  <span className="capitalize text-textSecondary">{event.source_type.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-emerald">+{event.xp_amount} XP</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-textSecondary">No XP events yet.</p>
          )}
        </div>
      </div>

      {activity && activity.assessment_results.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold uppercase text-textTertiary">Assessment results</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {activity.assessment_results.map((res) => (
              <PremiumCard key={res.id}>
                <p className="text-sm font-semibold capitalize">{res.assessment_kind.replace(/_/g, " ")}</p>
                <p className="mt-1 text-sm text-textSecondary">{res.result_label || `${res.score}%`}</p>
              </PremiumCard>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
