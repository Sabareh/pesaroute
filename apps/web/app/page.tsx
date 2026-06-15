import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ClipboardCheck,
  FileSearch,
  Globe2,
  Landmark,
  LockKeyhole,
  Map,
  Route,
  ShieldAlert,
  Users,
  WalletCards
} from "lucide-react";
import {
  AmountRangeSelector,
  AppleLikeNav,
  AppShell,
  EditorialImage,
  FeatureCard,
  GoalChip,
  PageShell,
  PremiumCard,
  PricingCard,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  TrustBadge
} from "./components/maliprime";

const trustPromises = ["No M-Pesa PIN", "No bank passwords", "No execution", "Privacy-first", "Professionals verified"];

const features = [
  {
    title: "Route engine",
    body: "Start with an amount range and goal, then learn what to compare, what to avoid, and what to ask.",
    icon: Route
  },
  {
    title: "Product passports",
    body: "Scan educational profiles for MMFs, Treasury bills, SACCOs, chamas, global routes, land, and risk areas.",
    icon: FileSearch
  },
  {
    title: "Simulators",
    body: "Run calm local scenarios for MMFs, T-bills, SACCOs, and global routes before acting elsewhere.",
    icon: Calculator
  },
  {
    title: "Scam checker",
    body: "Paste suspicious investment pitches and review deterministic red flags before sending money.",
    icon: ShieldAlert
  },
  {
    title: "Private journal",
    body: "Save decisions with exact, rounded, range, or hidden amount modes.",
    icon: LockKeyhole
  },
  {
    title: "Professional review",
    body: "Request scoped review from verified professionals while sharing only what you approve.",
    icon: Users
  }
];

const productCategories = [
  { name: "MMFs", icon: WalletCards, note: "Yield, withdrawal timing, fund manager checks." },
  { name: "Treasury bills", icon: Landmark, note: "Auction calendar, maturity, discount pricing." },
  { name: "SACCOs", icon: Users, note: "Share capital, deposits, governance, liquidity." },
  { name: "Chamas", icon: ClipboardCheck, note: "Member rules, records, contribution discipline." },
  { name: "NSE stocks", icon: BookOpen, note: "Volatility, broker checks, diversification basics." },
  { name: "US stocks/ETFs", icon: Globe2, note: "FX costs, offshore brokerage, tax considerations." },
  { name: "Land", icon: Map, note: "Title search, survey checks, legal review." },
  { name: "Crypto risk", icon: ShieldAlert, note: "Volatility, custody, scams, regulatory caution." }
];

const pricingPlans = [
  {
    name: "Free",
    price: "KES 0",
    body: "Learning routes, public passports, basic simulations, scam red flags, and private planning."
  },
  {
    name: "Premium",
    price: "KES 300/month",
    body: "Prepared for unlimited simulations, deeper portfolio mirror, advanced routes, and priority review placeholders."
  },
  {
    name: "Professional",
    price: "Plan placeholder",
    body: "Prepared for verified profile tools, qualified leads, and professional dashboard subscriptions later."
  }
];

const amountRanges = ["KES 1k-5k", "KES 5k-20k", "KES 20k-100k", "KES 100k-500k", "KES 500k+"];

const goals = [
  "Emergency fund",
  "First investment",
  "SACCO/chama",
  "Treasury bills",
  "Global stocks",
  "Land",
  "Scam check",
  "Speak to professional"
];

export default function HomePage() {
  return (
    <AppShell>
      <AppleLikeNav />

      <section className="relative isolate min-h-[680px] overflow-hidden bg-[#11110f] text-white">
        <Image
          alt="A Nairobi workspace with a notebook, Kenyan shillings, and a phone showing investment route options."
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          fill
          priority
          sizes="100vw"
          src="/images/nairobi-workspace-hero.jpg"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(17,17,15,0.86)_0%,rgba(17,17,15,0.68)_38%,rgba(17,17,15,0.18)_72%,rgba(17,17,15,0.05)_100%)]" />
        <div className="mx-auto flex min-h-[680px] max-w-7xl items-end px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-3xl">
            <TrustBadge tone="primary" className="border-white/20 bg-white/10 text-white">
              Kenya-first investment clarity
            </TrustBadge>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Understand your investment route before you move your money.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/74 sm:text-xl">
              PesaRoute helps Kenyans learn, compare, simulate, journal, and get verified professional guidance before
              investing.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="#amount" className="!bg-white !text-textPrimary hover:!bg-white/90">
                Start with my amount
                <ArrowRight className="h-4 w-4" aria-hidden />
              </PrimaryButton>
              <SecondaryButton href="/learning" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                Open learning engine
              </SecondaryButton>
              <SecondaryButton href="/product-passports" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                Explore product passports
              </SecondaryButton>
            </div>
          </div>
        </div>
      </section>

      <PageShell className="-mt-10">
        <div className="mx-auto mt-12 grid max-w-6xl gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <PremiumCard id="amount" className="lg:sticky lg:top-20 lg:self-start">
            <p className="text-sm font-semibold text-textSecondary">Start with a range</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Choose a starting point</h2>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              You can learn with ranges. PesaRoute does not need exact balances for the core learning flow.
            </p>
            <div className="mt-5">
              <AmountRangeSelector ranges={amountRanges} />
            </div>
          </PremiumCard>

          <PremiumCard>
            <p className="text-sm font-semibold text-textSecondary">Pick the decision you are trying to make</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {goals.map((goal, index) => (
                <GoalChip active={index === 1} key={goal}>
                  {goal}
                </GoalChip>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {trustPromises.map((promise) => (
                <div className="rounded-lg border border-border bg-surfaceSubtle px-4 py-3 text-sm font-medium text-textSecondary" key={promise}>
                  {promise}
                </div>
              ))}
            </div>
          </PremiumCard>
        </div>
      </PageShell>

      <PageShell>
        <section className="grid gap-8 py-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <SectionHeader
            eyebrow="The moment before action"
            title="Decision clarity for Kenyan investors, without moving money."
            body="PesaRoute is built for the quiet step before a user sends money anywhere: understand the route, risks, liquidity, documents, fees, and red flags."
          />
          <EditorialImage
            alt="A phone beside a notebook and Kenyan shillings, representing private route planning before sending money."
            caption="PesaRoute keeps the planning step separate from the money movement step."
            className="min-h-[320px]"
            imgClassName="aspect-[16/9]"
            src="/images/route-planning-phone.jpg"
          />
        </section>
      </PageShell>

      <section id="learning" className="bg-surface px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <SectionHeader
              eyebrow="Learning engine"
              title="One guided journey, not separate tools."
              body="The Phase 2.6 loop is now visible: start a track, finish a short lesson, practice, run a relevant simulator, save a private reflection, then review progress before asking for professional help."
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="/learning">
                View learning dashboard
                <ArrowRight className="h-4 w-4" aria-hidden />
              </PrimaryButton>
              <SecondaryButton href="/#amount">Start from amount range</SecondaryButton>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["1", "Short lesson", "Plain-language examples using KES, risk, liquidity, fees, and provider checks."],
              ["2", "Practice", "Quiz and flashcard prompts reward understanding, not risky money movement."],
              ["3", "Simulator", "MMF, T-bill, SACCO, and global route estimates connect back to the lesson."],
              ["4", "Private journal", "Users can save a reflection with exact, rounded, range, or hidden amount modes."],
              ["5", "Progress", "XP, streaks, badges, and library views show what to continue next."],
              ["6", "Scoped review", "Advanced lessons can lead to professional review without exposing private details by default."]
            ].map(([step, title, body]) => (
              <PremiumCard key={step}>
                <p className="text-xs font-semibold uppercase text-textTertiary">Step {step}</p>
                <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-textSecondary">{body}</p>
              </PremiumCard>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-surface px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="MVP flows"
            title="Learn, compare, simulate, journal, and request scoped review."
            body="Every flow stays educational. PesaRoute does not execute investments, hold funds, or ask for financial account credentials."
          />
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard body={feature.body} icon={feature.icon} key={feature.title} title={feature.title} />
            ))}
          </div>
        </div>
      </section>

      <PageShell>
        <section className="py-10">
          <SectionHeader
            eyebrow="Product passports"
            title="Clean educational cards for local and global routes."
            body="Each passport explains risk, liquidity, regulator context, beginner mistakes, documents, and the external route."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {productCategories.map((category) => (
              <PremiumCard key={category.name}>
                <category.icon className="h-5 w-5 text-textTertiary" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em]">{category.name}</h3>
                <p className="mt-2 text-sm leading-6 text-textSecondary">{category.note}</p>
              </PremiumCard>
            ))}
          </div>
        </section>
      </PageShell>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-lg border border-[#252520] bg-[#11110f] p-6 text-white shadow-soft sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase text-white/56">Professional marketplace</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
              Human review, with private data hidden by default.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
              Users choose what to share, professionals see limited qualified context first, and access expires
              automatically.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <SecondaryButton href="/professional/dashboard" className="border-white/10 bg-white text-textPrimary hover:bg-white/90">
                Professional portal
              </SecondaryButton>
              <SecondaryButton href="/provider/dashboard" className="border-white/10 bg-white/10 text-white hover:bg-white/15">
                Provider portal
              </SecondaryButton>
            </div>
          </div>
          <figure className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.06]">
            <Image
              alt="Notebook and cash on a desk, representing a private professional review context."
              className="aspect-[16/9] h-full w-full object-cover"
              height={572}
              sizes="(min-width: 1024px) 42vw, 100vw"
              src="/images/private-review-notebook.jpg"
              width={1100}
            />
          </figure>
        </div>
      </section>

      <section id="privacy" className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <SectionHeader
            eyebrow="Privacy"
            title="Trust rules users can understand before they sign up."
            body="PesaRoute does not ask for M-Pesa PINs, bank passwords, broker credentials, or MMF credentials. Users can plan with ranges and revoke professional access."
          />
          <EditorialImage
            alt="A calm desk scene with a phone and written planning notes for privacy-first investment decisions."
            caption="Users can plan with ranges and decide what, if anything, to share."
            imgClassName="aspect-[16/9]"
            src="/images/provider-passport-desk.jpg"
          />
        </div>
      </section>

      <section id="pricing" className="bg-surface px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Pricing foundation"
            title="Checkout preparation without investment payment rails."
            body="M-Pesa checkout is only for PesaRoute subscriptions, learning packs, and future review fees. It is not for investment execution."
          />
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <PricingCard
                body={plan.body}
                ctaHref="/payments/status"
                ctaLabel="View payment status flow"
                key={plan.name}
                name={plan.name}
                price={plan.price}
              />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-10 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 text-sm leading-6 text-textSecondary md:grid-cols-[0.9fr_1.1fr]">
          <p className="font-semibold text-textPrimary">PesaRoute</p>
          <p>
            Educational information only. PesaRoute does not provide investment execution, custody, guaranteed returns,
            M-Pesa services, bank account linking, or broker account linking.
          </p>
        </div>
      </footer>
    </AppShell>
  );
}
