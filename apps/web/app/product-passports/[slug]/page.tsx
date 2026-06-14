import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default async function ProductPassportPlaceholderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <main className="min-h-screen bg-[#fbfdf9] px-5 py-8 text-ink sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/product-passports" className="inline-flex items-center gap-2 text-sm font-bold text-leaf">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Product passports
        </Link>
        <section className="mt-10 rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
          <ShieldCheck className="h-8 w-8 text-leaf" aria-hidden />
          <h1 className="mt-5 text-3xl font-black">{title}</h1>
          <p className="mt-4 leading-7 text-ink/70">
            Placeholder passport page. The backend catalog seed command already includes the first generic passport records
            and will later power this page through the public API.
          </p>
          <p className="mt-4 text-sm font-semibold text-ink/60">
            Educational information only. We do not execute investments, hold money, recommend products, or promise returns.
          </p>
        </section>
      </div>
    </main>
  );
}
