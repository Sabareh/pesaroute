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

// The global sidebar + top bar now live in AppFrame (rendered from the root layout),
// so the app shell is applied end-to-end. These keep their old call sites working:
// AppShell is a passthrough (no second <main>), and AppleLikeNav renders nothing.
export function AppShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 ${className}`}>{children}</div>;
}

type BannerAccent = "green" | "amber" | "blue" | "violet";
type BannerArtKind = "layers" | "rings" | "shield" | "bars" | "compare" | "search";

// One accent colour per banner (DataCamp-style). Literal class strings so Tailwind JIT keeps them.
const bannerAccent: Record<BannerAccent, { pill: string; art: string }> = {
  green: { pill: "border-accent/40 bg-accent/15 text-accent", art: "text-accent" },
  amber: { pill: "border-amber/50 bg-amber/15 text-amber", art: "text-amber" },
  blue: { pill: "border-sky/50 bg-sky/15 text-sky", art: "text-sky" },
  violet: { pill: "border-violet/50 bg-violet/15 text-violet", art: "text-violet" }
};

function BannerArt({ kind, className }: { kind: BannerArtKind; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const art: Record<BannerArtKind, ReactNode> = {
    layers: (
      <>
        <path d="M80 18 134 46 80 74 26 46Z" />
        <path d="M26 66 80 94 134 66" opacity={0.6} />
        <path d="M26 86 80 114 134 86" opacity={0.35} />
      </>
    ),
    rings: (
      <>
        <circle cx="80" cy="66" r="46" opacity={0.4} />
        <circle cx="80" cy="66" r="28" />
        <path d="M80 20a46 46 0 0 1 46 46" />
        <path d="M118 52 126 66 112 70" />
      </>
    ),
    shield: (
      <>
        <path d="M80 16 124 32v34c0 30-44 52-44 52s-44-22-44-52V32Z" opacity={0.55} />
        <path d="M62 66 74 80l24-30" />
      </>
    ),
    bars: (
      <>
        <path d="M30 112h104" opacity={0.5} />
        <rect x="44" y="70" width="16" height="42" rx="2" opacity={0.5} />
        <rect x="72" y="46" width="16" height="66" rx="2" />
        <rect x="100" y="84" width="16" height="28" rx="2" opacity={0.5} />
      </>
    ),
    compare: (
      <>
        <rect x="30" y="40" width="42" height="56" rx="4" opacity={0.5} />
        <rect x="88" y="28" width="42" height="68" rx="4" />
        <path d="M80 24v80" opacity={0.4} />
      </>
    ),
    search: (
      <>
        <circle cx="72" cy="60" r="34" />
        <path d="M98 86 122 110" />
        <path d="M58 60h28M72 46v28" opacity={0.5} />
      </>
    )
  };
  return (
    <svg className={className} width="180" height="140" viewBox="0 0 160 130" aria-hidden="true" {...common}>
      {art[kind]}
    </svg>
  );
}

/**
 * Coloured page banner (deep-navy hero) carrying the page's header information,
 * like DataCamp's section banners. Dark in both themes. `accent` tints the badge
 * pill + the right-side line-art (`art`); `badge` is a short accent pill.
 */
export function PageBanner({
  eyebrow,
  title,
  description,
  badge,
  accent = "green",
  art,
  children
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: string;
  accent?: BannerAccent;
  art?: BannerArtKind;
  children?: ReactNode;
}) {
  const tone = bannerAccent[accent] ?? bannerAccent.green;
  return (
    <section className="relative overflow-hidden rounded-xl bg-bannerBg p-6 text-bannerText sm:p-8">
      {art ? (
        <BannerArt kind={art} className={`pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 opacity-60 lg:block ${tone.art}`} />
      ) : null}
      <div className="relative max-w-2xl">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wider text-bannerMuted">{eyebrow}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] sm:text-3xl">{title}</h1>
          {badge ? <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.pill}`}>{badge}</span> : null}
        </div>
        {description ? <p className="mt-2 text-sm leading-6 text-bannerMuted">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </section>
  );
}

export function AppleLikeNav() {
  return null;
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

// Circular progress ring with the PesaRoute accent→violet gradient. Centre slot
// renders whatever you pass as children (e.g. the percentage).
export function ProgressRing({
  value,
  size = 132,
  stroke = 10,
  children
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="pr-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--c-accent))" />
            <stop offset="100%" stopColor="rgb(var(--c-violet))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--c-surfaceSubtle))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#pr-ring-gradient)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

const statToneClass: Record<"accent" | "amber" | "sky" | "muted", string> = {
  accent: "text-accent",
  amber: "text-amber",
  sky: "text-sky",
  muted: "text-textSecondary"
};

export function StatPill({
  icon: Icon,
  value,
  label,
  tone = "accent"
}: {
  icon?: IconType;
  value: ReactNode;
  label: string;
  tone?: "accent" | "amber" | "sky" | "muted";
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
      {Icon ? <Icon className={`h-5 w-5 ${statToneClass[tone]}`} aria-hidden /> : null}
      <div>
        <p className="text-lg font-bold leading-none text-textPrimary">{value}</p>
        <p className="mt-1 text-xs font-medium text-textSecondary">{label}</p>
      </div>
    </div>
  );
}

const tileToneClass: Record<"accent" | "amber" | "violet" | "sky", string> = {
  accent: "bg-accent/15 text-accent",
  amber: "bg-amber/15 text-amber",
  violet: "bg-violet/15 text-violet",
  sky: "bg-sky/15 text-sky"
};

export function IconTile({
  icon: Icon,
  tone = "accent",
  title,
  body,
  href
}: {
  icon: IconType;
  tone?: "accent" | "amber" | "violet" | "sky";
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-borderStrong"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tileToneClass[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-base font-semibold text-textPrimary">{title}</p>
      <p className="mt-1 text-sm leading-6 text-textSecondary">{body}</p>
    </Link>
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
