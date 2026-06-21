"use client";

import { useState, type ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

type Toggle = { key: string; title: string; body: string; icon: ReactNode; iconBg: string; iconColor: string };
const TOGGLES: Toggle[] = [
  {
    key: "availability",
    title: "Availability",
    body: "Accept qualified leads during weekday review windows.",
    icon: <Icon><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="13" cy="18" r="2" /></Icon>,
    iconBg: "bg-accent/[0.12]",
    iconColor: "text-primary"
  },
  {
    key: "notifications",
    title: "Notifications",
    body: "Email alerts for new qualified leads. Never include private journal text or exact portfolio values.",
    icon: <Icon><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></Icon>,
    iconBg: "bg-sky/[0.12]",
    iconColor: "text-sky"
  },
  {
    key: "privacy",
    title: "Privacy-safe responses",
    body: "Keep response templates scoped to the review request; never collect external account access.",
    icon: <Icon><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>,
    iconBg: "bg-violet/[0.14]",
    iconColor: "text-violet"
  }
];

export default function ProfessionalSettingsPage() {
  // TODO(api): persist these to the professional's settings endpoint. Local-only for the beta.
  const [on, setOn] = useState<Record<string, boolean>>({ availability: true, notifications: true, privacy: true });

  return (
    <div className="max-w-[880px]">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-textPrimary">Portal settings</h1>
      <p className="mt-2 max-w-[600px] text-sm leading-[1.6] text-textSecondary">
        Beta settings focus on safe operations, clear availability, and privacy-preserving communication.
      </p>

      <div className="mt-[18px] flex flex-col gap-3">
        {TOGGLES.map((t) => {
          const isOn = on[t.key];
          return (
            <div key={t.key} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-[18px] shadow-card">
              <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${t.iconBg} ${t.iconColor}`}>{t.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-textPrimary">{t.title}</p>
                <p className="mt-1 text-[13px] leading-[1.5] text-textSecondary">{t.body}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={t.title}
                onClick={() => setOn((s) => ({ ...s, [t.key]: !s[t.key] }))}
                className={`flex h-[27px] w-[46px] flex-none items-center rounded-full p-[3px] transition ${isOn ? "bg-primary" : "bg-[#D9D5CC]"}`}
              >
                <span className={`block h-[21px] w-[21px] rounded-full bg-white shadow transition-transform ${isOn ? "translate-x-[19px]" : "translate-x-0"}`} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2.5 rounded-2xl border border-amber/20 bg-amber/[0.08] p-4">
        <span className="flex-none text-amber">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 9v4M12 17h0" />
            <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
        </span>
        <p className="text-[12.5px] leading-[1.5] text-textSecondary">
          Notifications never include private journal text or exact portfolio values. Response templates stay scoped to the review request and must not collect external account access.
        </p>
      </div>
    </div>
  );
}
