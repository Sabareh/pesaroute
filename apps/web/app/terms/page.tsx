import type { Metadata } from "next";
import { AppleLikeNav, AppShell, PageShell, PremiumCard, SectionHeader } from "../components/maliprime";

export const metadata: Metadata = {
  title: "Terms & Conditions | PesaRoute",
  description: "PesaRoute service boundaries, privacy promises, and educational-use terms."
};

const notices = [
  "PesaRoute provides educational information and decision-support tools only.",
  "PesaRoute does not hold money, execute investments, promise returns, or provide custody.",
  "PesaRoute does not ask for M-Pesa PINs, bank passwords, broker credentials, MMF credentials, OTPs, private keys, or seed phrases.",
  "Users should verify current rates, fees, liquidity rules, licenses, and product terms with the provider, regulator, or a licensed professional where needed.",
  "Professional sharing is intended to be explicit, scoped, time-limited, revocable, and controlled by the user."
];

export default function TermsPage() {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell className="max-w-4xl">
        <SectionHeader
          eyebrow="Terms & Conditions"
          title="Service boundaries and privacy notices"
          body="These notices are centralized here so product pages can stay focused on learning, comparison, and planning."
        />

        <PremiumCard className="mt-8">
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-textPrimary">Core notices</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-textSecondary">
            {notices.map((notice) => (
              <li className="flex gap-3" key={notice}>
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-textPrimary" />
                <span>{notice}</span>
              </li>
            ))}
          </ul>
        </PremiumCard>

        <PremiumCard className="mt-4">
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-textPrimary">Using PesaRoute</h2>
          <p className="mt-3 text-sm leading-6 text-textSecondary">
            Use PesaRoute to learn, compare options, run simulations, record decisions, and prepare better questions
            before acting outside the platform. Do not treat any page as a personal recommendation, offer, or
            instruction to buy or sell a financial product.
          </p>
        </PremiumCard>
      </PageShell>
    </AppShell>
  );
}
