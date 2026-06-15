import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Filter, Search, ShieldCheck } from "lucide-react";
import {
  AppShell,
  AppleLikeNav,
  EditorialImage,
  EmptyState,
  ErrorState,
  LoadingState,
  PageShell,
  PremiumCard,
  PrivacyPromiseCard,
  ProductPassportCard,
  SectionHeader,
  TrustBadge
} from "../components/maliprime";
import { type PublicPassport, publicPassports } from "./catalog";

export const metadata: Metadata = {
  title: "Kenyan Investment Product Passports | PesaRoute",
  description:
    "Search educational Kenyan investment product passports for MMFs, Treasury bills, SACCOs, global routes, and land due diligence."
};

type PassportSearchParams = {
  category?: string;
  liquidity?: string;
  q?: string;
  risk?: string;
};

const categories = ["Money Market Funds", "Treasury Bills", "SACCOs", "US Stocks and ETFs", "Land"];
const riskLevels = ["Low", "Moderate", "High"];
const liquidityLevels = ["High", "Medium", "Low"];

export default async function ProductPassportsPage({
  searchParams
}: {
  searchParams?: Promise<PassportSearchParams>;
}) {
  const filters = (await searchParams) ?? {};
  const query = filters.q?.trim().toLowerCase() ?? "";
  const filteredPassports = publicPassports.filter((passport) => matchesFilters(passport, filters, query));

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-textSecondary transition hover:text-textPrimary">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          PesaRoute
        </Link>

        <header className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <SectionHeader
            eyebrow="Product passports"
            title="Search and compare Kenyan investment route basics."
            body="Educational passports show category, risk, liquidity, minimum amount, regulator context, beginner mistakes, documents, route notes, and disclosures before a user acts elsewhere."
          />
          <EditorialImage
            alt="A phone and planning notebook representing educational investment product passport discovery."
            caption="Product passports explain how to verify a route before acting outside PesaRoute."
            imgClassName="aspect-[16/9]"
            src="/images/route-planning-phone.jpg"
          />
        </header>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          <PrivacyPromiseCard
            icon={ShieldCheck}
            text="Educational information only. PesaRoute does not execute investments, hold money, or promise returns."
          />
          <PrivacyPromiseCard
            icon={ShieldCheck}
            text="Verify details with the provider, regulator, and a licensed professional where needed."
          />
        </section>

        <section className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
            <Search className="h-4 w-4 text-textTertiary" aria-hidden />
            Discovery controls
          </div>
          <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="sr-only" htmlFor="passport-search">
              Search passports
            </label>
            <input
              id="passport-search"
              name="q"
              className="min-h-12 rounded-lg border border-border bg-background px-4 text-sm outline-none focus:border-borderStrong"
              defaultValue={filters.q ?? ""}
              placeholder="Search product name, provider, beginner mistakes, or execution route"
              type="search"
            />
            <input name="category" type="hidden" value={filters.category ?? ""} />
            <input name="risk" type="hidden" value={filters.risk ?? ""} />
            <input name="liquidity" type="hidden" value={filters.liquidity ?? ""} />
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surfaceAlt px-4 text-sm font-semibold text-textPrimary transition hover:border-borderStrong">
              <Filter className="h-4 w-4" aria-hidden />
              Search
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={buildFilterHref({ ...filters, category: undefined })}>
              <TrustBadge tone={!filters.category ? "primary" : "muted"}>All</TrustBadge>
            </Link>
            {categories.map((category) => (
              <Link href={buildFilterHref({ ...filters, category })} key={category}>
                <TrustBadge tone={filters.category === category ? "primary" : "muted"}>{category}</TrustBadge>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {riskLevels.map((risk) => (
              <Link href={buildFilterHref({ ...filters, risk })} key={risk}>
                <TrustBadge tone={risk === "High" ? "danger" : "muted"}>{risk} risk</TrustBadge>
              </Link>
            ))}
            {liquidityLevels.map((liquidity) => (
              <Link href={buildFilterHref({ ...filters, liquidity })} key={liquidity}>
                <TrustBadge tone={liquidity === "High" ? "emerald" : "muted"}>{liquidity} liquidity</TrustBadge>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {filteredPassports.map((passport) => (
            <ProductPassportCard
              body={passport.description}
              category={passport.category}
              href={`/product-passports/${passport.slug}`}
              key={passport.slug}
              liquidity={passport.liquidityLevel}
              name={passport.name}
              risk={passport.riskLevel}
            />
          ))}
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <PremiumCard>
            <h2 className="text-lg font-semibold tracking-[-0.01em]">Compare with</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Placeholder for side-by-side comparison. It will stay educational and avoid implying rankings.
            </p>
          </PremiumCard>
          {filteredPassports.length === 0 ? (
            <EmptyState title="No matching passports" body="Try a broader category, risk level, or liquidity level." />
          ) : (
            <PremiumCard>
              <h2 className="text-lg font-semibold tracking-[-0.01em]">{filteredPassports.length} passports shown</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Results are ordered for educational scanning. They are not rankings or recommendations.
              </p>
            </PremiumCard>
          )}
          <div className="space-y-3">
            <LoadingState label="Loading public catalog..." />
            <ErrorState message="Catalog unavailable. Showing cached educational passports when possible." />
          </div>
        </section>
      </PageShell>
    </AppShell>
  );
}

function matchesFilters(passport: PublicPassport, filters: PassportSearchParams, query: string) {
  const matchesCategory = !filters.category || passport.category === filters.category;
  const matchesRisk = !filters.risk || passport.riskLevel === filters.risk;
  const matchesLiquidity = !filters.liquidity || passport.liquidityLevel === filters.liquidity;
  const searchable = [
    passport.name,
    passport.provider,
    passport.description,
    passport.externalRoute,
    ...passport.beginnerMistakes
  ]
    .join(" ")
    .toLowerCase();
  const matchesQuery = !query || searchable.includes(query);

  return matchesCategory && matchesRisk && matchesLiquidity && matchesQuery;
}

function buildFilterHref(filters: PassportSearchParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/product-passports?${query}` : "/product-passports";
}
