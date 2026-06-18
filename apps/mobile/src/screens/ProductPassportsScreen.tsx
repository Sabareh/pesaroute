import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { PesaRouteApiClient, ProductPassportQuery } from "../api/client";
import { ProductPassportCard, maliPrime, maliPrimeText } from "../components/maliprime";
import type { CatalogState, ProductPassport } from "../types";

const riskLevels = ["all", "low", "moderate", "high", "very_high"];
const liquidityLevels = ["all", "high", "medium", "low", "locked"];

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatVerifiedAt(value?: string | null) {
  if (!value) return "Not verified yet";
  return new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function sourceSummary(passport: ProductPassport) {
  const firstReference = passport.source_references?.[0];
  if (firstReference) {
    return firstReference.citation_label || firstReference.title;
  }
  if (passport.public_source_url) {
    return passport.public_source_url;
  }
  return "Editorial educational content";
}

function learningRouteForCategory(categoryName: string) {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes("money market")) return "Money Market Funds";
  if (normalized.includes("treasury")) return "Treasury Bills and Bonds";
  if (normalized.includes("sacco")) return "SACCO Smart Member";
  if (normalized.includes("chama")) return "Chama Investment Basics";
  if (normalized.includes("land")) return "Land Due Diligence Basics";
  if (normalized.includes("stock") || normalized.includes("etf") || normalized.includes("nse")) {
    return normalized.includes("nse") ? "NSE Stocks for Beginners" : "Global Stocks and ETFs";
  }
  return "Money Foundations";
}

function filterLocal(
  passports: ProductPassport[],
  {
    category,
    liquidity_level,
    risk_level,
    search
  }: Pick<ProductPassportQuery, "category" | "liquidity_level" | "risk_level" | "search">
) {
  const term = search?.trim().toLowerCase();
  return passports.filter((passport) => {
    const categoryMatches = !category || passport.category.slug === category;
    const riskMatches = !risk_level || passport.risk_level === risk_level;
    const liquidityMatches = !liquidity_level || passport.liquidity_level === liquidity_level;
    const searchable = [
      passport.name,
      passport.provider?.name,
      passport.description,
      passport.beginner_mistakes.join(" "),
      passport.execution_route_external
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const searchMatches = !term || searchable.includes(term);
    return categoryMatches && riskMatches && liquidityMatches && searchMatches;
  });
}

export function ProductPassportsScreen({
  apiClient,
  catalog
}: {
  apiClient: PesaRouteApiClient;
  catalog: CatalogState;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");
  const [liquidityLevel, setLiquidityLevel] = useState("all");
  const [results, setResults] = useState<ProductPassport[]>(catalog.passports);
  const [selected, setSelected] = useState<ProductPassport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filterQuery = useMemo<ProductPassportQuery>(
    () => ({
      category: category === "all" ? undefined : category,
      liquidity_level: liquidityLevel === "all" ? undefined : liquidityLevel,
      ordering: "-updated_at",
      risk_level: riskLevel === "all" ? undefined : riskLevel,
      search: query.trim() || undefined,
      status: "published"
    }),
    [category, liquidityLevel, query, riskLevel]
  );

  async function applyFilters() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const apiResults = await apiClient.productPassports(filterQuery);
      setResults(apiResults);
    } catch (filterError) {
      setResults(filterLocal(catalog.passports, filterQuery));
      setError(filterError instanceof Error ? filterError.message : "API unavailable. Showing offline catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setResults(catalog.passports);
  }, [catalog.passports]);

  if (selected) {
    const learningRoute = learningRouteForCategory(selected.category.name);

    return (
      <View>
        <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.backButton}>
          <Text style={styles.backText}>Back to passports</Text>
        </Pressable>
        <Text style={maliPrimeText.title}>{selected.name}</Text>
        <Text style={maliPrimeText.subtitle}>{selected.description || "Educational product passport for this route."}</Text>

        <View style={styles.detailGrid}>
          <Fact label="Category" value={selected.category.name} />
          <Fact label="Provider" value={selected.provider?.name ?? "Generic"} />
          <Fact label="Risk" value={label(selected.risk_level)} />
          <Fact label="Liquidity" value={label(selected.liquidity_level)} />
          <Fact label="Minimum" value={selected.minimum_amount ? `KES ${selected.minimum_amount}` : "Varies"} />
          <Fact label="Regulator" value={selected.regulator_category || "Verify"} />
          <Fact label="Source" value={sourceSummary(selected)} />
          <Fact label="Learning route" value={learningRoute} />
          <Fact label="Freshness" value={label(selected.freshness_status ?? selected.data_freshness ?? "unknown")} />
          <Fact label="Last verified" value={formatVerifiedAt(selected.last_verified_at)} />
          <Fact label="Next review" value={formatVerifiedAt(selected.next_review_due_at)} />
        </View>

        {selected.source_references?.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Source references</Text>
            {selected.source_references.map((reference) => (
              <Text key={reference.id} style={styles.bullet}>
                - {reference.title}
              </Text>
            ))}
          </View>
        ) : null}

        <Section title="What to verify" items={selected.documents_needed} fallback="Provider documents and regulator status." />
        <Section title="Common beginner mistakes" items={selected.beginner_mistakes} fallback="Skipping provider and fee checks." />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>External route</Text>
          <Text style={styles.cardCopy}>
            {selected.execution_route_external || "Complete any investment directly with the regulated provider."}
          </Text>
          <Text style={styles.routeHint}>Open Learn to continue with: {learningRoute}</Text>
        </View>

        <View style={styles.placeholderRow}>
          <Pressable accessibilityRole="button" onPress={() => setNotice("Compare with placeholder saved for Phase 2.")} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Compare with</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setNotice("Watchlist placeholder saved locally later.")} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Save to watchlist</Text>
          </Pressable>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>
    );
  }

  return (
    <View>
      <Text style={maliPrimeText.title}>Product Passports</Text>
      <Text style={maliPrimeText.subtitle}>
        Search Kenyan investment categories and generic product passports by risk, liquidity, provider, and source notes.
      </Text>

      <View style={styles.searchPanel}>
        <TextInput
          onChangeText={setQuery}
          placeholder="Search product, provider, mistakes, route"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={styles.input}
          value={query}
        />
        <Text style={styles.groupTitle}>Category</Text>
        <View style={styles.pillRow}>
          <FilterChip active={category === "all"} labelText="All" onPress={() => setCategory("all")} />
          {catalog.categories.slice(0, 10).map((item) => (
            <FilterChip
              active={category === item.slug}
              key={item.slug}
              labelText={item.name}
              onPress={() => setCategory(item.slug)}
            />
          ))}
        </View>

        <Text style={styles.groupTitle}>Risk</Text>
        <View style={styles.pillRow}>
          {riskLevels.map((item) => (
            <FilterChip active={riskLevel === item} key={item} labelText={label(item)} onPress={() => setRiskLevel(item)} />
          ))}
        </View>

        <Text style={styles.groupTitle}>Liquidity</Text>
        <View style={styles.pillRow}>
          {liquidityLevels.map((item) => (
            <FilterChip
              active={liquidityLevel === item}
              key={item}
              labelText={label(item)}
              onPress={() => setLiquidityLevel(item)}
            />
          ))}
        </View>

        <Pressable accessibilityRole="button" disabled={loading} onPress={applyFilters} style={[styles.primaryButton, loading && styles.disabled]}>
          <Text style={styles.primaryText}>{loading ? "Searching..." : "Apply filters"}</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Offline fallback</Text>
          <Text style={styles.errorCopy}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.resultCount}>{results.length} passports</Text>
      <View style={styles.list}>
        {results.map((passport) => (
          <ProductPassportCard
            body={passport.description || passport.disclosures || "Educational passport for this route."}
            key={passport.id}
            liquidity={label(passport.liquidity_level)}
            name={passport.name}
            onPress={() => setSelected(passport)}
            risk={label(passport.risk_level)}
          />
        ))}
      </View>
    </View>
  );
}

function FilterChip({ active, labelText, onPress }: { active: boolean; labelText: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{labelText}</Text>
    </Pressable>
  );
}

function Fact({ label: labelText, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{labelText}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function Section({ fallback, items, title }: { fallback: string; items: string[]; title: string }) {
  const visibleItems = items.length > 0 ? items : [fallback];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {visibleItems.map((item) => (
        <Text key={item} style={styles.bullet}>
          - {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  searchPanel: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
    ...maliPrime.shadow
  },
  input: {
    backgroundColor: maliPrime.colors.background,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14
  },
  groupTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900", marginTop: 14 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  pillActive: { backgroundColor: maliPrime.colors.primary, borderColor: maliPrime.colors.primary },
  pillText: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  pillTextActive: { color: maliPrime.colors.surface },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48
  },
  primaryText: { color: maliPrime.colors.surface, fontSize: 14, fontWeight: "700" },
  disabled: { backgroundColor: maliPrime.colors.textTertiary },
  errorBox: { backgroundColor: "#FFF7E8", borderRadius: maliPrime.radius.md, marginTop: 14, padding: 14 },
  errorTitle: { color: "#A86500", fontSize: 14, fontWeight: "900" },
  errorCopy: { color: "#7A5B22", fontSize: 13, lineHeight: 19, marginTop: 4 },
  resultCount: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "900", marginTop: 16 },
  list: { gap: 12, marginTop: 12 },
  card: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 12,
    padding: 16
  },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  cardTitle: { color: maliPrime.colors.textPrimary, flex: 1, fontSize: 16, fontWeight: "900" },
  badge: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.pill,
    color: maliPrime.colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  meta: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "800", marginTop: 5 },
  cardCopy: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  metaPill: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.pill,
    color: maliPrime.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: "capitalize"
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  backText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  detailGrid: { gap: 10, marginTop: 16 },
  fact: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    padding: 14
  },
  factLabel: { color: maliPrime.colors.textSecondary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  factValue: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "900", marginTop: 4 },
  bullet: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  placeholderRow: { gap: 10, marginTop: 12 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    minHeight: 46
  },
  secondaryText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  notice: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 10 },
  routeHint: {
    color: maliPrime.colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: 12
  }
});
