import Link from "next/link";
import { ArrowLeft, Bell, LockKeyhole, SlidersHorizontal } from "lucide-react";
import { AppleLikeNav, AppShell, PageShell, PremiumCard, SectionHeader, TrustBadge } from "../../components/maliprime";

const settings = [
  {
    title: "Availability",
    body: "Accept qualified leads during weekday review windows.",
    icon: SlidersHorizontal
  },
  {
    title: "Notifications",
    body: "Email alerts are a placeholder. No private journal text or exact portfolio values should appear in alerts.",
    icon: Bell
  },
  {
    title: "Privacy-safe responses",
    body: "Response templates must not ask for M-Pesa PINs, bank passwords, broker credentials, or MMF credentials.",
    icon: LockKeyhole
  }
];

export default function ProfessionalSettingsPage() {
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
            eyebrow="Settings"
            title="Professional portal settings"
            body="Beta settings focus on safe operations, clear availability, and privacy-preserving communication."
          />
          <TrustBadge tone="muted">Beta placeholders</TrustBadge>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {settings.map((setting) => (
            <PremiumCard key={setting.title}>
              <setting.icon className="h-5 w-5 text-textTertiary" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">{setting.title}</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">{setting.body}</p>
            </PremiumCard>
          ))}
        </section>
      </PageShell>
    </AppShell>
  );
}
