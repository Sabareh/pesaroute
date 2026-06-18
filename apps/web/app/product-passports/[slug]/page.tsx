import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Scale } from "lucide-react";
import {
  AppleLikeNav,
  AppShell,
  EditorialImage,
  PageShell,
  PremiumCard,
  SectionHeader,
  TrustBadge
} from "../../components/maliprime";
import { findPublicPassport, publicPassports } from "../catalog";

export function generateStaticParams() {
  return publicPassports.map((passport) => ({ slug: passport.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const passport = findPublicPassport(slug);
  if (!passport) {
    return {
      title: "Product Passport | PesaRoute"
    };
  }
  return {
    title: `${passport.name} Product Passport | PesaRoute`,
    description: passport.description
  };
}

export default async function ProductPassportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const passport = findPublicPassport(slug);
  if (!passport) {
    notFound();
  }

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell className="max-w-5xl">
        <Link
          href="/product-passports"
          className="inline-flex items-center gap-2 text-sm font-semibold text-textSecondary transition hover:text-textPrimary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Product passports
        </Link>

        <header className="mt-10 border-b border-border pb-8">
          <SectionHeader eyebrow={passport.category} title={passport.name} body={passport.description} />
          <div className="mt-5 flex flex-wrap gap-2">
            <TrustBadge tone="muted">{passport.provider}</TrustBadge>
            <TrustBadge tone={passport.riskLevel === "High" ? "danger" : "muted"}>{passport.riskLevel} risk</TrustBadge>
            <TrustBadge tone="emerald">{passport.liquidityLevel} liquidity</TrustBadge>
            <TrustBadge tone="muted">Educational information</TrustBadge>
          </div>
        </header>

        <EditorialImage
          alt="A notebook, phone, and Kenyan shillings used for checking an investment route before sending money."
          caption="Passport details stay educational: verify externally, compare risks, and avoid rushed commitments."
          className="mt-8"
          imgClassName="aspect-[16/7]"
          src="/images/private-review-notebook.jpg"
        />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Fact label="Provider" value={passport.provider} />
          <Fact label="Risk" value={passport.riskLevel} />
          <Fact label="Liquidity" value={passport.liquidityLevel} />
          <Fact label="Minimum" value={passport.minimumAmount} />
          <Fact label="Regulator category" value={passport.regulatorCategory} />
          <Fact label="Execution" value="External provider only" />
          <Fact label="Source" value={passport.sourceLabel} />
          <Fact label="Learning route" value={passport.learningTrackTitle} href={passport.learningTrackHref} />
          <Fact label="Last verified" value={passport.lastVerified} />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <ListBlock icon="disclosure" title="What it is" items={[passport.description]} />
          <ListBlock icon="disclosure" title="How it works" items={[passport.externalRoute]} />
          <ListBlock title="Good for learning about" items={goodFor(passport)} />
          <ListBlock icon="disclosure" title="Not ideal for" items={notIdealFor(passport)} />
          <ListBlock title="Checks before acting" items={passport.checks} />
          <ListBlock title="Questions to ask" items={questionsToAsk(passport)} />
          <ListBlock title="Beginner mistakes to avoid" items={passport.beginnerMistakes} />
          <ListBlock icon="document" title="Documents commonly needed" items={passport.documentsNeeded} />
          <ListBlock icon="disclosure" title="Disclosures" items={passport.disclosures} />
          <ListBlock icon="disclosure" title="Where to verify" items={[`${passport.sourceLabel}: ${passport.sourceUrl}`]} />
        </section>

        <PremiumCard className="mt-8">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">External route</h2>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{passport.externalRoute}</p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">
            Source:{" "}
            <a className="font-semibold text-textPrimary underline decoration-border underline-offset-4" href={passport.sourceUrl}>
              {passport.sourceLabel}
            </a>
            . If no source exists for future passports, show editorial educational content.
          </p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">
            PesaRoute shows the route explanation only. Any application, transfer, custody, execution, or payment happens outside PesaRoute
            after independent verification.
          </p>
          <Link
            href={passport.learningTrackHref}
            className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-textPrimary transition hover:border-textTertiary"
          >
            Learn this route
          </Link>
        </PremiumCard>
      </PageShell>
    </AppShell>
  );
}

function goodFor(passport: NonNullable<ReturnType<typeof findPublicPassport>>) {
  const items = [`Understanding ${passport.category.toLowerCase()} before acting outside PesaRoute.`];
  if (passport.liquidityLevel === "High") {
    items.push("Comparing liquidity and withdrawal timing for near-term goals.");
  }
  if (passport.category.includes("Treasury")) {
    items.push("Learning auction timing, maturity, face value, and purchase price.");
  }
  if (passport.category.includes("SACCO")) {
    items.push("Learning membership rules, deposits, share capital, and guarantor exposure.");
  }
  if (passport.category.includes("Land")) {
    items.push("Learning slow verification before paying deposits.");
  }
  return items;
}

function notIdealFor(passport: NonNullable<ReturnType<typeof findPublicPassport>>) {
  const items = ["Anyone looking for PesaRoute to execute, hold money, or recommend a provider."];
  if (passport.liquidityLevel === "Low" || passport.liquidityLevel === "Medium") {
    items.push("Money needed urgently before the route's exit timing is clear.");
  }
  if (passport.riskLevel === "High") {
    items.push("Users who have not checked documents, provider status, fees, and loss scenarios.");
  }
  return items;
}

function questionsToAsk(passport: NonNullable<ReturnType<typeof findPublicPassport>>) {
  return [
    "Who regulates or supervises this route?",
    "How do I exit, and how long can withdrawal or transfer take?",
    "What fees, taxes, penalties, or delays could reduce the outcome?",
    "What official documents should I read before sending money?",
    ...passport.checks
  ];
}

function Fact({ href, label, value }: { href?: string; label: string; value: string }) {
  return (
    <PremiumCard>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-textTertiary">{label}</p>
      {href ? (
        <Link className="mt-2 inline-flex text-base font-semibold text-textPrimary underline decoration-border underline-offset-4" href={href}>
          {value}
        </Link>
      ) : (
        <p className="mt-2 text-base font-semibold text-textPrimary">{value}</p>
      )}
    </PremiumCard>
  );
}

function ListBlock({ icon = "check", items, title }: { icon?: "check" | "disclosure" | "document"; items: string[]; title: string }) {
  const Icon = icon === "document" ? FileText : icon === "disclosure" ? Scale : CheckCircle2;

  return (
    <PremiumCard>
      <h2 className="text-xl font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div className="flex gap-3" key={item}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-textTertiary" aria-hidden />
            <p className="text-sm leading-6 text-textSecondary">{item}</p>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}
