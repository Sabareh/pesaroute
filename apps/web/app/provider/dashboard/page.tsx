import Link from "next/link";
import {
  BarChart3,
  BadgeCheck,
  Edit3,
  FileSearch,
  Megaphone,
  PackageCheck,
  ShieldAlert
} from "lucide-react";
import {
  AppShell,
  EmptyState,
  PageShell,
  PremiumCard,
  PrimaryButton,
  SectionHeader,
  TrustBadge
} from "../../components/maliprime";

const stats = [
  ["Published passports", "5"],
  ["Draft updates", "2"],
  ["Flagged disclosures", "0"],
  ["Sponsored labels", "Clearly marked"]
];

const portalCards = [
  {
    href: "/provider/products",
    title: "Product list",
    body: "Review published and draft passport entries.",
    icon: PackageCheck
  },
  {
    href: "/provider/product-passport-editor",
    title: "Product passport editor",
    body: "Edit basics, risk, fees, documents, disclosures, and external route copy.",
    icon: Edit3
  }
];

export default function ProviderDashboardPage() {
  return (
    <AppShell>
      <PageShell>
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            eyebrow="Provider portal"
            title="Manage educational product passports with clear disclosures."
            body="Providers can prepare public education pages without execution links, paid rankings, or unlabelled sponsorship."
          />
          <TrustBadge tone="amber">
            <ShieldAlert className="mr-2 h-4 w-4" aria-hidden />
            Sponsored content must be clearly labelled.
          </TrustBadge>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <PremiumCard key={label}>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-textSecondary">{label}</p>
              <p className="mt-2 text-xl font-black text-primary">{value}</p>
            </PremiumCard>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {portalCards.map((card) => (
            <Link
              href={card.href}
              key={card.href}
              className="rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-primary/35"
            >
              <card.icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-4 text-xl font-black text-textPrimary">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">{card.body}</p>
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <PremiumCard>
            <BarChart3 className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-black">Analytics placeholder</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Future analytics should show educational engagement without exposing user portfolio, journal, or account data.
            </p>
          </PremiumCard>
          <PremiumCard>
            <Megaphone className="h-6 w-6 text-amber" aria-hidden />
            <h2 className="mt-4 text-lg font-black">Sponsored education placeholder</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Sponsored content can be prepared only with clear labels and no implied recommendation or guaranteed return.
            </p>
          </PremiumCard>
          <EmptyState title="No pending review issues" body="Passport quality checks and admin review notes will appear here." />
        </section>

        <section className="mt-6 rounded-[24px] border border-border bg-surfaceAlt p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-primary">
                <FileSearch className="h-5 w-5" aria-hidden />
                Public passport review
              </div>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Check educational copy before publishing. Keep route instructions external and verification-focused.
              </p>
            </div>
            <PrimaryButton href="/provider/product-passport-editor">
              Open editor
              <BadgeCheck className="h-5 w-5" aria-hidden />
            </PrimaryButton>
          </div>
        </section>
      </PageShell>
    </AppShell>
  );
}
