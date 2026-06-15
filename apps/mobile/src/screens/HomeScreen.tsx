import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LearningHomeApiResponse, PesaRouteApiClient } from "../api/client";
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
import type { AmountRangeId, AuthCredentials, CatalogState, GoalId } from "../types";
import { amountRanges, goalChips } from "../utils/routePlanner";

export function HomeScreen({
  apiClient,
  auth,
  catalog,
  onChooseRoute,
  onOpenLearn,
  onOpenScam,
  onRefreshCatalog,
  selectedGoalId
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  catalog: CatalogState;
  onChooseRoute: (amountRangeId: AmountRangeId, goalId: GoalId) => void;
  onOpenLearn: () => void;
  onOpenScam: () => void;
  onRefreshCatalog: () => Promise<void>;
  selectedGoalId: GoalId;
}) {
  const [selectedAmountRangeId, setSelectedAmountRangeId] = useState<AmountRangeId>("5k-20k");
  const [selectedGoal, setSelectedGoal] = useState<GoalId>(selectedGoalId);
  const [learningHome, setLearningHome] = useState<LearningHomeApiResponse | null>(null);
  const catalogPreview = catalog.categories
    .slice(0, 6)
    .map((category) => category.name)
    .join(" / ");

  function startRoute() {
    onChooseRoute(selectedAmountRangeId, selectedGoal);
  }

  useEffect(() => {
    let active = true;
    apiClient
      .learningHome(auth)
      .then((summary) => {
        if (active) setLearningHome(summary);
      })
      .catch(() => {
        if (active) setLearningHome(null);
      });
    return () => {
      active = false;
    };
  }, [apiClient, auth?.token]);

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

      <PremiumCard>
        <View style={styles.learningTopRow}>
          <TrustBadge tone="muted">Daily learning</TrustBadge>
          <TrustBadge tone="emerald">XP ready</TrustBadge>
        </View>
        <Text style={styles.promiseTitle}>Continue money foundations</Text>
        <Text style={styles.promiseCopy}>
          {learningHome?.continue_learning?.lesson.title ??
            "Short lessons, flashcards, practice, and private reflection before you compare products."}
        </Text>
        <View style={styles.learningStats}>
          <View style={styles.learningStat}>
            <Text style={styles.learningValue}>{learningHome?.total_xp ?? 0} XP</Text>
            <Text style={styles.learningLabel}>{learningHome?.streak ? "Account" : "Anonymous"}</Text>
          </View>
          <View style={styles.learningStat}>
            <Text style={styles.learningValue}>{learningHome?.streak?.current_streak_days ?? 0}d</Text>
            <Text style={styles.learningLabel}>Streak</Text>
          </View>
        </View>
        <SecondaryButton onPress={onOpenLearn}>Open learning tab</SecondaryButton>
      </PremiumCard>

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

      <PremiumCard>
        <View style={styles.catalogTitleRow}>
          <View style={styles.catalogDot} />
          <Text style={styles.promiseTitle}>Catalog loaded</Text>
        </View>
        <Text style={styles.promiseCopy}>
          {catalog.categories.length} categories and {catalog.passports.length} product passports from {catalog.source}.
        </Text>
        <View style={styles.catalogPreview}>
          <Text style={styles.catalogLabel}>Available categories</Text>
          <Text style={styles.catalogLine}>{catalogPreview}</Text>
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
  learningTopRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  learningStats: { flexDirection: "row", gap: 10, marginBottom: 12, marginTop: 12 },
  learningStat: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  learningValue: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  learningLabel: { color: maliPrime.colors.textSecondary, fontSize: 11, fontWeight: "800", marginTop: 3 },
  amountGrid: { gap: 10, marginTop: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  ctaStack: { gap: 10 },
  catalogTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  catalogDot: { backgroundColor: maliPrime.colors.emerald, borderRadius: 4, height: 8, width: 8 },
  catalogPreview: {
    borderTopColor: maliPrime.colors.border,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10
  },
  catalogLabel: { color: maliPrime.colors.textTertiary, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  catalogLine: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700", lineHeight: 20, marginTop: 4 },
  promiseTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "700" },
  promiseCopy: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6 }
});
