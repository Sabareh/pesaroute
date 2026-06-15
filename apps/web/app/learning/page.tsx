import { ArrowRight, BookOpen, ClipboardCheck, FileText, Gauge, GraduationCap, LockKeyhole, ShieldCheck } from "lucide-react";
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
  ["Money foundations", "Free", "Goals, liquidity, risk, fees, provider checks, and scam pressure."],
  ["First MMF decision", "Free", "Yield language, withdrawal timing, and fund manager checks."],
  ["SACCO and chama basics", "Free", "Governance, records, contributions, and exit rules."],
  ["Treasury bills basics", "Premium placeholder", "Face value, purchase price, auctions, maturity, and tax notes."],
  ["Global investing route", "Premium placeholder", "FX costs, platform checks, custody, transfer fees, and tax questions."],
  ["Scam defense", "Free", "Guaranteed returns, urgency, missing regulator details, and referral pressure."]
];

const qaNotes = [
  "For education only.",
  "Compare before committing money.",
  "Use ranges if you do not want exact amounts.",
  "Speak to a licensed professional when needed.",
  "PesaRoute does not hold or execute investments."
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
