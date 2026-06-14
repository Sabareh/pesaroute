import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AmountRangeButton,
  ErrorState,
  GoalChip,
  HeroCard,
  PremiumCard,
  PrimaryButton,
  SecondaryButton,
  TrustBadge,
  maliPrime,
  maliPrimeText
} from "../components/maliprime";
import type { AmountRangeId, CatalogState, GoalId } from "../types";
import { amountRanges, goalChips } from "../utils/routePlanner";

export function HomeScreen({
  catalog,
  onChooseRoute,
  onOpenScam,
  onRefreshCatalog,
  selectedGoalId
}: {
  catalog: CatalogState;
  onChooseRoute: (amountRangeId: AmountRangeId, goalId: GoalId) => void;
  onOpenScam: () => void;
  onRefreshCatalog: () => Promise<void>;
  selectedGoalId: GoalId;
}) {
  const [selectedAmountRangeId, setSelectedAmountRangeId] = useState<AmountRangeId>("5k-20k");
  const [selectedGoal, setSelectedGoal] = useState<GoalId>(selectedGoalId);

  function startRoute() {
    onChooseRoute(selectedAmountRangeId, selectedGoal);
  }

  return (
    <View style={styles.screen}>
      <HeroCard>
        <View style={styles.heroTopRow}>
          <TrustBadge tone={catalog.source === "api" ? "primary" : "muted"}>{catalog.loading ? "Loading catalog" : `${catalog.source} mode`}</TrustBadge>
          <TrustBadge tone="emerald">Privacy-first</TrustBadge>
        </View>
        <Text style={[maliPrimeText.title, styles.heroTitle]}>Before you invest, understand the route.</Text>
        <Text style={[maliPrimeText.subtitle, styles.heroCopy]}>
          Learn, compare, simulate, and get verified guidance before risking your money.
        </Text>
        <View style={styles.trustChips}>
          {["No M-Pesa PIN", "No bank passwords", "No execution", "Privacy-first"].map((chip) => (
            <TrustBadge key={chip} tone="muted">
              {chip}
            </TrustBadge>
          ))}
        </View>
      </HeroCard>

      {catalog.error ? (
        <View style={styles.errorWrap}>
          <ErrorState message={`Using offline fallback: ${catalog.error}`} />
          <Pressable accessibilityRole="button" onPress={onRefreshCatalog} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry API</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Start with my amount</Text>
      <View style={styles.amountGrid}>
        {amountRanges.map((range) => (
          <AmountRangeButton
            active={range.id === selectedAmountRangeId}
            key={range.id}
            label={range.label}
            onPress={() => setSelectedAmountRangeId(range.id)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Choose your goal</Text>
      <View style={styles.chips}>
        {goalChips.map((goal) => (
          <GoalChip
            active={goal.id === selectedGoal}
            key={goal.id}
            label={goal.label}
            onPress={() => setSelectedGoal(goal.id)}
          />
        ))}
      </View>

      <View style={styles.ctaStack}>
        <PrimaryButton onPress={startRoute}>Start with my amount</PrimaryButton>
        <SecondaryButton onPress={onOpenScam}>Check investment red flags</SecondaryButton>
      </View>

      <PremiumCard tone="success">
        <Text style={styles.promiseTitle}>Catalog loaded</Text>
        <Text style={styles.promiseCopy}>
          {catalog.categories.length} categories and {catalog.passports.length} product passports from {catalog.source}.
        </Text>
        <View style={styles.catalogChips}>
          {catalog.categories.slice(0, 6).map((category) => (
            <Text key={category.slug} style={styles.catalogChip}>
              {category.name}
            </Text>
          ))}
        </View>
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.promiseTitle}>Before you move money</Text>
        <Text style={styles.promiseCopy}>Learn first. Compare clearly. Get guidance when needed. No M-Pesa PIN. No bank passwords. No execution.</Text>
      </PremiumCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 18 },
  heroTopRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroTitle: { marginTop: 14 },
  heroCopy: { marginTop: 12 },
  trustChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  errorWrap: { gap: 10 },
  retryButton: { alignItems: "center", backgroundColor: maliPrime.colors.primaryDark, borderRadius: maliPrime.radius.md, paddingVertical: 12 },
  retryText: { color: maliPrime.colors.surface, fontSize: 13, fontWeight: "900" },
  sectionTitle: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  amountGrid: { gap: 10, marginTop: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  ctaStack: { gap: 10 },
  catalogChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  catalogChip: {
    backgroundColor: maliPrime.colors.surface,
    borderRadius: maliPrime.radius.md,
    color: maliPrime.colors.primary,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  promiseTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  promiseCopy: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6 }
});
