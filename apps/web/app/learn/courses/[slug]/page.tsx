"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PremiumCard, TrustBadge } from "../../../components/maliprime";
import { useAuth } from "../../../lib/auth";
import { learningApi, type CourseDetail, type LessonSummary } from "../../../lib/learning";
import { LessonTypeBadge, PremiumGate, ProgressBar } from "../../ui";

export default function CourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const { token, ready } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    if (!ready || !slug) return;
    let active = true;
    setLoading(true);
    learningApi
      .course(slug, token)
      .then((data) => active && setCourse(data))
      .catch(() => active && setError("Could not load this course."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, slug, token]);

  if (loading || !ready) return <p className="text-sm text-textSecondary">Loading course…</p>;
  if (error || !course) return <p className="rounded-lg border border-danger/15 bg-danger/[0.06] px-4 py-3 text-sm text-danger">{error || "Not found."}</p>;

  const firstOpen = course.lessons.find((lesson) => !lesson.locked);
  const xp = course.lessons.reduce((sum, lesson) => sum + lesson.xp_reward, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/learn/tracks/${course.track.slug}`} className="text-sm text-textSecondary hover:text-textPrimary">
          ← {course.track.title}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase text-textTertiary capitalize">{course.track.level}</p>
          {course.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{course.title}</h1>
        <p className="mt-2 text-sm leading-6 text-textSecondary">{course.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-textTertiary">
          <span>{course.lessons.length} lessons</span>
          <span>·</span>
          <span>~{course.estimated_minutes} min</span>
          <span>·</span>
          <span>{xp} XP</span>
        </div>
        <div className="mt-4">
          <ProgressBar value={0} label="Course progress" />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {firstOpen ? (
            <Link
              href={`/learn/lessons/${firstOpen.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark"
            >
              Continue
            </Link>
          ) : null}
          <Link
            href="/learn/practice"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle"
          >
            Practice now
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <PremiumCard>
            <p className="text-xs font-semibold uppercase text-textTertiary">What you’ll learn</p>
            <ul className="mt-2 space-y-1.5 text-sm text-textSecondary">
              {course.lessons.slice(0, 5).map((lesson) => (
                <li key={lesson.id} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-emerald" />
                  {lesson.summary || lesson.title}
                </li>
              ))}
            </ul>
          </PremiumCard>

          <div>
            <h2 className="text-sm font-semibold uppercase text-textTertiary">Lessons</h2>
            <ul className="mt-3 space-y-2">
              {course.lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} onLockedClick={() => setGateOpen(true)} />
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-4">
          <PremiumCard>
            <p className="text-xs font-semibold uppercase text-textTertiary">Resources &amp; glossary</p>
            <Link href="/learn/resources" className="mt-2 inline-block text-sm font-semibold text-emerald underline">
              Open resources
            </Link>
          </PremiumCard>
          <PremiumCard>
            <p className="text-xs font-semibold uppercase text-textTertiary">Related product passports</p>
            <Link href="/product-passports" className="mt-2 inline-block text-sm font-semibold text-emerald underline">
              Browse passports
            </Link>
          </PremiumCard>
        </aside>
      </div>

      <PremiumGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}

function LessonRow({ lesson, onLockedClick }: { lesson: LessonSummary; onLockedClick: () => void }) {
  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-textPrimary">{lesson.title}</p>
        <p className="text-xs text-textTertiary">~{lesson.estimated_minutes} min · {lesson.xp_reward} XP</p>
      </div>
      <div className="flex flex-none items-center gap-2">
        <LessonTypeBadge type={lesson.lesson_type} />
        {lesson.locked ? <span className="text-xs text-textTertiary">🔒</span> : null}
      </div>
    </div>
  );
  if (lesson.locked) {
    return (
      <li>
        <button type="button" onClick={onLockedClick} className="block w-full text-left">
          {inner}
        </button>
      </li>
    );
  }
  return (
    <li>
      <Link href={`/learn/lessons/${lesson.id}`} className="block">
        {inner}
      </Link>
    </li>
  );
}
