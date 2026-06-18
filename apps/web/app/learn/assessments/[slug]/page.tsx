"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PremiumCard, TrustBadge } from "../../../components/maliprime";
import { useAuth } from "../../../lib/auth";
import { learningApi, type AssessmentDetail, type AssessmentSubmitResult } from "../../../lib/learning";
import { PremiumGate, QuestionStepper } from "../../ui";

type Phase = "intro" | "playing" | "results";

export default function AssessmentPlayerPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const { token, ready, isAuthenticated } = useAuth();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentSubmitResult | null>(null);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    if (!ready || !slug) return;
    let active = true;
    setLoading(true);
    learningApi
      .assessmentDetail(slug, token)
      .then((data) => active && setAssessment(data))
      .catch(() => active && setError("Could not load this assessment."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, slug, token]);

  async function submit(answers: Record<string, string>) {
    if (!assessment || !token) return;
    setSubmitting(true);
    try {
      const data = await learningApi.submitAssessment(assessment.slug, answers, token);
      setResult(data);
      setPhase("results");
    } catch {
      setError("Could not submit your answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !ready) return <p className="text-sm text-textSecondary">Loading assessment…</p>;
  if (error || !assessment) return <p className="rounded-lg border border-danger/15 bg-danger/[0.06] px-4 py-3 text-sm text-danger">{error || "Not found."}</p>;

  if (assessment.locked) {
    return (
      <div className="mx-auto max-w-2xl">
        <PremiumCard className="border-amber/30 text-center">
          <h1 className="text-xl font-semibold">{assessment.title}</h1>
          <p className="mt-2 text-sm text-textSecondary">This assessment is part of premium learning.</p>
          <button type="button" onClick={() => setGateOpen(true)} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white">
            See Premium
          </button>
        </PremiumCard>
        <PremiumGate open={gateOpen} onClose={() => setGateOpen(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/learn/assessments" className="text-sm text-textSecondary hover:text-textPrimary">
        ← All assessments
      </Link>

      {phase === "intro" ? (
        <PremiumCard className="mt-4">
          <p className="text-xs font-semibold uppercase text-textTertiary">Assess</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{assessment.title}</h1>
          <p className="mt-2 text-sm leading-6 text-textSecondary">{assessment.description}</p>
          <ul className="mt-4 space-y-1.5 text-sm text-textSecondary">
            <li>• {assessment.question_count} question{assessment.question_count === 1 ? "" : "s"}.</li>
            <li>• No time limit. Private to you.</li>
            <li>• Earn {assessment.xp_reward} XP when you complete it.</li>
          </ul>
          {!isAuthenticated ? (
            <p className="mt-4 rounded-lg border border-border bg-surfaceSubtle px-4 py-3 text-sm text-textSecondary">
              Sign in to submit and earn XP.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setPhase("playing")}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primaryDark"
          >
            Start
          </button>
        </PremiumCard>
      ) : null}

      {phase === "playing" ? (
        <PremiumCard className="mt-4">
          <QuestionStepper
            questions={assessment.questions}
            submitting={submitting}
            submitLabel={isAuthenticated ? "See result" : "Sign in to submit"}
            onComplete={(answers) => (isAuthenticated ? submit(answers) : setGateOpen(false))}
          />
        </PremiumCard>
      ) : null}

      {phase === "results" && result ? (
        <PremiumCard className="mt-4 border-emerald/20 bg-mint">
          <p className="text-xs font-semibold uppercase text-textTertiary">Your result</p>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{result.result_label || `${result.score}%`}</p>
          <div className="mt-2 flex gap-2">
            <TrustBadge tone="muted">Score {result.score}%</TrustBadge>
            <TrustBadge tone={result.passed ? "emerald" : "amber"}>{result.passed ? "Completed" : "Keep practising"}</TrustBadge>
            <TrustBadge tone="muted">{result.xp_awarded > 0 ? `+${result.xp_awarded} XP` : "XP already earned"}</TrustBadge>
          </div>
          <p className="mt-3 text-sm text-textSecondary">
            This is a private, educational self-check. It does not recommend any specific product.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/learn/tracks" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark">
              Explore tracks
            </Link>
            <Link href="/learn/my-activity" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
              View activity
            </Link>
          </div>
        </PremiumCard>
      ) : null}

      <PremiumGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}
