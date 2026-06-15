import Link from "next/link";
import Image from "next/image";
import type { ComponentType, ReactNode } from "react";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type ActionProps = {
  children: ReactNode;
  className?: string;
  href?: string;
};

type EditorialImageProps = {
  alt: string;
  caption?: string;
  className?: string;
  imgClassName?: string;
  src: string;
};

type BadgeTone = "primary" | "emerald" | "amber" | "danger" | "muted";

const badgeToneClass: Record<BadgeTone, string> = {
  primary: "border-borderStrong bg-surface text-textPrimary",
  emerald: "border-emerald/20 bg-mint text-emerald",
  amber: "border-border bg-surfaceSubtle text-textSecondary",
  danger: "border-danger/20 bg-danger/[0.06] text-danger",
  muted: "border-border bg-surfaceSubtle text-textSecondary"
};

export function AppShell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background text-textPrimary">{children}</main>;
}

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 ${className}`}>{children}</div>;
}

export function AppleLikeNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 text-textPrimary backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-[-0.01em] text-textPrimary">
          PesaRoute
        </Link>
        <nav className="hidden items-center gap-7 text-xs font-medium text-textSecondary sm:flex">
          <Link className="transition hover:text-textPrimary" href="/learning">
            Learning
          </Link>
          <Link className="transition hover:text-textPrimary" href="/product-passports">
            Passports
          </Link>
          <Link className="transition hover:text-textPrimary" href="/professional/dashboard">
            Professionals
          </Link>
          <Link className="transition hover:text-textPrimary" href="/provider/dashboard">
            Providers
          </Link>
          <Link className="transition hover:text-textPrimary" href="/payments/status">
            Payments
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PremiumCard({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-5 shadow-card sm:p-6 ${className}`} id={id}>
      {children}
    </div>
  );
}

export function DashboardCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <PremiumCard className={className}>{children}</PremiumCard>;
}

export function HeroCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-lg border border-border bg-surface p-6 shadow-soft sm:p-8 ${className}`}>
      <div className="relative">{children}</div>
    </section>
  );
}

export function EditorialImage({ alt, caption, className = "", imgClassName = "", src }: EditorialImageProps) {
  return (
    <figure className={`overflow-hidden rounded-lg border border-border bg-surface shadow-soft ${className}`}>
      <Image
        alt={alt}
        className={`h-full w-full object-cover ${imgClassName}`}
        height={800}
        sizes="(min-width: 1024px) 42vw, 100vw"
        src={src}
        width={1200}
      />
      {caption ? (
        <figcaption className="border-t border-border bg-surface px-4 py-3 text-xs leading-5 text-textSecondary">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function LiquidHeroSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative isolate overflow-hidden bg-background px-5 py-16 sm:px-8 sm:py-24 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

export function PrimaryButton({ children, className = "", href }: ActionProps) {
  const classes = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark focus:outline-none focus:ring-4 focus:ring-emerald/20 ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return <button className={classes}>{children}</button>;
}

export function SecondaryButton({ children, className = "", href }: ActionProps) {
  const classes = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-textPrimary transition hover:border-borderStrong hover:bg-surfaceSubtle focus:outline-none focus:ring-4 focus:ring-emerald/15 ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return <button className={classes}>{children}</button>;
}

export function AmountRangeSelector({ ranges }: { ranges: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ranges.map((range, index) => (
        <button
          className={`min-h-14 rounded-lg border px-4 text-left text-sm font-semibold transition ${
            index === 1
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-textPrimary hover:border-borderStrong hover:bg-surfaceSubtle"
          }`}
          key={range}
        >
          {range}
        </button>
      ))}
    </div>
  );
}

export function GoalChip({ active = false, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3.5 py-2 text-sm font-semibold ${
        active ? "border-primary bg-primary text-white" : "border-border bg-surface text-textSecondary"
      }`}
    >
      {children}
    </span>
  );
}

export function LiquidPill({ active = false, children }: { active?: boolean; children: ReactNode }) {
  return <GoalChip active={active}>{children}</GoalChip>;
}

export function RiskBadge({ level }: { level: string }) {
  const tone: BadgeTone = level.toLowerCase().includes("high") ? "danger" : "muted";
  return <TrustBadge tone={tone}>{level} risk</TrustBadge>;
}

export function LiquidityBadge({ level }: { level: string }) {
  const tone: BadgeTone = level.toLowerCase().includes("high") ? "emerald" : "muted";
  return <TrustBadge tone={tone}>{level} liquidity</TrustBadge>;
}

export function PrivacyPromiseCard({ icon: Icon, text }: { icon?: IconType; text: string }) {
  return (
    <PremiumCard className="flex items-start gap-3">
      {Icon ? (
        <Icon className="mt-0.5 h-5 w-5 flex-none text-textTertiary" aria-hidden />
      ) : (
        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-textTertiary" />
      )}
      <p className="text-sm font-medium leading-6 text-textSecondary">{text}</p>
    </PremiumCard>
  );
}

export function FeatureCard({ body, icon: Icon, title }: { body: string; icon?: IconType; title: string }) {
  return (
    <PremiumCard className="transition hover:-translate-y-0.5 hover:border-borderStrong">
      {Icon ? <Icon className="h-5 w-5 text-textTertiary" aria-hidden /> : null}
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-textSecondary">{body}</p>
    </PremiumCard>
  );
}

export function SimulatorCard(props: { body: string; icon?: IconType; title: string }) {
  return <FeatureCard {...props} />;
}

export function ProductPassportCard({
  body,
  category,
  href,
  liquidity,
  name,
  risk
}: {
  body: string;
  category: string;
  href: string;
  liquidity: string;
  name: string;
  risk: string;
}) {
  return (
    <Link href={href} className="block rounded-lg border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-borderStrong sm:p-6">
      <p className="text-xs font-semibold uppercase text-textTertiary">{category}</p>
      <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-textPrimary">{name}</h3>
      <p className="mt-3 text-sm leading-6 text-textSecondary">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <RiskBadge level={risk} />
        <LiquidityBadge level={liquidity} />
      </div>
    </Link>
  );
}

export function ProfessionalCard({ body, firm, name, specialty }: { body: string; firm: string; name: string; specialty: string }) {
  return (
    <PremiumCard>
      <TrustBadge tone="emerald">Verified</TrustBadge>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em]">{name}</h3>
      <p className="mt-1 text-sm font-medium text-textSecondary">{firm}</p>
      <p className="mt-3 text-sm font-semibold text-textPrimary">{specialty}</p>
      <p className="mt-3 text-sm leading-6 text-textSecondary">{body}</p>
    </PremiumCard>
  );
}

export function PricingCard({ body, ctaHref, ctaLabel, name, price }: { body: string; ctaHref: string; ctaLabel: string; name: string; price: string }) {
  return (
    <PremiumCard className="flex h-full flex-col">
      <h3 className="text-lg font-semibold tracking-[-0.01em]">{name}</h3>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-textPrimary">{price}</p>
      <p className="mt-3 flex-1 text-sm leading-6 text-textSecondary">{body}</p>
      <SecondaryButton href={ctaHref} className="mt-6">
        {ctaLabel}
      </SecondaryButton>
    </PremiumCard>
  );
}

export function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <PremiumCard className="text-center">
      <h3 className="text-lg font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-textSecondary">{body}</p>
    </PremiumCard>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-textSecondary shadow-subtle">{label}</p>;
}

export function ErrorState({ message }: { message: string }) {
  return <p className="rounded-lg border border-danger/15 bg-danger/[0.06] px-4 py-3 text-sm font-medium text-danger">{message}</p>;
}

export function SectionHeader({ eyebrow, title, body }: { body?: string; eyebrow?: string; title: string }) {
  return (
    <header className="max-w-3xl">
      {eyebrow ? <p className="text-xs font-semibold uppercase text-textTertiary">{eyebrow}</p> : null}
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">{title}</h2>
      {body ? <p className="mt-4 text-base leading-7 text-textSecondary">{body}</p> : null}
    </header>
  );
}

export function TrustBadge({ children, className = "", tone = "primary" }: { children: ReactNode; className?: string; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${badgeToneClass[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function PortalShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-textTertiary">PesaRoute portal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em]">{title}</h1>
        </div>
        {children}
      </PageShell>
    </AppShell>
  );
}
