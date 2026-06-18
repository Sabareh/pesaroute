import type { Metadata } from "next";

import { AppShell, AppleLikeNav, PageShell } from "../../components/maliprime";
import { CompareBuilder } from "./CompareBuilder";

export const metadata: Metadata = {
  title: "Compare | PesaRoute Marketplace",
  description: "Compare 2-5 products side by side - assumptions, not a winner."
};

type PageProps = { searchParams: Promise<{ slugs?: string }> };

export default async function ComparePage({ searchParams }: PageProps) {
  const { slugs } = await searchParams;
  const initial = (slugs ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <CompareBuilder initialSlugs={initial} />
      </PageShell>
    </AppShell>
  );
}
