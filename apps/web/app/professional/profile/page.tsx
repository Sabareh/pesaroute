import Link from "next/link";
import { ArrowLeft, Languages, ShieldCheck, UserCog } from "lucide-react";
import { AppleLikeNav, AppShell, PageShell, PremiumCard, SectionHeader, TrustBadge } from "../../components/maliprime";

const profileFields = [
  ["Name", "Amina Kariuki"],
  ["Firm", "Mali Clarity Advisory"],
  ["Specialty", "MMFs, Treasury bills, first investment routes"],
  ["License category", "Investment adviser placeholder"],
  ["Languages", "English, Swahili"],
  ["Consultation fee range", "KES 1,500-5,000"],
  ["Diaspora support", "Yes"],
  ["Chama support", "Yes"]
];

export default function ProfessionalProfilePage() {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell className="max-w-5xl">
        <Link href="/professional/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-textSecondary transition hover:text-textPrimary">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Professional dashboard
        </Link>

        <div className="mt-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            eyebrow="Profile"
            title="Verified professional profile"
            body="This screen keeps professional identity, specialties, disclosures, and verification status visible before lead workflows mature."
          />
          <TrustBadge tone="emerald">Verified</TrustBadge>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <PremiumCard>
            <UserCog className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-xl font-semibold tracking-[-0.01em]">Profile details</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              {profileFields.map(([label, value]) => (
                <div className="rounded-lg border border-border bg-surfaceAlt p-4" key={label}>
                  <dt className="font-semibold text-textPrimary">{label}</dt>
                  <dd className="mt-1 text-textSecondary">{value}</dd>
                </div>
              ))}
            </dl>
          </PremiumCard>

          <div className="grid gap-4">
            <PremiumCard>
              <ShieldCheck className="h-5 w-5 text-textTertiary" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.01em]">Verification status</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Admin verification is active. Future updates should keep license evidence and disclosures auditable.
              </p>
            </PremiumCard>
            <PremiumCard>
              <Languages className="h-5 w-5 text-textTertiary" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.01em]">Edit profile placeholder</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Editing is intentionally simple for beta: name, firm, specialties, languages, support flags, bio, and
                disclosures.
              </p>
            </PremiumCard>
          </div>
        </section>
      </PageShell>
    </AppShell>
  );
}
