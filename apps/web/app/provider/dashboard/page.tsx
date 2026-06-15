import Link from "next/link";
import {
  BarChart3,
  BadgeCheck,
  Edit3,
  FileSearch,
  Megaphone,
  PackageCheck
} from "lucide-react";
import {
  AppShell,
  AppleLikeNav,
  EditorialImage,
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
      <AppleLikeNav />
      <PageShell>
        <div className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_360px] lg:items-end">
          <SectionHeader
            eyebrow="Provider portal"
            title="Manage educational product passports with clear disclosures."
            body="Providers can prepare public education pages without execution links, paid rankings, or unlabelled sponsorship."
          />
          <div className="grid gap-3">
            <EditorialImage
              alt="A phone and desk scene representing product passport publishing."
              className="hidden lg:block"
              imgClassName="aspect-[4/3]"
              src="/images/provider-passport-desk.jpg"
            />
            <TrustBadge tone="muted">Sponsored content must be clearly labelled.</TrustBadge>
          </div>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <PremiumCard key={label}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-textTertiary">{label}</p>
              <p className="mt-3 text-xl font-semibold tracking-[-0.01em] text-textPrimary">{value}</p>
            </PremiumCard>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {portalCards.map((card) => (
            <Link
              href={card.href}
              key={card.href}
              className="rounded-lg border border-border bg-surface p-5 shadow-card transition hover:border-borderStrong"
            >
              <card.icon className="h-5 w-5 text-textTertiary" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.01em] text-textPrimary">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">{card.body}</p>
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <PremiumCard>
            <BarChart3 className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">Analytics placeholder</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Future analytics should show educational engagement without exposing user portfolio, journal, or account data.
            </p>
          </PremiumCard>
          <PremiumCard>
            <Megaphone className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">Sponsored education placeholder</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Sponsored content can be prepared only with clear labels and no implied recommendation or guaranteed return.
            </p>
          </PremiumCard>
          <EmptyState title="No pending review issues" body="Passport quality checks and admin review notes will appear here." />
        </section>

        <section className="mt-6 rounded-lg border border-border bg-surfaceAlt p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
                <FileSearch className="h-4 w-4 text-textTertiary" aria-hidden />
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
