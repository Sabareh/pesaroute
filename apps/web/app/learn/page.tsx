"use client";

import { BookOpen, ClipboardCheck, Dumbbell, Calculator, Flame, RotateCcw, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconTile, PageBanner, PremiumCard, ProgressRing, StatPill, TrustBadge } from "../components/maliprime";
import { useAuth } from "../lib/auth";
import { learningApi, type Dashboard, type ProgressSummary, type TrackOutline } from "../lib/learning";

export default function LearnDashboardPage() {
  const { token, ready, isAuthenticated } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [currentOutline, setCurrentOutline] = useState<TrackOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true);
    learningApi
      .dashboard(token)
      .then((data) => {
        if (!active) return;
        setDashboard(data);
        // Fetch the current track outline so the progress ring shows a REAL %.
        const slug = data.continue_learning?.track.slug ?? data.current_track?.slug;
        if (slug) {
          learningApi
            .trackOutline(slug, token)
            .then((outline) => active && setCurrentOutline(outline))
            .catch(() => undefined);
        }
      })
      .catch(() => active && setError("Could not load your dashboard. Please try again."))
      .finally(() => active && setLoading(false));
    if (token) {
      learningApi
        .progress(token)
        .then((data) => active && setProgress(data))
        .catch(() => undefined);
    } else {
      setProgress(null);
    }
    return () => {
      active = false;
    };
  }, [ready, token]);

  if (loading || !ready) {
    return <p className="text-sm text-textSecondary">Loading your learning dashboard…</p>;
  }
  if (error || !dashboard) {
    return <p className="rounded-lg border border-danger/15 bg-danger/[0.06] px-4 py-3 text-sm text-danger">{error || "Unavailable."}</p>;
  }

  const continueItem = dashboard.continue_learning;
  const trackSlug = continueItem?.track.slug ?? dashboard.current_track?.slug;

  // Real track completion: completed lessons in this track / total lessons in outline.
  const totalLessons = currentOutline
    ? currentOutline.courses.reduce(
        (sum, course) => sum + course.lessons.length + course.modules.reduce((s, m) => s + m.lessons.length, 0),
        0
      )
    : 0;
  const completedInTrack =
    progress && trackSlug ? progress.completed_lessons.filter((lesson) => lesson.track_slug === trackSlug).length : 0;
  const trackPct = totalLessons > 0 ? Math.round((completedInTrack / totalLessons) * 100) : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <PageBanner accent="blue" badge="Your home" art="layers"
          eyebrow={dashboard.greeting}
          title="Your learning home"
          description="Assess - Learn - Practice - Apply - Review."
        />

        {/* Top stat pills */}
        <div className="grid grid-cols-3 gap-3">
          <StatPill icon={Star} value={dashboard.total_xp} label="Total XP" tone="accent" />
          <StatPill icon={Flame} value={dashboard.daily_streak?.current_streak_days ?? 0} label="Day streak" tone="amber" />
          <StatPill icon={RotateCcw} value={dashboard.review_count} label="To review" tone="sky" />
        </div>

        {/* Continue learning hero with progress ring */}
        {continueItem ? (
          <PremiumCard className="overflow-hidden">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <ProgressRing value={trackPct} size={132}>
                <span className="text-2xl font-bold text-textPrimary">{trackPct}%</span>
                <span className="text-[11px] font-medium uppercase text-textTertiary">complete</span>
              </ProgressRing>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-textTertiary">Continue learning</p>
                <h2 className="mt-2 text-xl font-bold tracking-[-0.01em]">{continueItem.lesson.title}</h2>
                <p className="mt-1 text-sm text-textSecondary">
                  {continueItem.track.title} · {continueItem.course.title}
                </p>
                <p className="mt-1 text-xs text-textTertiary">About {continueItem.lesson.estimated_minutes} min · {completedInTrack}/{totalLessons || "-"} lessons</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                  <Link
                    href={`/learn/lessons/${continueItem.lesson.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primaryDark"
                  >
                    Continue learning
                  </Link>
                  <Link
                    href="/learn/practice"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle"
                  >
                    Practice
                  </Link>
                </div>
              </div>
            </div>
          </PremiumCard>
        ) : dashboard.current_track ? (
          <PremiumCard>
            <p className="text-xs font-semibold uppercase text-textTertiary">Start here</p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.01em]">{dashboard.current_track.title}</h2>
            <p className="mt-1 text-sm text-textSecondary">{dashboard.current_track.description}</p>
            <Link
              href={`/learn/tracks/${dashboard.current_track.slug}`}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark"
            >
              View track
            </Link>
          </PremiumCard>
        ) : null}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-textTertiary">Quick actions</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <IconTile icon={Dumbbell} tone="accent" title="Practice" body="Money decisions" href="/learn/practice" />
            <IconTile icon={ClipboardCheck} tone="amber" title="Assess" body="Know where you stand" href="/learn/assessments" />
            <IconTile icon={BookOpen} tone="violet" title="Resources" body="Guides & glossary" href="/learn/resources" />
            <IconTile icon={Calculator} tone="sky" title="Simulate" body="Compare products" href="/simulate" />
          </div>
        </div>

        {/* Review + suggestions */}
        <div className="grid gap-4 sm:grid-cols-2">
          <PremiumCard>
            <p className="text-xs font-semibold uppercase text-textTertiary">Review opportunities</p>
            <p className="mt-2 text-3xl font-bold tracking-[-0.02em]">{dashboard.review_count}</p>
            <p className="text-sm text-textSecondary">lessons in progress to revisit</p>
            <Link href="/learn/practice" className="mt-3 inline-block text-sm font-semibold text-accent underline">
              Go to practice
            </Link>
          </PremiumCard>
          {dashboard.suggested_practice ? (
            <PremiumCard>
              <p className="text-xs font-semibold uppercase text-textTertiary">Suggested practice</p>
              <h3 className="mt-2 text-base font-semibold">{dashboard.suggested_practice.title}</h3>
              <p className="mt-1 text-sm text-textSecondary">{dashboard.suggested_practice.description}</p>
              <Link
                href={`/learn/practice/${dashboard.suggested_practice.id}`}
                className="mt-3 inline-block text-sm font-semibold text-accent underline"
              >
                Start practice
              </Link>
            </PremiumCard>
          ) : null}
        </div>

        {/* Assessments */}
        {dashboard.assessments.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-textTertiary">Assess yourself first</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {dashboard.assessments.map((assessment) => (
                <Link
                  key={assessment.id}
                  href={`/learn/assessments/${assessment.slug}`}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:border-borderStrong"
                >
                  <p className="text-sm font-semibold">{assessment.title}</p>
                  <p className="mt-1 text-xs text-textSecondary">{assessment.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Right rail */}
      <aside className="space-y-4">
        <PremiumCard>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-textTertiary">Your activity</p>
            <TrustBadge tone={dashboard.premium_status === "premium" ? "emerald" : "muted"}>
              {dashboard.premium_status === "premium" ? "Premium" : "Free"}
            </TrustBadge>
          </div>
          {isAuthenticated ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl font-bold">{dashboard.total_xp}</p>
                  <p className="text-xs text-textSecondary">Total XP</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboard.daily_streak?.current_streak_days ?? 0}</p>
                  <p className="text-xs text-textSecondary">Day streak</p>
                </div>
              </div>
              {progress && progress.badges.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-textTertiary">Badges</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {progress.badges.slice(0, 6).map((item) => (
                      <TrustBadge key={item.id} tone="emerald">
                        {item.badge.name}
                      </TrustBadge>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-textSecondary">
              Sign in to track XP, streaks, and badges. Browsing stays open to everyone.
            </p>
          )}
        </PremiumCard>

        <PremiumCard>
          <p className="text-xs font-semibold uppercase text-textTertiary">Learning goal</p>
          <p className="mt-2 text-sm text-textSecondary">
            Understand risk, liquidity, fees, and verification before any money moves. XP rewards learning - never
            returns or portfolio size.
          </p>
        </PremiumCard>

      </aside>
    </div>
  );
}
