import Link from "next/link";
import {
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
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
  AppleLikeNav,
  EditorialImage,
  PageBanner,
  PageShell,
  PremiumCard,
  SecondaryButton,
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
    status: "submitted",
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
    status: "submitted",
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
    status: "professional_responded",
    question: "How do I compare dividends, rebates, and liquidity?"
  }
];

const consultations = [
  {
    id: 980,
    category: "Global investing",
    status: "awaiting_payment",
    fee: "KES 1,500",
    nextStep: "User selected your offer"
  },
  {
    id: 981,
    category: "Treasury bills/bonds",
    status: "paid",
    fee: "KES 2,000",
    nextStep: "Schedule review call"
  }
];

const stats = [
  { label: "Qualified leads", value: "12" },
  { label: "Awaiting response", value: "3" },
  { label: "Paid reviews", value: "2" },
  { label: "Verified status", value: "Active" },
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
      <AppleLikeNav />
      <PageShell>
        <div className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_360px] lg:items-end">
          <PageBanner accent="green" badge="Professional" art="rings"
            eyebrow="Professional portal"
            title="Review qualified requests without exposing private details by default."
            description="This MVP shows limited lead context, verification status, and response tools for verified professionals."
          />
          <div className="grid gap-3">
            <EditorialImage
              alt="Notebook and Kenyan shillings on a desk, representing scoped professional review."
              className="hidden lg:block"
              imgClassName="aspect-[4/3]"
              src="/images/private-review-notebook.jpg"
            />
            <TrustBadge tone="emerald">Limited view until user grants access</TrustBadge>
          </div>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <PremiumCard key={stat.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-textTertiary">{stat.label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-textPrimary">{stat.value}</p>
            </PremiumCard>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {portalLinks.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              className="rounded-lg border border-border bg-surface p-5 shadow-card transition hover:border-borderStrong"
            >
              <link.icon className="h-5 w-5 text-textTertiary" aria-hidden />
              <p className="mt-4 text-sm font-semibold text-textPrimary">{link.label}</p>
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">Leads inbox</h2>
              <TrustBadge tone="muted">Newest first</TrustBadge>
            </div>
            <div className="space-y-3">
              {leads.map((lead) => (
                <PremiumCard key={lead.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
                      <ClipboardList className="h-4 w-4 text-textTertiary" aria-hidden />
                      Lead #{lead.id}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <TrustBadge tone="muted">{lead.status}</TrustBadge>
                      <TrustBadge tone={lead.amountRange === "Hidden" ? "muted" : "primary"}>{lead.amountRange}</TrustBadge>
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em]">{lead.category}</h3>
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
            <div className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
              <LockKeyhole className="h-4 w-4 text-textTertiary" aria-hidden />
              Lead detail
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">{activeLead.category}</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">{activeLead.question}</p>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <Detail icon={EyeOff} label="Amount view" value={activeLead.amountRange} />
              <Detail icon={Languages} label="Preferred language" value={activeLead.language} />
              <Detail icon={Clock} label="Timeline" value={activeLead.timeline} />
              <Detail icon={ShieldCheck} label="Data sharing" value={activeLead.dataSharingStatus} />
            </dl>

            <div className="mt-5 rounded-lg border border-border bg-surfaceAlt p-4">
              <p className="text-sm font-semibold text-textPrimary">Limited view until user grants access.</p>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Exact values, contact details, and journal notes stay hidden unless the active user data grant includes
                those scopes.
              </p>
            </div>

            <form className="mt-5 space-y-3">
              <label className="block text-sm font-bold" htmlFor="response">
                Offer message
              </label>
              <textarea
                id="response"
                className="min-h-32 w-full rounded-lg border border-border bg-surface p-3 text-sm outline-none focus:border-borderStrong"
                placeholder="Write a scoped response based only on the review request and shared context."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold" htmlFor="fee">
                    Proposed fee
                  </label>
                  <input
                    id="fee"
                    className="mt-2 min-h-12 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-borderStrong"
                    placeholder="KES 1,500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold" htmlFor="duration">
                    Estimated duration
                  </label>
                  <input
                    id="duration"
                    className="mt-2 min-h-12 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-borderStrong"
                    placeholder="30 minutes"
                  />
                </div>
              </div>
              <label className="block text-sm font-bold" htmlFor="next-steps">
                Available slots
              </label>
              <input
                id="next-steps"
                className="min-h-12 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-borderStrong"
                placeholder="Tue 6pm, Thu 8pm, Sat morning"
              />
              <SecondaryButton>
                Send offer placeholder
                <Send className="h-5 w-5" aria-hidden />
              </SecondaryButton>
            </form>
          </PremiumCard>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <PremiumCard>
            <BadgeCheck className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">Verification status</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Verified. License category and disclosures stay editable from the profile screen.
            </p>
          </PremiumCard>
          <PremiumCard>
            <Settings className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">Settings</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Notification, availability, and privacy-safe response settings are placeholders for beta.
            </p>
          </PremiumCard>
          <PremiumCard>
            <CalendarCheck className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">Accepted reviews</h2>
            <div className="mt-4 space-y-3">
              {consultations.map((consultation) => (
                <div key={consultation.id} className="rounded-lg border border-border bg-surfaceAlt p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Request #{consultation.id}</p>
                    <TrustBadge tone={consultation.status === "paid" ? "emerald" : "muted"}>
                      {consultation.status}
                    </TrustBadge>
                  </div>
                  <p className="mt-2 text-sm text-textSecondary">{consultation.category}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-textPrimary">
                    <CheckCircle2 className="h-4 w-4 text-textTertiary" aria-hidden />
                    {consultation.fee} - {consultation.nextStep}
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>
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
    <div className="rounded-lg border border-border bg-surfaceAlt p-4">
      <Icon className="h-4 w-4 text-textTertiary" aria-hidden />
      <dt className="mt-3 text-sm font-semibold text-textPrimary">{label}</dt>
      <dd className="mt-1 text-sm text-textSecondary">{value}</dd>
    </div>
  );
}
