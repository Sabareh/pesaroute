import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell, PageShell } from "../../components/maliprime";
import { fetchProduct } from "../../lib/api";
import { SimulationForm } from "./SimulationForm";

export const revalidate = 300;

type PageProps = { params: Promise<{ productSlug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productSlug } = await params;
  const product = await fetchProduct(productSlug);
  if (!product) {
    return { title: "Product not found | PesaRoute" };
  }
  return {
    title: `Simulate ${product.name} | PesaRoute`,
    description: `Educational simulation for ${product.name}${
      product.provider?.name ? ` from ${product.provider.name}` : ""
    }. See the latest source-linked rate, freshness, and what to verify before investing.`,
    alternates: { canonical: `/simulate/${product.slug}` }
  };
}

export default async function ProductSimulatePage({ params }: PageProps) {
  const { productSlug } = await params;
  const product = await fetchProduct(productSlug);
  if (!product) {
    notFound();
  }

  const rate = product.current_rate_snapshot ?? product.current_rate;

  return (
    <AppShell>
      <PageShell>
        <SimulationForm product={product} hasRate={Boolean(rate)} />
      </PageShell>
    </AppShell>
  );
}
