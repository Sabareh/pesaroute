import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { DataGrantScope, PesaRouteApiClient } from "../api/client";
import type { AuthCredentials } from "../types";

const durations = [7, 14, 30];

export function ProfessionalsScreen({
  apiClient,
  auth,
  onRequestAuth
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  onRequestAuth: () => void;
}) {
  const [professionalId, setProfessionalId] = useState("1");
  const [topic, setTopic] = useState("Review my PesaRoute plan");
  const [notes, setNotes] = useState("");
  const [shareContact, setShareContact] = useState(false);
  const [sharePortfolioSummary, setSharePortfolioSummary] = useState(true);
  const [shareExactValues, setShareExactValues] = useState(false);
  const [shareJournal, setShareJournal] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestReview() {
    if (!auth) {
      onRequestAuth();
      return;
    }
    const granteeId = Number(professionalId);
    if (!Number.isInteger(granteeId) || granteeId <= 0) {
      setError("Enter a professional ID from the backend seed data.");
      return;
    }
    const scopes: DataGrantScope[] = ["consultation_context"];
    if (shareContact) scopes.push("contact_info");
    if (sharePortfolioSummary) scopes.push("portfolio_summary");
    if (shareExactValues) scopes.push("portfolio_exact_values");
    if (shareJournal) scopes.push("journal_entries");

    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      await apiClient.createDataGrant(
        {
          grantee_type: "professional",
          grantee_id: granteeId,
          scopes,
          expires_at: expiresAt
        },
        auth
      );
      await apiClient.createConsultationRequest(
        {
          professional: granteeId,
          topic: topic.trim() || "Review my PesaRoute plan",
          notes: notes.trim()
        },
        auth
      );
      setStatus("Review request saved. The professional can only see the scopes you selected.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create review request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text style={styles.title}>Professional Review</Text>
      <Text style={styles.copy}>You control what professionals see. Access expires automatically. You can revoke access anytime.</Text>

      {!auth ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Login required for sharing</Text>
          <Text style={styles.panelCopy}>Anonymous mode can still learn and simulate, but sharing needs an account.</Text>
          <Pressable accessibilityRole="button" onPress={onRequestAuth} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Log in or create account</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <View style={styles.form}>
            <TextInput
              keyboardType="numeric"
              onChangeText={setProfessionalId}
              placeholder="Professional ID"
              placeholderTextColor="#7b8a83"
              style={styles.input}
              value={professionalId}
            />
            <TextInput onChangeText={setTopic} placeholder="Topic" placeholderTextColor="#7b8a83" style={styles.input} value={topic} />
            <TextInput
              multiline
              onChangeText={setNotes}
              placeholder="Context you want reviewed"
              placeholderTextColor="#7b8a83"
              style={[styles.input, styles.multi]}
              textAlignVertical="top"
              value={notes}
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Choose what to share</Text>
            <ConsentSwitch label="Share name/contact" value={shareContact} onValueChange={setShareContact} />
            <ConsentSwitch label="Share portfolio summary" value={sharePortfolioSummary} onValueChange={setSharePortfolioSummary} />
            <ConsentSwitch label="Share exact values" value={shareExactValues} onValueChange={setShareExactValues} />
            <ConsentSwitch label="Share selected journal notes" value={shareJournal} onValueChange={setShareJournal} />
          </View>

          <Text style={styles.groupTitle}>Access duration</Text>
          <View style={styles.pillRow}>
            {durations.map((days) => (
              <Pressable
                accessibilityRole="button"
                key={days}
                onPress={() => setDurationDays(days)}
                style={[styles.pill, durationDays === days && styles.pillActive]}
              >
                <Text style={[styles.pillText, durationDays === days && styles.pillTextActive]}>{days} days</Text>
              </Pressable>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {status ? <Text style={styles.status}>{status}</Text> : null}
          <Pressable accessibilityRole="button" disabled={loading} onPress={requestReview} style={[styles.primaryButton, loading && styles.disabled]}>
            <Text style={styles.primaryText}>{loading ? "Saving..." : "Request review with selected access"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ConsentSwitch({
  label,
  onValueChange,
  value
}: {
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? "#ffffff" : "#f5f5f5"}
        trackColor={{ false: "#b8c7bf", true: "#0f7b5f" }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: "#15221d", fontSize: 30, fontWeight: "900" },
  copy: { color: "#52645b", fontSize: 16, lineHeight: 24, marginTop: 10 },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 16
  },
  panelTitle: { color: "#15221d", fontSize: 16, fontWeight: "900" },
  panelCopy: { color: "#627469", fontSize: 14, lineHeight: 21, marginTop: 6 },
  form: { gap: 10, marginTop: 18 },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    color: "#15221d",
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14
  },
  multi: { minHeight: 96, paddingTop: 14 },
  switchRow: {
    alignItems: "center",
    borderTopColor: "#e3ece7",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12
  },
  switchLabel: { color: "#15221d", flex: 1, fontSize: 14, fontWeight: "800", paddingRight: 12 },
  groupTitle: { color: "#15221d", fontSize: 14, fontWeight: "900", marginTop: 16 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  pillActive: { backgroundColor: "#dff5ec", borderColor: "#0f7b5f" },
  pillText: { color: "#52645b", fontSize: 13, fontWeight: "900" },
  pillTextActive: { color: "#0f7b5f" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0f7b5f",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50,
    paddingHorizontal: 14
  },
  primaryText: { color: "#ffffff", fontSize: 14, fontWeight: "900", textAlign: "center" },
  error: { color: "#7a431e", fontSize: 13, lineHeight: 19, marginTop: 10 },
  status: { color: "#0f7b5f", fontSize: 13, fontWeight: "900", lineHeight: 19, marginTop: 10 },
  disabled: { backgroundColor: "#91a39a" }
});
