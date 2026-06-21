"use client";

import { useAuth } from "../../lib/auth";

// TODO(api): add a "my professional profile" endpoint (e.g. GET
// /api/marketplace/professional/me/) and replace this stub. The backend already
// has the Professional model (name, firm, specialty, license_category,
// languages, consultation_fee_range, diaspora_support, chama_support, bio).
type ProfessionalProfile = {
  firm: string;
  specialty: string;
  licenseCategory: string;
  languages: string;
  feeRange: string;
  diasporaSupport: boolean;
  chamaSupport: boolean;
};
function useMyProfessionalProfile(): ProfessionalProfile {
  return {
    firm: "Mali Clarity Advisory",
    specialty: "MMFs, Treasury bills, first-investment routes",
    licenseCategory: "Investment adviser",
    languages: "English, Swahili",
    feeRange: "KES 1,500 – 5,000",
    diasporaSupport: true,
    chamaSupport: true
  };
}

export default function ProfessionalProfilePage() {
  const { user } = useAuth();
  const profile = useMyProfessionalProfile();
  const name = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.first_name || user?.username || "Your profile";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const fields: Array<[string, string]> = [
    ["Name", name],
    ["Firm", profile.firm],
    ["Specialty", profile.specialty],
    ["License category", profile.licenseCategory],
    ["Languages", profile.languages],
    ["Consultation fee", profile.feeRange],
    ["Diaspora support", profile.diasporaSupport ? "Yes" : "No"],
    ["Chama support", profile.chamaSupport ? "Yes" : "No"]
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* header */}
      <div className="flex flex-wrap items-center gap-5 rounded-[18px] border border-border bg-surface p-5 shadow-card">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-accent/[0.12] text-[22px] font-bold text-primary">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-textPrimary">{name}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.12] px-2.5 py-1 text-[11px] font-semibold text-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Verified
            </span>
          </div>
          <p className="mt-1 text-sm text-textSecondary">{profile.firm} · {profile.specialty}</p>
        </div>
        <button type="button" className="rounded-full bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-primaryDark">
          Edit profile
        </button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* details */}
        <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-textPrimary">Profile details</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {fields.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-surfaceSubtle p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.03em] text-textTertiary">{label}</p>
                <p className="mt-1.5 text-sm font-semibold text-textPrimary">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* right column */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-accent/[0.12] text-primary">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <h3 className="mt-3.5 text-base font-semibold tracking-[-0.01em] text-textPrimary">Verification status</h3>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-textSecondary">Admin verification is active. License evidence and disclosures stay auditable on every update.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-accent/[0.12] px-2.5 py-0.5 text-[11px] font-semibold text-primary">License on file</span>
              <span className="rounded-full border border-border bg-surfaceSubtle px-2.5 py-0.5 text-[11px] font-semibold text-textSecondary">Disclosures current</span>
            </div>
          </div>
          <div className="rounded-[18px] border border-border bg-surface p-5 shadow-card">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-sky/[0.12] text-sky">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 8h14M5 12h14M5 16h9" />
              </svg>
            </span>
            <h3 className="mt-3.5 text-base font-semibold tracking-[-0.01em] text-textPrimary">Specialties &amp; bio</h3>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-textSecondary">Keep specialties, languages, diaspora/chama support flags, and a short bio current so leads route to the right fit.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
