import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { PesaRouteApiClient } from "../api/client";
import {
  EmptyState,
  ErrorState,
  GoalChip,
  LoadingState,
  PremiumCard,
  PrimaryButton,
  SecondaryButton,
  TrustBadge,
  maliPrime,
  maliPrimeText
} from "../components/maliprime";
import type { AuthCredentials, MarketplaceProduct } from "../types";

type MarketView = "home" | "list" | "detail" | "compare" | "watchlist" | "brief";

type Props = {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  onRequestAuth: () => void;
};

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "money_market_fund", label: "Money market" },
  { value: "sacco_deposit", label: "SACCO" },
  { value: "treasury_bill", label: "T-bill" },
  { value: "fixed_deposit", label: "Fixed deposit" }
];
const SORTS = ["name", "yield", "minimum", "freshness", "beginner_friendly"];
const FINDER_GOALS = ["emergency_fund", "first_investment", "school_fees", "land_deposit", "retirement", "chama_sacco", "diaspora_investing"];
const SACCO_TYPES = new Set(["sacco_deposit", "sacco_share_capital"]);

const DISCLAIMER =
  "Educational information only. PesaRoute does not hold money, execute investments, recommend providers, or promise returns. Verify with the provider, regulator, and a licensed professional before committing money.";

function label(v: string): string {
  return v.replace(/_/g, " ");
}

export function MarketplaceScreen({ apiClient, auth, onRequestAuth }: Props) {
  const [view, setView] = useState<MarketView>("home");
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [compareRows, setCompareRows] = useState<Array<Record<string, unknown>>>([]);
  const [watchlist, setWatchlist] = useState<Array<Record<string, unknown>>>([]);
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);
  const [netCalc, setNetCalc] = useState<Record<string, unknown> | null>(null);
  const [saccoScore, setSaccoScore] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [finder, setFinder] = useState<Record<string, unknown> | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { sort };
      if (search) params.search = search;
      if (type) params.product_type = type;
      const res = await apiClient.marketplaceProducts(params);
      setProducts(res.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, search, type, sort]);

  useEffect(() => {
    if (view === "list") {
      const t = setTimeout(() => void loadList(), 250);
      return () => clearTimeout(t);
    }
  }, [view, loadList]);

  async function runFinder(goal: string) {
    setLoading(true);
    try {
      setFinder(await apiClient.marketplaceFinder({ goal }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finder failed.");
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(slug: string) {
    setLoading(true);
    setError(null);
    setNetCalc(null);
    setSaccoScore(null);
    try {
      const product = await apiClient.marketplaceProduct(slug);
      setSelected(product);
      setView("detail");
      if (SACCO_TYPES.has(String(product.product_type))) {
        setSaccoScore(await apiClient.marketplaceSaccoScore(slug));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open product.");
    } finally {
      setLoading(false);
    }
  }

  async function runNetAfterTax() {
    if (!selected) return;
    try {
      const result = await apiClient.marketplaceNetAfterTax({
        initial_amount: "100000",
        timeline_months: 12,
        annual_yield: selected.annual_yield ?? "10",
        yield_treatment: selected.yield_type === "net_of_management_fee" ? "net_of_management_fee" : "unknown",
        management_fee: selected.management_fee_rate ?? "0",
        withholding_tax_rate: "15"
      });
      setNetCalc(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed.");
    }
  }

  function toggleCompare(slug: string) {
    setCompareSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 5 ? prev : [...prev, slug]));
  }

  async function runCompare() {
    if (compareSlugs.length < 2) return;
    setLoading(true);
    try {
      const data = await apiClient.marketplaceCompare(compareSlugs);
      setCompareRows((data.rows as Array<Record<string, unknown>>) ?? []);
      setView("compare");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed.");
    } finally {
      setLoading(false);
    }
  }

  async function loadWatchlist() {
    if (!auth) {
      onRequestAuth();
      return;
    }
    setLoading(true);
    try {
      setWatchlist(await apiClient.listWatchlist(auth));
      setView("watchlist");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load watchlist.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBrief() {
    if (!auth) {
      onRequestAuth();
      return;
    }
    setLoading(true);
    try {
      setBrief(await apiClient.personalBrief(auth));
      setView("brief");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load brief.");
    } finally {
      setLoading(false);
    }
  }

  async function watch() {
    if (!auth || !selected) {
      onRequestAuth();
      return;
    }
    try {
      await apiClient.addToWatchlist(String(selected.slug), "", auth);
      setNotice("Added to your watchlist.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not watch.");
    }
  }

  async function journal() {
    if (!auth || !selected) {
      onRequestAuth();
      return;
    }
    try {
      await apiClient.saveProductToJournal(String(selected.slug), "Considering this product.", auth);
      setNotice("Saved to your private journal with assumptions.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }

  async function review() {
    if (!auth || !selected) {
      onRequestAuth();
      return;
    }
    try {
      await apiClient.requestProductReview(String(selected.slug), { question: "Please review my assumptions.", goal: "first_investment" }, auth);
      setNotice("Review requested. Amount shared as a range; access expires automatically.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request review.");
    }
  }

  // --- renders ---------------------------------------------------------------

  function card(p: MarketplaceProduct) {
    const isSacco = SACCO_TYPES.has(p.product_type);
    return (
      <PremiumCard key={p.slug}>
        <Text style={maliPrimeText.sectionTitle}>{p.name}</Text>
        <Text style={s.muted}>{p.provider_name ?? "Provider not listed"} · {p.currency}</Text>
        <View style={s.row}>
          <TrustBadge tone={p.freshness_status === "stale" ? "danger" : p.freshness_status === "fresh" ? "emerald" : "muted"}>
            {p.freshness_status}
          </TrustBadge>
          <TrustBadge tone="muted">{p.source_confidence === "official" ? "Official source" : "Provider-reported"}</TrustBadge>
          {p.mpesa_paybill_available ? <TrustBadge tone="emerald">M-Pesa</TrustBadge> : null}
        </View>
        {isSacco ? (
          <Text style={s.body}>
            Dividend {p.dividend_rate_latest ?? "-"}% · Deposit interest {p.interest_on_deposits_latest ?? "-"}% · DD score {p.sacco_due_diligence_score ?? "-"}/100
          </Text>
        ) : p.annual_yield ? (
          <Text style={s.body}>{p.annual_yield}% annual yield{p.current_rate ? ` · as of ${p.current_rate.snapshot_date}` : ""}</Text>
        ) : (
          <Text style={s.warn}>Latest rate unavailable. Use a custom educational rate.</Text>
        )}
        <View style={s.row}>
          <SecondaryButton onPress={() => openDetail(p.slug)}>Details</SecondaryButton>
          <GoalChip active={compareSlugs.includes(p.slug)} label={compareSlugs.includes(p.slug) ? "In compare" : "Compare"} onPress={() => toggleCompare(p.slug)} />
        </View>
      </PremiumCard>
    );
  }

  function renderHome() {
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.eyebrow}>Marketplace</Text>
        <Text style={maliPrimeText.title}>Search. Compare. Simulate. Decide.</Text>
        <Text style={maliPrimeText.subtitle}>
          A guided decision layer - never a "best product" ranking. Find products to understand, compare assumptions,
          and save your reasoning before you commit money.
        </Text>
        <PrimaryButton onPress={() => setView("list")}>Browse products</PrimaryButton>
        <SecondaryButton onPress={loadWatchlist}>Your watchlist</SecondaryButton>
        <SecondaryButton onPress={loadBrief}>Your money brief</SecondaryButton>

        <Text style={maliPrimeText.sectionTitle}>Find products for a goal</Text>
        <View style={s.chips}>
          {FINDER_GOALS.map((g) => (
            <GoalChip key={g} label={label(g)} onPress={() => runFinder(g)} />
          ))}
        </View>
        {finder ? (
          <PremiumCard>
            <Text style={s.body}>Products to understand: {(finder.products_to_understand as Array<Record<string, unknown>>).map((x) => x.label).join(", ")}</Text>
            {(finder.route_to_land_safety as boolean) ? (
              <Text style={s.warn}>Land needs a safety workflow, not just price comparison. Open the Land tab.</Text>
            ) : null}
            <Text style={s.muted}>Professional to consult: {String(finder.professional_to_consult)}</Text>
          </PremiumCard>
        ) : null}
        <Text style={s.footer}>{DISCLAIMER}</Text>
      </View>
    );
  }

  function renderList() {
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.sectionTitle}>Products</Text>
        <TextInput
          style={s.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search product or provider"
          placeholderTextColor={maliPrime.colors.textTertiary}
        />
        <View style={s.chips}>
          {TYPE_FILTERS.map((t) => (
            <GoalChip key={t.value} active={type === t.value} label={t.label} onPress={() => setType(t.value)} />
          ))}
        </View>
        <View style={s.chips}>
          {SORTS.map((srt) => (
            <GoalChip key={srt} active={sort === srt} label={label(srt)} onPress={() => setSort(srt)} />
          ))}
        </View>
        {compareSlugs.length >= 2 ? <PrimaryButton onPress={runCompare}>Compare {compareSlugs.length} (assumptions)</PrimaryButton> : null}
        {loading ? <LoadingState /> : products.length === 0 ? <EmptyState title="No products" body="Try a different search or filter." /> : products.map(card)}
        <SecondaryButton onPress={() => setView("home")}>Back</SecondaryButton>
      </View>
    );
  }

  function renderDetail() {
    if (!selected) return null;
    const isSacco = SACCO_TYPES.has(String(selected.product_type));
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.sectionTitle}>{String(selected.name)}</Text>
        <Text style={s.muted}>{String(selected.provider_name ?? "")} · {String(selected.currency)}</Text>
        {notice ? <PremiumCard tone="success"><Text style={s.body}>{notice}</Text></PremiumCard> : null}

        {!isSacco ? (
          <PremiumCard>
            <Text style={maliPrimeText.sectionTitle}>Net-after-tax estimate</Text>
            <Text style={s.muted}>Educational, KES 100,000 over 12 months, 15% withholding tax on growth.</Text>
            <PrimaryButton onPress={runNetAfterTax}>Estimate</PrimaryButton>
            {netCalc ? (
              <Text style={s.body}>
                Gross KES {String(netCalc.gross_estimate)} · Fee KES {String(netCalc.fee_estimate)} · Tax KES {String(netCalc.tax_estimate)} · Net KES {String(netCalc.net_estimated_total_value)}
              </Text>
            ) : null}
          </PremiumCard>
        ) : null}

        {isSacco && saccoScore ? (
          <PremiumCard>
            <Text style={maliPrimeText.sectionTitle}>SACCO due-diligence score: {String(saccoScore.score)}/100</Text>
            <Text style={s.muted}>{String(saccoScore.note)}</Text>
          </PremiumCard>
        ) : null}

        <SecondaryButton onPress={watch}>Save to watchlist</SecondaryButton>
        <SecondaryButton onPress={journal}>Save to journal</SecondaryButton>
        <SecondaryButton onPress={review}>Request professional review</SecondaryButton>
        <SecondaryButton onPress={() => setView("list")}>Back to products</SecondaryButton>
      </View>
    );
  }

  function renderCompare() {
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.sectionTitle}>Compare assumptions before committing money</Text>
        {compareRows.map((r) => {
          const p = r.product as MarketplaceProduct;
          return (
            <PremiumCard key={p.slug}>
              <Text style={maliPrimeText.sectionTitle}>{p.name}</Text>
              <Text style={s.body}>Yield: {p.annual_yield ? `${p.annual_yield}%` : "Unavailable"} · Fee: {p.management_fee_rate ?? "?"}% · Min: {p.minimum_amount ?? "?"}</Text>
              <Text style={s.muted}>Freshness {p.freshness_status} · {p.liquidity_level} liquidity · {label(p.risk_level)} risk</Text>
            </PremiumCard>
          );
        })}
        <Text style={s.footer}>{DISCLAIMER}</Text>
        <SecondaryButton onPress={() => setView("list")}>Back</SecondaryButton>
      </View>
    );
  }

  function renderWatchlist() {
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.sectionTitle}>Your watchlist</Text>
        {watchlist.length === 0 ? <EmptyState title="Nothing watched" body="Open a product and add it to your watchlist." /> : null}
        {watchlist.map((w) => {
          const p = w.product as MarketplaceProduct;
          return (
            <PremiumCard key={String(w.id)}>
              <Text style={maliPrimeText.sectionTitle}>{p.name}</Text>
              <View style={s.row}>
                {p.annual_yield ? <TrustBadge tone="muted">{p.annual_yield}% now</TrustBadge> : null}
                {(w.rate_changed as boolean) ? <TrustBadge tone="amber">Rate changed</TrustBadge> : null}
                {(w.stale as boolean) ? <TrustBadge tone="danger">Data may be stale</TrustBadge> : null}
              </View>
              <SecondaryButton onPress={() => auth && apiClient.removeFromWatchlist(Number(w.id), auth).then(loadWatchlist)}>Remove</SecondaryButton>
            </PremiumCard>
          );
        })}
        <SecondaryButton onPress={() => setView("home")}>Back</SecondaryButton>
      </View>
    );
  }

  function renderBrief() {
    if (!brief) return null;
    const section = (title: string, rows: string[]) => (
      <PremiumCard>
        <Text style={maliPrimeText.sectionTitle}>{title}</Text>
        {rows.length ? rows.map((r, i) => <Text key={i} style={s.body}>- {r}</Text>) : <Text style={s.muted}>Nothing here yet.</Text>}
      </PremiumCard>
    );
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.title}>Your money brief</Text>
        {section("Watching", (brief.products_you_are_watching as Array<Record<string, unknown>>).map((p) => String(p.name)))}
        {section("Data that is stale", (brief.data_that_is_stale as Array<Record<string, unknown>>).map((p) => `${String(p.name)} - verify before committing`))}
        {section("Simulations to rerun", (brief.simulations_to_rerun as Array<Record<string, unknown>>).map((sx) => String(sx.name)))}
        {section("Journal decisions to review", (brief.journal_decisions_to_review as Array<Record<string, unknown>>).map((j) => String(j.goal) || "Decision"))}
        <SecondaryButton onPress={() => setView("home")}>Back</SecondaryButton>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      {error ? <ErrorState message={error} /> : null}
      {view === "home" && renderHome()}
      {view === "list" && renderList()}
      {view === "detail" && renderDetail()}
      {view === "compare" && renderCompare()}
      {view === "watchlist" && renderWatchlist()}
      {view === "brief" && renderBrief()}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: maliPrime.spacing.lg, gap: maliPrime.spacing.lg, paddingBottom: 64 },
  stack: { gap: maliPrime.spacing.md },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginVertical: 6, alignItems: "center" },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  input: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15
  },
  body: { color: maliPrime.colors.textPrimary, fontSize: 14, lineHeight: 21 },
  muted: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  warn: { color: maliPrime.colors.amber, fontSize: 13, fontWeight: "600" },
  footer: { color: maliPrime.colors.textTertiary, fontSize: 12, lineHeight: 18 }
});
