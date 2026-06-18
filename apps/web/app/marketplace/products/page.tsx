import type { Metadata } from "next";

import { AppShell, AppleLikeNav, PageShell } from "../../components/maliprime";
import { MarketplaceBrowser } from "./MarketplaceBrowser";

export const metadata: Metadata = {
  title: "Products | PesaRoute Marketplace",
  description: "Search and filter Kenyan investment products with source and freshness labels."
};

export default function MarketplaceProductsPage() {
  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <MarketplaceBrowser />
      </PageShell>
    </AppShell>
  );
}
