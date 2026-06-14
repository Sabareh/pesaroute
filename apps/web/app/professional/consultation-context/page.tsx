import { Clock, LockKeyhole, ShieldCheck } from "lucide-react";

const allowedScopes = ["consultation_context", "portfolio_summary"];

const canShow = (scope: string) => allowedScopes.includes(scope);

export default function ProfessionalConsultationContextPage() {
  return (
    <main className="min-h-screen bg-[#fbfdf9] px-5 py-8 text-ink sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-ink/12 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-clay">Professional context</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Consultation review</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-mint px-4 py-3 text-sm font-bold text-leaf">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            Scoped access only
          </div>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {canShow("consultation_context") ? (
            <article className="rounded-lg border border-ink/10 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-leaf">
                <LockKeyhole className="h-5 w-5" aria-hidden />
                Granted consultation context
              </div>
              <h2 className="mt-4 text-xl font-black">Review portfolio liquidity</h2>
              <p className="mt-3 text-sm leading-6 text-ink/72">
                The API response includes only the topic and user-provided consultation notes when the user grants
                `consultation_context`.
              </p>
            </article>
          ) : null}

          <article className="rounded-lg border border-ink/10 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-clay">
              <Clock className="h-5 w-5" aria-hidden />
              Access window
            </div>
            <p className="mt-4 text-sm leading-6 text-ink/72">
              Access expires automatically. The mobile app also lets the user revoke grants before expiry.
            </p>
          </article>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          {canShow("contact_info") ? (
            <article className="rounded-lg border border-ink/10 bg-white p-5">
              <h2 className="text-lg font-black">Contact</h2>
              <p className="mt-3 text-sm text-ink/72">Rendered only when `contact_info` is granted.</p>
            </article>
          ) : null}

          {canShow("portfolio_summary") ? (
            <article className="rounded-lg border border-ink/10 bg-white p-5">
              <h2 className="text-lg font-black">Portfolio summary</h2>
              <p className="mt-3 text-sm leading-6 text-ink/72">
                Shows item count, asset categories, liquidity score, and risk note without exact values.
              </p>
            </article>
          ) : null}

          {canShow("portfolio_exact_values") ? (
            <article className="rounded-lg border border-ink/10 bg-white p-5">
              <h2 className="text-lg font-black">Exact values</h2>
              <p className="mt-3 text-sm text-ink/72">Rendered only when `portfolio_exact_values` is granted.</p>
            </article>
          ) : null}

          {canShow("journal_entries") ? (
            <article className="rounded-lg border border-ink/10 bg-white p-5">
              <h2 className="text-lg font-black">Journal notes</h2>
              <p className="mt-3 text-sm text-ink/72">Rendered only when `journal_entries` is granted.</p>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
