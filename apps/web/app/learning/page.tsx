import { ArrowRight, BookOpen, ClipboardCheck, FileText, Gauge, GraduationCap, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  AppleLikeNav,
  AppShell,
  PageShell,
  PremiumCard,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  TrustBadge
} from "../components/maliprime";

const journeySteps = [
  {
    title: "Start a track",
    body: "Choose a beginner route such as money foundations, first MMF decision, SACCO/chama basics, treasury bills, or scam defense.",
    icon: GraduationCap
  },
  {
    title: "Read a short lesson",
    body: "Lessons stay practical: goal, timeline, liquidity, risk, fees, documents, provider checks, and red flags.",
    icon: BookOpen
  },
  {
    title: "Practice the decision",
    body: "Answer a quiz or flashcard prompt before looking at simulations or passports.",
    icon: ClipboardCheck
  },
  {
    title: "Run the simulator",
    body: "Use MMF, T-bill, SACCO, or global route estimates as learning aids, not return promises.",
    icon: Gauge
  },
  {
    title: "Save a reflection",
    body: "Write the decision in a private journal. Amounts can be exact, rounded, range, or hidden.",
    icon: LockKeyhole
  },
  {
    title: "Review progress",
    body: "XP, streaks, badges, and library views help users continue learning without hype.",
    icon: ShieldCheck
  }
];

const tracks = [
  ["Money Foundations", "Free", "Emergency funds, risk, liquidity, comparison habits, and red-flag language."],
  ["First Salary Money Plan", "Free", "Salary buckets, black-tax boundaries, emergency buffers, and first KES 10,000 decisions."],
  ["Money Market Funds", "Free", "CMA scheme checks, yield language, fees, withdrawal timing, and MMF simulation."],
  ["Treasury Bills and Bonds", "Free", "CBK securities, DhowCSD, face value, purchase price, coupons, maturity, and price risk."],
  ["SACCO Smart Member", "Free", "SASRA checks, deposits, share capital, dividends, loan multipliers, and guarantor risk."],
  ["Chama Investment Basics", "Free", "Contribution discipline, investment policies, minutes, voting, and land caution."],
  ["Scam Defense", "Free", "Urgency, recruitment pressure, fake bots, land pressure sales, and questions before sending money."],
  ["NSE Stocks for Beginners", "Free", "Shares, dividends, CDS accounts, brokers, long horizons, and journal discipline."],
  ["Global Stocks and ETFs", "Premium placeholder", "ETF routes, USD/KES currency risk, platform custody, fees, and global simulations."],
  ["Land Due Diligence Basics", "Premium placeholder", "Ardhisasa checks, seller authority, boundaries, public-land questions, and deposit discipline."],
  ["Diaspora Investing Kenya", "Premium placeholder", "Cross-border goals, transfer route, FX, scoped sharing, and privacy boundaries."],
  ["Farmer Seasonal Money Plan", "Free", "Harvest income, input reserves, liquidity, cooperative/SACCO rules, and payout journaling."],
  ["Jua Kali Daily Income Plan", "Free", "Daily buckets, stock replacement, personal reserves, liquidity, and closing-time journaling."]
];

const detailedLessons = [
  {
    title: "Money Market Fund basics",
    summary: "Use MMFs as a liquidity lesson, not a shortcut to a fixed return.",
    scenario:
      "A first-jobber has KES 8,000 left after rent and transport. Before placing it anywhere, they compare withdrawal time, fund manager status, fees, and whether this money may be needed in an emergency.",
    checks: [
      "Confirm fund manager, trustee, and provider documents.",
      "Compare withdrawal timing and cut-off rules.",
      "Look at net yield after fees, not only a headline number.",
      "Keep emergency money separate from money you can leave longer."
    ],
    source: "Capital Markets Authority investor education",
    href: "/learning/money-market-funds/what-is-a-money-market-fund"
  },
  {
    title: "Treasury bill readiness",
    summary: "Separate face value, purchase price, auction timing, maturity, and cash needs.",
    scenario:
      "A user wants to place KES 50,000 in a 91-day bill but may need school-fee money in two months. They check auction timing, maturity, and whether early access is realistic before applying.",
    checks: [
      "Confirm current instructions from CBK or DhowCSD.",
      "Know whether the bid is competitive or non-competitive.",
      "Calculate purchase price separately from face value.",
      "Do not use money needed before maturity unless the exit route is clear."
    ],
    source: "Central Bank of Kenya government securities",
    href: "/learning/treasury-bills-and-bonds/what-is-a-treasury-bill"
  },
  {
    title: "SACCO member safety",
    summary: "Understand deposits, share capital, guarantor exposure, dividends, and exit rules.",
    scenario:
      "A member is told contributions can qualify them for a loan. Before joining, they ask how deposits are withdrawn, what share capital means, who regulates the SACCO, and what happens if a borrower defaults.",
    checks: [
      "Verify regulated status on SASRA lists where applicable.",
      "Separate withdrawable deposits from share capital.",
      "Ask for written loan, guarantor, dividend, and exit rules.",
      "Do not guarantee a loan you cannot afford to support."
    ],
    source: "SASRA regulated SACCO lists",
    href: "/learning/sacco-smart-member/what-is-a-sacco"
  },
  {
    title: "Scam pitch pause",
    summary: "Slow down urgency, secrecy, recruitment pressure, missing regulator details, and unclear withdrawal rules.",
    scenario:
      "Someone sends a screenshot showing large profits and asks for a deposit today. The user copies the message into the scam checker and refuses to share PINs, passwords, OTPs, or money under pressure.",
    checks: [
      "Ask who regulates the provider and verify independently.",
      "Reject requests for PINs, passwords, OTPs, or remote-control apps.",
      "Watch for urgency, secrecy, referral rewards, and unclear withdrawals.",
      "Speak to a licensed professional where the decision is material."
    ],
    source: "CMA investor education and PesaRoute editorial review",
    href: "/learning/scam-defense/guaranteed-returns-are-a-red-flag"
  }
];

const sourceLinks = [
  ["Central Bank of Kenya", "https://www.centralbank.go.ke/securities/"],
  ["CBK Treasury Bills", "https://www.centralbank.go.ke/securities/treasury-bills/"],
  ["CBK Treasury Bonds", "https://www.centralbank.go.ke/securities/treasury-bonds/"],
  ["DhowCSD", "https://dhowcsd.centralbank.go.ke/"],
  ["Capital Markets Authority handbook", "https://handbook.cma.or.ke/"],
  ["CMA licensees", "https://licensees.cma.or.ke/"],
  ["CMA approved collective investment schemes", "https://licensees.cma.or.ke/licenses/15/"],
  ["Nairobi Securities Exchange FAQs", "https://www.nse.co.ke/faqs/"],
  ["CDSC account opening", "https://cdsckenya.com/account-opening/"],
  ["SASRA licensed DT SACCOs", "https://www.sasra.go.ke/licensed-dt-saccos/"],
  ["SASRA regulated SACCOs", "https://www.sasra.go.ke/regulated-saccos/"],
  ["Ardhisasa", "https://ardhisasa.lands.go.ke/"],
  ["National Land Commission", "https://landcommission.go.ke/"],
  ["KRA withholding tax", "https://www.kra.go.ke/individual/filing-paying/types-of-taxes/individual-withholding-tax"],
  ["KRA capital gains tax", "https://www.kra.go.ke/individual/filing-paying/types-of-taxes/capital-gains-tax"]
];

const qaNotes = [
  "Compare before committing money.",
  "Use ranges if you do not want exact amounts.",
  "Check sources and review dates.",
  "Save the questions you still need answered."
];

export default function LearningPage() {
  return (
    <AppShell>
      <AppleLikeNav />

      <section className="border-b border-border bg-[#11110f] px-5 py-16 text-white sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <TrustBadge className="border-white/20 bg-white/10 text-white">Phase 2.6 learning loop</TrustBadge>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-6xl">
              Learn, simulate, reflect, then decide what to ask next.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
              The learning engine connects lessons, practice, simulators, the private journal, progress, premium locks,
              and professional review prompts into one guided journey.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="/#amount" className="!bg-white !text-textPrimary hover:!bg-white/90">
                Start from my amount
                <ArrowRight className="h-4 w-4" aria-hidden />
              </PrimaryButton>
              <SecondaryButton href="/product-passports" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                Compare passports
              </SecondaryButton>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Total XP", "0 until account sign-in"],
              ["Current streak", "Tracked after login"],
              ["Daily challenge", "Check one risk before money moves"],
              ["Saved library", "Tracks and courses sync to account"]
            ].map(([label, value]) => (
              <div className="rounded-lg border border-white/10 bg-white/[0.07] p-5" key={label}>
                <p className="text-xs font-semibold uppercase text-white/52">{label}</p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.01em]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageShell>
        <section className="py-8">
          <SectionHeader
            eyebrow="Detailed lessons"
            title="Real lesson content, not placeholder paragraphs."
            body="Each lesson is written as a practical decision check: scenario, key idea, checks before money moves, sources, and review date."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {detailedLessons.map((lesson) => (
              <PremiumCard key={lesson.title}>
                <TrustBadge tone="muted">Reviewed lesson sample</TrustBadge>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">{lesson.title}</h2>
                <p className="mt-3 text-sm leading-6 text-textSecondary">{lesson.summary}</p>
                <div className="mt-5 rounded-lg border border-border bg-surfaceSubtle p-4">
                  <p className="text-xs font-semibold uppercase text-textTertiary">Kenyan scenario</p>
                  <p className="mt-2 text-sm leading-6 text-textSecondary">{lesson.scenario}</p>
                </div>
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase text-textTertiary">Before money moves</p>
                  <div className="mt-3 grid gap-2">
                    {lesson.checks.map((check) => (
                      <p className="rounded-lg border border-border bg-white px-4 py-3 text-sm leading-6 text-textSecondary" key={check}>
                        {check}
                      </p>
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-xs font-semibold uppercase text-textTertiary">Source: {lesson.source}</p>
                <Link
                  className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-textPrimary transition hover:border-textTertiary"
                  href={lesson.href}
                >
                  Open lesson
                </Link>
              </PremiumCard>
            ))}
          </div>
        </section>

        <section className="grid gap-4 py-8 lg:grid-cols-[0.72fr_1.28fr]">
          <SectionHeader
            eyebrow="Source references"
            title="Lessons carry public source context and review dates."
            body="Official sources are used where available. Editorial-only lessons are labelled so they can be reviewed before publication."
          />
          <PremiumCard>
            <div className="grid gap-3">
              {sourceLinks.map(([label, href]) => (
                <a
                  className="rounded-lg border border-border bg-surfaceSubtle px-4 py-3 text-sm font-medium text-textPrimary transition hover:border-borderStrong"
                  href={href}
                  key={href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {label}
                </a>
              ))}
            </div>
          </PremiumCard>
        </section>

        <section className="py-8">
          <SectionHeader
            eyebrow="Guided core loop"
            title="Learning now points users toward action, reflection, and progress."
            body="The app should feel like one literacy journey: a short lesson leads to practice, a simulator, a journal reflection, and progress review."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {journeySteps.map((step, index) => (
              <PremiumCard key={step.title}>
                <step.icon className="h-5 w-5 text-textTertiary" aria-hidden />
                <p className="mt-5 text-xs font-semibold uppercase text-textTertiary">Step {index + 1}</p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.015em]">{step.title}</h2>
                <p className="mt-3 text-sm leading-6 text-textSecondary">{step.body}</p>
              </PremiumCard>
            ))}
          </div>
        </section>
      </PageShell>

      <section className="bg-surface px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.76fr_1.24fr]">
          <SectionHeader
            eyebrow="Track library"
            title="Kenya-first tracks with free value and clear premium placeholders."
            body="Free users still get useful education. Premium locks are explained plainly and do not block the core learning habit."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {tracks.map(([title, access, body]) => (
              <PremiumCard key={title}>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold tracking-[-0.01em]">{title}</h3>
                  <TrustBadge tone={access === "Free" ? "emerald" : "amber"}>{access}</TrustBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-textSecondary">{body}</p>
              </PremiumCard>
            ))}
          </div>
        </div>
      </section>

      <PageShell>
        <section className="grid gap-4 py-8 lg:grid-cols-[1fr_1fr]">
          <PremiumCard>
            <FileText className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">Private reflection stays part of the route.</h2>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Journal entries can link back to a lesson, course, or track. Users can keep entries local-only or sync them
              after login.
            </p>
          </PremiumCard>
          <PremiumCard>
            <ShieldCheck className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">QA language stays serious.</h2>
            <div className="mt-4 grid gap-2">
              {qaNotes.map((note) => (
                <p className="rounded-lg border border-border bg-surfaceSubtle px-4 py-3 text-sm font-medium text-textSecondary" key={note}>
                  {note}
                </p>
              ))}
            </div>
          </PremiumCard>
        </section>
      </PageShell>
    </AppShell>
  );
}
