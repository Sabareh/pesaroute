import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Scale, ShieldCheck } from "lucide-react";
import { AppShell, PageShell, PremiumCard, PrivacyPromiseCard, SectionHeader, TrustBadge } from "../../components/maliprime";
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
      <PageShell className="max-w-5xl">
        <Link href="/product-passports" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Product passports
        </Link>

        <header className="mt-10 border-b border-border pb-8">
          <SectionHeader eyebrow={passport.category} title={passport.name} body={passport.description} />
          <div className="mt-5 flex flex-wrap gap-2">
            <TrustBadge tone="muted">{passport.provider}</TrustBadge>
            <TrustBadge tone="primary">{passport.riskLevel} risk</TrustBadge>
            <TrustBadge tone="emerald">{passport.liquidityLevel} liquidity</TrustBadge>
            <TrustBadge tone="amber">Educational information</TrustBadge>
          </div>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-2">
          <PrivacyPromiseCard icon={ShieldCheck} text="Educational information only. This page is not an investment recommendation." />
          <PrivacyPromiseCard
            icon={ShieldCheck}
            text="PesaRoute does not execute investments, hold money, collect credentials, or promise returns."
          />
          <PrivacyPromiseCard icon={ShieldCheck} text="Verify current terms with the provider and regulator before sending money." />
          <PrivacyPromiseCard
            icon={ShieldCheck}
            text="Consult a licensed professional where legal, tax, or personal suitability questions matter."
          />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Fact label="Provider" value={passport.provider} />
          <Fact label="Risk" value={passport.riskLevel} />
          <Fact label="Liquidity" value={passport.liquidityLevel} />
          <Fact label="Minimum" value={passport.minimumAmount} />
          <Fact label="Regulator category" value={passport.regulatorCategory} />
          <Fact label="Execution" value="External provider only" />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <ListBlock title="Checks before acting" items={passport.checks} />
          <ListBlock title="Beginner mistakes to avoid" items={passport.beginnerMistakes} />
          <ListBlock icon="document" title="Documents commonly needed" items={passport.documentsNeeded} />
          <ListBlock icon="disclosure" title="Disclosures" items={passport.disclosures} />
        </section>

        <PremiumCard className="mt-8">
          <h2 className="text-xl font-black">External route</h2>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{passport.externalRoute}</p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">
            PesaRoute shows the route explanation only. Any application, transfer, custody, execution, or payment happens
            outside PesaRoute after independent verification.
          </p>
        </PremiumCard>
      </PageShell>
    </AppShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <PremiumCard>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-textSecondary">{label}</p>
      <p className="mt-2 text-base font-black text-textPrimary">{value}</p>
    </PremiumCard>
  );
}

function ListBlock({ icon = "check", items, title }: { icon?: "check" | "disclosure" | "document"; items: string[]; title: string }) {
  const Icon = icon === "document" ? FileText : icon === "disclosure" ? Scale : CheckCircle2;

  return (
    <PremiumCard>
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div className="flex gap-3" key={item}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden />
            <p className="text-sm leading-6 text-textSecondary">{item}</p>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}
