"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PremiumCard, TrustBadge } from "../../../components/maliprime";
import { useAuth } from "../../../lib/auth";
import { learningApi, type CourseOutline, type LessonSummary, type TrackOutline } from "../../../lib/learning";
import { LessonTypeBadge, PremiumGate, ProgressBar } from "../../ui";

export default function TrackDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const { token, ready } = useAuth();
  const [track, setTrack] = useState<TrackOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready || !slug) return;
    let active = true;
    setLoading(true);
    learningApi
      .trackOutline(slug, token)
      .then((data) => active && setTrack(data))
      .catch(() => active && setError("Could not load this track."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, slug, token]);

  if (loading || !ready) return <p className="text-sm text-textSecondary">Loading track…</p>;
  if (error || !track) return <p className="rounded-lg border border-danger/15 bg-danger/[0.06] px-4 py-3 text-sm text-danger">{error || "Not found."}</p>;

  const lessonCount = track.courses.reduce(
    (sum, course) => sum + course.lessons.length + course.modules.reduce((s, m) => s + m.lessons.length, 0),
    0
  );
  const simCount = countLessonType(track, "simulation") + countLessonType(track, "simulator");
  const journalCount = countLessonType(track, "journal_prompt");
  const xpAvailable = lessonCount * 10;

  async function saveTrack() {
    if (!token || !track) {
      setGateOpen(false);
      return;
    }
    try {
      await learningApi.saveLibrary(track.id, token);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div>
          <Link href="/learn/tracks" className="text-sm text-textSecondary hover:text-textPrimary">
            ← All tracks
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs font-semibold uppercase text-textTertiary capitalize">{track.level} track</p>
            {track.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{track.title}</h1>
          <p className="mt-2 text-sm leading-6 text-textSecondary">{track.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-textTertiary">
            <span>{track.courses.length} course{track.courses.length === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>{simCount} simulation{simCount === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>{journalCount} journal prompt{journalCount === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>~{track.estimated_minutes} min</span>
            <span>·</span>
            <span>{xpAvailable} XP available</span>
          </div>
          <div className="mt-4">
            <ProgressBar value={0} label="Track progress" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={firstLessonHref(track) || "#"}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark"
            >
              Start track
            </Link>
            <button
              type="button"
              onClick={token ? saveTrack : () => setGateOpen(false)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle"
            >
              {saved ? "Saved to library ✓" : token ? "Save to library" : "Sign in to save"}
            </button>
          </div>
        </div>

        {track.courses.map((course) => (
          <CourseAccordion key={course.id} course={course} onLockedClick={() => setGateOpen(true)} />
        ))}
      </div>

      <aside className="space-y-4">
        <PremiumCard>
          <p className="text-xs font-semibold uppercase text-textTertiary">Prerequisites</p>
          <p className="mt-2 text-sm text-textSecondary">
            None required. Start with Money Foundations if you are new to investing terms.
          </p>
        </PremiumCard>
        <PremiumCard>
          <p className="text-xs font-semibold uppercase text-textTertiary">Resources</p>
          <Link href="/learn/resources" className="mt-2 inline-block text-sm font-semibold text-emerald underline">
            Guides, checklists &amp; glossary
          </Link>
        </PremiumCard>
        <PremiumCard>
          <p className="text-xs font-semibold uppercase text-textTertiary">Professional review</p>
          <p className="mt-2 text-sm text-textSecondary">Want a verified professional to review your plan?</p>
          <Link href="/professional/dashboard" className="mt-2 inline-block text-sm font-semibold text-emerald underline">
            Request scoped review
          </Link>
        </PremiumCard>
      </aside>

      <PremiumGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}

function CourseAccordion({ course, onLockedClick }: { course: CourseOutline; onLockedClick: () => void }) {
  const [open, setOpen] = useState(true);
  const moduleLessons = course.modules.flatMap((module) => module.lessons);
  const allLessons = [...moduleLessons, ...course.lessons];

  return (
    <PremiumCard>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between text-left">
        <div>
          <h2 className="text-base font-semibold">{course.title}</h2>
          <p className="text-xs text-textSecondary">
            {allLessons.length} lesson{allLessons.length === 1 ? "" : "s"} · ~{course.estimated_minutes} min
          </p>
        </div>
        <span className="text-textTertiary">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="mt-4 space-y-4">
          <Link href={`/learn/courses/${course.slug}`} className="inline-block text-sm font-semibold text-emerald underline">
            Open course detail
          </Link>
          {course.modules.map((module) => (
            <div key={module.id}>
              <p className="text-xs font-semibold uppercase text-textTertiary">{module.title}</p>
              <ul className="mt-2 space-y-1.5">
                {module.lessons.map((lesson) => (
                  <LessonRow key={lesson.id} lesson={lesson} onLockedClick={onLockedClick} />
                ))}
              </ul>
            </div>
          ))}
          {course.lessons.length > 0 ? (
            <ul className="space-y-1.5">
              {course.lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} onLockedClick={onLockedClick} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </PremiumCard>
  );
}

function LessonRow({ lesson, onLockedClick }: { lesson: LessonSummary; onLockedClick: () => void }) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
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
          {content}
        </button>
      </li>
    );
  }
  return (
    <li>
      <Link href={`/learn/lessons/${lesson.id}`} className="block">
        {content}
      </Link>
    </li>
  );
}

function countLessonType(track: TrackOutline, type: string): number {
  return track.courses.reduce(
    (sum, course) =>
      sum +
      course.lessons.filter((lesson) => lesson.lesson_type === type).length +
      course.modules.reduce((s, module) => s + module.lessons.filter((lesson) => lesson.lesson_type === type).length, 0),
    0
  );
}

function firstLessonHref(track: TrackOutline): string | null {
  for (const course of track.courses) {
    const lesson = course.modules.flatMap((module) => module.lessons)[0] || course.lessons[0];
    if (lesson && !lesson.locked) return `/learn/lessons/${lesson.id}`;
  }
  return null;
}
