import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { BetaFeedbackApiRequest, PesaRouteApiClient } from "../api/client";
import { PremiumCard, maliPrime, maliPrimeText } from "../components/maliprime";
import type { AuthCredentials } from "../types";

const categories: Array<{ label: string; value: BetaFeedbackApiRequest["category"] }> = [
  { label: "Payment issue", value: "payment_issue" },
  { label: "Privacy question", value: "privacy_question" },
  { label: "Professional review issue", value: "professional_review_issue" },
  { label: "Bug report", value: "bug_report" },
  { label: "General", value: "general" }
];

export function BetaSupportScreen({
  apiClient,
  auth
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
}) {
  const [category, setCategory] = useState<BetaFeedbackApiRequest["category"]>("general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitFeedback() {
    if (message.trim().length < 5) {
      setError("Add a short beta feedback note.");
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      await apiClient.sendBetaFeedback(
        {
          category,
          message: message.trim(),
          screenshot_placeholder: "Screenshot upload placeholder"
        },
        auth
      );
      setMessage("");
      setStatus("Feedback sent. Thank you for helping shape the beta.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send beta feedback.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text style={maliPrimeText.title}>Support and beta feedback</Text>
      <Text style={maliPrimeText.subtitle}>
        Tell us about payment issues, privacy questions, professional review issues, or bugs. Keep the report focused on
        what happened in the app.
      </Text>

      <PremiumCard>
        <Text style={styles.cardTitle}>What do you need help with?</Text>
        <View style={styles.pillRow}>
          {categories.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.value}
              onPress={() => setCategory(item.value)}
              style={[styles.pill, category === item.value && styles.pillActive]}
            >
              <Text style={[styles.pillText, category === item.value && styles.pillTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          multiline
          onChangeText={setMessage}
          placeholder="Send beta feedback"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={styles.textArea}
          textAlignVertical="top"
          value={message}
        />
        <Text style={styles.copy}>Screenshot upload is a placeholder for now. Keep sensitive financial details out of feedback.</Text>
      </PremiumCard>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading} onPress={submitFeedback} style={[styles.primaryButton, loading && styles.disabled]}>
        <Text style={styles.primaryText}>{loading ? "Sending..." : "Send beta feedback"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "700" },
  copy: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  pill: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  pillActive: { backgroundColor: maliPrime.colors.primary, borderColor: maliPrime.colors.primary },
  pillText: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "700" },
  pillTextActive: { color: maliPrime.colors.surface },
  textArea: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 15,
    marginTop: 14,
    minHeight: 130,
    padding: 14
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50
  },
  primaryText: { color: maliPrime.colors.surface, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  status: { color: maliPrime.colors.emerald, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 12 },
  error: { color: maliPrime.colors.danger, fontSize: 13, lineHeight: 19, marginTop: 12 }
});
