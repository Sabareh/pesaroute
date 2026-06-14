import { Clock, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppShell, PageShell, PremiumCard, SectionHeader, TrustBadge } from "../../components/maliprime";

const allowedScopes = ["consultation_context", "portfolio_summary"];

const canShow = (scope: string) => allowedScopes.includes(scope);

export default function ProfessionalConsultationContextPage() {
  return (
    <AppShell>
      <PageShell className="max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader eyebrow="Professional context" title="Consultation review" />
          <TrustBadge tone="emerald">
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
            Scoped access only
          </TrustBadge>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {canShow("consultation_context") ? (
            <PremiumCard>
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <LockKeyhole className="h-5 w-5" aria-hidden />
                Granted consultation context
              </div>
              <h2 className="mt-4 text-xl font-black">Review portfolio liquidity</h2>
              <p className="mt-3 text-sm leading-6 text-textSecondary">
                The API response includes only the topic and user-provided consultation notes when the user grants
                `consultation_context`.
              </p>
            </PremiumCard>
          ) : null}

          <PremiumCard>
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Clock className="h-5 w-5" aria-hidden />
              Access window
            </div>
            <p className="mt-4 text-sm leading-6 text-textSecondary">
              Access expires automatically. The mobile app also lets the user revoke grants before expiry.
            </p>
          </PremiumCard>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          {canShow("contact_info") ? <ScopeCard body="Rendered only when contact_info is granted." title="Contact" /> : null}
          {canShow("portfolio_summary") ? (
            <ScopeCard body="Shows item count, asset categories, liquidity score, and risk note without exact values." title="Portfolio summary" />
          ) : null}
          {canShow("portfolio_exact_values") ? <ScopeCard body="Rendered only when portfolio_exact_values is granted." title="Exact values" /> : null}
          {canShow("journal_entries") ? <ScopeCard body="Rendered only when journal_entries is granted." title="Journal notes" /> : null}
        </section>
      </PageShell>
    </AppShell>
  );
}

function ScopeCard({ body, title }: { body: string; title: string }) {
  return (
    <PremiumCard>
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-textSecondary">{body}</p>
    </PremiumCard>
  );
}
