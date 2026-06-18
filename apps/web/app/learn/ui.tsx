"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { TrustBadge } from "../components/maliprime";
import { confidenceLabel } from "../lib/labels";
import { useAuth } from "../lib/auth";
import type { StructuredBlock } from "../lib/learning";

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      {label ? <p className="mb-1 text-xs font-medium text-textSecondary">{label}</p> : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surfaceSubtle" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
        active ? "border-primary bg-primary text-white" : "border-border bg-surface text-textSecondary hover:border-borderStrong"
      }`}
    >
      {label}
    </button>
  );
}

export function LessonTypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, " ");
  const tone = type === "quiz" || type === "scenario" ? "amber" : type === "simulation" || type === "simulator" ? "emerald" : "muted";
  return <TrustBadge tone={tone}>{label}</TrustBadge>;
}

export function SourceFooter({
  sources,
  sourceLabel,
  confidence
}: {
  sources: { id: number; organization: string; title: string; url: string }[];
  sourceLabel: string;
  confidence: string;
}) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-surfaceSubtle p-4">
      <p className="text-xs font-semibold uppercase text-textTertiary">Sources &amp; confidence</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <TrustBadge tone="muted">{confidenceLabel(confidence)}</TrustBadge>
        <TrustBadge tone="muted">{sourceLabel}</TrustBadge>
      </div>
      {sources.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {sources.map((source) => (
            <li key={source.id}>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-emerald underline">
                  {source.organization}: {source.title}
                </a>
              ) : (
                <span className="text-textSecondary">
                  {source.organization}: {source.title}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function StructuredContent({ blocks }: { blocks: StructuredBlock[] }) {
  if (!blocks || blocks.length === 0) {
    return null;
  }
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <h2 key={index} className="text-xl font-semibold tracking-[-0.01em] text-textPrimary">
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={index} className="text-base leading-7 text-textSecondary">
                {block.text}
              </p>
            );
          case "scenario":
            return (
              <div key={index} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase text-textTertiary">{block.title || "Kenyan scenario"}</p>
                <p className="mt-1 text-base leading-7 text-textSecondary">{block.text}</p>
              </div>
            );
          case "definition":
            return (
              <div key={index} className="rounded-lg border border-border bg-surfaceSubtle p-4">
                <p className="text-sm font-semibold text-textPrimary">{block.term}</p>
                <p className="mt-1 text-sm leading-6 text-textSecondary">{block.text}</p>
              </div>
            );
          case "checklist":
            return (
              <div key={index}>
                <p className="text-sm font-semibold text-textPrimary">{block.title || "Checklist"}</p>
                <ul className="mt-2 space-y-1.5">
                  {(block.items || []).map((item, itemIndex) => (
                    <li key={itemIndex} className="flex gap-2 text-sm leading-6 text-textSecondary">
                      <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-emerald" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          case "caution":
            return (
              <div key={index} className="rounded-lg border border-amber/30 bg-surfaceSubtle p-4">
                <p className="text-xs font-semibold uppercase text-amber">{block.title || "What can go wrong"}</p>
                <p className="mt-1 text-sm leading-6 text-textSecondary">{block.text}</p>
              </div>
            );
          case "key_takeaway":
            return (
              <div key={index} className="rounded-lg border border-emerald/20 bg-mint p-4">
                <p className="text-xs font-semibold uppercase text-emerald">Key takeaway</p>
                <p className="mt-1 text-sm leading-6 text-textPrimary">{block.text}</p>
              </div>
            );
          case "comparison_table":
            return (
              <div key={index} className="overflow-x-auto">
                {block.title ? <p className="mb-2 text-sm font-semibold text-textPrimary">{block.title}</p> : null}
                <table className="w-full border-collapse text-sm">
                  {block.columns ? (
                    <thead>
                      <tr>
                        {block.columns.map((col) => (
                          <th key={col} className="border-b border-border py-2 text-left font-semibold text-textPrimary">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {(block.rows || []).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border-b border-border py-2 pr-4 text-textSecondary">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "source_note":
            return (
              <p key={index} className="text-xs leading-5 text-textTertiary">
                {block.text}
              </p>
            );
          case "disclaimer":
            return null;
          default:
            return block.text ? (
              <div key={index} className="rounded-lg border border-border bg-surface p-4">
                {block.title ? <p className="text-xs font-semibold uppercase text-textTertiary">{block.title}</p> : null}
                <p className="mt-1 text-sm leading-6 text-textSecondary">{block.text}</p>
              </div>
            ) : null;
        }
      })}
    </div>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-soft">{children}</div>
    </div>
  );
}

export function PremiumGate({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <p className="text-xs font-semibold uppercase text-textTertiary">PesaRoute Premium</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-textPrimary">Unlock deeper investment learning.</h2>
      <p className="mt-2 text-sm leading-6 text-textSecondary">
        Get advanced tracks, unlimited simulations, downloadable checklists, and professional review preparation.
      </p>
      <p className="mt-4 text-2xl font-semibold text-textPrimary">
        KES 300<span className="text-base font-medium text-textSecondary">/month</span>
      </p>
      <p className="text-xs text-textTertiary">Annual plan placeholder available at checkout.</p>
      <ul className="mt-4 space-y-2 text-sm text-textSecondary">
        {[
          "Advanced Kenyan investment tracks",
          "Unlimited practice",
          "Unlimited simulations",
          "Premium checklists",
          "Professional review prep"
        ].map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-emerald" />
            {benefit}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/#pricing"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark"
        >
          Unlock Premium
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle"
        >
          Continue with free lessons
        </button>
      </div>
    </Modal>
  );
}

export type StepQuestion = { id: number; prompt: string; options: { label: string; value: string }[] };

export function QuestionStepper({
  questions,
  submitting,
  submitLabel = "Submit",
  onComplete
}: {
  questions: StepQuestion[];
  submitting?: boolean;
  submitLabel?: string;
  onComplete: (answers: Record<string, string>) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const current = questions[index];
  const selected = current ? answers[String(current.id)] : undefined;
  const isLast = index === questions.length - 1;

  const choose = useCallback(
    (value: string) => {
      if (!current) return;
      setAnswers((prev) => ({ ...prev, [String(current.id)]: value }));
    },
    [current]
  );

  const advance = useCallback(() => {
    if (!current || !answers[String(current.id)] || submitting) return;
    if (isLast) {
      onComplete({ ...answers });
    } else {
      setIndex((value) => value + 1);
    }
  }, [current, answers, isLast, onComplete, submitting]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!current) return;
      const numeric = Number(event.key);
      if (numeric >= 1 && numeric <= current.options.length) {
        choose(current.options[numeric - 1].value);
      } else if (event.key === "Enter") {
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, choose, advance]);

  if (!current) return null;

  return (
    <div>
      <div className="mb-3">
        <ProgressBar value={((index + 1) / questions.length) * 100} label={`Question ${index + 1} of ${questions.length}`} />
      </div>
      <p className="text-lg font-semibold text-textPrimary">{current.prompt}</p>
      <div className="mt-4 space-y-2">
        {current.options.map((option, optionIndex) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => choose(option.value)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                active ? "border-primary bg-surfaceSubtle text-textPrimary" : "border-border bg-surface text-textSecondary hover:border-borderStrong"
              }`}
            >
              <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border text-xs font-semibold ${active ? "border-primary bg-primary text-white" : "border-border text-textTertiary"}`}>
                {optionIndex + 1}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
          className="text-sm font-medium text-textSecondary disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={!selected || submitting}
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:opacity-50"
        >
          {isLast ? (submitting ? "Submitting…" : submitLabel) : "Next"}
        </button>
      </div>
      <p className="mt-3 text-xs text-textTertiary">Tip: press 1-{current.options.length} to choose, Enter to continue.</p>
    </div>
  );
}

export function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") {
        await signIn(username, password);
      } else {
        await register({
          username,
          password,
          email: email || undefined,
          invite_code: inviteCode || undefined
        });
      }
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: "signin" | "register") {
    setMode(next);
    setError(null);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <p className="text-xs font-semibold uppercase text-textTertiary">PesaRoute</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-textPrimary">
        {mode === "signin" ? "Sign in to track progress" : "Create your account"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-textSecondary">Your learning, XP, and saved tracks sync across web and mobile.</p>

      <div className="mt-4 flex rounded-full border border-border bg-surfaceSubtle p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={`flex-1 rounded-full px-4 py-1.5 transition ${mode === "signin" ? "bg-surface text-textPrimary shadow-card" : "text-textSecondary"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`flex-1 rounded-full px-4 py-1.5 transition ${mode === "register" ? "bg-surface text-textPrimary shadow-card" : "text-textSecondary"}`}
        >
          Create account
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={submit}>
        <input
          type="text"
          placeholder="Username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-borderStrong focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-borderStrong focus:outline-none"
        />
        {mode === "register" ? (
          <>
            <input
              type="email"
              placeholder="Email (optional)"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-borderStrong focus:outline-none"
            />
            <input
              type="text"
              placeholder="Invite code (private beta)"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-borderStrong focus:outline-none"
            />
          </>
        ) : null}
        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:opacity-60"
        >
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </Modal>
  );
}
