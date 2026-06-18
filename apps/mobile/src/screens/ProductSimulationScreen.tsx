import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { BillingEntitlementSnapshot, PesaRouteApiClient } from "../api/client";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PremiumCard,
  PrimaryButton,
  SecondaryButton,
  TrustBadge,
  maliPrime,
  maliPrimeText
} from "../components/maliprime";
import type {
  AuthCredentials,
  InvestmentProduct,
  JournalEntryDraft,
  ProductCompareItem,
  ProductSpecificResult,
  ReviewPrefill
} from "../types";
import { formatKes, parseMoneyInput } from "../utils/format";
import {
  CONFIDENCE_OPTIONS,
  CURRENCY_OPTIONS,
  FRESHNESS_OPTIONS,
  LIQUIDITY_OPTIONS,
  PRODUCT_SPECIFIC_RATE_MODES,
  RISK_OPTIONS,
  SIM_CATEGORIES,
  type ProductFilters,
  type ProductSpecificRateModeKey,
  type SimCategory,
  activeFilterCount,
  buildProductQuery,
  canCompare,
  confidenceLabel,
  consultationCategoryForProductType,
  freshnessLabel,
  freshnessTone,
  summariseCategory,
  toggleCompareSelection
} from "../utils/products";

type SimView = "home" | "filters" | "list" | "detail" | "compare" | "virtual";

const REFLECTION_PROMPTS = [
  "Why am I considering this product?",
  "What risk could make me avoid it?",
  "When should I review this decision?"
];

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  onChangeText,
  value,
  keyboardType = "numeric",
  placeholder
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
  keyboardType?: "numeric" | "default";
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={maliPrime.colors.textTertiary}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function currencyAmount(currency: string, value: string | null): string {
  if (value === null) return "Not available";
  const numeric = Number(value);
  if (currency === "KES" && Number.isFinite(numeric)) {
    return formatKes(numeric);
  }
  return `${currency} ${value}`;
}

function FreshnessRow({ product }: { product: InvestmentProduct }) {
  return (
    <View style={styles.badgeRow}>
      <TrustBadge tone={freshnessTone(product.freshness_status)}>{freshnessLabel(product.freshness_status)}</TrustBadge>
      <TrustBadge tone="muted">{confidenceLabel(product.source_confidence)}</TrustBadge>
    </View>
  );
}

export function ProductSimulationScreen({
  apiClient,
  auth,
  entitlements,
  onSaveJournal,
  onOpenPricing,
  onOpenProfessionals,
  onOpenGenericSimulator,
  onOpenPassports
}: {
  apiClient: PesaRouteApiClient;
  auth?: AuthCredentials | null;
  entitlements: BillingEntitlementSnapshot | null;
  onSaveJournal?: (entry: JournalEntryDraft) => void;
  onOpenPricing: () => void;
  onOpenProfessionals?: (prefill: ReviewPrefill) => void;
  onOpenGenericSimulator?: () => void;
  onOpenPassports?: () => void;
}) {
  const [view, setView] = useState<SimView>("home");
  const [allProducts, setAllProducts] = useState<InvestmentProduct[]>([]);
  const [listProducts, setListProducts] = useState<InvestmentProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [selected, setSelected] = useState<InvestmentProduct | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareItems, setCompareItems] = useState<ProductCompareItem[] | null>(null);

  // Simulation form state
  const [amount, setAmount] = useState("50000");
  const [monthlyTopup, setMonthlyTopup] = useState("0");
  const [timeline, setTimeline] = useState("12");
  const [rateMode, setRateMode] = useState<ProductSpecificRateModeKey>("latest_available_rate");
  const [customRate, setCustomRate] = useState("10");
  const [includeFees, setIncludeFees] = useState(true);
  const [includeTax, setIncludeTax] = useState(false);
  const [goal, setGoal] = useState("");
  const [liquidityNeed, setLiquidityNeed] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductSpecificResult | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [tourDismissed, setTourDismissed] = useState(false);

  // Virtual (educational) what-if portfolio state
  const [vpId, setVpId] = useState<number | null>(null);
  const [vpCash, setVpCash] = useState("100000");
  const [vpGoal, setVpGoal] = useState("");
  const [vpProductSlug, setVpProductSlug] = useState("");
  const [vpAllocation, setVpAllocation] = useState("40000");
  const [vpPositions, setVpPositions] = useState<Array<{ name: string; amount: string }>>([]);
  const [vpRun, setVpRun] = useState<{ estimated_value: string; estimated_growth: string; total_contributions: string; label: string } | null>(null);
  const [vpBusy, setVpBusy] = useState(false);
  const [vpError, setVpError] = useState<string | null>(null);

  const loadAllProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const products = await apiClient.allProducts();
      setAllProducts(products);
      setApiAvailable(true);
    } catch (loadError) {
      setApiAvailable(false);
      setError(loadError instanceof Error ? loadError.message : "Product data unavailable.");
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void loadAllProducts();
  }, [loadAllProducts]);

  const runList = useCallback(
    async (nextFilters: ProductFilters) => {
      setLoading(true);
      setError(null);
      try {
        const products = await apiClient.products(buildProductQuery(nextFilters));
        setListProducts(products);
        setApiAvailable(true);
      } catch (listError) {
        // Graceful fallback: filter the already-loaded catalogue client-side.
        setApiAvailable(false);
        setError(listError instanceof Error ? listError.message : "Showing cached products.");
        setListProducts(
          allProducts.filter((product) => {
            if (nextFilters.product_type && product.product_type !== nextFilters.product_type) return false;
            if (nextFilters.risk_level && product.risk_level !== nextFilters.risk_level) return false;
            if (nextFilters.liquidity_level && product.liquidity_level !== nextFilters.liquidity_level) return false;
            if (nextFilters.currency && product.currency !== nextFilters.currency) return false;
            if (nextFilters.freshness_status && product.freshness_status !== nextFilters.freshness_status) return false;
            if (nextFilters.source_confidence && product.source_confidence !== nextFilters.source_confidence)
              return false;
            if (nextFilters.has_current_rate && !product.current_rate) return false;
            return true;
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [allProducts, apiClient]
  );

  function openCategory(category: SimCategory) {
    // Filter by category slug so the drilldown shows every product in the category
    // (some categories span multiple product types, e.g. NSE share + CDS routes).
    const nextFilters: ProductFilters = { category: category.categorySlug };
    setFilters(nextFilters);
    setCompareIds([]);
    setView("list");
    void runList(nextFilters);
  }

  function openAllProducts() {
    setFilters({});
    setCompareIds([]);
    setView("list");
    void runList({});
  }

  function applyFilters() {
    setCompareIds([]);
    setView("list");
    void runList(filters);
  }

  function openProduct(product: InvestmentProduct) {
    setSelected(product);
    setResult(null);
    setSimError(null);
    setActionStatus(null);
    setRateMode(product.current_rate ? "latest_available_rate" : "neutral_scenario");
    setView("detail");
  }

  async function runSimulation() {
    if (!selected) return;
    setSimLoading(true);
    setSimError(null);
    setActionStatus(null);
    try {
      const payload = {
        product_slug: selected.slug,
        initial_amount: parseMoneyInput(amount, 50000).toFixed(2),
        monthly_topup: parseMoneyInput(monthlyTopup, 0).toFixed(2),
        timeline_months: Math.max(1, Math.round(parseMoneyInput(timeline, 12))),
        rate_mode: rateMode,
        include_fees: includeFees,
        include_tax_estimate: includeTax,
        ...(rateMode === "custom_educational_rate" ? { custom_rate: parseMoneyInput(customRate, 10).toFixed(4) } : {}),
        ...(goal ? { goal } : {})
      };
      const simulation = (await apiClient.simulateProductSpecific(payload, auth)) as unknown as ProductSpecificResult;
      setResult(simulation);
    } catch (runError) {
      setSimError(runError instanceof Error ? runError.message : "Simulation failed. Try again or use a custom rate.");
    } finally {
      setSimLoading(false);
    }
  }

  async function openCompare() {
    if (!canCompare(compareIds)) return;
    setLoading(true);
    setError(null);
    setCompareItems(null);
    setView("compare");
    try {
      const response = await apiClient.compareProducts(compareIds);
      setCompareItems(response.results);
    } catch (compareError) {
      setError(compareError instanceof Error ? compareError.message : "Compare unavailable.");
      setCompareItems(
        allProducts
          .filter((product) => compareIds.includes(product.id))
          .map((product) => ({
            id: product.id,
            name: product.name,
            slug: product.slug,
            provider: product.provider?.name ?? "",
            category: product.category?.name ?? "",
            risk_level: product.risk_level,
            liquidity_level: product.liquidity_level,
            minimum_amount: product.minimum_amount,
            current_rate: product.current_rate
              ? {
                  id: product.current_rate.id,
                  snapshot_date: product.current_rate.snapshot_date,
                  rate_type: product.current_rate.rate_type,
                  rate_value: product.current_rate.rate_value,
                  rate_period: product.current_rate.rate_period,
                  confidence: product.current_rate.confidence
                }
              : null,
            fees: [],
            freshness_status: product.freshness_status,
            source_confidence: product.source_confidence,
            documents_needed: product.documents_needed,
            questions_to_ask: product.questions_to_ask
          }))
      );
    } finally {
      setLoading(false);
    }
  }

  function saveToJournal() {
    if (!selected || !result) return;
    const providerName = result.provider.name || "the provider";
    const estimatedValue = result.estimated_maturity_value ?? result.estimated_gross_value;
    const reflection = [
      `Product: ${selected.name} via ${providerName}.`,
      `Timeline: ${timeline} months. Rate source: ${result.rate_source_label}.`,
      `Freshness: ${freshnessLabel(result.freshness)}. Estimated value: ${estimatedValue ? currencyAmount(selected.currency, estimatedValue) : "unavailable"}.`,
      "",
      ...REFLECTION_PROMPTS.map((prompt) => `- ${prompt}`)
    ].join("\n");
    onSaveJournal?.({
      goal: goal ? `Simulate: ${selected.name} (${goal})` : `Simulate: ${selected.name}`,
      decision: `Considering ${selected.name} via ${providerName}`,
      amountDisplayMode: "range",
      amountText: `KES ${amount}`,
      reason: reflection
    });
    setActionStatus("Saved to journal as a range. Add your reflection answers anytime.");
  }

  function requestReview() {
    if (!selected) return;
    const amountValue = parseMoneyInput(amount, 50000);
    const low = Math.max(1000, Math.round((amountValue * 0.8) / 1000) * 1000);
    const high = Math.round((amountValue * 1.2) / 1000) * 1000;
    const sourceNote = result
      ? `Simulation: ${result.rate_source_label}; freshness ${freshnessLabel(result.freshness)}; ${confidenceLabel(
          result.source_confidence
        )}.`
      : "";
    onOpenProfessionals?.({
      category: consultationCategoryForProductType(selected.product_type) as ReviewPrefill["category"],
      amountRange: `KES ${Math.round(low / 1000)}k-${Math.round(high / 1000)}k`,
      question: `Reviewing ${selected.name} via ${selected.provider?.name ?? "a provider"}. ${sourceNote} What should I check before committing money?`
    });
  }

  async function createVp() {
    if (!auth) {
      setVpError("Sign in from the Profile tab to build and save a what-if portfolio.");
      return;
    }
    setVpBusy(true);
    setVpError(null);
    try {
      const pf = (await apiClient.createVirtualPortfolio(
        { name: "My what-if plan", starting_virtual_cash: parseMoneyInput(vpCash, 100000).toFixed(2), goal: vpGoal },
        auth
      )) as { id: number };
      setVpId(pf.id);
      setVpPositions([]);
      setVpRun(null);
    } catch {
      setVpError("Could not create the portfolio.");
    } finally {
      setVpBusy(false);
    }
  }

  async function addVpPosition() {
    const slug = vpProductSlug || allProducts[0]?.slug;
    if (!auth || vpId === null || !slug) return;
    setVpBusy(true);
    setVpError(null);
    try {
      await apiClient.addVirtualPosition(
        vpId,
        { product_slug: slug, virtual_amount_allocated: parseMoneyInput(vpAllocation, 0).toFixed(2), rate_mode: "neutral_scenario", timeline_months: 12 },
        auth
      );
      const product = allProducts.find((p) => p.slug === slug);
      setVpPositions((prev) => [...prev, { name: product?.name ?? slug, amount: parseMoneyInput(vpAllocation, 0).toFixed(2) }]);
      setVpRun(null);
    } catch {
      setVpError("Could not add the product.");
    } finally {
      setVpBusy(false);
    }
  }

  async function runVp() {
    if (!auth || vpId === null) return;
    setVpBusy(true);
    setVpError(null);
    try {
      const r = (await apiClient.runVirtualPortfolio(vpId, auth)) as {
        estimated_value: string;
        estimated_growth: string;
        total_contributions: string;
        label: string;
      };
      setVpRun(r);
    } catch {
      setVpError("Could not run the portfolio.");
    } finally {
      setVpBusy(false);
    }
  }

  // ---- Render helpers -------------------------------------------------------

  function renderHome() {
    const showLock = !entitlements?.features.unlimited_simulations;
    return (
      <View style={styles.screen}>
        <Text style={maliPrimeText.title}>Simulate</Text>
        <Text style={maliPrimeText.subtitle}>
          Compare source-linked estimates, liquidity, fees, and what can go wrong before committing money.
        </Text>

        {showLock ? (
          <PremiumCard tone="warning">
            <Text style={styles.lockTitle}>Free simulation access</Text>
            <Text style={styles.lockCopy}>
              Core educational simulations stay available. Premium is prepared for unlimited runs.
            </Text>
            <View style={styles.spacer} />
            <SecondaryButton onPress={onOpenPricing}>View Premium</SecondaryButton>
          </PremiumCard>
        ) : null}

        {error && !apiAvailable ? (
          <PremiumCard tone="warning">
            <Text style={styles.lockTitle}>Live product data unavailable</Text>
            <Text style={styles.lockCopy}>
              Showing categories from local knowledge. You can still run an educational simulation with a custom rate.
            </Text>
            {onOpenGenericSimulator ? (
              <>
                <View style={styles.spacer} />
                <SecondaryButton onPress={onOpenGenericSimulator}>Open generic simulator</SecondaryButton>
              </>
            ) : null}
          </PremiumCard>
        ) : null}

        {!tourDismissed ? (
          <PremiumCard tone="alt">
            <Text style={styles.cardLabel}>How the simulator works</Text>
            <Text style={styles.bullet}>• Practise before using real money — every figure is an educational estimate.</Text>
            <Text style={styles.bullet}>• Choose real Kenyan products or generic categories.</Text>
            <Text style={styles.bullet}>• Rates show their source and freshness; missing rates use a custom rate.</Text>
            <Text style={styles.bullet}>• Save your reasoning to your journal.</Text>
            <Text style={styles.bullet}>• Ask a verified professional when you need to.</Text>
            <View style={styles.spacerSm} />
            <SecondaryButton onPress={() => setTourDismissed(true)}>Got it</SecondaryButton>
          </PremiumCard>
        ) : null}

        <View style={styles.filterBar}>
          <SecondaryButton onPress={() => setView("filters")}>
            {activeFilterCount(filters) > 0 ? `Filters (${activeFilterCount(filters)})` : "All filters"}
          </SecondaryButton>
          <SecondaryButton onPress={openAllProducts}>Browse all products</SecondaryButton>
          <SecondaryButton onPress={() => setView("virtual")}>What-if portfolio</SecondaryButton>
        </View>

        {loading ? <LoadingState label="Loading product categories..." /> : null}

        <View style={styles.categoryGrid}>
          {SIM_CATEGORIES.map((category) => {
            const summary = summariseCategory(allProducts, category);
            return (
              <Pressable
                accessibilityRole="button"
                key={category.key}
                onPress={() => openCategory(category)}
                style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
              >
                <Text style={styles.categoryTitle}>{category.label}</Text>
                <Text style={styles.categoryBlurb}>{category.blurb}</Text>
                <View style={styles.badgeRow}>
                  <TrustBadge tone={category.defaultRisk.includes("high") ? "danger" : "muted"}>
                    {category.defaultRisk.replace("_", " ")} risk
                  </TrustBadge>
                  <TrustBadge tone={category.defaultLiquidity === "high" ? "emerald" : "muted"}>
                    {category.defaultLiquidity} liquidity
                  </TrustBadge>
                </View>
                <Text style={styles.categoryMeta}>
                  {summary.count} product{summary.count === 1 ? "" : "s"}
                  {summary.providers > 0 ? ` · ${summary.providers} provider${summary.providers === 1 ? "" : "s"}` : ""}
                  {" · "}
                  {summary.hasData ? "latest data available" : "no latest rate yet"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {onOpenGenericSimulator ? (
          <SecondaryButton onPress={onOpenGenericSimulator}>Generic educational simulator</SecondaryButton>
        ) : null}
        <Text style={styles.footerNote}>
          We never recommend a specific provider, call any product "best", or guarantee returns.
        </Text>
      </View>
    );
  }

  function renderFilters() {
    const set = (patch: Partial<ProductFilters>) => setFilters((current) => ({ ...current, ...patch }));
    const toggle = (key: keyof ProductFilters, value: string) =>
      set({ [key]: filters[key] === value ? undefined : value } as Partial<ProductFilters>);
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("home")} style={styles.backRow}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={maliPrimeText.title}>Filters</Text>
        <Text style={maliPrimeText.subtitle}>Narrow products, then compare or simulate. Stale and missing data stay visible.</Text>

        <Text style={styles.groupTitle}>Category</Text>
        <View style={styles.chipRow}>
          {SIM_CATEGORIES.map((category) => (
            <Chip
              key={category.key}
              active={filters.product_type === category.productType}
              label={category.label}
              onPress={() => toggle("product_type", category.productType)}
            />
          ))}
        </View>

        <Text style={styles.groupTitle}>Currency</Text>
        <View style={styles.chipRow}>
          {CURRENCY_OPTIONS.map((currency) => (
            <Chip key={currency} active={filters.currency === currency} label={currency} onPress={() => toggle("currency", currency)} />
          ))}
        </View>

        <Text style={styles.groupTitle}>Risk level</Text>
        <View style={styles.chipRow}>
          {RISK_OPTIONS.map((risk) => (
            <Chip key={risk} active={filters.risk_level === risk} label={risk.replace("_", " ")} onPress={() => toggle("risk_level", risk)} />
          ))}
        </View>

        <Text style={styles.groupTitle}>Liquidity level</Text>
        <View style={styles.chipRow}>
          {LIQUIDITY_OPTIONS.map((liquidity) => (
            <Chip
              key={liquidity}
              active={filters.liquidity_level === liquidity}
              label={liquidity}
              onPress={() => toggle("liquidity_level", liquidity)}
            />
          ))}
        </View>

        <Text style={styles.groupTitle}>Freshness</Text>
        <View style={styles.chipRow}>
          {FRESHNESS_OPTIONS.map((freshness) => (
            <Chip
              key={freshness}
              active={filters.freshness_status === freshness}
              label={freshness}
              onPress={() => toggle("freshness_status", freshness)}
            />
          ))}
        </View>

        <Text style={styles.groupTitle}>Source confidence</Text>
        <View style={styles.chipRow}>
          {CONFIDENCE_OPTIONS.map((confidence) => (
            <Chip
              key={confidence}
              active={filters.source_confidence === confidence}
              label={confidence.replace("_", " ")}
              onPress={() => toggle("source_confidence", confidence)}
            />
          ))}
        </View>

        <Field
          label="Provider name contains"
          keyboardType="default"
          onChangeText={(value) => set({ provider: value || undefined })}
          placeholder="e.g. CIC"
          value={filters.provider ?? ""}
        />
        <Field
          label="Maximum minimum amount (KES)"
          onChangeText={(value) => set({ minimum_amount_lte: value || undefined })}
          placeholder="e.g. 5000"
          value={filters.minimum_amount_lte ?? ""}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Has current rate only</Text>
          <Switch
            onValueChange={(value) => set({ has_current_rate: value || undefined })}
            thumbColor={maliPrime.colors.surface}
            trackColor={{ false: maliPrime.colors.surfaceSubtle, true: maliPrime.colors.emerald }}
            value={Boolean(filters.has_current_rate)}
          />
        </View>

        <View style={styles.spacer} />
        <PrimaryButton onPress={applyFilters}>Show products</PrimaryButton>
        <SecondaryButton onPress={() => setFilters({})}>Clear filters</SecondaryButton>
      </View>
    );
  }

  function renderList() {
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("home")} style={styles.backRow}>
          <Text style={styles.backText}>← Categories</Text>
        </Pressable>
        <Text style={maliPrimeText.title}>Products</Text>
        <View style={styles.filterBar}>
          <SecondaryButton onPress={() => setView("filters")}>
            {activeFilterCount(filters) > 0 ? `Filters (${activeFilterCount(filters)})` : "All filters"}
          </SecondaryButton>
          {compareIds.length > 0 ? (
            <SecondaryButton onPress={() => setCompareIds([])}>Clear compare ({compareIds.length})</SecondaryButton>
          ) : null}
        </View>

        {loading ? <LoadingState label="Loading products..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && listProducts.length === 0 ? (
          <EmptyState
            title="No products match"
            body="Try removing a filter. Missing data is never hidden - products without a rate still appear when filters allow."
          />
        ) : null}

        <View style={styles.list}>
          {listProducts.map((product) => {
            const selectedForCompare = compareIds.includes(product.id);
            return (
              <PremiumCard key={product.id}>
                <Text style={styles.cardTitle}>{product.name}</Text>
                <Text style={styles.cardMeta}>
                  {product.provider?.name ? `${product.provider.name} · ` : ""}
                  {product.category?.name ?? product.product_type}
                </Text>
                {product.current_rate ? (
                  <Text style={styles.rateValue}>
                    {product.current_rate.rate_value}% {product.current_rate.rate_type.replace(/_/g, " ")}
                    <Text style={styles.rateMeta}> · as of {product.current_rate.snapshot_date}</Text>
                  </Text>
                ) : (
                  <Text style={styles.rateUnavailable}>Latest rate unavailable - simulate with a custom educational rate.</Text>
                )}
                <FreshnessRow product={product} />
                <View style={styles.badgeRow}>
                  <TrustBadge tone={product.risk_level.includes("high") ? "danger" : "muted"}>
                    {product.risk_level.replace("_", " ")} risk
                  </TrustBadge>
                  <TrustBadge tone={product.liquidity_level === "high" ? "emerald" : "muted"}>
                    {product.liquidity_level} liquidity
                  </TrustBadge>
                  {product.minimum_amount ? <TrustBadge tone="muted">Min {currencyAmount(product.currency, product.minimum_amount)}</TrustBadge> : null}
                </View>
                {product.freshness_status === "stale" ? (
                  <Text style={styles.staleNote}>
                    Data may be stale.{product.last_verified_at ? ` Last verified ${product.last_verified_at.slice(0, 10)}.` : ""}
                  </Text>
                ) : null}
                <View style={styles.cardActions}>
                  <View style={styles.cardActionMain}>
                    <PrimaryButton onPress={() => openProduct(product)}>Simulate</PrimaryButton>
                  </View>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selectedForCompare }}
                    onPress={() => setCompareIds((current) => toggleCompareSelection(current, product.id))}
                    style={({ pressed }) => [styles.compareToggle, selectedForCompare && styles.compareToggleActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.compareToggleText, selectedForCompare && styles.compareToggleTextActive]}>
                      {selectedForCompare ? "✓ Compare" : "Compare"}
                    </Text>
                  </Pressable>
                </View>
              </PremiumCard>
            );
          })}
        </View>

        {compareIds.length > 0 ? (
          <PremiumCard tone="alt">
            <Text style={styles.cardTitle}>{compareIds.length} selected to compare</Text>
            <Text style={styles.cardMeta}>Compare 2-4 products side by side before committing money.</Text>
            <View style={styles.spacer} />
            <PrimaryButton disabled={!canCompare(compareIds)} onPress={openCompare}>
              {canCompare(compareIds) ? "Compare selected" : "Select 2-4 to compare"}
            </PrimaryButton>
          </PremiumCard>
        ) : null}
      </View>
    );
  }

  function renderDetail() {
    if (!selected) return null;
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("list")} style={styles.backRow}>
          <Text style={styles.backText}>← Products</Text>
        </Pressable>
        <Text style={maliPrimeText.title}>{selected.name}</Text>
        <Text style={maliPrimeText.subtitle}>
          {selected.provider?.name ? `${selected.provider.name} · ` : ""}
          {selected.category?.name ?? selected.product_type}
        </Text>

        <PremiumCard>
          {selected.current_rate ? (
            <>
              <Text style={styles.cardLabel}>Latest rate</Text>
              <Text style={styles.rateValue}>
                {selected.current_rate.rate_value}% {selected.current_rate.rate_type.replace(/_/g, " ")}
              </Text>
              <Text style={styles.cardMeta}>Snapshot date: {selected.current_rate.snapshot_date}</Text>
            </>
          ) : (
            <Text style={styles.rateUnavailable}>Latest rate unavailable. Use a custom educational rate below.</Text>
          )}
          <FreshnessRow product={selected} />
          {selected.freshness_status === "stale" ? (
            <Text style={styles.staleNote}>
              Data may be stale.{selected.last_verified_at ? ` Last verified ${selected.last_verified_at.slice(0, 10)}.` : ""} Verify with the provider.
            </Text>
          ) : null}
        </PremiumCard>

        <Field label="Amount (KES)" onChangeText={setAmount} value={amount} />
        <Field label="Monthly top-up (KES)" onChangeText={setMonthlyTopup} value={monthlyTopup} />
        <Field label="Timeline (months)" onChangeText={setTimeline} value={timeline} />

        <Text style={styles.groupTitle}>Rate mode</Text>
        <View style={styles.chipRow}>
          {PRODUCT_SPECIFIC_RATE_MODES.map((mode) => (
            <Chip
              key={mode.key}
              active={rateMode === mode.key}
              label={mode.label}
              onPress={() => setRateMode(mode.key)}
            />
          ))}
        </View>
        {rateMode === "custom_educational_rate" ? <Field label="Custom educational rate (% annual)" onChangeText={setCustomRate} value={customRate} /> : null}
        {rateMode === "latest_available_rate" && !selected.current_rate ? (
          <Text style={styles.staleNote}>Latest rate unavailable — use a scenario or custom educational rate.</Text>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Include fees</Text>
          <Switch
            onValueChange={setIncludeFees}
            thumbColor={maliPrime.colors.surface}
            trackColor={{ false: maliPrime.colors.surfaceSubtle, true: maliPrime.colors.emerald }}
            value={includeFees}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Estimate tax</Text>
          <Switch
            onValueChange={setIncludeTax}
            thumbColor={maliPrime.colors.surface}
            trackColor={{ false: maliPrime.colors.surfaceSubtle, true: maliPrime.colors.emerald }}
            value={includeTax}
          />
        </View>

        <Field label="Goal (optional)" keyboardType="default" onChangeText={setGoal} placeholder="e.g. emergency fund" value={goal} />
        <Field
          label="Liquidity need (optional)"
          keyboardType="default"
          onChangeText={setLiquidityNeed}
          placeholder="e.g. high / emergency"
          value={liquidityNeed}
        />

        {simError ? <ErrorState message={simError} /> : null}
        <PrimaryButton disabled={simLoading} onPress={runSimulation}>
          {simLoading ? "Running..." : "Run simulation"}
        </PrimaryButton>

        {result ? renderResult(result) : null}
      </View>
    );
  }

  function renderResult(simulation: ProductSpecificResult) {
    const currency = selected?.currency ?? "KES";
    const estimatedValue = simulation.estimated_maturity_value ?? simulation.estimated_gross_value;
    return (
      <>
        <PremiumCard tone="success">
          <Text style={styles.cardLabel}>Estimated value (not guaranteed)</Text>
          <Text style={styles.resultValue}>{estimatedValue ? currencyAmount(currency, estimatedValue) : "Not available"}</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultMetaLabel}>Total contributions</Text>
            <Text style={styles.resultMetaValue}>{currencyAmount(currency, simulation.total_contributions)}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultMetaLabel}>Estimated growth</Text>
            <Text style={styles.resultMetaValue}>{currencyAmount(currency, simulation.estimated_growth)}</Text>
          </View>
          {simulation.estimated_net_value ? (
            <View style={styles.resultRow}>
              <Text style={styles.resultMetaLabel}>After fees/tax</Text>
              <Text style={styles.resultMetaValue}>{currencyAmount(currency, simulation.estimated_net_value)}</Text>
            </View>
          ) : null}
          <View style={styles.resultRow}>
            <Text style={styles.resultMetaLabel}>Rate used</Text>
            <Text style={styles.resultMetaValue}>{simulation.rate_used ? `${simulation.rate_used}%` : "None applied"}</Text>
          </View>
        </PremiumCard>

        <PremiumCard tone="alt">
          <Text style={styles.cardLabel}>Source &amp; freshness</Text>
          <Text style={styles.cardMeta}>{simulation.rate_source_label}</Text>
          <View style={styles.badgeRow}>
            <TrustBadge tone={freshnessTone(simulation.freshness)}>{freshnessLabel(simulation.freshness)}</TrustBadge>
            <TrustBadge tone="muted">{confidenceLabel(simulation.source_confidence)}</TrustBadge>
            {simulation.snapshot_date ? <TrustBadge tone="muted">as of {simulation.snapshot_date}</TrustBadge> : null}
          </View>
        </PremiumCard>

        {simulation.assumptions.length > 0 ? (
          <PremiumCard>
            <Text style={styles.cardLabel}>Assumptions</Text>
            {simulation.assumptions.map((item) => (
              <Text key={item} style={styles.bullet}>• {item}</Text>
            ))}
          </PremiumCard>
        ) : null}

        {simulation.warnings.length > 0 ? (
          <PremiumCard tone="warning">
            <Text style={styles.cardLabel}>What to watch</Text>
            {simulation.warnings.map((warning) => (
              <Text key={warning} style={styles.bullet}>• {warning}</Text>
            ))}
          </PremiumCard>
        ) : null}

        {simulation.fees_notes.length > 0 ? (
          <PremiumCard>
            <Text style={styles.cardLabel}>Fee notes</Text>
            {simulation.fees_notes.map((fee) => (
              <Text key={fee} style={styles.bullet}>• {fee}</Text>
            ))}
          </PremiumCard>
        ) : null}

        {simulation.tax_notes.length > 0 ? (
          <PremiumCard>
            <Text style={styles.cardLabel}>Tax notes</Text>
            {simulation.tax_notes.map((note) => (
              <Text key={note} style={styles.bullet}>• {note}</Text>
            ))}
          </PremiumCard>
        ) : null}

        {simulation.liquidity_notes.length > 0 ? (
          <PremiumCard>
            <Text style={styles.cardLabel}>Withdrawal &amp; liquidity</Text>
            {simulation.liquidity_notes.map((note) => (
              <Text key={note} style={styles.bullet}>• {note}</Text>
            ))}
          </PremiumCard>
        ) : null}

        {simulation.beginner_mistakes.length > 0 ? (
          <PremiumCard>
            <Text style={styles.cardLabel}>Beginner mistakes</Text>
            {simulation.beginner_mistakes.map((mistake) => (
              <Text key={mistake} style={styles.bullet}>• {mistake}</Text>
            ))}
          </PremiumCard>
        ) : null}

        {simulation.questions_to_ask.length > 0 ? (
          <PremiumCard>
            <Text style={styles.cardLabel}>Questions to ask the provider/professional</Text>
            {simulation.questions_to_ask.map((question) => (
              <Text key={question} style={styles.bullet}>• {question}</Text>
            ))}
          </PremiumCard>
        ) : null}

        <PremiumCard tone="alt">
          <Text style={styles.cardLabel}>Next steps</Text>
          {actionStatus ? <Text style={styles.statusText}>{actionStatus}</Text> : null}
          {onSaveJournal ? <SecondaryButton onPress={saveToJournal}>Save to journal</SecondaryButton> : null}
          <View style={styles.spacerSm} />
          <SecondaryButton onPress={() => setView("virtual")}>Add to a what-if portfolio</SecondaryButton>
          <View style={styles.spacerSm} />
          <SecondaryButton onPress={() => setView("list")}>Compare another product</SecondaryButton>
          {onOpenProfessionals ? (
            <>
              <View style={styles.spacerSm} />
              <SecondaryButton onPress={requestReview}>Request professional review</SecondaryButton>
            </>
          ) : null}
          {onOpenPassports ? (
            <>
              <View style={styles.spacerSm} />
              <SecondaryButton onPress={onOpenPassports}>Learn this product</SecondaryButton>
            </>
          ) : null}
        </PremiumCard>

        <Text style={styles.disclaimer}>{simulation.disclaimer}</Text>
      </>
    );
  }

  function renderCompare() {
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("list")} style={styles.backRow}>
          <Text style={styles.backText}>← Products</Text>
        </Pressable>
        <Text style={maliPrimeText.title}>Compare</Text>
        <Text style={maliPrimeText.subtitle}>Compare before committing money. We do not pick a winner or a best option.</Text>

        {loading ? <LoadingState label="Loading comparison..." /> : null}
        {error ? <ErrorState message={error} /> : null}

        <View style={styles.list}>
          {(compareItems ?? []).map((item) => (
            <PremiumCard key={item.id}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.provider || "Provider not set"} · {item.category}</Text>
              <View style={styles.compareGrid}>
                <CompareRow label="Rate used" value={item.current_rate ? `${item.current_rate.rate_value}%` : "Unavailable"} />
                <CompareRow
                  label="Rate source"
                  value={item.current_rate ? `${confidenceLabel(item.source_confidence)} · ${item.current_rate.snapshot_date}` : "No latest rate"}
                />
                <CompareRow label="Freshness" value={freshnessLabel(item.freshness_status)} />
                <CompareRow label="Risk" value={item.risk_level.replace("_", " ")} />
                <CompareRow label="Liquidity" value={item.liquidity_level} />
                <CompareRow label="Minimum" value={item.minimum_amount ? currencyAmount("KES", item.minimum_amount) : "Varies"} />
              </View>
              {item.fees.length > 0 ? (
                <>
                  <Text style={styles.cardLabel}>Fee notes</Text>
                  {item.fees.map((fee) => (
                    <Text key={fee} style={styles.bullet}>• {fee}</Text>
                  ))}
                </>
              ) : null}
              {item.questions_to_ask.length > 0 ? (
                <>
                  <Text style={styles.cardLabel}>Questions to ask</Text>
                  {item.questions_to_ask.map((question) => (
                    <Text key={question} style={styles.bullet}>• {question}</Text>
                  ))}
                </>
              ) : null}
            </PremiumCard>
          ))}
        </View>
      </View>
    );
  }

  function renderVirtual() {
    const activeSlug = vpProductSlug || allProducts[0]?.slug || "";
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("home")} style={styles.backRow}>
          <Text style={styles.backText}>← Simulate</Text>
        </Pressable>
        <Text style={maliPrimeText.title}>What-if portfolio</Text>
        <Text style={maliPrimeText.subtitle}>
          Allocate virtual money across real products and see an estimated outcome. This is a learning portfolio, not
          real money — no buying, selling, or execution.
        </Text>

        {vpError ? <ErrorState message={vpError} /> : null}

        {!auth ? (
          <PremiumCard tone="warning">
            <Text style={styles.lockTitle}>Sign in to build a what-if portfolio</Text>
            <Text style={styles.lockCopy}>Open the Profile tab to sign in. Simulating single products stays open to everyone.</Text>
          </PremiumCard>
        ) : vpId === null ? (
          <PremiumCard>
            <Text style={styles.cardLabel}>Start your plan</Text>
            <Field label="Virtual starting amount (KES)" onChangeText={setVpCash} value={vpCash} />
            <Field label="Goal (optional)" keyboardType="default" onChangeText={setVpGoal} placeholder="e.g. balance liquidity and yield" value={vpGoal} />
            <View style={styles.spacerSm} />
            <PrimaryButton disabled={vpBusy} onPress={createVp}>Create what-if portfolio</PrimaryButton>
          </PremiumCard>
        ) : (
          <>
            <PremiumCard>
              <Text style={styles.cardLabel}>Add a product</Text>
              <View style={styles.chipRow}>
                {allProducts.slice(0, 12).map((product) => (
                  <Chip key={product.id} active={activeSlug === product.slug} label={product.name} onPress={() => setVpProductSlug(product.slug)} />
                ))}
              </View>
              <Field label="Allocation (KES)" onChangeText={setVpAllocation} value={vpAllocation} />
              <View style={styles.spacerSm} />
              <SecondaryButton onPress={addVpPosition}>Add to portfolio</SecondaryButton>
            </PremiumCard>

            <PremiumCard>
              <Text style={styles.cardLabel}>Your allocations</Text>
              {vpPositions.length === 0 ? (
                <Text style={styles.cardMeta}>No products added yet.</Text>
              ) : (
                vpPositions.map((pos, index) => (
                  <Text key={`${pos.name}-${index}`} style={styles.bullet}>• {pos.name}: {currencyAmount("KES", pos.amount)}</Text>
                ))
              )}
              <View style={styles.spacerSm} />
              <PrimaryButton disabled={vpBusy || vpPositions.length === 0} onPress={runVp}>Run what-if simulation</PrimaryButton>
            </PremiumCard>

            {vpRun ? (
              <PremiumCard tone="success">
                <Text style={styles.cardLabel}>Estimated portfolio value (not guaranteed)</Text>
                <Text style={styles.resultValue}>{currencyAmount("KES", vpRun.estimated_value)}</Text>
                <Text style={styles.cardMeta}>
                  Contributions {currencyAmount("KES", vpRun.total_contributions)} · estimated growth {currencyAmount("KES", vpRun.estimated_growth)}
                </Text>
                <Text style={styles.disclaimer}>{vpRun.label}</Text>
              </PremiumCard>
            ) : null}
          </>
        )}

        <Text style={styles.disclaimer}>This is a learning portfolio, not real money.</Text>
      </View>
    );
  }

  switch (view) {
    case "filters":
      return renderFilters();
    case "list":
      return renderList();
    case "detail":
      return renderDetail();
    case "compare":
      return renderCompare();
    case "virtual":
      return renderVirtual();
    default:
      return renderHome();
  }
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={styles.compareValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14 },
  pressed: { opacity: 0.78 },
  spacer: { height: 12 },
  spacerSm: { height: 8 },
  backRow: { paddingVertical: 4 },
  backText: { color: maliPrime.colors.textSecondary, fontSize: 14, fontWeight: "700" },
  filterBar: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  lockTitle: { color: maliPrime.colors.amber, fontSize: 14, fontWeight: "900" },
  lockCopy: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
  categoryGrid: { gap: 12 },
  categoryCard: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    padding: maliPrime.spacing.lg,
    ...maliPrime.shadow
  },
  categoryTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  categoryBlurb: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  categoryMeta: { color: maliPrime.colors.textPrimary, fontSize: 12, fontWeight: "700", marginTop: 10 },
  footerNote: { color: maliPrime.colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  groupTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900", marginTop: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  chipActive: { backgroundColor: maliPrime.colors.primary, borderColor: maliPrime.colors.primary },
  chipText: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  chipTextActive: { color: maliPrime.colors.surface },
  field: { gap: 6 },
  fieldLabel: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  input: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 50,
    paddingHorizontal: 14
  },
  switchRow: {
    alignItems: "center",
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    padding: 14
  },
  switchLabel: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "800" },
  list: { gap: 12 },
  cardTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  cardLabel: { color: maliPrime.colors.textPrimary, fontSize: 12, fontWeight: "900", marginTop: 10, textTransform: "uppercase" },
  cardMeta: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
  rateValue: { color: maliPrime.colors.primary, fontSize: 17, fontWeight: "900", lineHeight: 24, marginTop: 8 },
  rateMeta: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "700" },
  rateUnavailable: { color: maliPrime.colors.amber, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 8 },
  staleNote: { color: maliPrime.colors.danger, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 8 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  cardActions: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 14 },
  cardActionMain: { flex: 1 },
  compareToggle: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  compareToggleActive: { backgroundColor: maliPrime.colors.surfaceAlt, borderColor: maliPrime.colors.primary },
  compareToggleText: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "800" },
  compareToggleTextActive: { color: maliPrime.colors.primary },
  resultValue: { color: maliPrime.colors.emerald, fontSize: 24, fontWeight: "900", marginTop: 6 },
  resultRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  resultMetaLabel: { color: maliPrime.colors.textSecondary, fontSize: 13 },
  resultMetaValue: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "800" },
  bullet: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 4 },
  statusText: { color: maliPrime.colors.emerald, fontSize: 13, fontWeight: "800", lineHeight: 19, marginBottom: 8 },
  disclaimer: { color: maliPrime.colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 8 },
  compareGrid: { marginTop: 10 },
  compareRow: {
    borderTopColor: maliPrime.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8
  },
  compareLabel: { color: maliPrime.colors.textSecondary, fontSize: 13 },
  compareValue: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "800", textAlign: "right", flex: 1, marginLeft: 12 }
});
