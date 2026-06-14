import Link from "next/link";
import {
  BadgeCheck,
  ClipboardList,
  Clock,
  EyeOff,
  Languages,
  LockKeyhole,
  MessageSquare,
  Send,
  Settings,
  ShieldCheck,
  UserCog,
  type LucideIcon
} from "lucide-react";
import {
  AppShell,
  EmptyState,
  PageShell,
  PremiumCard,
  SecondaryButton,
  SectionHeader,
  TrustBadge
} from "../../components/maliprime";

const leads = [
  {
    id: 1042,
    category: "Treasury bills/bonds",
    amountRange: "KES 20,000-100,000",
    goal: "First investment",
    timeline: "This month",
    risk: "Low",
    language: "Swahili",
    dataSharingStatus: "portfolio_summary granted",
    question: "Should I use money needed in two months?"
  },
  {
    id: 1043,
    category: "General first investment",
    amountRange: "Hidden",
    goal: "Emergency fund",
    timeline: "Flexible",
    risk: "Not sure",
    language: "English",
    dataSharingStatus: "limited anonymous view",
    question: "What should I learn before moving from saving to investing?"
  },
  {
    id: 1044,
    category: "SACCO",
    amountRange: "KES 5,000-20,000",
    goal: "SACCO/chama",
    timeline: "Next 3 months",
    risk: "Moderate",
    language: "English",
    dataSharingStatus: "consultation_context granted",
    question: "How do I compare dividends, rebates, and liquidity?"
  }
];

const stats = [
  { label: "Qualified leads", value: "12" },
  { label: "Awaiting response", value: "3" },
  { label: "Verified status", value: "Active" },
  { label: "Languages", value: "EN, SW" }
];

const portalLinks = [
  { href: "/professional/profile", icon: UserCog, label: "Profile and specialties" },
  { href: "/professional/consultation-context", icon: LockKeyhole, label: "Scoped context view" },
  { href: "/professional/settings", icon: Settings, label: "Settings" }
];

export default function ProfessionalDashboardPage() {
  const activeLead = leads[0];

  return (
    <AppShell>
      <PageShell>
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            eyebrow="Professional portal"
            title="Review qualified requests without exposing private details by default."
            body="This MVP shows limited lead context, verification status, and response tools for verified professionals."
          />
          <TrustBadge tone="emerald">
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
            Limited view until user grants access
          </TrustBadge>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <PremiumCard key={stat.label}>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-textSecondary">{stat.label}</p>
              <p className="mt-2 text-2xl font-black text-primary">{stat.value}</p>
            </PremiumCard>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {portalLinks.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              className="rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-primary/35"
            >
              <link.icon className="h-6 w-6 text-primary" aria-hidden />
              <p className="mt-4 text-sm font-black text-textPrimary">{link.label}</p>
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Leads inbox</h2>
              <TrustBadge tone="muted">Newest first</TrustBadge>
            </div>
            <div className="space-y-3">
              {leads.map((lead) => (
                <PremiumCard key={lead.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-primary">
                      <ClipboardList className="h-5 w-5" aria-hidden />
                      Lead #{lead.id}
                    </div>
                    <TrustBadge tone={lead.amountRange === "Hidden" ? "amber" : "primary"}>{lead.amountRange}</TrustBadge>
                  </div>
                  <h3 className="mt-3 text-lg font-black">{lead.category}</h3>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <Fact label="Goal" value={lead.goal} />
                    <Fact label="Timeline" value={lead.timeline} />
                    <Fact label="Language" value={lead.language} />
                    <Fact label="Sharing" value={lead.dataSharingStatus} />
                  </dl>
                  <p className="mt-3 text-sm leading-6 text-textSecondary">{lead.question}</p>
                  <SecondaryButton className="mt-4" href="/professional/consultation-context">
                    Review scoped detail
                    <MessageSquare className="h-5 w-5" aria-hidden />
                  </SecondaryButton>
                </PremiumCard>
              ))}
            </div>
          </div>

          <PremiumCard>
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <LockKeyhole className="h-5 w-5" aria-hidden />
              Lead detail
            </div>
            <h2 className="mt-4 text-2xl font-black">{activeLead.category}</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">{activeLead.question}</p>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <Detail icon={EyeOff} label="Amount view" value={activeLead.amountRange} />
              <Detail icon={Languages} label="Preferred language" value={activeLead.language} />
              <Detail icon={Clock} label="Timeline" value={activeLead.timeline} />
              <Detail icon={ShieldCheck} label="Data sharing" value={activeLead.dataSharingStatus} />
            </dl>

            <div className="mt-5 rounded-2xl border border-primary/10 bg-surfaceAlt p-4">
              <p className="text-sm font-bold text-primary">Limited view until user grants access.</p>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Exact values, contact details, and journal notes stay hidden unless the active user data grant includes
                those scopes.
              </p>
            </div>

            <form className="mt-5 space-y-3">
              <label className="block text-sm font-bold" htmlFor="response">
                Response
              </label>
              <textarea
                id="response"
                className="min-h-32 w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:border-primary"
                placeholder="Write a scoped, educational response. Do not ask for M-Pesa PINs, bank passwords, or broker credentials."
              />
              <label className="block text-sm font-bold" htmlFor="next-steps">
                Next steps
              </label>
              <input
                id="next-steps"
                className="min-h-12 w-full rounded-2xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
                placeholder="Suggest documents or context the user may choose to share"
              />
              <SecondaryButton>
                Send response placeholder
                <Send className="h-5 w-5" aria-hidden />
              </SecondaryButton>
            </form>
          </PremiumCard>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <PremiumCard>
            <BadgeCheck className="h-6 w-6 text-emerald" aria-hidden />
            <h2 className="mt-4 text-lg font-black">Verification status</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Verified. License category and disclosures stay editable from the profile screen.
            </p>
          </PremiumCard>
          <PremiumCard>
            <Settings className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-black">Settings</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Notification, availability, and privacy-safe response settings are placeholders for beta.
            </p>
          </PremiumCard>
          <EmptyState title="No accepted requests" body="Accepted lead workflow will appear here after response lifecycle wiring." />
        </section>
      </PageShell>
    </AppShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold text-textPrimary">{label}</dt>
      <dd className="mt-1 text-textSecondary">{value}</dd>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surfaceAlt p-4">
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      <dt className="mt-3 text-sm font-bold text-textPrimary">{label}</dt>
      <dd className="mt-1 text-sm text-textSecondary">{value}</dd>
    </div>
  );
}
