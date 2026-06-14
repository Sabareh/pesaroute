import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";

const passports = [
  "Generic MMF",
  "Generic Treasury Bill via DhowCSD",
  "Generic SACCO Deposits",
  "Generic NSE Shares",
  "Generic US ETF route",
  "Generic Land Due Diligence Checklist",
  "Generic Bitcoin Self-Custody Risk Card"
];

export default function ProductPassportsPage() {
  return (
    <main className="min-h-screen bg-[#fbfdf9] px-5 py-8 text-ink sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-leaf">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          PesaRoute
        </Link>
        <header className="mt-10 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-clay">Product passports</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Public passport placeholders</h1>
          <p className="mt-5 text-lg leading-8 text-ink/70">
            These pages will expose educational category summaries, documents to check, fees, liquidity, risk level, tax notes,
            common beginner mistakes, and external execution routes.
          </p>
        </header>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {passports.map((passport) => {
            const slug = passport.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            return (
              <Link
                href={`/product-passports/${slug}`}
                key={passport}
                className="flex items-center justify-between rounded-lg border border-ink/10 bg-white p-5 shadow-sm transition hover:border-leaf"
              >
                <span className="flex items-center gap-3 font-bold">
                  <FileText className="h-5 w-5 text-leaf" aria-hidden />
                  {passport}
                </span>
                <ArrowRight className="h-5 w-5 text-ink/50" aria-hidden />
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
