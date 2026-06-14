import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type ActionProps = {
  children: ReactNode;
  className?: string;
  href?: string;
};

type BadgeTone = "primary" | "emerald" | "amber" | "danger" | "muted";

const badgeToneClass: Record<BadgeTone, string> = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  emerald: "border-emerald/15 bg-emerald/10 text-emerald",
  amber: "border-amber/20 bg-amber/10 text-amber",
  danger: "border-danger/15 bg-danger/10 text-danger",
  muted: "border-border bg-surfaceAlt text-textSecondary"
};

export function AppShell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background text-textPrimary">{children}</main>;
}

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 ${className}`}>{children}</div>;
}

export function PremiumCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-surface p-5 shadow-card ${className}`}>{children}</div>;
}

export function HeroCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[24px] border border-primary/10 bg-[linear-gradient(135deg,#ffffff_0%,#f1f4f9_58%,#eaf0ff_100%)] p-6 shadow-card sm:p-8 ${className}`}
    >
      {children}
    </section>
  );
}

export function PrimaryButton({ children, className = "", href }: ActionProps) {
  const classes = `inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-button transition hover:bg-primaryDark focus:outline-none focus:ring-4 focus:ring-primary/20 ${className}`;
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
  const classes = `inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 text-sm font-bold text-textPrimary shadow-subtle transition hover:border-primary/35 hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15 ${className}`;
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
      {ranges.map((range) => (
        <button
          className="min-h-14 rounded-2xl border border-border bg-surface px-4 text-left text-sm font-black text-textPrimary shadow-subtle transition hover:border-primary/40 hover:text-primary"
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
      className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-bold ${
        active ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-surface text-textSecondary"
      }`}
    >
      {children}
    </span>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const tone: BadgeTone = level.toLowerCase().includes("high") ? "danger" : level.toLowerCase().includes("moderate") ? "amber" : "emerald";
  return <TrustBadge tone={tone}>{level} risk</TrustBadge>;
}

export function LiquidityBadge({ level }: { level: string }) {
  const tone: BadgeTone = level.toLowerCase().includes("high") ? "emerald" : level.toLowerCase().includes("low") ? "amber" : "primary";
  return <TrustBadge tone={tone}>{level} liquidity</TrustBadge>;
}

export function PrivacyPromiseCard({ icon: Icon, text }: { icon?: IconType; text: string }) {
  return (
    <PremiumCard className="flex items-start gap-3">
      {Icon ? <Icon className="mt-0.5 h-5 w-5 flex-none text-primary" aria-hidden /> : <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald" />}
      <p className="text-sm font-semibold leading-6 text-textSecondary">{text}</p>
    </PremiumCard>
  );
}

export function SimulatorCard({ body, icon: Icon, title }: { body: string; icon?: IconType; title: string }) {
  return (
    <PremiumCard>
      {Icon ? <Icon className="h-6 w-6 text-primary" aria-hidden /> : null}
      <h3 className="mt-4 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-textSecondary">{body}</p>
    </PremiumCard>
  );
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
    <Link href={href} className="block rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-primary/35">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{category}</p>
      <h3 className="mt-3 text-lg font-black text-textPrimary">{name}</h3>
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
      <TrustBadge tone="emerald">Verified placeholder</TrustBadge>
      <h3 className="mt-4 text-lg font-black">{name}</h3>
      <p className="mt-1 text-sm font-bold text-textSecondary">{firm}</p>
      <p className="mt-3 text-sm font-black text-primary">{specialty}</p>
      <p className="mt-3 text-sm leading-6 text-textSecondary">{body}</p>
    </PremiumCard>
  );
}

export function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <PremiumCard className="text-center">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-textSecondary">{body}</p>
    </PremiumCard>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <p className="rounded-2xl border border-border bg-surfaceAlt px-4 py-3 text-sm font-bold text-textSecondary">{label}</p>;
}

export function ErrorState({ message }: { message: string }) {
  return <p className="rounded-2xl border border-danger/15 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{message}</p>;
}

export function SectionHeader({ eyebrow, title, body }: { body?: string; eyebrow?: string; title: string }) {
  return (
    <header className="max-w-3xl">
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">{eyebrow}</p> : null}
      <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
      {body ? <p className="mt-4 text-base leading-7 text-textSecondary">{body}</p> : null}
    </header>
  );
}

export function TrustBadge({ children, tone = "primary" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${badgeToneClass[tone]}`}>
      {children}
    </span>
  );
}
