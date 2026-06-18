"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorState, PageBanner, PremiumCard, TrustBadge } from "../../components/maliprime";
import { postFinder } from "../../lib/api";
import { NoAdviceNote } from "../_components";

type Question = { key: string; label: string; options: Array<{ value: string; label: string }> };

const QUESTIONS: Question[] = [
  { key: "amount_range", label: "How much are you planning with?", options: [
    { value: "1k_5k", label: "KES 1k-5k" }, { value: "5k_20k", label: "KES 5k-20k" }, { value: "20k_100k", label: "KES 20k-100k" },
    { value: "100k_500k", label: "KES 100k-500k" }, { value: "500k_plus", label: "KES 500k+" }, { value: "prefer_not_to_say", label: "Prefer not to say" } ] },
  { key: "goal", label: "What is the goal?", options: [
    { value: "emergency_fund", label: "Emergency fund" }, { value: "first_investment", label: "First investment" }, { value: "school_fees", label: "School fees" },
    { value: "land_deposit", label: "Land deposit" }, { value: "business", label: "Business" }, { value: "retirement", label: "Retirement" },
    { value: "chama_sacco", label: "Chama/SACCO" }, { value: "global_exposure", label: "Global exposure" }, { value: "diaspora_investing", label: "Diaspora investing" } ] },
  { key: "timeline", label: "When do you need the money?", options: [
    { value: "under_3_months", label: "Under 3 months" }, { value: "3_12_months", label: "3-12 months" }, { value: "1_3_years", label: "1-3 years" },
    { value: "3_5_years", label: "3-5 years" }, { value: "5_plus_years", label: "5+ years" } ] },
  { key: "quick_withdrawal", label: "How important is quick withdrawal?", options: [
    { value: "very_important", label: "Very important" }, { value: "somewhat_important", label: "Somewhat important" }, { value: "not_important", label: "Not important" } ] },
  { key: "value_drop_comfort", label: "How comfortable are you with value going down?", options: [
    { value: "not_comfortable", label: "Not comfortable" }, { value: "somewhat_comfortable", label: "Somewhat comfortable" }, { value: "comfortable", label: "Comfortable" }, { value: "i_do_not_know", label: "I do not know" } ] },
  { key: "currency_pref", label: "Do you prefer?", options: [
    { value: "kes", label: "KES" }, { value: "usd", label: "USD" }, { value: "both", label: "Both" }, { value: "not_sure", label: "Not sure" } ] },
  { key: "investing_context", label: "Are you investing?", options: [
    { value: "alone", label: "Alone" }, { value: "with_a_chama", label: "With a chama" }, { value: "as_diaspora", label: "As diaspora" }, { value: "for_family", label: "For family" }, { value: "for_business", label: "For business" } ] }
];

type Result = {
  products_to_understand: Array<{ product_type: string; label: string }>;
  options_to_compare: Array<{ slug: string; name: string; provider: string | null }>;
  may_not_fit_this_goal: Array<{ product_type: string; label: string }>;
  learning_path: Array<{ slug: string; title: string }>;
  simulations_to_run: string[];
  professional_to_consult: string;
  route_to_land_safety: boolean;
  notes: string[];
  disclaimer: string;
};

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-primary bg-primary text-white" : "border-border hover:border-borderStrong"}`;

export function FinderWizard() {
  const [answers, setAnswers] = useState<Record<string, string>>({ goal: "first_investment" });
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setResult((await postFinder(answers)) as unknown as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run the finder.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageBanner accent="green" badge="Guided finder" art="search"
        eyebrow="Product Finder"
        title="What should I understand for my goal?"
        description="This gives you products to understand and options to compare - never a recommendation to invest."
      />

      <PremiumCard>
        <div className="flex flex-col gap-4">
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <p className="text-sm font-medium text-textPrimary">{q.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {q.options.map((o) => (
                  <button key={o.value} type="button" onClick={() => setAnswers((a) => ({ ...a, [q.key]: o.value }))} className={chip(answers[q.key] === o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={run} disabled={loading} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? "Working..." : "Show products to understand"}
        </button>
      </PremiumCard>

      {error ? <ErrorState message={error} /> : null}

      {result ? (
        <div className="flex flex-col gap-4">
          {result.route_to_land_safety ? (
            <PremiumCard className="border-amber/20 bg-amber/[0.06]">
              <p className="text-sm font-semibold text-amber">Land needs a safety workflow, not just a price comparison.</p>
              <Link href="/land-decision-safety" className="mt-2 inline-block text-sm text-accent">Open Land Decision Safety</Link>
            </PremiumCard>
          ) : null}

          <ResultBlock title="Products to understand">
            <div className="flex flex-wrap gap-2">
              {result.products_to_understand.map((p) => <TrustBadge key={p.product_type} tone="muted">{p.label}</TrustBadge>)}
            </div>
          </ResultBlock>

          <ResultBlock title="Options to compare">
            {result.options_to_compare.length ? (
              <ul className="divide-y divide-border">
                {result.options_to_compare.map((o) => (
                  <li key={o.slug} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/marketplace/products/${o.slug}`} className="text-textPrimary hover:underline">{o.name}</Link>
                    <span className="text-textTertiary">{o.provider}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-textTertiary">No published products yet for this goal.</p>}
          </ResultBlock>

          {result.may_not_fit_this_goal.length ? (
            <ResultBlock title="May not fit this goal">
              <div className="flex flex-wrap gap-2">
                {result.may_not_fit_this_goal.map((p) => <TrustBadge key={p.product_type} tone="danger">{p.label}</TrustBadge>)}
              </div>
            </ResultBlock>
          ) : null}

          <ResultBlock title="Learning path">
            <div className="flex flex-wrap gap-2">
              {result.learning_path.map((l) => <Link key={l.slug} href="/learn" className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-borderStrong">{l.title}</Link>)}
            </div>
          </ResultBlock>

          <ResultBlock title="Simulations to run">
            <ul className="list-disc pl-5 text-sm text-textSecondary">{result.simulations_to_run.map((s) => <li key={s}>{s}</li>)}</ul>
          </ResultBlock>

          <ResultBlock title="Professional to consult">
            <p className="text-sm text-textSecondary">{result.professional_to_consult}</p>
          </ResultBlock>

          {result.notes?.length ? (
            <ResultBlock title="Notes">
              <ul className="list-disc pl-5 text-sm text-textSecondary">{result.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </ResultBlock>
          ) : null}
        </div>
      ) : null}

      <NoAdviceNote />
    </div>
  );
}

function ResultBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PremiumCard>
      <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
      <div className="mt-2">{children}</div>
    </PremiumCard>
  );
}
