"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PremiumCard, TrustBadge } from "../../../components/maliprime";
import { useAuth } from "../../../lib/auth";
import { learningApi, type PracticeSetDetail, type PracticeSubmitResult } from "../../../lib/learning";
import { PremiumGate, QuestionStepper } from "../../ui";

type Phase = "intro" | "playing" | "results";

export default function PracticePlayerPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { token, ready, isAuthenticated } = useAuth();
  const [set, setSet] = useState<PracticeSetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeSubmitResult | null>(null);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    if (!ready || !id) return;
    let active = true;
    setLoading(true);
    learningApi
      .practiceDetail(id, token)
      .then((data) => active && setSet(data))
      .catch(() => active && setError("Could not load this practice set."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, id, token]);

  async function submit(answers: Record<string, string>) {
    if (!set || !token) return;
    setSubmitting(true);
    try {
      const data = await learningApi.submitPractice(set.id, answers, token);
      setResult(data);
      setPhase("results");
    } catch {
      setError("Could not submit your answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !ready) return <p className="text-sm text-textSecondary">Loading practice…</p>;
  if (error || !set) return <p className="rounded-lg border border-danger/15 bg-danger/[0.06] px-4 py-3 text-sm text-danger">{error || "Not found."}</p>;

  if (set.locked) {
    return (
      <div className="mx-auto max-w-2xl">
        <PremiumCard className="border-amber/30 text-center">
          <h1 className="text-xl font-semibold">{set.title}</h1>
          <p className="mt-2 text-sm text-textSecondary">This practice set is part of premium learning.</p>
          <button type="button" onClick={() => setGateOpen(true)} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white">
            See Premium
          </button>
        </PremiumCard>
        <PremiumGate open={gateOpen} onClose={() => setGateOpen(false)} />
      </div>
    );
  }

  const stepperQuestions = set.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({ label: option, value: option }))
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/learn/practice" className="text-sm text-textSecondary hover:text-textPrimary">
        ← All practice
      </Link>

      {phase === "intro" ? (
        <PremiumCard className="mt-4">
          <p className="text-xs font-semibold uppercase text-textTertiary">Practice</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{set.title}</h1>
          <p className="mt-2 text-sm leading-6 text-textSecondary">{set.description}</p>
          <ul className="mt-4 space-y-1.5 text-sm text-textSecondary">
            <li>• {set.question_count} question{set.question_count === 1 ? "" : "s"} to answer.</li>
            <li>• No time limit.</li>
            <li>• Earn {set.xp_reward} XP for completing it.</li>
            <li>• On web, press 1-4 to choose and Enter to continue.</li>
          </ul>
          {!isAuthenticated ? (
            <p className="mt-4 rounded-lg border border-border bg-surfaceSubtle px-4 py-3 text-sm text-textSecondary">
              Sign in to submit answers and earn XP. You can still read the questions.
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
            questions={stepperQuestions}
            submitting={submitting}
            submitLabel={isAuthenticated ? "Submit answers" : "Sign in to submit"}
            onComplete={(answers) => (isAuthenticated ? submit(answers) : setGateOpen(false))}
          />
          {!isAuthenticated ? (
            <p className="mt-4 text-xs text-textTertiary">Submitting and XP require signing in.</p>
          ) : null}
        </PremiumCard>
      ) : null}

      {phase === "results" && result ? (
        <div className="mt-4 space-y-4">
          <PremiumCard className="border-emerald/20 bg-mint">
            <p className="text-xs font-semibold uppercase text-textTertiary">Practice complete</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.02em]">
              {result.correct_count}/{result.total_questions} correct
            </p>
            <div className="mt-2 flex gap-2">
              <TrustBadge tone="emerald">Score {result.score}%</TrustBadge>
              <TrustBadge tone="muted">{result.xp_awarded > 0 ? `+${result.xp_awarded} XP` : "XP already earned"}</TrustBadge>
            </div>
          </PremiumCard>
          {set.questions.map((question) => {
            const outcome = result.results.find((item) => item.question_id === question.id);
            return (
              <PremiumCard key={question.id}>
                <p className="text-sm font-semibold text-textPrimary">{question.prompt}</p>
                <p className={`mt-2 text-sm font-medium ${outcome?.correct ? "text-emerald" : "text-danger"}`}>
                  {outcome?.correct ? "Correct" : `Correct answer: ${outcome?.correct_answer}`}
                </p>
                {outcome?.explanation ? <p className="mt-1 text-sm text-textSecondary">{outcome.explanation}</p> : null}
              </PremiumCard>
            );
          })}
          <div className="flex gap-3">
            <Link href="/learn/practice" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
              More practice
            </Link>
            <Link href="/learn/my-activity" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark">
              View activity
            </Link>
          </div>
        </div>
      ) : null}

      <PremiumGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}
