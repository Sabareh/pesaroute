"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AppShell, AppleLikeNav, EmptyState, LoadingState, PageBanner, PageShell, PremiumCard, TrustBadge } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import { listWatchlist, removeFromWatchlist } from "../../lib/api";
import { NoAdviceNote } from "../_components";

export default function WatchlistPage() {
  const { token, ready, isAuthenticated } = useAuth();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await listWatchlist(token);
    setItems(data.results);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function remove(id: number) {
    if (!token) return;
    await removeFromWatchlist(id, token);
    void load();
  }

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell>
        <div className="flex flex-col gap-5">
          <PageBanner accent="green" badge="Your saves" art="bars"
            eyebrow="Watchlist"
            title="Products you are watching"
            description="We flag when a rate changed or data went stale. Watching is not a recommendation."
          />

          {!ready || loading ? (
            <LoadingState label="Loading your watchlist..." />
          ) : !isAuthenticated ? (
            <EmptyState title="Sign in required" body="Sign in to keep a private watchlist of products." />
          ) : items.length === 0 ? (
            <EmptyState title="Nothing watched yet" body="Open a product and add it to your watchlist." />
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((w) => {
                const product = w.product as Record<string, unknown>;
                return (
                  <PremiumCard key={String(w.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/marketplace/products/${String(product.slug)}`} className="text-base font-semibold text-textPrimary hover:underline">
                          {String(product.name)}
                        </Link>
                        <p className="text-sm text-textSecondary">{String(product.provider_name ?? "")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {product.annual_yield ? <TrustBadge tone="muted">{String(product.annual_yield)}% now</TrustBadge> : null}
                          {w.last_seen_rate_value ? <TrustBadge tone="muted">was {String(w.last_seen_rate_value)}%</TrustBadge> : null}
                          {w.rate_changed ? <TrustBadge tone="amber">Rate changed</TrustBadge> : null}
                          {w.stale ? <TrustBadge tone="danger">Data may be stale</TrustBadge> : null}
                        </div>
                        {w.note ? <p className="mt-2 text-sm text-textSecondary">Note: {String(w.note)}</p> : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link href={`/simulate/${String(product.slug)}`} className="rounded-full border border-border px-3 py-1.5 text-center text-xs hover:border-borderStrong">Run simulation</Link>
                        <button type="button" onClick={() => remove(Number(w.id))} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-borderStrong">Remove</button>
                      </div>
                    </div>
                  </PremiumCard>
                );
              })}
            </div>
          )}

          <NoAdviceNote />
        </div>
      </PageShell>
    </AppShell>
  );
}
