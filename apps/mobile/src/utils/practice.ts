import type { PracticeKind } from "../api/client";

export type PracticeKindMeta = {
  label: string;
  blurb: string;
};

// Labels and blurbs for the practice home cards. Money-decision framing only —
// never trading or returns.
export const PRACTICE_KIND_META: Record<PracticeKind, PracticeKindMeta> = {
  review_recent: { label: "Review recent", blurb: "Revisit ideas from lessons you started." },
  weak_area: { label: "Weak areas", blurb: "Focus on what needs another pass." },
  scenario_practice: { label: "Scenario practice", blurb: "Decide what to do in real money situations." },
  flashcards: { label: "Flashcards", blurb: "Quick term and meaning review." },
  simulator_practice: { label: "Simulator practice", blurb: "Practise reading simulation outputs." },
  scam_red_flag_practice: { label: "Scam red flags", blurb: "Spot unsafe pitches before money moves." }
};

export function practiceKindLabel(kind: string): string {
  return PRACTICE_KIND_META[kind as PracticeKind]?.label ?? kind.replace(/_/g, " ");
}

export function practiceKindBlurb(kind: string): string {
  return PRACTICE_KIND_META[kind as PracticeKind]?.blurb ?? "Practise money decisions.";
}

// True when every question has a chosen answer.
export function allAnswered(questionIds: number[], answers: Record<string, string>): boolean {
  return questionIds.length > 0 && questionIds.every((id) => Boolean(answers[String(id)]));
}

export function answeredCount(answers: Record<string, string>): number {
  return Object.values(answers).filter((value) => Boolean(value)).length;
}

export function setAnswer(answers: Record<string, string>, questionId: number, value: string): Record<string, string> {
  return { ...answers, [String(questionId)]: value };
}

export function formatScore(score: number): string {
  return `${Math.round(score)}%`;
}

// Plain-language XP note that never implies a financial reward.
export function xpAwardNote(xpAwarded: number): string {
  return xpAwarded > 0 ? `+${xpAwarded} learning XP` : "XP already earned for this set";
}
