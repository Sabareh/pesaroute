import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  AssessmentApiResponse,
  AssessmentDetailApiResponse,
  AssessmentSubmitApiResponse,
  BillingEntitlementSnapshot,
  PesaRouteApiClient
} from "../api/client";
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
import type { AuthCredentials } from "../types";
import { allAnswered, formatScore, setAnswer, xpAwardNote } from "../utils/practice";

type AssessView = "list" | "intro" | "player" | "result";

const KIND_BLURB: Record<string, string> = {
  money_profile: "A short, private profile of how you handle money.",
  risk_comfort: "Your comfort with ups and downs. Not a product recommendation.",
  scam_awareness: "Check how well you spot unsafe pitches.",
  liquidity_needs: "Estimate how soon you may need access to money."
};

export function AssessmentsScreen({
  apiClient,
  auth,
  entitlements,
  onOpenPricing,
  onRequestAuth
}: {
  apiClient: PesaRouteApiClient;
  auth?: AuthCredentials | null;
  entitlements: BillingEntitlementSnapshot | null;
  onOpenPricing: () => void;
  onRequestAuth: () => void;
}) {
  const [view, setView] = useState<AssessView>("list");
  const [assessments, setAssessments] = useState<AssessmentApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<AssessmentDetailApiResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentSubmitApiResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssessments(await apiClient.learningAssessments(auth));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load assessments.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, auth?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(assessment: AssessmentApiResponse) {
    setDetail(null);
    setAnswers({});
    setQuestionIndex(0);
    setResult(null);
    setView("intro");
    setDetailLoading(true);
    try {
      setDetail(await apiClient.learningAssessmentDetail(assessment.slug, auth));
    } catch {
      setError("Could not open this assessment.");
      setView("list");
    } finally {
      setDetailLoading(false);
    }
  }

  async function submit() {
    if (!detail) return;
    if (!auth) {
      onRequestAuth();
      return;
    }
    setSubmitting(true);
    try {
      setResult(await apiClient.submitAssessment(detail.slug, answers, auth));
      setView("result");
    } catch {
      setError("Could not submit your answers. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (view === "list") {
    return (
      <View style={styles.screen}>
        <Text style={maliPrimeText.title}>Assess</Text>
        <Text style={maliPrimeText.subtitle}>
          Private self-checks for money habits, risk comfort, scam awareness, and liquidity needs. These do not
          recommend any product.
        </Text>

        {!entitlements?.features.premium_learning ? (
          <PremiumCard tone="warning">
            <Text style={styles.lockTitle}>Free self-checks</Text>
            <Text style={styles.lockCopy}>Assessments are free. Premium adds advanced tracks and unlimited practice.</Text>
            <View style={styles.spacer} />
            <SecondaryButton onPress={onOpenPricing}>View Premium</SecondaryButton>
          </PremiumCard>
        ) : null}

        {loading ? <LoadingState label="Loading assessments…" /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && assessments.length === 0 ? (
          <EmptyState title="No assessments yet" body="Self-checks will appear here as they are published." />
        ) : null}

        <View style={styles.list}>
          {assessments.map((assessment) => (
            <Pressable
              accessibilityRole="button"
              key={assessment.id}
              onPress={() => open(assessment)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardHeaderRow}>
                <TrustBadge tone="muted">{assessment.scoring === "knowledge" ? "Knowledge" : "Profile"}</TrustBadge>
                {assessment.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
              </View>
              <Text style={styles.cardTitle}>{assessment.title}</Text>
              <Text style={styles.cardBlurb}>{assessment.description || KIND_BLURB[assessment.kind] || ""}</Text>
              <Text style={styles.cardMeta}>
                {assessment.question_count} question{assessment.question_count === 1 ? "" : "s"} · {assessment.xp_reward} XP
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (view === "intro") {
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("list")} style={styles.backRow}>
          <Text style={styles.backText}>← All assessments</Text>
        </Pressable>
        {detailLoading || !detail ? (
          <LoadingState label="Loading assessment…" />
        ) : detail.locked ? (
          <PremiumCard tone="warning">
            <Text style={styles.lockTitle}>{detail.title}</Text>
            <Text style={styles.lockCopy}>This assessment is part of premium learning.</Text>
            <View style={styles.spacer} />
            <PrimaryButton onPress={onOpenPricing}>See Premium</PrimaryButton>
          </PremiumCard>
        ) : (
          <PremiumCard>
            <Text style={styles.introEyebrow}>Assess</Text>
            <Text style={styles.introTitle}>{detail.title}</Text>
            <Text style={styles.cardBlurb}>{detail.description || KIND_BLURB[detail.kind] || ""}</Text>
            <View style={styles.introList}>
              <Text style={styles.introItem}>• {detail.question_count} question{detail.question_count === 1 ? "" : "s"}.</Text>
              <Text style={styles.introItem}>• No time limit. Private to you.</Text>
              <Text style={styles.introItem}>• Earn {detail.xp_reward} learning XP.</Text>
            </View>
            {!auth ? <Text style={styles.signInNote}>Sign in to submit and earn XP.</Text> : null}
            <View style={styles.spacer} />
            <PrimaryButton onPress={() => setView("player")}>Start</PrimaryButton>
          </PremiumCard>
        )}
      </View>
    );
  }

  if (view === "player" && detail) {
    const question = detail.questions[questionIndex];
    const isLast = questionIndex === detail.questions.length - 1;
    const selected = question ? answers[String(question.id)] : undefined;
    if (!question) {
      return <EmptyState title="No questions" body="This assessment has no questions yet." />;
    }
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("intro")} style={styles.backRow}>
          <Text style={styles.backText}>← Assessment intro</Text>
        </Pressable>
        <Text style={styles.progressLabel}>
          Question {questionIndex + 1} of {detail.questions.length}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((questionIndex + 1) / detail.questions.length) * 100}%` }]} />
        </View>

        <PremiumCard>
          <Text style={styles.questionPrompt}>{question.prompt}</Text>
          <View style={styles.options}>
            {question.options.map((option, optionIndex) => {
              const active = selected === option.value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={option.value}
                  onPress={() => setAnswers((prev) => setAnswer(prev, question.id, option.value))}
                  style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.pressed]}
                >
                  <View style={[styles.optionIndex, active && styles.optionIndexActive]}>
                    <Text style={[styles.optionIndexText, active && styles.optionIndexTextActive]}>{optionIndex + 1}</Text>
                  </View>
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </PremiumCard>

        <View style={styles.playerActions}>
          {questionIndex > 0 ? (
            <View style={styles.playerActionItem}>
              <SecondaryButton onPress={() => setQuestionIndex((value) => value - 1)}>Back</SecondaryButton>
            </View>
          ) : null}
          <View style={styles.playerActionItem}>
            {isLast ? (
              <PrimaryButton disabled={!allAnswered(detail.questions.map((q) => q.id), answers) || submitting} onPress={submit}>
                {submitting ? "Submitting…" : auth ? "See result" : "Sign in to submit"}
              </PrimaryButton>
            ) : (
              <PrimaryButton disabled={!selected} onPress={() => setQuestionIndex((value) => value + 1)}>
                Next
              </PrimaryButton>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (view === "result" && result) {
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("list")} style={styles.backRow}>
          <Text style={styles.backText}>← All assessments</Text>
        </Pressable>
        <PremiumCard tone="success">
          <Text style={styles.introEyebrow}>Your result</Text>
          <Text style={styles.resultLabel}>{result.result_label || formatScore(result.score)}</Text>
          <View style={styles.cardHeaderRow}>
            <TrustBadge tone="muted">Score {formatScore(result.score)}</TrustBadge>
            <TrustBadge tone={result.passed ? "emerald" : "amber"}>{result.passed ? "Completed" : "Keep practising"}</TrustBadge>
            <TrustBadge tone="muted">{xpAwardNote(result.xp_awarded)}</TrustBadge>
          </View>
          <Text style={styles.cardBlurb}>
            This is a private, educational self-check. It does not recommend any specific product.
          </Text>
        </PremiumCard>
        <PrimaryButton onPress={() => setView("list")}>Back to assessments</PrimaryButton>
      </View>
    );
  }

  return <LoadingState label="Loading assessments…" />;
}

const styles = StyleSheet.create({
  screen: { gap: 14 },
  pressed: { opacity: 0.8 },
  spacer: { height: 12 },
  backRow: { paddingVertical: 4 },
  backText: { color: maliPrime.colors.textSecondary, fontSize: 14, fontWeight: "700" },
  lockTitle: { color: maliPrime.colors.amber, fontSize: 14, fontWeight: "900" },
  lockCopy: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
  list: { gap: 12 },
  card: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    padding: maliPrime.spacing.lg,
    ...maliPrime.shadow
  },
  cardHeaderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  cardTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "900", marginTop: 10 },
  cardBlurb: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  cardMeta: { color: maliPrime.colors.textTertiary, fontSize: 12, fontWeight: "700", marginTop: 10 },
  introEyebrow: { color: maliPrime.colors.textTertiary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  introTitle: { color: maliPrime.colors.textPrimary, fontSize: 20, fontWeight: "900", lineHeight: 26, marginTop: 6 },
  introList: { gap: 4, marginTop: 12 },
  introItem: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  signInNote: { color: maliPrime.colors.amber, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 12 },
  progressLabel: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  progressTrack: { backgroundColor: maliPrime.colors.surfaceSubtle, borderRadius: 999, height: 8, overflow: "hidden" },
  progressFill: { backgroundColor: maliPrime.colors.emerald, borderRadius: 999, height: 8 },
  questionPrompt: { color: maliPrime.colors.textPrimary, fontSize: 17, fontWeight: "800", lineHeight: 24 },
  options: { gap: 10, marginTop: 14 },
  option: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  optionActive: { backgroundColor: maliPrime.colors.surfaceAlt, borderColor: maliPrime.colors.primary },
  optionIndex: {
    alignItems: "center",
    borderColor: maliPrime.colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  optionIndexActive: { backgroundColor: maliPrime.colors.primary, borderColor: maliPrime.colors.primary },
  optionIndexText: { color: maliPrime.colors.textTertiary, fontSize: 12, fontWeight: "900" },
  optionIndexTextActive: { color: maliPrime.colors.surface },
  optionText: { color: maliPrime.colors.textSecondary, flex: 1, fontSize: 14, fontWeight: "700" },
  optionTextActive: { color: maliPrime.colors.textPrimary },
  playerActions: { flexDirection: "row", gap: 10 },
  playerActionItem: { flex: 1 },
  resultLabel: { color: maliPrime.colors.emerald, fontSize: 22, fontWeight: "900", marginTop: 6 }
});
