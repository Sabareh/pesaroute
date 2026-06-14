import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Calculator,
  ClipboardCheck,
  LockKeyhole,
  Route,
  ShieldAlert,
  WalletCards
} from "lucide-react";

const features = [
  {
    title: "Learn Kenyan options",
    body: "Understand MMFs, Treasury bills, SACCOs, NSE shares, land, pensions, and global routes in plain language.",
    icon: BookOpen
  },
  {
    title: "Run educational simulations",
    body: "Model MMF, T-bill, SACCO, and offshore route scenarios without promises or investment execution.",
    icon: Calculator
  },
  {
    title: "Check red flags",
    body: "Spot phrases like guaranteed return, recruit people, and double your money before sending funds anywhere.",
    icon: ShieldAlert
  },
  {
    title: "Mirror privately",
    body: "Track exact values, rounded values, ranges, or hidden amounts while keeping everything private by default.",
    icon: LockKeyhole
  }
];

const routes = ["Money Market Funds", "Treasury Bills", "SACCOs", "NSE Stocks", "US ETFs", "Land due diligence"];

export default function HomePage() {
  return (
    <main>
      <section className="relative min-h-[86vh] overflow-hidden bg-ink text-white">
        <Image
          src="/hero-workspace.png"
          alt="Kenyan personal finance planning workspace"
          fill
          priority
          className="object-cover object-center opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,34,29,0.92),rgba(21,34,29,0.66)_42%,rgba(21,34,29,0.18))]" />
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Route className="h-6 w-6 text-sunrise" aria-hidden />
            PesaRoute
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/82 sm:flex">
            <Link href="/product-passports">Passports</Link>
            <a href="#features">Features</a>
            <a href="#privacy">Privacy</a>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 border border-white/24 bg-white/10 px-3 py-2 text-sm text-white/84 backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-sunrise" aria-hidden />
              Kenya-first. Privacy-first. Education-first.
            </p>
            <h1 className="max-w-2xl text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">PesaRoute</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/88 sm:text-xl">
              Compare routes from KES, M-Pesa, or bank money into investment categories, run educational simulations,
              check scam red flags, and keep your own investment journal.
            </p>

            <div className="mt-8 max-w-xl border border-white/24 bg-white/12 p-3 shadow-soft backdrop-blur">
              <label htmlFor="hero-amount" className="sr-only">
                Amount in Kenyan shillings
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex min-h-14 flex-1 items-center gap-3 bg-white px-4 text-ink">
                  <WalletCards className="h-5 w-5 text-leaf" aria-hidden />
                  <span className="text-sm font-semibold">I have KES</span>
                  <input
                    id="hero-amount"
                    inputMode="numeric"
                    placeholder="50,000"
                    className="min-w-0 flex-1 border-0 bg-transparent text-lg font-bold outline-none placeholder:text-ink/42"
                  />
                </div>
                <button className="inline-flex min-h-14 items-center justify-center gap-2 bg-sunrise px-5 font-bold text-ink transition hover:bg-white">
                  Compare options
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/78">
              We do not hold your money, execute investments, connect financial accounts, ask for bank passwords, or ask for
              your M-Pesa PIN.
            </p>
          </div>

          <div className="self-end">
            <div className="grid gap-3 sm:grid-cols-2">
              {routes.map((route) => (
                <Link
                  href="/product-passports"
                  key={route}
                  className="border border-white/18 bg-white/12 p-4 text-sm font-semibold text-white backdrop-blur transition hover:border-sunrise hover:bg-white/18"
                >
                  {route}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#fbfdf9] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-clay">MVP foundation</p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">A decision platform, not an execution app.</h2>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                <feature.icon className="h-7 w-7 text-leaf" aria-hidden />
                <h3 className="mt-5 text-lg font-black">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/72">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="privacy" className="bg-mint px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-leaf">Trust model</p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Private by default, explicit by design.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Use ranges instead of exact amounts.",
              "Professional sharing is future, explicit, time-limited, and revocable.",
              "Sensitive actions create audit events.",
              "Scam checks are educational and deterministic first."
            ].map((promise) => (
              <div key={promise} className="flex gap-3 rounded-lg bg-white p-4">
                <ClipboardCheck className="mt-1 h-5 w-5 flex-none text-leaf" aria-hidden />
                <p className="text-sm font-semibold leading-6 text-ink/78">{promise}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-y border-ink/12 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-black">Join the first PesaRoute waitlist.</h2>
            <p className="mt-2 max-w-2xl text-ink/68">
              The first release focuses on learning, comparison, simulation, journaling, mirroring, and scam red flags.
            </p>
          </div>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-5 font-bold text-white transition hover:bg-leaf">
            Request early access
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </section>
    </main>
  );
}
