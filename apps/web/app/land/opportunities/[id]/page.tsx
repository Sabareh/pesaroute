import type { Metadata } from "next";

import { AppShell, AppleLikeNav, PageShell } from "../../../components/maliprime";
import { LandOpportunityDetail } from "./LandOpportunityDetail";

export const metadata: Metadata = {
  title: "Land opportunity | PesaRoute",
  description: "Your private land decision workspace: checklist, visible risk, and professional review."
};

type PageProps = { params: Promise<{ id: string }> };

export default async function LandOpportunityPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <LandOpportunityDetail opportunityId={Number(id)} />
      </PageShell>
    </AppShell>
  );
}
