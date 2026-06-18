import type { Metadata } from "next";

import { AppShell, AppleLikeNav, PageBanner, PageShell, PremiumCard, PrimaryButton, SecondaryButton } from "../../components/maliprime";

export const metadata: Metadata = {
  title: "Before paying a land deposit in Kenya | PesaRoute",
  description:
    "A plain-language guide to what to verify before paying a land deposit in Kenya - title, official search, survey, agreement, and who to involve."
};

const STEPS = [
  {
    title: "See the title before anything else",
    body: "Ask for the title deed (or lease/certificate) and confirm the parcel number matches the plot you are buying. A title you have not seen is a red flag."
  },
  {
    title: "Do an official search",
    body: "An official land search confirms the registered owner and any encumbrances (charges, cautions, caveats). Run it through Ardhisasa / the Ministry of Lands, ideally via an advocate."
  },
  {
    title: "Confirm the search matches the seller",
    body: "The registered owner on the search must be the exact person or company you are paying. Mismatches are a common fraud pattern."
  },
  {
    title: "Use a qualified advocate",
    body: "An advocate should review the title, the search, and the sale agreement before any money moves. This is not where you cut costs."
  },
  {
    title: "Get a surveyor to confirm boundaries",
    body: "A licensed surveyor confirms the beacons and that the plot on the ground matches the map. Visit the site and confirm access roads."
  },
  {
    title: "Protect the deposit",
    body: "Understand whether your deposit is refundable, tie payments to verified milestones, and never let pressure to “pay today” rush you. PesaRoute never holds your money."
  }
];

export default function BeforeYouPayPage() {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="flex flex-col gap-6">
          <PageBanner accent="amber" badge="Public guide" art="shield"
            eyebrow="Public guide"
            title="Before paying a land deposit in Kenya"
            description="Most land losses happen because money moved before verification. Here is what to check first - and who to involve. This is educational information, not legal advice."
          >
            <div className="flex flex-wrap gap-3">
              <PrimaryButton href="/land/checklist">Open the full checklist</PrimaryButton>
              <SecondaryButton href="/land/compare">Compare land vs alternatives</SecondaryButton>
            </div>
          </PageBanner>

          <div className="flex flex-col gap-3">
            {STEPS.map((step, index) => (
              <PremiumCard key={step.title}>
                <h3 className="text-base font-semibold text-textPrimary">
                  {index + 1}. {step.title}
                </h3>
                <p className="mt-2 text-sm text-textSecondary">{step.body}</p>
              </PremiumCard>
            ))}
          </div>

          <PremiumCard>
            <h3 className="text-base font-semibold text-textPrimary">Important</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-textSecondary">
              <li>PesaRoute does not verify land ownership or replace the official land registry.</li>
              <li>PesaRoute does not provide legal advice or guarantee a land deal is safe.</li>
              <li>Official verification happens through Ardhisasa / the Ministry of Lands and a qualified advocate.</li>
            </ul>
          </PremiumCard>
        </div>
      </PageShell>
    </AppShell>
  );
}
