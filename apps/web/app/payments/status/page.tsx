import Link from "next/link";
import { ArrowLeft, Clock, LockKeyhole, Smartphone } from "lucide-react";
import {
  AppleLikeNav,
  AppShell,
  EditorialImage,
  HeroCard,
  PageBanner,
  PageShell,
  PremiumCard,
  TrustBadge
} from "../../components/maliprime";

const statuses = [
  ["pending", "Payment intent created, no STK push has been sent yet."],
  ["initiated", "M-Pesa prompt was requested. Backend is waiting for callback confirmation."],
  ["successful", "Backend callback confirmed payment and applied the matching entitlement."],
  ["failed", "M-Pesa callback returned a failure or the checkout could not be initiated."],
  ["expired", "Payment intent or prompt timed out before confirmation."]
];

export default function PaymentStatusPage() {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell className="max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-textSecondary transition hover:text-textPrimary">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          PesaRoute
        </Link>

        <HeroCard className="mt-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-end">
            <div>
              <PageBanner accent="green" badge="Payments" art="rings"
                eyebrow="Payments"
                title="M-Pesa payment status foundation"
                description="PesaRoute payments are only for subscriptions, learning packs, and future professional review fees. They are never for investment execution."
              >
                <TrustBadge tone="emerald">Backend confirmation only</TrustBadge>
              </PageBanner>
            </div>
            <EditorialImage
              alt="A phone on a desk beside Kenyan shillings, representing M-Pesa payment prompts handled outside PesaRoute."
              imgClassName="aspect-[4/3]"
              src="/images/route-planning-phone.jpg"
            />
          </div>
        </HeroCard>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <PremiumCard>
            <Smartphone className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">Mobile checkout</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Users enter a phone number, receive an M-Pesa prompt, and approve only on their phone if the amount is
              correct.
            </p>
          </PremiumCard>
          <PremiumCard>
            <LockKeyhole className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">Server-side credentials</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Payment credentials stay on the backend, and the mobile app only tracks the payment status returned by
              PesaRoute.
            </p>
          </PremiumCard>
          <PremiumCard>
            <Clock className="h-5 w-5 text-textTertiary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em]">Callback-driven</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">
              Entitlements unlock only after the backend receives and handles a successful payment callback.
            </p>
          </PremiumCard>
        </section>

        <section className="mt-6 grid gap-3">
          {statuses.map(([status, description]) => (
            <PremiumCard className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" key={status}>
              <TrustBadge tone={status === "successful" ? "emerald" : status === "failed" ? "danger" : "muted"}>
                {status}
              </TrustBadge>
              <p className="text-sm leading-6 text-textSecondary sm:max-w-2xl">{description}</p>
            </PremiumCard>
          ))}
        </section>
      </PageShell>
    </AppShell>
  );
}
