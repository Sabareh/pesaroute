"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "../lib/auth";
import {
  getConsultationContext,
  getProfessionalConsultations,
  getProfessionalLeads,
  respondToLead,
  type ConsultationContext,
  type ConsultationLead,
  type ConsultationListItem
} from "../lib/api";
import { amountLabel, labelCategory, labelLanguage, labelRisk, labelTimeline } from "./shared";

function LockGlyph({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Stat({ label, value, tone = "accent" }: { label: string; value: string; tone?: "accent" | "amber" | "info" }) {
  const dot = tone === "amber" ? "text-amber" : tone === "info" ? "text-sky" : "text-primary";
  return (
    <div className="rounded-2xl border border-border bg-surface px-[18px] py-4 shadow-card">
      <p className="text-xs font-semibold text-textTertiary">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-[-0.02em] ${dot === "text-primary" ? "text-textPrimary" : "text-textPrimary"}`}>{value}</p>
    </div>
  );
}

/** A privacy-aware "shared context" field: clear when granted, blurred + locked when not. */
function Field({ label, value, granted, hiddenValue = "•• hidden ••" }: { label: string; value: string; granted: boolean; hiddenValue?: string }) {
  return (
    <div className={`rounded-xl border p-3 ${granted ? "border-accent/30 bg-surface" : "border-border bg-surfaceSubtle"}`}>
      <div className="flex items-center gap-1.5">
        <span className={granted ? "text-primary" : "text-textTertiary"}>{granted ? <CheckGlyph /> : <LockGlyph />}</span>
        <span className="text-[11px] font-semibold text-textTertiary">{label}</span>
      </div>
      <p className={`mt-1.5 text-[13.5px] font-semibold ${granted ? "text-textPrimary" : "select-none text-textTertiary blur-[4px]"}`}>{granted ? value : hiddenValue}</p>
    </div>
  );
}

export default function ProfessionalLeadsPage() {
  const { token, ready, isAuthenticated } = useAuth();
  const [leads, setLeads] = useState<ConsultationLead[]>([]);
  const [consultations, setConsultations] = useState<ConsultationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [context, setContext] = useState<ConsultationContext | null>(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [fee, setFee] = useState("1500");
  const [duration, setDuration] = useState("30 minutes");
  const [slots, setSlots] = useState("Tue 6pm · Thu 8pm · Sat morning");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [l, c] = await Promise.all([getProfessionalLeads(token), getProfessionalConsultations(token)]);
    setLeads(l);
    setConsultations(c);
    setSelectedId((prev) => prev ?? l[0]?.id ?? null);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  // Scoped context for the selected lead drives the redaction (null when the
  // user has not granted consultation_context access — the 403 case).
  useEffect(() => {
    if (!token || selectedId == null) {
      setContext(null);
      return;
    }
    let alive = true;
    void getConsultationContext(selectedId, token).then((c) => {
      if (alive) setContext(c);
    });
    return () => {
      alive = false;
    };
  }, [token, selectedId]);

  const selected = useMemo(() => leads.find((l) => l.id === selectedId) ?? null, [leads, selectedId]);
  const contactGranted = Boolean(context?.allowed_scopes?.includes("contact_info"));
  const grantLabel = context?.allowed_scopes?.length
    ? `${context.allowed_scopes.length} scope${context.allowed_scopes.length > 1 ? "s" : ""} granted`
    : "Anonymous view";

  async function sendOffer() {
    if (selectedId == null || !token) return;
    if (message.trim().length < 5) {
      setError("Write at least a short response (5+ characters) before sending.");
      return;
    }
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await respondToLead(
        selectedId,
        {
          response_text: message.trim(),
          proposed_fee: fee.replace(/[^\d.]/g, "") || undefined,
          estimated_duration: duration.trim() || undefined,
          available_slots_text: slots.trim() || undefined
        },
        token
      );
      setNotice("Scoped offer sent. The user sees your message, fee, and slots, nothing more.");
      setMessage("");
      void load();
    } catch {
      setError("Could not send the offer. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const awaiting = leads.filter((l) => l.status === "submitted").length;
  const paid = consultations.filter((c) => c.status === "paid").length;

  return (
    <div className="flex flex-col gap-4">
      {/* stats */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Qualified leads" value={String(leads.length)} />
        <Stat label="Awaiting response" value={String(awaiting)} tone="amber" />
        <Stat label="Paid reviews" value={String(paid)} tone="info" />
        <Stat label="Verified status" value="Active" />
      </div>

      {!ready || loading ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-textSecondary shadow-card">Loading your leads…</p>
      ) : !isAuthenticated ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-textSecondary shadow-card">Sign in as a verified professional to see qualified leads.</p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          {/* lead list */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-textPrimary">Qualified leads</h2>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-textSecondary">Newest first</span>
            </div>
            {leads.length === 0 ? (
              <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-textSecondary shadow-card">No qualified leads yet. New review requests that match your specialties will appear here.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {leads.map((l) => {
                  const active = l.id === selectedId;
                  const amt = amountLabel(l);
                  const responded = l.status === "professional_responded" || l.status === "user_selected_professional";
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelectedId(l.id)}
                      className={`pr-card-hover block w-full rounded-2xl border bg-surface p-[18px] text-left shadow-card transition ${active ? "border-primary" : "border-border"}`}
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <span className="text-[13px] font-semibold text-textPrimary">Lead #{l.id}</span>
                        <div className="flex gap-1.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${responded ? "bg-primary/10 text-primary" : "bg-amber/[0.14] text-amber"}`}>{responded ? "responded" : "new"}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${amt.hidden ? "bg-surfaceSubtle text-textTertiary" : "bg-primary/10 text-primary"}`}>{amt.text}</span>
                        </div>
                      </div>
                      <h3 className="mt-3 text-base font-semibold tracking-[-0.01em] text-textPrimary">{labelCategory(l.category)}</h3>
                      {l.user_question ? <p className="mt-1.5 text-[13px] leading-[1.5] text-textSecondary">{l.user_question}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Chip>{labelTimeline(l.timeline)}</Chip>
                        <Chip>{labelRisk(l.risk_preference)}</Chip>
                        <Chip>{labelLanguage(l.preferred_language)}</Chip>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* lead detail */}
          <div className="rounded-[18px] border border-border bg-surface shadow-card lg:sticky lg:top-4">
            {!selected ? (
              <p className="p-6 text-sm text-textSecondary">Select a lead to see its scoped context.</p>
            ) : (
              <>
                <div className="border-b border-border p-5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-textTertiary">
                      <LockGlyph /> Lead detail · #{selected.id}
                    </span>
                    <span className="rounded-full bg-accent/[0.12] px-2.5 py-1 text-[11px] font-semibold text-primary">{grantLabel}</span>
                  </div>
                  <h2 className="mt-3 text-[21px] font-semibold tracking-[-0.02em] text-textPrimary">{labelCategory(selected.category)}</h2>
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-textSecondary">
                    {selected.user_question || "The user's full question unlocks for the professional they select."}
                  </p>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Shared context</p>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <Field label="Amount range" value={amountLabel(selected).text} granted={!amountLabel(selected).hidden} />
                    <Field label="Goal" value={labelCategory(selected.category)} granted />
                    <Field label="Timeline" value={labelTimeline(selected.timeline)} granted />
                    <Field label="Language" value={labelLanguage(selected.preferred_language)} granted />
                    <Field label="Risk appetite" value={labelRisk(selected.risk_preference)} granted />
                    <Field
                      label="Contact"
                      value={contactGranted && context?.contact_info ? context.contact_info.email || context.contact_info.username : "Hidden"}
                      granted={contactGranted}
                    />
                  </div>

                  <div className="mt-3.5 flex gap-2.5 rounded-xl border border-amber/20 bg-amber/[0.08] p-3">
                    <span className="flex-none text-amber">
                      <LockGlyph />
                    </span>
                    <p className="text-xs leading-[1.5] text-textSecondary">
                      Exact amounts, contact details, and journal notes stay hidden unless the user&apos;s grant includes those scopes.
                    </p>
                  </div>

                  {/* response composer */}
                  <p className="mt-[18px] text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Send a scoped offer</p>
                  <label className="sr-only" htmlFor="pro-response">Response message</label>
                  <textarea
                    id="pro-response"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write a response based only on the review request and shared context…"
                    className="mt-2.5 min-h-[88px] w-full resize-y rounded-xl border border-border bg-surface p-3 text-[13.5px] leading-[1.5] text-textPrimary focus:border-primary/50 focus:outline-none"
                  />
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    <ComposerField label="Proposed fee (KES)" value={fee} onChange={setFee} />
                    <ComposerField label="Est. duration" value={duration} onChange={setDuration} />
                  </div>
                  <div className="mt-2.5">
                    <ComposerField label="Available slots" value={slots} onChange={setSlots} />
                  </div>

                  {error ? <p className="mt-3 text-sm font-medium text-danger">{error}</p> : null}
                  {notice ? <p className="mt-3 text-sm font-medium text-primary">{notice}</p> : null}

                  <div className="mt-3.5 flex gap-2.5">
                    <button
                      type="button"
                      onClick={sendOffer}
                      disabled={sending}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:opacity-60"
                    >
                      {sending ? "Sending…" : "Send offer"}
                    </button>
                    <button type="button" className="flex-none rounded-full border border-border bg-surface px-[18px] py-3 text-sm font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
                      Decline
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* accepted reviews */}
      <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.01em] text-textPrimary">Accepted reviews</h2>
      {consultations.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-textSecondary shadow-card">No accepted reviews yet. When a user selects your offer and pays, it appears here.</p>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {consultations.map((c) => {
            const isPaid = c.status === "paid" || c.status === "scheduled" || c.status === "completed";
            return (
              <div key={c.id} className="flex items-center justify-between gap-3.5 rounded-2xl border border-border bg-surface p-[18px] shadow-card">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-textPrimary">Request #{c.id}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isPaid ? "bg-primary/10 text-primary" : "bg-amber/[0.14] text-amber"}`}>{c.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-textSecondary">{labelCategory(c.category)}</p>
                  {c.platform_fee_amount ? <p className="mt-1 text-[13px] font-semibold text-textPrimary">KES {Math.round(Number(c.platform_fee_amount)).toLocaleString("en-US")} platform fee</p> : null}
                </div>
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent/[0.12] text-primary">
                  <CheckGlyph className="h-5 w-5" />
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-5 text-textTertiary">
        Educational only. PesaRoute does not hold money or execute investments. You only see what the user explicitly grants, and access expires automatically.
      </p>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-border bg-surfaceSubtle px-2.5 py-0.5 text-[11px] font-semibold text-textSecondary">{children}</span>;
}

function ComposerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-textTertiary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[13.5px] font-semibold text-textPrimary focus:border-primary/50 focus:outline-none"
      />
    </label>
  );
}
