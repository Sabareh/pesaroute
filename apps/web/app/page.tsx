"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown, LineChart, Lock, Play, ShieldCheck, UserRound } from "lucide-react";

import { useAuth } from "./lib/auth";
import { SignInModal } from "./learn/ui";

// The homepage is a fixed-light marketing surface — it renders standalone (AppFrame
// chrome is suppressed on "/"), so it uses the design's literal palette rather than
// theme-aware tokens and looks identical regardless of dark mode. Per the handoff
// "hybrid" decision: the app's brand tokens for colour, Manrope for type.
const FONT =
  "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const ACCENT = "#1A6B45"; // --c-primary
const NAVY = "#10182B"; // --c-surfaceInk (the one dark, reused for band + footer)
const INK = "#11110F"; // --c-ink
const INK2 = "#5B5A55"; // --c-ink2
const INK3 = "#85827A"; // --c-ink3
const WARN = "#8D6A2E"; // --c-warning (clay)
const INFO = "#247AC4"; // --c-info

const NAV_LINKS: Array<[string, string, boolean]> = [
  ["Learn", "/learn", true],
  ["Simulate", "/simulate", false],
  ["Markets", "/marketplace", true],
  ["Resources", "/land-decision-safety", true],
  ["Pricing", "/pricing", false]
];

const STATS: Array<[string, string]> = [
  ["40+", "Real products to simulate"],
  ["0 KES", "At risk — fully virtual"],
  ["6 steps", "Learn → simulate → invest"],
  ["100%", "Source-linked, no PINs"]
];

const PILLARS: Array<{ Icon: typeof ShieldCheck; title: string; body: string }> = [
  { Icon: ShieldCheck, title: "Trust", body: "Built on integrity — every figure is source-linked and we never rank a “best” product." },
  { Icon: Lock, title: "Safety", body: "Learn & practice with confidence — virtual money only, nothing real ever at risk." },
  { Icon: UserRound, title: "Privacy", body: "Your data, your control — we never ask for PINs and you choose exactly what to share." },
  { Icon: LineChart, title: "Better decisions", body: "Knowledge today, freedom tomorrow — compare options before you commit real money." }
];

const STEPS: Array<[string, string, string]> = [
  ["01", "Learn", "Short, plain-language lessons on MMFs, T-bills, SACCOs and more."],
  ["02", "Simulate", "Project real returns with live rates — drag the inputs, watch it grow."],
  ["03", "Compare", "Weigh products and even land side by side — net of costs and risk."],
  ["04", "Invest better", "Act with a plan, or get scoped review from a verified professional."]
];

// TODO(api): replace with the live marketplace rates feed (see docs/api.md) — these
// figures are illustrative placeholders for layout, not real quoted rates.
const MARKETS: Array<{
  kind: string;
  name: string;
  badge: string;
  badgeTone: "green" | "clay";
  rate: string;
  sub: string;
  spark: string;
}> = [
  { kind: "Money Market Fund", name: "Sanlam MMF", badge: "Fresh", badgeTone: "green", rate: "12.1%", sub: "net annual yield", spark: "M0 24 L15 25 L30 18 L45 20 L60 12 L75 14 L90 6" },
  { kind: "Treasury Bill", name: "91-Day T-Bill", badge: "Official", badgeTone: "green", rate: "16.0%", sub: "discount rate", spark: "M0 26 L15 20 L30 22 L45 14 L60 12 L75 8 L90 4" },
  { kind: "SACCO", name: "Stima Sacco", badge: "Est.", badgeTone: "clay", rate: "10.5%", sub: "dividend est.", spark: "M0 20 L15 22 L30 16 L45 18 L60 14 L75 16 L90 10" }
];

const ALLOCATION: Array<[string, string, string]> = [
  ["Equities", "60%", ACCENT],
  ["Bonds", "25%", INFO],
  ["Money Market", "10%", WARN],
  ["Cash", "5%", "#C9D2DC"]
];

const FOOTER_COLS: Array<{ title: string; links: Array<[string, string]> }> = [
  { title: "Product", links: [["Learn", "/learn"], ["Simulate", "/simulate"], ["Marketplace", "/marketplace"], ["Land", "/land-decision-safety"], ["Professionals", "/professional/dashboard"]] },
  { title: "Company", links: [["About", "/"], ["Trust & safety", "/land/before-you-pay"], ["Pricing", "/pricing"], ["Contact", "/professional/dashboard"]] },
  { title: "Legal", links: [["Terms", "/terms"], ["Privacy", "/terms"], ["Disclosures", "/terms"]] }
];

function BrandMark({ inkColor, routeColor }: { inkColor: string; routeColor: string }) {
  // Shield + route + pin wordmark from the Homepage handoff, recoloured to app tokens.
  return (
    <svg width="32" height="37" viewBox="0 0 52 60" fill="none" aria-hidden>
      <path d="M26 4 L46 11 V30 C46 44 37 53 26 56 C15 53 6 44 6 30 V11 Z" fill="none" stroke={ACCENT} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M19 47 C19 39.5 33 40 33 31 C33 23.5 20 24.5 22.5 16.5" fill="none" stroke={routeColor} strokeWidth="6.6" strokeLinecap="round" />
      <path d="M14.5 49 L23 49 L21 41 L16.5 41 Z" fill={routeColor} />
      <circle cx="30.5" cy="15" r="4.6" fill={inkColor} stroke={ACCENT} strokeWidth="2.4" />
    </svg>
  );
}

export default function HomePage() {
  const { ready, isAuthenticated } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);

  const greenBtn =
    "inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#1A6B45] font-bold text-white transition-colors hover:bg-[#125436]";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: FONT, color: INK }}>
      {/* Manrope — loaded at runtime in the browser; falls back to the system stack
          if unavailable, so there is no build-time font dependency. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* ===================== NAV ===================== */}
      <header className="sticky top-0 z-50 border-b border-[rgba(17,17,15,0.08)] bg-white/[0.92] backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-[70px] max-w-[1200px] items-center gap-5 px-5 sm:px-8">
          <Link href="/" className="flex items-center" aria-label="PesaRoute — Learn. Simulate. Invest better.">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/pesaroute-logo.png" alt="PesaRoute" className="h-9 w-auto" />
          </Link>
          <nav className="ml-4 hidden items-center gap-[26px] lg:flex">
            {NAV_LINKS.map(([label, href, caret]) => (
              <Link
                key={label}
                href={href}
                className="inline-flex items-center gap-1 text-[14.5px] font-semibold transition-colors hover:text-[#1A6B45]"
                style={{ color: "#3C4858" }}
              >
                {label}
                {caret ? <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden /> : null}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            {ready && isAuthenticated ? (
              <Link href="/learn" className={`${greenBtn} px-5 py-[11px] text-[14.5px]`}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSignInOpen(true)}
                  className="whitespace-nowrap text-[14.5px] font-bold transition-colors hover:text-[#1A6B45]"
                  style={{ color: INK }}
                >
                  Log in
                </button>
                <Link href="/learn" className={`${greenBtn} whitespace-nowrap px-5 py-[11px] text-[14.5px]`}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section style={{ background: "linear-gradient(180deg,#F6F8F6 0%,#fff 70%)" }}>
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pb-20 pt-[60px] sm:px-8 lg:grid-cols-2 lg:gap-14 lg:pt-[72px]">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-[7px] text-[12.5px] font-bold uppercase tracking-[0.04em]"
              style={{ color: ACCENT, background: "rgba(26,107,69,0.10)" }}
            >
              Kenya-first investing, risk-free
            </span>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">
              Practice today.
              <br />
              <span style={{ color: ACCENT }}>Invest better</span> tomorrow.
            </h1>
            <p className="mt-5 max-w-[480px] text-[17px] leading-[1.6]" style={{ color: INK2 }}>
              Learn investing in a risk-free environment built for the Kenyan investor — simulate real products, compare
              routes, and grow your confidence before your money is on the line.
            </p>
            <div className="mt-[30px] flex flex-wrap items-center gap-3.5">
              <Link href="/learn" className={`${greenBtn} px-[26px] py-[15px] text-[16px]`}>
                Start Learning Free <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
              </Link>
              <Link
                href="/simulate"
                className="inline-flex items-center gap-2.5 rounded-[10px] border-[1.5px] border-[rgba(17,17,15,0.16)] bg-white px-[22px] py-[15px] text-[16px] font-bold transition-colors hover:border-[rgba(17,17,15,0.32)]"
                style={{ color: INK }}
              >
                <Play className="h-[18px] w-[18px]" aria-hidden />
                Watch demo
              </Link>
            </div>
            <div className="mt-[34px] flex flex-wrap gap-[22px]">
              <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold" style={{ color: "#3C4858" }}>
                <span className="flex h-4 w-6 flex-col overflow-hidden rounded-[3px]" aria-hidden>
                  <span className="flex-1 bg-black" />
                  <span className="flex-1" style={{ background: "#B5141B" }} />
                  <span className="flex-1" style={{ background: "#1A7A3D" }} />
                </span>
                Kenya-First
              </span>
              <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold" style={{ color: "#3C4858" }}>
                <Lock className="h-[17px] w-[17px]" style={{ color: ACCENT }} aria-hidden />
                Safe &amp; Private
              </span>
              <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold" style={{ color: "#3C4858" }}>
                <LineChart className="h-[17px] w-[17px]" style={{ color: ACCENT }} aria-hidden />
                Built for Better Decisions
              </span>
            </div>
          </div>

          {/* simulation card (illustrative) */}
          <div className="pr-card-hover rounded-[20px] border border-[rgba(17,17,15,0.08)] bg-white p-[26px] shadow-[0_24px_60px_rgba(17,17,15,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-bold">Portfolio Simulation</p>
                <p className="mt-[3px] text-[12.5px]" style={{ color: INK3 }}>
                  Virtual · risk-free
                </p>
              </div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[12px] font-bold"
                style={{ color: ACCENT, background: "rgba(26,107,69,0.10)" }}
              >
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: ACCENT }} />
                Live
              </span>
            </div>
            <p className="mt-5 text-[12.5px]" style={{ color: INK3 }}>
              Total Value (KES)
            </p>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-[36px] font-extrabold tracking-[-0.02em]">125,430</span>
              <span className="pb-[7px] text-[14px] font-bold" style={{ color: ACCENT }}>
                +8.45% <span className="font-semibold" style={{ color: INK3 }}>(1M)</span>
              </span>
            </div>
            <svg viewBox="0 0 440 120" preserveAspectRatio="none" className="mt-2.5 block h-[118px] w-full" aria-hidden>
              <defs>
                <linearGradient id="pr-home-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d="M0 96 L40 90 L80 98 L120 78 L160 84 L200 60 L240 68 L280 44 L320 52 L360 30 L400 36 L440 14 L440 120 L0 120 Z" fill="url(#pr-home-area)" />
              <path d="M0 96 L40 90 L80 98 L120 78 L160 84 L200 60 L240 68 L280 44 L320 52 L360 30 L400 36 L440 14" fill="none" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="440" cy="14" r="4" fill={ACCENT} />
            </svg>
            <div className="mt-4 border-t border-[rgba(17,17,15,0.08)] pt-[18px]">
              <p className="text-[13px] font-bold">
                Asset Allocation <span className="text-[11.5px] font-medium" style={{ color: INK3 }}>· Current mix</span>
              </p>
              <div className="mt-3.5 flex items-center gap-[22px]">
                <div className="relative h-[104px] w-[104px] flex-none">
                  <div
                    className="h-[104px] w-[104px] rounded-full"
                    style={{ background: `conic-gradient(${ACCENT} 0 60%, ${INFO} 60% 85%, ${WARN} 85% 95%, #C9D2DC 95% 100%)` }}
                  />
                  <div className="absolute inset-4 rounded-full bg-white" />
                </div>
                <div className="flex flex-1 flex-col gap-[9px]">
                  {ALLOCATION.map(([label, pct, color]) => (
                    <div key={label} className="flex items-center gap-[9px] text-[13px]">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
                      <span className="font-semibold">{label}</span>
                      <span className="ml-auto font-bold">{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== STAT STRIP ===================== */}
      <section className="border-y border-[rgba(17,17,15,0.07)] bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 px-5 py-[34px] sm:px-8 md:grid-cols-4">
          {STATS.map(([big, small]) => (
            <div key={small}>
              <p className="text-[30px] font-extrabold tracking-[-0.02em]">{big}</p>
              <p className="mt-[5px] text-[13.5px]" style={{ color: INK2 }}>
                {small}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== NAVY BAND ===================== */}
      <section className="relative overflow-hidden" style={{ background: NAVY }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/nairobi-skyline.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-bottom opacity-80"
        />
        {/* scrim darkens the left (copy) and stays clear on the right (skyline) */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(16,24,43,0.78) 0%, rgba(16,24,43,0.5) 38%, rgba(16,24,43,0.08) 68%, rgba(16,24,43,0) 100%)" }} aria-hidden />
        <div className="relative mx-auto max-w-[1200px] px-5 py-[76px] sm:px-8">
          <div className="max-w-[600px] text-left">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-white/50">Practice today · Invest tomorrow</p>
            <h2 className="mt-3.5 text-[34px] font-extrabold tracking-[-0.03em] text-white sm:text-[48px]">
              Learn<span style={{ color: ACCENT }}>.</span> Simulate<span style={{ color: ACCENT }}>.</span> Invest<span style={{ color: ACCENT }}>.</span> Grow<span style={{ color: ACCENT }}>.</span>
            </h2>
            <p className="mt-4 max-w-[520px] text-[17px] leading-[1.6] text-white/70">
              Build your investment knowledge and confidence through real market simulation — risk-free.
            </p>
            <Link href="/simulate" className={`${greenBtn} mt-7 px-7 py-[15px] text-[16px]`}>
              Start Simulating <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== PILLARS ===================== */}
      <section className="mx-auto max-w-[1200px] px-5 py-[84px] sm:px-8">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.1em]" style={{ color: ACCENT }}>
            Why PesaRoute
          </p>
          <h2 className="mt-3 text-[32px] font-extrabold tracking-[-0.025em] sm:text-[38px]">A calmer way to learn money</h2>
          <p className="mt-3.5 text-[16px] leading-[1.6]" style={{ color: INK2 }}>
            Built on four promises — so you can practice with total confidence and no pressure.
          </p>
        </div>
        <div className="mt-[46px] grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ Icon, title, body }) => (
            <div key={title} className="pr-card-hover rounded-[18px] border border-[rgba(17,17,15,0.1)] bg-white p-[26px]">
              <span className="flex h-12 w-12 items-center justify-center rounded-[13px]" style={{ background: "rgba(26,107,69,0.10)", color: ACCENT }}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-[18px] text-[17px] font-bold">{title}</h3>
              <p className="mt-[7px] text-[13.5px] leading-[1.55]" style={{ color: INK2 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="border-t border-[rgba(17,17,15,0.07)]" style={{ background: "#F6F8F6" }}>
        <div className="mx-auto max-w-[1200px] px-5 py-[84px] sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[12.5px] font-bold uppercase tracking-[0.1em]" style={{ color: ACCENT }}>
                The route
              </p>
              <h2 className="mt-3 text-[32px] font-extrabold tracking-[-0.025em] sm:text-[38px]">From curious to confident</h2>
            </div>
            <p className="max-w-[380px] text-[15.5px] leading-[1.6]" style={{ color: INK2 }}>
              A guided path that turns “where do I even start?” into a concrete plan you understand.
            </p>
          </div>
          <div className="mt-[46px] grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([num, title, body]) => (
              <div key={num} className="rounded-[18px] border border-[rgba(17,17,15,0.1)] bg-white p-6">
                <span className="text-[13px] font-extrabold" style={{ color: ACCENT }}>
                  {num}
                </span>
                <h3 className="mt-3 text-[17px] font-bold">{title}</h3>
                <p className="mt-[7px] text-[13.5px] leading-[1.55]" style={{ color: INK2 }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== MARKETS PREVIEW ===================== */}
      <section className="mx-auto max-w-[1200px] px-5 py-[84px] sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[12.5px] font-bold uppercase tracking-[0.1em]" style={{ color: ACCENT }}>
              Live marketplace
            </p>
            <h2 className="mt-3 text-[32px] font-extrabold tracking-[-0.025em] sm:text-[38px]">Today’s rates, source-linked</h2>
          </div>
          <Link href="/marketplace" className="text-[14.5px] font-bold transition-colors hover:opacity-80" style={{ color: ACCENT }}>
            Explore all products →
          </Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {MARKETS.map((m) => (
            <div key={m.name} className="pr-card-hover rounded-[18px] border border-[rgba(17,17,15,0.1)] bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.05em]" style={{ color: INK3 }}>
                    {m.kind}
                  </p>
                  <h3 className="mt-[5px] text-[17px] font-bold">{m.name}</h3>
                </div>
                <span
                  className="rounded-full px-[9px] py-[3px] text-[11px] font-bold"
                  style={
                    m.badgeTone === "clay"
                      ? { color: WARN, background: "rgba(141,106,46,0.12)" }
                      : { color: ACCENT, background: "rgba(26,107,69,0.10)" }
                  }
                >
                  {m.badge}
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[28px] font-extrabold leading-none" style={{ color: ACCENT }}>
                    {m.rate}
                  </p>
                  <p className="mt-1 text-[11.5px]" style={{ color: INK3 }}>
                    {m.sub}
                  </p>
                </div>
                <svg viewBox="0 0 90 32" className="h-[30px] w-[88px]" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={m.spark} />
                </svg>
              </div>
              <Link href="/simulate" className={`${greenBtn} mt-[18px] w-full px-3 py-[11px] text-[14px]`}>
                Simulate
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section style={{ background: ACCENT }}>
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-[30px] px-5 py-[60px] sm:px-8">
          <div>
            <h2 className="text-[28px] font-extrabold tracking-[-0.025em] text-white sm:text-[34px]">Start your route today — free.</h2>
            <p className="mt-2.5 max-w-[520px] text-[16px] leading-[1.6] text-white/[0.85]">
              No money down, no PINs, no pressure. Just a calmer, smarter way to learn investing in Kenya.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/learn" className="rounded-[10px] bg-white px-[26px] py-[15px] text-[16px] font-bold transition-colors hover:bg-white/90" style={{ color: NAVY }}>
              Start Learning Free
            </Link>
            <Link href="/professional/dashboard" className="rounded-[10px] border-[1.5px] border-white/35 bg-white/[0.14] px-6 py-[15px] text-[16px] font-bold text-white transition-colors hover:bg-white/[0.22]">
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer style={{ background: NAVY, color: "rgba(255,255,255,0.72)" }}>
        <div className="mx-auto grid max-w-[1200px] gap-9 px-5 pb-10 pt-16 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark inkColor={NAVY} routeColor="#fff" />
              <span className="text-[19px] font-extrabold tracking-[-0.02em]">
                <span className="text-white">Pesa</span>
                <span style={{ color: ACCENT }}>Route</span>
              </span>
            </div>
            <p className="mt-4 max-w-[300px] text-[13.5px] leading-[1.6] text-white/55">
              A Kenya-first investment learning and simulation platform — build confidence, make smarter decisions, grow
              your financial future.
            </p>
            <p className="mt-[18px] text-[12.5px] font-semibold tracking-[0.04em] text-white/40">LEARN. SIMULATE. INVEST BETTER.</p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/45">{col.title}</p>
              <div className="mt-4 flex flex-col gap-[11px] text-[14px]">
                {col.links.map(([label, href]) => (
                  <Link key={label} href={href} className="w-fit text-white/72 transition-colors hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.08]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-[22px] sm:px-8">
            <p className="max-w-[680px] text-[12.5px] leading-[1.5] text-white/45">
              Educational only. PesaRoute does not hold money, give financial advice, or guarantee returns. Always verify
              rates and terms with the provider or regulator before investing.
            </p>
            <p className="text-[12.5px] text-white/45">© 2026 PesaRoute · pesaroute.co.ke</p>
          </div>
        </div>
      </footer>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
