import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  BillingEntitlementSnapshot,
  PesaRouteApiClient,
  PracticeSetApiResponse,
  PracticeSetDetailApiResponse,
  PracticeSubmitApiResponse
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
import { allAnswered, formatScore, practiceKindBlurb, practiceKindLabel, setAnswer, xpAwardNote } from "../utils/practice";

type PracticeView = "home" | "intro" | "player" | "results";

export function PracticeScreen({
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
  const [view, setView] = useState<PracticeView>("home");
  const [sets, setSets] = useState<PracticeSetApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<PracticeSetDetailApiResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeSubmitApiResponse | null>(null);

  const loadSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSets(await apiClient.learningPractice(auth));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load practice.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, auth?.token]);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  async function openSet(set: PracticeSetApiResponse) {
    setDetail(null);
    setAnswers({});
    setQuestionIndex(0);
    setResult(null);
    setView("intro");
    setDetailLoading(true);
    try {
      setDetail(await apiClient.learningPracticeDetail(set.id, auth));
    } catch {
      setError("Could not open this practice set.");
      setView("home");
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
      const submitResult = await apiClient.submitPractice(detail.id, answers, auth);
      setResult(submitResult);
      setView("results");
    } catch {
      setError("Could not submit your answers. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (view === "home") {
    return (
      <View style={styles.screen}>
        <Text style={maliPrimeText.title}>Practice</Text>
        <Text style={maliPrimeText.subtitle}>
          Short money-decision sets. No time limit. Earn learning XP — never returns or portfolio rewards.
        </Text>

        {!entitlements?.features.unlimited_simulations ? (
          <PremiumCard tone="warning">
            <Text style={styles.lockTitle}>Free practice access</Text>
            <Text style={styles.lockCopy}>Core practice stays free. Premium adds unlimited practice and advanced sets.</Text>
            <View style={styles.spacer} />
            <SecondaryButton onPress={onOpenPricing}>View Premium</SecondaryButton>
          </PremiumCard>
        ) : null}

        {loading ? <LoadingState label="Loading practice…" /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && sets.length === 0 ? (
          <EmptyState title="No practice yet" body="Practice sets will appear here as they are published." />
        ) : null}

        <View style={styles.list}>
          {sets.map((set) => (
            <Pressable
              accessibilityRole="button"
              key={set.id}
              onPress={() => openSet(set)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardHeaderRow}>
                <TrustBadge tone="muted">{practiceKindLabel(set.kind)}</TrustBadge>
                {set.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
              </View>
              <Text style={styles.cardTitle}>{set.title}</Text>
              <Text style={styles.cardBlurb}>{set.description || practiceKindBlurb(set.kind)}</Text>
              <Text style={styles.cardMeta}>
                {set.question_count} question{set.question_count === 1 ? "" : "s"} · {set.xp_reward} XP
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
        <Pressable accessibilityRole="button" onPress={() => setView("home")} style={styles.backRow}>
          <Text style={styles.backText}>← All practice</Text>
        </Pressable>
        {detailLoading || !detail ? (
          <LoadingState label="Loading practice…" />
        ) : detail.locked ? (
          <PremiumCard tone="warning">
            <Text style={styles.lockTitle}>{detail.title}</Text>
            <Text style={styles.lockCopy}>This practice set is part of premium learning.</Text>
            <View style={styles.spacer} />
            <PrimaryButton onPress={onOpenPricing}>See Premium</PrimaryButton>
          </PremiumCard>
        ) : (
          <PremiumCard>
            <Text style={styles.introEyebrow}>Practice</Text>
            <Text style={styles.introTitle}>{detail.title}</Text>
            <Text style={styles.cardBlurb}>{detail.description || practiceKindBlurb(detail.kind)}</Text>
            <View style={styles.introList}>
              <Text style={styles.introItem}>• {detail.question_count} question{detail.question_count === 1 ? "" : "s"}.</Text>
              <Text style={styles.introItem}>• No time limit.</Text>
              <Text style={styles.introItem}>• Earn {detail.xp_reward} learning XP.</Text>
            </View>
            {!auth ? <Text style={styles.signInNote}>Sign in to submit and earn XP. You can still read the questions.</Text> : null}
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
      return <EmptyState title="No questions" body="This practice set has no questions yet." />;
    }
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("intro")} style={styles.backRow}>
          <Text style={styles.backText}>← Practice intro</Text>
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
              const active = selected === option;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={option}
                  onPress={() => setAnswers((prev) => setAnswer(prev, question.id, option))}
                  style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.pressed]}
                >
                  <View style={[styles.optionIndex, active && styles.optionIndexActive]}>
                    <Text style={[styles.optionIndexText, active && styles.optionIndexTextActive]}>{optionIndex + 1}</Text>
                  </View>
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
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
                {submitting ? "Submitting…" : auth ? "Submit answers" : "Sign in to submit"}
              </PrimaryButton>
            ) : (
              <PrimaryButton disabled={!selected} onPress={() => setQuestionIndex((value) => value + 1)}>
                Next
              </PrimaryButton>
            )}
          </View>
        </View>
        <Text style={styles.reportNote}>Report an issue: long-press a question (placeholder).</Text>
      </View>
    );
  }

  if (view === "results" && result && detail) {
    return (
      <View style={styles.screen}>
        <Pressable accessibilityRole="button" onPress={() => setView("home")} style={styles.backRow}>
          <Text style={styles.backText}>← All practice</Text>
        </Pressable>
        <PremiumCard tone="success">
          <Text style={styles.introEyebrow}>Practice complete</Text>
          <Text style={styles.resultScore}>
            {result.correct_count}/{result.total_questions} correct
          </Text>
          <View style={styles.cardHeaderRow}>
            <TrustBadge tone="emerald">Score {formatScore(result.score)}</TrustBadge>
            <TrustBadge tone="muted">{xpAwardNote(result.xp_awarded)}</TrustBadge>
          </View>
        </PremiumCard>

        <View style={styles.list}>
          {detail.questions.map((question) => {
            const outcome = result.results.find((item) => item.question_id === question.id);
            return (
              <PremiumCard key={question.id}>
                <Text style={styles.questionPromptSmall}>{question.prompt}</Text>
                <Text style={[styles.feedback, outcome?.correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
                  {outcome?.correct ? "Correct" : `Correct answer: ${outcome?.correct_answer}`}
                </Text>
                {outcome?.explanation ? <Text style={styles.cardBlurb}>{outcome.explanation}</Text> : null}
              </PremiumCard>
            );
          })}
        </View>

        <PrimaryButton onPress={() => setView("home")}>More practice</PrimaryButton>
      </View>
    );
  }

  return <LoadingState label="Loading practice…" />;
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
  questionPromptSmall: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "800", lineHeight: 20 },
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
  reportNote: { color: maliPrime.colors.textTertiary, fontSize: 12 },
  resultScore: { color: maliPrime.colors.emerald, fontSize: 26, fontWeight: "900", marginTop: 6 },
  feedback: { fontSize: 13, fontWeight: "800", marginTop: 8 },
  feedbackCorrect: { color: maliPrime.colors.emerald },
  feedbackWrong: { color: maliPrime.colors.danger }
});
