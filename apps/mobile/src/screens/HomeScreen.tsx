import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LearningDashboardApiResponse, PesaRouteApiClient } from "../api/client";
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

type QuickAction = { key: string; label: string; sub: string; onPress: () => void };

export function HomeScreen({
  apiClient,
  auth,
  catalog,
  onChooseRoute,
  onOpenLearn,
  onOpenScam,
  onOpenPractice,
  onOpenSimulate,
  onOpenAssessments,
  onRefreshCatalog,
  selectedGoalId
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  catalog: CatalogState;
  onChooseRoute: (amountRangeId: AmountRangeId, goalId: GoalId) => void;
  onOpenLearn: () => void;
  onOpenScam: () => void;
  onOpenPractice: () => void;
  onOpenSimulate: () => void;
  onOpenAssessments: () => void;
  onRefreshCatalog: () => Promise<void>;
  selectedGoalId: GoalId;
}) {
  const [selectedAmountRangeId, setSelectedAmountRangeId] = useState<AmountRangeId>("5k-20k");
  const [selectedGoal, setSelectedGoal] = useState<GoalId>(selectedGoalId);
  const [dashboard, setDashboard] = useState<LearningDashboardApiResponse | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await apiClient.learningDashboard(auth));
    } catch {
      setDashboard(null);
    }
  }, [apiClient, auth?.token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const continueItem = dashboard?.continue_learning ?? null;
  const isAuthenticated = Boolean(auth?.token);

  const quickActions: QuickAction[] = [
    { key: "flashcards", label: "Flashcards", sub: "Review terms", onPress: onOpenLearn },
    { key: "practice", label: "Practice", sub: "Money decisions", onPress: onOpenPractice },
    { key: "scam", label: "Scam check", sub: "Spot red flags", onPress: onOpenScam },
    { key: "simulate", label: "Simulate", sub: "Compare products", onPress: onOpenSimulate }
  ];

  return (
    <View style={styles.screen}>
      <HeroCard>
        <View style={styles.heroTopRow}>
          <TrustBadge tone={catalog.source === "api" ? "primary" : "muted"}>
            {catalog.loading ? "Loading" : `${catalog.source} mode`}
          </TrustBadge>
          <TrustBadge tone="emerald">Privacy-first</TrustBadge>
        </View>
        <Text style={[maliPrimeText.title, styles.heroTitle]}>{dashboard?.greeting ?? "Learn before you invest."}</Text>
        <Text style={[maliPrimeText.subtitle, styles.heroCopy]}>
          Assess, learn, practice, simulate, and review your next money decision.
        </Text>
      </HeroCard>

      {/* Top summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{dashboard?.total_xp ?? 0}</Text>
          <Text style={styles.summaryLabel}>Total XP</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{dashboard?.daily_streak?.current_streak_days ?? 0}</Text>
          <Text style={styles.summaryLabel}>Day streak</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{dashboard?.review_count ?? 0}</Text>
          <Text style={styles.summaryLabel}>To review</Text>
        </View>
      </View>

      {/* Continue learning */}
      <PremiumCard>
        <View style={styles.learningTopRow}>
          <TrustBadge tone="muted">Continue learning</TrustBadge>
          {dashboard?.premium_status === "premium" ? <TrustBadge tone="emerald">Premium</TrustBadge> : null}
        </View>
        <Text style={styles.continueTitle}>
          {continueItem?.lesson.title ?? dashboard?.current_track?.title ?? "Start with Money Foundations"}
        </Text>
        <Text style={styles.continueMeta}>
          {continueItem ? `${continueItem.track.title} · ${continueItem.course.title}` : "Short lessons before you compare products."}
        </Text>
        <View style={styles.ctaRow}>
          <View style={styles.ctaItem}>
            <PrimaryButton onPress={onOpenLearn}>Continue learning</PrimaryButton>
          </View>
          <View style={styles.ctaItem}>
            <SecondaryButton onPress={onOpenPractice}>Practice</SecondaryButton>
          </View>
        </View>
        {!isAuthenticated ? <Text style={styles.anonNote}>Sign in to save XP, streaks, and progress across web and mobile.</Text> : null}
      </PremiumCard>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <Pressable
            accessibilityRole="button"
            key={action.key}
            onPress={action.onPress}
            style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
          >
            <Text style={styles.quickLabel}>{action.label}</Text>
            <Text style={styles.quickSub}>{action.sub}</Text>
          </Pressable>
        ))}
      </View>

      {/* Assess yourself */}
      {dashboard && dashboard.assessments.length > 0 ? (
        <PremiumCard>
          <Text style={styles.promiseTitle}>Assess yourself first</Text>
          <Text style={styles.promiseCopy}>Private self-checks for money habits, risk, scams, and liquidity needs.</Text>
          <View style={styles.spacer} />
          <SecondaryButton onPress={onOpenAssessments}>Take an assessment</SecondaryButton>
        </PremiumCard>
      ) : null}

      {/* Suggested track */}
      {dashboard?.current_track && continueItem ? (
        <PremiumCard tone="alt">
          <Text style={styles.promiseTitle}>Suggested track</Text>
          <Text style={styles.promiseCopy}>{dashboard.current_track.title}</Text>
          <View style={styles.spacer} />
          <SecondaryButton onPress={onOpenLearn}>Open in Learn</SecondaryButton>
        </PremiumCard>
      ) : null}

      {/* Daily money challenge */}
      <PremiumCard tone="alt">
        <Text style={styles.promiseTitle}>Daily money challenge</Text>
        <Text style={styles.promiseCopy}>
          Pick one product you are curious about and write down its withdrawal time, fees, and what could go wrong.
        </Text>
      </PremiumCard>

      {catalog.error ? (
        <View style={styles.errorWrap}>
          <ErrorState message={`Using offline fallback: ${catalog.error}`} />
          <Pressable accessibilityRole="button" onPress={onRefreshCatalog} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry API</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Route builder (preserved) */}
      <Text style={styles.sectionTitle}>Plan from your amount and goal</Text>
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
      <View style={styles.chips}>
        {goalChips.map((goal) => (
          <GoalChip active={goal.id === selectedGoal} key={goal.id} label={goal.label} onPress={() => setSelectedGoal(goal.id)} />
        ))}
      </View>
      <PrimaryButton onPress={() => onChooseRoute(selectedAmountRangeId, selectedGoal)}>Start with my amount</PrimaryButton>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16 },
  pressed: { opacity: 0.8 },
  spacer: { height: 12 },
  heroTopRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroTitle: { marginTop: 14, fontSize: 26, lineHeight: 32 },
  heroCopy: { marginTop: 10 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    flex: 1,
    padding: 14,
    ...maliPrime.shadow
  },
  summaryValue: { color: maliPrime.colors.textPrimary, fontSize: 22, fontWeight: "900" },
  summaryLabel: { color: maliPrime.colors.textSecondary, fontSize: 11, fontWeight: "800", marginTop: 4 },
  learningTopRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  continueTitle: { color: maliPrime.colors.textPrimary, fontSize: 17, fontWeight: "900", lineHeight: 23 },
  continueMeta: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  ctaRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  ctaItem: { flex: 1 },
  anonNote: { color: maliPrime.colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 10 },
  sectionTitle: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 16,
    ...maliPrime.shadow
  },
  quickLabel: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  quickSub: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 4 },
  amountGrid: { gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  errorWrap: { gap: 10 },
  retryButton: { alignItems: "center", backgroundColor: maliPrime.colors.primaryDark, borderRadius: maliPrime.radius.md, paddingVertical: 12 },
  retryText: { color: maliPrime.colors.surface, fontSize: 13, fontWeight: "900" },
  promiseTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "700" },
  promiseCopy: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6 }
});
