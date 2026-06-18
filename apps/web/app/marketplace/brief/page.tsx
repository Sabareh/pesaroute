"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AppShell, AppleLikeNav, EmptyState, LoadingState, PageBanner, PageShell, PremiumCard } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import { getPersonalBrief } from "../../lib/api";
import { NoAdviceNote } from "../_components";

type Brief = {
  products_you_are_watching: Array<Record<string, unknown>>;
  data_that_changed: Array<Record<string, unknown>>;
  data_that_is_stale: Array<Record<string, unknown>>;
  lessons_to_continue: Array<Record<string, unknown>>;
  simulations_to_rerun: Array<Record<string, unknown>>;
  journal_decisions_to_review: Array<Record<string, unknown>>;
  professional_review_suggestions: string[];
};

export default function BriefPage() {
  const { token, ready, isAuthenticated } = useAuth();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setBrief((await getPersonalBrief(token)) as unknown as Brief);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="flex flex-col gap-5">
          <PageBanner accent="green" badge="Personal" art="bars"
            eyebrow="Your money brief"
            title="Personal, actionable - not market noise"
            description="Built from your watchlist, simulations, and journal. Nothing here is a recommendation."
          />

          {!ready || loading ? (
            <LoadingState label="Building your brief..." />
          ) : !isAuthenticated ? (
            <EmptyState title="Sign in required" body="Sign in to see your personal money brief." />
          ) : !brief ? (
            <EmptyState title="No brief yet" body="Watch a product and run a simulation to build your brief." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Products you are watching" rows={brief.products_you_are_watching.map((p) => `${String(p.name)} - ${p.current_rate ? `${String(p.current_rate)}%` : "no rate"}`)} />
              <Section title="Data that changed" rows={brief.data_that_changed.map((p) => String(p.name))} empty="Nothing changed since you last looked." />
              <Section title="Data that is stale" rows={brief.data_that_is_stale.map((p) => `${String(p.name)} - verify before committing`)} empty="No stale data." tone="danger" />
              <Section title="Simulations to rerun" rows={brief.simulations_to_rerun.map((s) => `${String(s.name)} (${String(s.created_at)})`)} empty="No saved simulations yet." />
              <Section title="Journal decisions to review" rows={brief.journal_decisions_to_review.map((j) => `${String(j.goal) || "Decision"} (${String(j.created_at)})`)} empty="No older decisions to review." />
              <Section title="Lessons to continue" rows={brief.lessons_to_continue.map((l) => String(l.lesson))} empty="No lessons in progress." />
              <Section title="Professional review suggestions" rows={brief.professional_review_suggestions} empty="No suggestions right now." />
            </div>
          )}

          <div className="flex gap-3 text-sm">
            <Link href="/marketplace/watchlist" className="text-accent">Your watchlist</Link>
            <Link href="/marketplace/products" className="text-accent">Browse products</Link>
          </div>
          <NoAdviceNote />
        </div>
      </PageShell>
    </AppShell>
  );
}

function Section({ title, rows, empty = "Nothing here yet.", tone = "muted" }: { title: string; rows: string[]; empty?: string; tone?: "muted" | "danger" }) {
  return (
    <PremiumCard>
      <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
      {rows.length ? (
        <ul className="mt-2 list-disc pl-5 text-sm text-textSecondary">
          {rows.map((r, i) => (
            <li key={i} className={tone === "danger" ? "text-danger" : undefined}>{r}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-textTertiary">{empty}</p>
      )}
    </PremiumCard>
  );
}
