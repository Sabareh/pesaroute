"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Calculator,
  Clock,
  FileSearch,
  Globe2,
  Landmark,
  Lock,
  LockKeyhole,
  Map as MapIcon,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
  X
} from "lucide-react";

import { useAuth } from "./lib/auth";
import { SignInModal } from "./learn/ui";

// The landing page is a fixed-light marketing page (it renders standalone, with
// AppFrame chrome suppressed on "/"), so it uses the design's literal palette
// rather than theme-aware tokens — it looks identical regardless of dark mode.
const ACCENT = "#1A6B45";
const NAVY = "#10182B";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Simulate", href: "/simulate" },
  { label: "Learning", href: "/learn" },
  { label: "Professionals", href: "/professional/dashboard" }
];

const AMOUNT_RANGES = ["KES 1k-5k", "KES 5k-20k", "KES 20k-100k", "KES 100k+"];
const GOALS = ["First investment", "Emergency fund", "SACCO / chama", "Land", "Scam check"];

const FX_RATES = [
  { pair: "USD/KES", value: "129.45", up: false, pct: "0.12%" },
  { pair: "EUR/KES", value: "140.20", up: true, pct: "0.34%" },
  { pair: "GBP/KES", value: "164.80", up: true, pct: "0.21%" },
  { pair: "AED/KES", value: "35.24", up: false, pct: "0.08%" },
  { pair: "ZAR/KES", value: "7.12", up: false, pct: "0.18%" },
  { pair: "CNY/KES", value: "17.91", up: true, pct: "0.06%" },
  { pair: "JPY/KES", value: "0.872", up: true, pct: "0.11%" },
  { pair: "USD/UGX", value: "3,712", up: false, pct: "0.05%" }
];

const LEARNING_STEPS = [
  ["Step 1", "Short lesson", "Plain-language examples using KES, risk, liquidity, fees, and provider checks."],
  ["Step 2", "Practice", "Quiz and flashcard prompts reward understanding, not risky money movement."],
  ["Step 3", "Simulator", "MMF, T-bill, SACCO, and global-route estimates connect back to the lesson."],
  ["Step 4", "Private journal", "Save a reflection with exact, rounded, range, or hidden amount modes."],
  ["Step 5", "Progress", "XP, streaks, badges, and library views show what to continue next."],
  ["Step 6", "Scoped review", "Advanced lessons can lead to professional review without exposing private details."]
];

type Tile = { title: string; body: string; Icon: typeof Route; tileBg: string; tileColor: string };

const FEATURES: Tile[] = [
  { title: "Route engine", body: "Start with an amount range and goal, then learn what to compare, avoid, and ask.", Icon: Route, tileBg: "rgba(26,107,69,0.12)", tileColor: ACCENT },
  { title: "Product passports", body: "Scan educational profiles for MMFs, T-bills, SACCOs, chamas, global routes, and land.", Icon: FileSearch, tileBg: "rgba(36,122,196,0.12)", tileColor: "#247AC4" },
  { title: "Simulators", body: "Run calm local scenarios for MMFs, T-bills, SACCOs, and global routes before acting.", Icon: Calculator, tileBg: "rgba(26,107,69,0.12)", tileColor: ACCENT },
  { title: "Scam checker", body: "Paste suspicious pitches and review deterministic red flags before sending money.", Icon: ShieldAlert, tileBg: "rgba(141,106,46,0.14)", tileColor: "#8D6A2E" },
  { title: "Private journal", body: "Save decisions with exact, rounded, range, or hidden amount modes.", Icon: LockKeyhole, tileBg: "rgba(109,91,170,0.14)", tileColor: "#6D5BAA" },
  { title: "Professional review", body: "Request scoped review from verified professionals, sharing only what you approve.", Icon: Users, tileBg: "rgba(26,107,69,0.12)", tileColor: ACCENT }
];

const PASSPORTS: Tile[] = [
  { title: "MMFs", body: "Yield, withdrawal timing, fund-manager checks.", Icon: WalletCards, tileBg: "rgba(26,107,69,0.12)", tileColor: ACCENT },
  { title: "Treasury bills", body: "Auction calendar, maturity, discount pricing.", Icon: Landmark, tileBg: "rgba(26,107,69,0.12)", tileColor: ACCENT },
  { title: "SACCOs", body: "Share capital, deposits, governance, liquidity.", Icon: Users, tileBg: "rgba(26,107,69,0.12)", tileColor: ACCENT },
  { title: "Chamas", body: "Member rules, records, contribution discipline.", Icon: Building2, tileBg: "rgba(26,107,69,0.12)", tileColor: ACCENT },
  { title: "NSE stocks", body: "Volatility, broker checks, diversification basics.", Icon: TrendingUp, tileBg: "rgba(26,107,69,0.12)", tileColor: ACCENT },
  { title: "US stocks / ETFs", body: "FX costs, offshore brokerage, tax considerations.", Icon: Globe2, tileBg: "rgba(36,122,196,0.12)", tileColor: "#247AC4" },
  { title: "Land", body: "Title search, survey checks, legal review.", Icon: MapIcon, tileBg: "rgba(141,106,46,0.14)", tileColor: "#8D6A2E" },
  { title: "Crypto risk", body: "Volatility, custody, scams, regulatory caution.", Icon: ShieldAlert, tileBg: "rgba(163,59,50,0.12)", tileColor: "#A33B32" }
];

const PRIVACY: Array<[typeof Route, string, string]> = [
  [ShieldCheck, "Ranges, not balances", "The core learning flow never needs your exact amount."],
  [Lock, "Scoped notes", "Private journal entries stay yours until you choose to share."],
  [Clock, "Expiring access", "Professional access revokes automatically when it's no longer needed."],
  [X, "No credentials", "We never ask for M-Pesa PINs, bank, or broker logins."]
];

export default function HomePage() {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();
  const [amount, setAmount] = useState("KES 5k-20k");
  const [goal, setGoal] = useState("First investment");
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F5F0] text-[#11110F] antialiased">
      {/* ===================== NAV ===================== */}
      <header className="sticky top-0 z-50" style={{ background: ACCENT }}>
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center gap-4 px-5 sm:px-7">
          <Link href="/" className="text-lg font-semibold tracking-[-0.015em] text-white">
            PesaRoute
          </Link>
          <nav className="ml-1 hidden items-center gap-0.5 rounded-full border border-white/20 bg-white/[0.14] p-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = link.label === "Home";
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${
                    active ? "bg-white font-semibold" : "font-medium text-white/[0.86] hover:text-white"
                  }`}
                  style={active ? { color: ACCENT } : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <Link
              href="/marketplace/products"
              className="hidden min-w-[180px] items-center gap-2 rounded-full border border-white/20 bg-white/[0.12] px-3.5 py-2 text-[13px] text-white/[0.86] transition hover:bg-white/20 sm:flex"
            >
              <Search className="h-4 w-4" aria-hidden />
              Search products
            </Link>
            {ready && isAuthenticated ? (
              <Link href="/learn" className="rounded-full bg-white px-[18px] py-2.5 text-[13px] font-semibold" style={{ color: ACCENT }}>
                Dashboard
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="rounded-full bg-white px-[18px] py-2.5 text-[13px] font-semibold"
                style={{ color: ACCENT }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
        {/* FX ticker (indicative) */}
        <div className="relative border-t border-white/[0.08]" style={{ background: NAVY }}>
          <div
            className="absolute left-0 top-0 bottom-0 z-[2] flex items-center gap-2 pl-[18px] pr-4"
            style={{ background: `linear-gradient(90deg, ${NAVY} 72%, rgba(16,24,43,0))` }}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#EDF1F8]/[0.62]">FX · indicative</span>
          </div>
          <div className="fx-ticker-mask overflow-hidden">
            <div className="fx-ticker-track py-[9px]">
              {[...FX_RATES, ...FX_RATES].map((fx, i) => (
                <span key={i} className="inline-flex items-center gap-[7px] px-[22px] text-[13px]">
                  <span className="font-semibold text-[#EDF1F8]">{fx.pair}</span>
                  <span className="font-mono text-[#EDF1F8]/[0.78]">{fx.value}</span>
                  <span className="font-semibold" style={{ color: fx.up ? "#2FB46E" : "#E2685E" }}>
                    {fx.up ? "▲" : "▼"} {fx.pct}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="mx-auto max-w-[1200px] px-5 pt-7 sm:px-7">
        <div className="flex flex-col overflow-hidden rounded-[22px] border border-[rgba(17,17,15,0.06)] shadow-[0_16px_40px_rgba(17,17,15,0.08)] lg:flex-row">
          {/* left emerald pitch */}
          <div
            className="relative flex flex-col justify-center overflow-hidden px-8 py-12 sm:px-12 sm:py-[60px] lg:flex-[1.06]"
            style={{ background: "linear-gradient(150deg,#1A6B45 0%,#11472E 100%)" }}
          >
            <svg viewBox="0 0 220 220" className="pointer-events-none absolute -bottom-11 -right-9 h-[360px] w-[360px] opacity-[0.15]" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="40" cy="110" r="9" fill="#fff" stroke="none" />
              <path d="M49 110 C 100 110, 110 40, 168 40" />
              <path d="M49 110 C 100 110, 110 92, 168 92" />
              <path d="M49 110 C 100 110, 110 144, 168 144" />
              <path d="M49 110 C 100 110, 110 196, 168 196" />
              <circle cx="178" cy="40" r="11" />
              <circle cx="178" cy="92" r="11" />
              <circle cx="178" cy="144" r="11" />
              <circle cx="178" cy="196" r="11" />
            </svg>
            <div className="relative">
              <span className="inline-flex items-center gap-[7px] rounded-full border border-white/[0.26] bg-white/[0.16] px-[13px] py-1.5 text-xs font-semibold text-white">
                Kenya-first investment clarity
              </span>
              <h1 className="mt-6 text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] text-white sm:text-[46px]">
                Understand your route before you move your money.
              </h1>
              <p className="mt-[18px] max-w-[430px] text-[17px] leading-[1.55] text-white/[0.86]">
                Learn, compare, simulate, and journal before you invest, with verified professional review whenever you
                want a second set of eyes.
              </p>
              <div className="mt-7 flex items-center gap-[18px]">
                <span className="text-[13px] font-medium text-white/[0.84]">✓ Plan with ranges</span>
                <span className="text-[13px] font-medium text-white/[0.84]">✓ Private by default</span>
              </div>
            </div>
          </div>
          {/* right product entry */}
          <div className="flex flex-col justify-center bg-white px-7 py-10 sm:px-[42px] sm:py-12 lg:flex-[0.94]">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#85827A]">Start in two taps</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">How much are you planning?</h2>
            <div className="mt-[18px] grid grid-cols-2 gap-2.5">
              {AMOUNT_RANGES.map((range) => {
                const active = range === amount;
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setAmount(range)}
                    className={`rounded-xl border px-3.5 py-3.5 text-left text-sm font-semibold transition ${
                      active ? "text-white" : "border-[rgba(17,17,15,0.12)] bg-white text-[#11110F] hover:border-[rgba(17,17,15,0.22)]"
                    }`}
                    style={active ? { background: ACCENT, borderColor: ACCENT } : undefined}
                  >
                    {range}
                  </button>
                );
              })}
            </div>
            <p className="mt-[22px] text-[13px] font-semibold text-[#5B5A55]">…and your goal</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {GOALS.map((g) => {
                const active = g === goal;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                      active ? "text-white" : "border border-[rgba(17,17,15,0.12)] bg-white text-[#5B5A55] hover:border-[rgba(17,17,15,0.22)]"
                    }`}
                    style={active ? { background: ACCENT } : undefined}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => router.push("/marketplace/finder")}
              className="mt-[26px] inline-flex items-center justify-center gap-2 rounded-full px-[22px] py-[15px] text-[15px] font-semibold text-white transition hover:opacity-95"
              style={{ background: NAVY }}
            >
              See my route <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </section>

      {/* ===================== CLARITY ===================== */}
      <section className="mx-auto max-w-[1200px] px-5 pt-[72px] sm:px-7">
        <div className="grid items-center gap-12 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#85827A]">The moment before action</p>
            <h2 className="mt-3.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-4xl">Decision clarity, without moving money.</h2>
            <p className="mt-4 text-base leading-[1.6] text-[#5B5A55]">
              PesaRoute is built for the quiet step before you send money anywhere: understand the route, the risks,
              liquidity, documents, fees, and red flags, first.
            </p>
          </div>
          <figure className="m-0 overflow-hidden rounded-2xl border border-[rgba(17,17,15,0.08)] bg-white shadow-[0_16px_40px_rgba(17,17,15,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/route-planning-phone.jpg" alt="A phone beside a notebook and Kenyan shillings, private route planning before sending money." className="block aspect-[16/9] w-full object-cover" />
            <figcaption className="border-t border-[rgba(17,17,15,0.08)] px-4 py-[13px] text-[13px] leading-[1.5] text-[#5B5A55]">
              PesaRoute keeps the planning step separate from the money-movement step.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ===================== LEARNING LOOP ===================== */}
      <section className="mx-auto max-w-[1200px] px-5 pt-[72px] sm:px-7">
        <div className="grid items-start gap-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#85827A]">Learning engine</p>
            <h2 className="mt-3.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-4xl">One guided journey, not separate tools.</h2>
            <p className="mt-4 text-base leading-[1.6] text-[#5B5A55]">
              Start a track, finish a short lesson, practice, run a relevant simulator, save a private reflection, then
              review progress before asking for professional help.
            </p>
            <Link href="/learn" className="mt-6 inline-flex items-center gap-2 rounded-full px-[22px] py-[13px] text-[15px] font-semibold text-white" style={{ background: ACCENT }}>
              View learning dashboard <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {LEARNING_STEPS.map(([step, title, body]) => (
              <div key={step} className="rounded-2xl border border-[rgba(17,17,15,0.1)] bg-white p-5 shadow-[0_1px_0_rgba(17,17,15,0.04)]">
                <p className="text-xs font-semibold uppercase tracking-[0.05em]" style={{ color: ACCENT }}>{step}</p>
                <h3 className="mt-2.5 text-lg font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 text-sm leading-[1.55] text-[#5B5A55]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="mt-[72px] bg-white px-5 py-[72px] sm:px-7">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#85827A]">MVP flows</p>
          <h2 className="mt-3.5 max-w-[680px] text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-4xl">
            Learn, compare, simulate, journal, and request scoped review.
          </h2>
          <p className="mt-4 max-w-[620px] text-base leading-[1.6] text-[#5B5A55]">
            Every flow stays educational. PesaRoute never executes investments, holds funds, or asks for financial
            account credentials.
          </p>
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ title, body, Icon, tileBg, tileColor }) => (
              <div key={title} className="pr-card-hover rounded-2xl border border-[rgba(17,17,15,0.1)] bg-white p-[22px] shadow-[0_1px_0_rgba(17,17,15,0.04)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: tileBg, color: tileColor }}>
                  <Icon className="h-[22px] w-[22px]" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 text-sm leading-[1.55] text-[#5B5A55]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== PASSPORTS ===================== */}
      <section className="mx-auto max-w-[1200px] px-5 pt-[72px] sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#85827A]">Product passports</p>
        <h2 className="mt-3.5 max-w-[680px] text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-4xl">
          Clean educational cards for local and global routes.
        </h2>
        <p className="mt-4 max-w-[620px] text-base leading-[1.6] text-[#5B5A55]">
          Each passport explains risk, liquidity, regulator context, beginner mistakes, documents, and the external route.
        </p>
        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PASSPORTS.map(({ title, body, Icon, tileBg, tileColor }) => (
            <div key={title} className="pr-card-hover rounded-2xl border border-[rgba(17,17,15,0.1)] bg-white p-5 shadow-[0_1px_0_rgba(17,17,15,0.04)]">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px]" style={{ background: tileBg, color: tileColor }}>
                <Icon className="h-[19px] w-[19px]" aria-hidden />
              </span>
              <h3 className="mt-3.5 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-[1.5] text-[#5B5A55]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== PROFESSIONAL MARKETPLACE ===================== */}
      <section className="mx-auto max-w-[1200px] px-5 pt-[72px] sm:px-7">
        <div className="relative overflow-hidden rounded-[22px] px-8 py-12 sm:px-12 sm:py-[52px]" style={{ background: NAVY }}>
          <svg viewBox="0 0 200 200" className="pointer-events-none absolute right-[-20px] top-1/2 h-[300px] w-[300px] -translate-y-1/2 opacity-[0.14]" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="100" cy="100" r="64" />
            <circle cx="100" cy="100" r="40" />
            <path d="M100 36a64 64 0 0 1 64 64" />
            <path d="M150 70l16 26-30 6" />
          </svg>
          <div className="relative max-w-[560px]">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#EDF1F8]/[0.55]">Professional marketplace</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-[1.12] tracking-[-0.025em] text-[#EDF1F8] sm:text-[32px]">
              Human review, with private data hidden by default.
            </h2>
            <p className="mt-3.5 text-base leading-[1.6] text-[#EDF1F8]/[0.72]">
              You choose what to share, professionals see limited qualified context first, and access expires automatically.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/professional/dashboard" className="rounded-full bg-white px-5 py-3 text-sm font-semibold" style={{ color: NAVY }}>
                Professional portal
              </Link>
              <Link href="/provider/dashboard" className="rounded-full border border-white/[0.18] bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.16]">
                Provider portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PRIVACY ===================== */}
      <section className="mx-auto max-w-[1200px] px-5 pt-[72px] sm:px-7">
        <div className="grid items-center gap-12 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#85827A]">Privacy</p>
            <h2 className="mt-3.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-4xl">Trust rules you understand before you sign up.</h2>
            <p className="mt-4 text-base leading-[1.6] text-[#5B5A55]">
              Plan with ranges, keep private notes scoped, and revoke professional access the moment sharing is no longer
              needed.
            </p>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {PRIVACY.map(([Icon, title, body]) => (
              <div key={title} className="flex items-start gap-[13px] rounded-2xl border border-[rgba(17,17,15,0.1)] bg-white p-5 shadow-[0_1px_0_rgba(17,17,15,0.04)]">
                <span className="shrink-0" style={{ color: ACCENT }}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-[1.5] text-[#5B5A55]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section className="mt-[72px] bg-white px-5 py-[72px] sm:px-7">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#85827A]">Pricing foundation</p>
          <h2 className="mt-3.5 max-w-[680px] text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-4xl">
            Checkout preparation, without investment payment rails.
          </h2>
          <p className="mt-4 max-w-[640px] text-base leading-[1.6] text-[#5B5A55]">
            M-Pesa checkout is only for PesaRoute subscriptions, learning packs, and future review fees, never for
            investment execution.
          </p>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-[rgba(17,17,15,0.1)] bg-white p-[26px] shadow-[0_1px_0_rgba(17,17,15,0.04)]">
              <h3 className="text-lg font-semibold">Free</h3>
              <p className="mt-3 text-[30px] font-semibold tracking-[-0.02em]">KES 0</p>
              <p className="mt-3 flex-1 text-sm leading-[1.55] text-[#5B5A55]">Learning routes, public passports, basic simulations, scam red flags, and private planning.</p>
              <Link href="/learn" className="mt-[22px] inline-flex items-center justify-center rounded-full border border-[rgba(17,17,15,0.12)] bg-white px-3 py-3 text-sm font-semibold text-[#11110F] transition hover:border-[rgba(17,17,15,0.22)]">
                Get started
              </Link>
            </div>
            {/* Premium */}
            <div className="relative flex flex-col rounded-2xl bg-white p-[26px] shadow-[0_16px_40px_rgba(17,17,15,0.08)]" style={{ border: `1.5px solid ${ACCENT}` }}>
              <span className="absolute -top-[11px] left-[26px] rounded-full px-[11px] py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-white" style={{ background: ACCENT }}>
                Most popular
              </span>
              <h3 className="text-lg font-semibold">Premium</h3>
              <p className="mt-3 text-[30px] font-semibold tracking-[-0.02em]">
                KES 300<span className="text-[15px] font-medium text-[#85827A]">/mo</span>
              </p>
              <p className="mt-3 flex-1 text-sm leading-[1.55] text-[#5B5A55]">Unlimited simulations, deeper portfolio mirror, advanced routes, and priority review placeholders.</p>
              <Link href="/pricing" className="mt-[22px] inline-flex items-center justify-center rounded-full px-3 py-3 text-sm font-semibold text-white" style={{ background: ACCENT }}>
                Go Premium
              </Link>
            </div>
            {/* Professional */}
            <div className="flex flex-col rounded-2xl border border-[rgba(17,17,15,0.1)] bg-white p-[26px] shadow-[0_1px_0_rgba(17,17,15,0.04)]">
              <h3 className="text-lg font-semibold">Professional</h3>
              <p className="mt-3 text-[30px] font-semibold tracking-[-0.02em]">Plan TBA</p>
              <p className="mt-3 flex-1 text-sm leading-[1.55] text-[#5B5A55]">Verified profile tools, qualified leads, and professional dashboard subscriptions later.</p>
              <Link href="/professional/dashboard" className="mt-[22px] inline-flex items-center justify-center rounded-full border border-[rgba(17,17,15,0.12)] bg-white px-3 py-3 text-sm font-semibold text-[#11110F] transition hover:border-[rgba(17,17,15,0.22)]">
                Join waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-[rgba(17,17,15,0.1)] bg-[#F6F5F0]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-[18px] px-5 py-8 sm:px-7">
          <span className="text-base font-semibold text-[#11110F]">PesaRoute</span>
          <span className="text-[13px] text-[#85827A]">Educational only. PesaRoute does not hold money or give advice.</span>
          <Link href="/terms" className="ml-auto text-sm font-medium text-[#5B5A55] transition hover:text-[#11110F]">
            Terms &amp; Conditions
          </Link>
        </div>
      </footer>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
