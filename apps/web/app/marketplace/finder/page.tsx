import type { Metadata } from "next";

import { AppShell, AppleLikeNav, PageShell } from "../../components/maliprime";
import { FinderWizard } from "./FinderWizard";

export const metadata: Metadata = {
  title: "Product Finder | PesaRoute Marketplace",
  description: "Answer a few questions to get products to understand and options to compare - never a recommendation."
};

export default function FinderPage() {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <FinderWizard />
      </PageShell>
    </AppShell>
  );
}
