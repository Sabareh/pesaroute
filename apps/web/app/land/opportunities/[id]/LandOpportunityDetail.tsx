"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState, ErrorState, LoadingState, PremiumCard, RiskBadge, TrustBadge } from "../../../components/maliprime";
import { useAuth } from "../../../lib/auth";
import {
  getLandOpportunity,
  requestLandReview,
  saveLandToJournal,
  scoreLandRisk,
  updateLandChecklistItem,
  type LandOpportunity,
  type LandRiskResult
} from "../../../lib/api";

const REVIEW_TYPES = ["land_lawyer", "surveyor", "valuer", "diaspora_land_adviser", "chama_land_adviser"];

const NEXT_STATUS: Record<string, string> = {
  not_started: "requested",
  requested: "verified_by_user",
  verified_by_user: "failed",
  failed: "not_started"
};

function statusTone(status: string): "emerald" | "danger" | "muted" {
  if (status === "verified_by_user" || status === "reviewed_by_professional") return "emerald";
  if (status === "failed") return "danger";
  return "muted";
}

export function LandOpportunityDetail({ opportunityId }: { opportunityId: number }) {
  const { token, ready, isAuthenticated } = useAuth();
  const [opp, setOpp] = useState<LandOpportunity | null>(null);
  const [risk, setRisk] = useState<LandRiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setOpp(await getLandOpportunity(opportunityId, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this opportunity.");
    } finally {
      setLoading(false);
    }
  }, [opportunityId, token]);

  useEffect(() => {
    if (ready && token) void load();
    else if (ready && !token) setLoading(false);
  }, [ready, token, load]);

  async function runRisk() {
    if (!token) return;
    try {
      const result = await scoreLandRisk(opportunityId, token);
      setRisk(result);
      setOpp((prev) => (prev ? { ...prev, risk_level: result.risk_level } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Risk score failed.");
    }
  }

  async function toggleItem(itemId: number, status: string) {
    if (!token) return;
    const next = NEXT_STATUS[status] ?? "requested";
    try {
      await updateLandChecklistItem(itemId, next, token);
      setOpp((prev) =>
        prev
          ? {
              ...prev,
              due_diligence_items: (prev.due_diligence_items ?? []).map((i) =>
                i.id === itemId ? { ...i, status: next } : i
              )
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  }

  async function journal() {
    if (!token) return;
    setNotice(null);
    try {
      await saveLandToJournal(opportunityId, "Saved my land decision reasoning.", token);
      setNotice("Saved to your private journal.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  async function review(professionalType: string) {
    if (!token) return;
    setNotice(null);
    try {
      await requestLandReview(opportunityId, { professional_type: professionalType, question: "Please review my land due diligence." }, token);
      setNotice(`Review requested (${professionalType.replace(/_/g, " ")}). Documents stay private until you share them.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review request failed.");
    }
  }

  if (!ready || loading) return <LoadingState label="Loading your land check…" />;
  if (!isAuthenticated) {
    return <EmptyState title="Sign in required" body="Sign in to view and manage your private land decision workspace." />;
  }
  if (error && !opp) return <ErrorState message={error} />;
  if (!opp) return <EmptyState title="Not found" body="This land opportunity could not be found." />;

  const items = opp.due_diligence_items ?? [];
  const highRisk = risk && (risk.risk_level === "high" || risk.risk_level === "very_high");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-textPrimary">{opp.title}</h1>
        <p className="text-sm text-textSecondary">{opp.location_text}</p>
        <div className="flex flex-wrap gap-2">
          <RiskBadge level={opp.risk_level} />
          <TrustBadge tone="muted">{opp.decision_stage.replace(/_/g, " ")}</TrustBadge>
          <TrustBadge tone="muted">{opp.privacy_mode.replace(/_/g, " ")}</TrustBadge>
        </div>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {notice ? (
        <PremiumCard className="border-emerald/20 bg-mint">
          <p className="text-sm text-emerald">{notice}</p>
        </PremiumCard>
      ) : null}

      <PremiumCard className={highRisk ? "border-danger/20 bg-danger/[0.06]" : ""}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-textPrimary">Visible risk</h2>
          <button type="button" onClick={runRisk} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white">
            {risk ? "Re-check risk" : "Check risk"}
          </button>
        </div>
        {risk ? (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-textSecondary">{risk.summary}</p>
            {risk.risk_flags.map((f, idx) => (
              <div key={idx} className="border-t border-border pt-2">
                <p className="text-sm font-semibold capitalize text-textPrimary">
                  {f.flag_type.replace(/_/g, " ")} · {f.severity}
                </p>
                <p className="text-sm text-textSecondary">{f.message}</p>
                {f.suggested_action ? <p className="text-xs text-textTertiary">→ {f.suggested_action}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-textSecondary">Run the check to see visible risk based on your checklist.</p>
        )}
      </PremiumCard>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-textPrimary">Due-diligence checklist</h2>
        {items.map((item) => (
          <PremiumCard key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm text-textPrimary">{item.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <TrustBadge tone={statusTone(item.status)}>{item.status.replace(/_/g, " ")}</TrustBadge>
                  {item.importance === "critical" ? <TrustBadge tone="danger">critical</TrustBadge> : null}
                </div>
                {item.source_note ? <p className="mt-2 text-xs text-textTertiary">{item.source_note}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => toggleItem(item.id, item.status)}
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-borderStrong"
              >
                Update
              </button>
            </div>
          </PremiumCard>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-textPrimary">Actions</h2>
        <button type="button" onClick={journal} className="self-start rounded-full border border-border px-4 py-2 text-sm hover:border-borderStrong">
          Save reasoning to journal
        </button>
        <p className="text-xs font-semibold uppercase text-textTertiary">Request a verified professional</p>
        <div className="flex flex-wrap gap-2">
          {REVIEW_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => review(t)}
              className="rounded-full border border-border px-3 py-1.5 text-xs capitalize hover:border-borderStrong"
            >
              {t.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <p className="text-xs text-textTertiary">
          Sharing is off by default: documents stay private and your exact amount is hidden. Access expires
          automatically.
        </p>
      </section>
    </div>
  );
}
