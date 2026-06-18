import type { Metadata } from "next";

import { AppShell, AppleLikeNav, PageBanner, PageShell } from "../../components/maliprime";
import { LandCompare } from "./LandCompare";

export const metadata: Metadata = {
  title: "Land vs alternatives | PesaRoute",
  description: "Educational comparison of land against money market funds, Treasury bills, SACCOs, REITs and more."
};

export default function LandComparePage() {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="flex flex-col gap-4">
          <PageBanner accent="amber" badge="vs alternatives" art="compare"
            eyebrow="Educational comparison"
            title="Land vs other investment options"
            description="Compare an educational land-appreciation scenario against regulated alternatives. Land appreciation is not guaranteed and land is usually illiquid."
          />
          <LandCompare />
        </div>
      </PageShell>
    </AppShell>
  );
}
