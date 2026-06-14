import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
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
  AppShell,
  GoalChip,
  PageShell,
  PremiumCard,
  PrimaryButton,
  PrivacyPromiseCard,
  SectionHeader,
  SimulatorCard,
  TrustBadge
} from "./components/maliprime";

const trustPromises = [
  "No M-Pesa PIN",
  "No bank passwords",
  "No execution",
  "Privacy-first",
  "Professionals verified"
];

const problemPoints = [
  "Money apps make moving funds easy, but they rarely explain which route fits a Kenyan user's goal.",
  "Influencers can make products sound simple without showing liquidity, risk, fees, or regulatory context.",
  "First-time investors often need a calm checklist before speaking to a provider or professional."
];

const features = [
  {
    title: "Route engine",
    body: "Start with an amount range and goal, then see what to learn first, what to avoid, and what questions to ask.",
    icon: Route
  },
  {
    title: "Product passports",
    body: "Compare educational profiles for MMFs, Treasury bills, SACCOs, chamas, global routes, land, and high-risk areas.",
    icon: FileSearch
  },
  {
    title: "Simulators",
    body: "Run local educational scenarios for MMFs, T-bills, SACCOs, and global investing routes before acting elsewhere.",
    icon: Calculator
  },
  {
    title: "Scam checker",
    body: "Paste suspicious investment pitches and review deterministic red flags before sending money.",
    icon: ShieldAlert
  },
  {
    title: "Private journal",
    body: "Write down decisions, assumptions, and questions with exact, rounded, range, or hidden amount display modes.",
    icon: LockKeyhole
  },
  {
    title: "Professional review",
    body: "Request scoped review from verified professionals while sharing only what you explicitly approve.",
    icon: Users
  }
];

const productCategories = [
  { name: "MMFs", icon: WalletCards, note: "Yield, withdrawal timing, fund manager checks." },
  { name: "Treasury bills", icon: Landmark, note: "Auction calendar, maturity, discount pricing." },
  { name: "SACCOs", icon: Users, note: "Share capital, deposits, governance, liquidity." },
  { name: "Chamas", icon: ClipboardCheck, note: "Member rules, record keeping, contribution discipline." },
  { name: "NSE stocks", icon: BookOpen, note: "Volatility, broker checks, diversification basics." },
  { name: "US stocks/ETFs", icon: Globe2, note: "FX costs, offshore brokerage, tax considerations." },
  { name: "Land", icon: Map, note: "Title search, survey checks, legal review." },
  { name: "Bitcoin/crypto risk", icon: ShieldAlert, note: "Volatility, custody, scams, regulatory caution." }
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
      <section className="relative min-h-[88vh] overflow-hidden bg-primaryDark text-white">
        <Image
          src="/hero-workspace.png"
          alt="Kenyan personal finance planning workspace"
          fill
          priority
          className="object-cover object-center opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,27,51,0.94),rgba(11,27,51,0.76)_52%,rgba(11,27,51,0.38))]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-black">
            <Route className="h-6 w-6 text-emerald" aria-hidden />
            PesaRoute
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/82 sm:flex">
            <a href="#features">Features</a>
            <Link href="/product-passports">Passports</Link>
            <Link href="/professional/dashboard">Professionals</Link>
            <Link href="/provider/dashboard">Providers</Link>
            <a href="#privacy">Privacy</a>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-[1.06fr_0.94fr] lg:pt-16">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-primary px-4 py-2 text-sm font-bold text-white shadow-button">
              <BadgeCheck className="h-4 w-4" aria-hidden />
              Kenya-first investment clarity
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
              Understand your investment route before you move your money.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/88 sm:text-xl">
              PesaRoute helps Kenyans learn, compare, simulate, journal, and get verified professional guidance before
              investing.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="#amount" className="bg-white text-primaryDark hover:bg-surfaceAlt">
                Start with my amount
                <ArrowRight className="h-5 w-5" aria-hidden />
              </PrimaryButton>
              <PrimaryButton href="/product-passports" className="bg-emerald text-primaryDark hover:bg-white">
                Explore product passports
              </PrimaryButton>
            </div>
          </div>

          <div id="amount" className="self-end rounded-[24px] border border-white/14 bg-surface p-5 text-textPrimary shadow-card">
            <h2 className="text-xl font-black">Choose a starting point</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Use a range first. PesaRoute does not need exact balances for learning flows.
            </p>
            <div className="mt-5">
              <AmountRangeSelector ranges={amountRanges} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {goals.map((goal, index) => (
                <GoalChip active={index === 1} key={goal}>
                  {goal}
                </GoalChip>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2">
          {trustPromises.map((promise) => (
            <TrustBadge tone="emerald" key={promise}>
              {promise}
            </TrustBadge>
          ))}
        </div>
      </section>

      <PageShell>
        <section className="grid gap-8 py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader
            eyebrow="The problem"
            title="Kenyans have more options than ever, but decision clarity is still hard to find."
            body="PesaRoute is built for the moment before action: when a user needs to understand the route, risks, documents, liquidity, and red flags before sending money anywhere."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {problemPoints.map((point) => (
              <PremiumCard key={point}>
                <p className="text-sm leading-6 text-textSecondary">{point}</p>
              </PremiumCard>
            ))}
          </div>
        </section>
      </PageShell>

      <section id="features" className="bg-surface px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="MVP flows"
            title="Learn, compare, simulate, journal, and ask for scoped review."
            body="The foundation stays simple: education first, privacy by default, no investment execution."
          />
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <SimulatorCard body={feature.body} icon={feature.icon} key={feature.title} title={feature.title} />
            ))}
          </div>
        </div>
      </section>

      <PageShell>
        <section className="py-10">
          <SectionHeader
            eyebrow="Product categories"
            title="Kenyan routes, global routes, and high-risk areas in one learning map."
            body="Each category is framed as educational information with risk, liquidity, regulator, document, and disclosure context."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {productCategories.map((category) => (
              <PremiumCard key={category.name}>
                <category.icon className="h-6 w-6 text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-black">{category.name}</h3>
                <p className="mt-2 text-sm leading-6 text-textSecondary">{category.note}</p>
              </PremiumCard>
            ))}
          </div>
        </section>
      </PageShell>

      <section className="bg-primaryDark px-5 py-16 text-white sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald">Professional marketplace</p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              When you need human guidance, request review from verified professionals.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/76">
              Users choose what to share, professionals see limited qualified context first, and private details stay
              hidden unless a scoped grant allows them.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="/professional/dashboard" className="bg-white text-primaryDark hover:bg-surfaceAlt">
                Professional portal
              </PrimaryButton>
              <PrimaryButton href="/provider/dashboard" className="bg-emerald text-primaryDark hover:bg-white">
                Provider portal
              </PrimaryButton>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Limited view until user grants access.",
              "Exact values remain hidden by default.",
              "Access expires automatically.",
              "Professionals respond without asking for credentials."
            ].map((item) => (
              <PrivacyPromiseCard icon={LockKeyhole} key={item} text={item} />
            ))}
          </div>
        </div>
      </section>

      <section id="privacy" className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <SectionHeader
            eyebrow="Privacy"
            title="A trust model that is part of the product, not fine print."
            body="PesaRoute does not ask for payment PINs, bank passwords, broker credentials, or MMF credentials. Users can plan with ranges, hide exact totals, and revoke professional access."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "We do not hold or execute investments.",
              "Users control what professionals see.",
              "Data grants are scoped and time-limited.",
              "Hidden and range modes avoid exposing exact values."
            ].map((promise) => (
              <PrivacyPromiseCard icon={ClipboardCheck} key={promise} text={promise} />
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-surface px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Pricing placeholder"
            title="Prepared for monetization, without payment integrations yet."
            body="Billing and entitlements can be tested in development, but M-Pesa, cards, payouts, and provider billing are intentionally not connected."
          />
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <PremiumCard key={plan.name}>
                <h3 className="text-lg font-black">{plan.name}</h3>
                <p className="mt-2 text-2xl font-black text-primary">{plan.price}</p>
                <p className="mt-3 text-sm leading-6 text-textSecondary">{plan.body}</p>
              </PremiumCard>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-10 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 text-sm leading-6 text-textSecondary md:grid-cols-[0.9fr_1.1fr]">
          <p className="font-black text-textPrimary">PesaRoute</p>
          <p>
            Educational information only. PesaRoute does not provide investment execution, custody, guaranteed returns,
            M-Pesa services, bank account linking, or broker account linking. Verify with providers, regulators, and
            licensed professionals before acting.
          </p>
        </div>
      </footer>
    </AppShell>
  );
}
