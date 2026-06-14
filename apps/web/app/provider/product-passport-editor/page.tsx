import Link from "next/link";
import { ArrowLeft, FileText, Megaphone, Save, ShieldAlert } from "lucide-react";
import { AppShell, PageShell, PremiumCard, SecondaryButton, SectionHeader, TrustBadge } from "../../components/maliprime";

const editorSections = [
  {
    title: "Basics",
    fields: ["Product name", "Provider name", "Category", "Short educational description"]
  },
  {
    title: "Risk/liquidity",
    fields: ["Risk level", "Liquidity level", "Regulator category", "Status"]
  },
  {
    title: "Fees/minimums",
    fields: ["Minimum amount", "Known fees", "Withdrawal or maturity timing"]
  },
  {
    title: "Documents needed",
    fields: ["Identity documents", "Tax documents", "Provider-specific forms"]
  },
  {
    title: "Disclosures",
    fields: ["No promised returns", "Liquidity warnings", "Tax or regulatory caveats"]
  },
  {
    title: "External route",
    fields: ["Official verification steps", "External provider route", "What PesaRoute does not execute"]
  }
];

export default function ProviderProductPassportEditorPage() {
  return (
    <AppShell>
      <PageShell>
        <Link href="/provider/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Provider dashboard
        </Link>

        <div className="mt-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            eyebrow="Passport editor"
            title="Edit an educational product passport."
            body="The editor focuses on clear public information: what the product is, how users verify externally, what to avoid, and what disclosures must be visible."
          />
          <TrustBadge tone="amber">
            <ShieldAlert className="mr-2 h-4 w-4" aria-hidden />
            Sponsored content must be clearly labelled.
          </TrustBadge>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.82fr]">
          <div className="grid gap-4">
            {editorSections.map((section) => (
              <PremiumCard key={section.title}>
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                  {section.title}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <label className="grid gap-2 text-sm font-bold text-textPrimary" key={field}>
                      {field}
                      <input
                        className="min-h-12 rounded-2xl border border-border bg-surface px-3 text-sm font-normal outline-none focus:border-primary"
                        placeholder={field}
                      />
                    </label>
                  ))}
                </div>
              </PremiumCard>
            ))}
          </div>

          <aside className="space-y-4">
            <PremiumCard>
              <Megaphone className="h-6 w-6 text-amber" aria-hidden />
              <h2 className="mt-4 text-xl font-black">Sponsorship label</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                If the passport is sponsored, the public page must label it plainly and avoid preferential ranking or
                recommendation language.
              </p>
              <label className="mt-4 flex items-center gap-3 text-sm font-bold">
                <input className="h-5 w-5 accent-primary" type="checkbox" />
                Mark this passport as sponsored
              </label>
            </PremiumCard>

            <PremiumCard>
              <h2 className="text-xl font-black">Publishing checks</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-textSecondary">
                <li>No guaranteed returns.</li>
                <li>No execution CTA that looks like investment advice.</li>
                <li>No request for M-Pesa PINs, bank passwords, broker credentials, or MMF credentials.</li>
                <li>External route explains verification before action.</li>
              </ul>
              <SecondaryButton className="mt-5">
                <Save className="h-5 w-5" aria-hidden />
                Save draft placeholder
              </SecondaryButton>
            </PremiumCard>
          </aside>
        </section>
      </PageShell>
    </AppShell>
  );
}
