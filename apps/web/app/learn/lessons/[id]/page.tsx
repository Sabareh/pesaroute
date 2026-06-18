"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { learningApi, type LessonDetail } from "../../../lib/learning";
import { LessonTypeBadge, PremiumGate, SourceFooter, StructuredContent } from "../../ui";

export default function LessonPlayerPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { token, ready, isAuthenticated } = useAuth();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    if (!ready || !id) return;
    let active = true;
    setLoading(true);
    learningApi
      .lesson(id, token)
      .then((data) => active && setLesson(data))
      .catch(() => active && setError("Could not load this lesson."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, id, token]);

  async function complete() {
    if (!token) {
      setGateOpen(false);
      return;
    }
    if (!lesson) return;
    setCompleting(true);
    try {
      await learningApi.completeLesson(lesson.id, token);
      setCompleted(true);
    } catch {
      setCompleted(false);
    } finally {
      setCompleting(false);
    }
  }

  if (loading || !ready) return <p className="text-sm text-textSecondary">Loading lesson…</p>;
  if (error || !lesson) return <p className="rounded-lg border border-danger/15 bg-danger/[0.06] px-4 py-3 text-sm text-danger">{error || "Not found."}</p>;

  if (lesson.locked) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href={`/learn/courses/${lesson.course_slug}`} className="text-sm text-textSecondary hover:text-textPrimary">
          ← {lesson.course_title}
        </Link>
        <div className="mt-6 rounded-lg border border-amber/30 bg-surfaceSubtle p-6 text-center">
          <h1 className="text-xl font-semibold">{lesson.title}</h1>
          <p className="mt-2 text-sm text-textSecondary">This lesson is part of premium learning.</p>
          <button
            type="button"
            onClick={() => setGateOpen(true)}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white"
          >
            See Premium
          </button>
        </div>
        <PremiumGate open={gateOpen} onClose={() => setGateOpen(false)} />
      </div>
    );
  }

  const isSimulator = lesson.lesson_type === "simulation" || lesson.lesson_type === "simulator";

  return (
    <div className="mx-auto max-w-2xl pb-28">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Link href={`/learn/courses/${lesson.course_slug}`} className="truncate text-sm text-textSecondary hover:text-textPrimary">
          ← {lesson.course_title}
        </Link>
        <a href="/professional/dashboard" className="flex-none text-xs text-textTertiary hover:text-textPrimary">
          Report issue
        </a>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <LessonTypeBadge type={lesson.lesson_type} />
        <span className="text-xs text-textTertiary">~{lesson.estimated_minutes} min · {lesson.xp_reward} XP</span>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{lesson.title}</h1>
      {lesson.summary ? <p className="mt-1 text-sm text-textSecondary">{lesson.summary}</p> : null}

      <div className="mt-6">
        {lesson.needs_review_fallback ? (
          <p className="rounded-lg border border-amber/30 bg-surfaceSubtle px-4 py-3 text-sm text-textSecondary">
            This lesson is being reviewed for quality. Check back soon.
          </p>
        ) : (
          <StructuredContent blocks={lesson.structured_content} />
        )}
      </div>

      <SourceFooter
        sources={lesson.content_sources}
        sourceLabel={lesson.source_label}
        confidence={lesson.source_confidence}
      />

      {/* Sticky bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={complete}
            disabled={completing || completed}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:opacity-70"
          >
            {completed ? `Completed ✓ +${lesson.xp_reward} XP` : completing ? "Saving…" : isAuthenticated ? "Mark complete" : "Sign in to complete"}
          </button>
          <Link
            href="/learn/practice"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle"
          >
            Practice
          </Link>
          {isSimulator ? (
            <Link
              href="/simulate"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle"
            >
              Run simulator
            </Link>
          ) : null}
          <Link
            href={`/learn/courses/${lesson.course_slug}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle"
          >
            Next in course
          </Link>
        </div>
      </div>

      <PremiumGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}
