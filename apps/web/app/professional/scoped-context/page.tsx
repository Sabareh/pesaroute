"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../lib/auth";
import { getConsultationContext, getProfessionalLeads, type ConsultationContext, type ConsultationLead } from "../../lib/api";
import { labelCategory, SCOPE_META } from "../shared";

function granted(ctx: ConsultationContext | null, scope: string): boolean {
  return Boolean(ctx?.allowed_scopes?.includes(scope as never));
}

// Real body text for a granted scope, drawn from the context payload.
function scopeBody(ctx: ConsultationContext | null, scope: string, fallback: string): string {
  if (!ctx || !granted(ctx, scope)) return fallback;
  if (scope === "consultation_context") {
    return ctx.consultation.topic ? `Topic: ${ctx.consultation.topic}. ${ctx.consultation.user_question || ""}`.trim() : ctx.consultation.user_question || fallback;
  }
  if (scope === "portfolio_summary" && ctx.portfolio_summary) {
    const cats = ctx.portfolio_summary.asset_categories
      ? Object.entries(ctx.portfolio_summary.asset_categories).map(([k, v]) => `${k} (${v})`).join(", ")
      : ctx.portfolio_summary.asset_allocation
        ? Object.keys(ctx.portfolio_summary.asset_allocation).join(", ")
        : "";
    return `${ctx.portfolio_summary.items_count} items${cats ? ` · ${cats}` : ""} · liquidity ${ctx.portfolio_summary.liquidity_score}. ${ctx.portfolio_summary.risk_concentration_note || ""}`.trim();
  }
  if (scope === "portfolio_exact_values" && ctx.portfolio_exact_values?.length) {
    return ctx.portfolio_exact_values
      .map((p) => `${p.asset_type}${p.provider_name ? ` (${p.provider_name})` : ""}: ${p.amount_exact ? `KES ${Math.round(Number(p.amount_exact)).toLocaleString("en-US")}` : "n/a"}`)
      .join(" · ");
  }
  if (scope === "journal_entries" && ctx.journal_entries?.length) {
    return `${ctx.journal_entries.length} reflection${ctx.journal_entries.length > 1 ? "s" : ""}: ${ctx.journal_entries[0].goal || ctx.journal_entries[0].decision}`;
  }
  if (scope === "contact_info" && ctx.contact_info) {
    return `${ctx.contact_info.first_name || ctx.contact_info.username} · ${ctx.contact_info.email}`;
  }
  return fallback;
}

export default function ScopedContextPage() {
  const { token, ready, isAuthenticated } = useAuth();
  const [leads, setLeads] = useState<ConsultationLead[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ctx, setCtx] = useState<ConsultationContext | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    const l = await getProfessionalLeads(token);
    setLeads(l);
    setSelectedId((prev) => prev ?? l[0]?.id ?? null);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  useEffect(() => {
    if (!token || selectedId == null) return;
    let alive = true;
    void getConsultationContext(selectedId, token).then((c) => {
      if (alive) setCtx(c);
    });
    return () => {
      alive = false;
    };
  }, [token, selectedId]);

  // "Review topic" is always shared with a qualified lead; the rest are real grant scopes.
  const cards = useMemo(() => {
    const topicCard = {
      scope: "topic",
      title: "Review topic",
      body: ctx?.consultation.topic || (selectedId ? labelCategory(leads.find((l) => l.id === selectedId)?.category ?? "") : "Always shared with a qualified lead."),
      on: true
    };
    const rest = SCOPE_META.map((s) => ({ scope: s.scope, title: s.title, body: scopeBody(ctx, s.scope, s.body), on: granted(ctx, s.scope) }));
    // consultation_context first, then topic, then the rest (per design ordering)
    return [rest[0], topicCard, ...rest.slice(1)];
  }, [ctx, leads, selectedId]);

  const grantedCount = cards.filter((c) => c.on).length;

  return (
    <div className="flex flex-col gap-4">
      {/* navy banner */}
      <section className="relative overflow-hidden rounded-2xl bg-bannerBg px-7 py-6">
        <div className="relative max-w-[640px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bannerMuted">Consultation review{selectedId ? ` · Lead #${selectedId}` : ""}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-bannerText">You only see what the user grants</h1>
          <p className="mt-2 text-sm leading-[1.6] text-bannerMuted">
            Each scope is granted explicitly, shown clearly when on, and redacted when off. Access expires automatically, the user can revoke any time.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.16] bg-white/10 px-3.5 py-2 text-[13px] font-semibold text-bannerText">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            Access is time-limited and revocable
          </div>
        </div>
      </section>

      {/* lead selector */}
      {leads.length > 1 ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Lead</span>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-textPrimary focus:border-primary/50 focus:outline-none"
          >
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                #{l.id} · {labelCategory(l.category)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-[-0.01em] text-textPrimary">Granted scopes</h2>
        <span className="text-xs font-semibold text-textSecondary">{grantedCount} of {cards.length} scopes granted</span>
      </div>

      {!ready || loading ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-textSecondary shadow-card">Loading scoped context…</p>
      ) : !isAuthenticated ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-textSecondary shadow-card">Sign in as a verified professional to view granted context.</p>
      ) : (
        <div className="grid max-w-[1040px] gap-3.5 sm:grid-cols-2">
          {cards.map((c) => (
            <div key={c.scope} className={`rounded-2xl border bg-surface p-5 shadow-card ${c.on ? "border-accent/30" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14.5px] font-semibold text-textPrimary">{c.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-textTertiary">{c.scope}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.on ? "bg-accent/[0.12] text-primary" : "bg-surfaceSubtle text-textTertiary"}`}>{c.on ? "Granted" : "Locked"}</span>
              </div>
              <p className={`mt-3 text-[13px] leading-[1.55] ${c.on ? "text-textSecondary" : "select-none text-textTertiary blur-[4px]"}`}>{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs leading-5 text-textTertiary">
        {/* TODO(api): surface the active DataGrant's exact expiry + revoke time from the privacy endpoint for a live countdown. */}
        Scopes reflect the user&apos;s active grant. PesaRoute logs every access for compliance and never shares more than the granted scopes.
      </p>
    </div>
  );
}
