import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { PesaRouteApiClient } from "../api/client";
import type { AmountDisplayMode, AuthCredentials, JournalEntry } from "../types";

const amountModes: AmountDisplayMode[] = ["exact", "rounded", "range", "hidden"];

function parseAmountToken(token: string): number | null {
  const trimmed = token.trim().toLowerCase();
  const multiplier = trimmed.endsWith("k") ? 1000 : 1;
  const value = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value * multiplier : null;
}

function parseAmountRange(text: string): { min?: string; max?: string; exact?: string } {
  const parts = text.split(/\s*(?:-|to)\s*/i).map(parseAmountToken);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { min: parts[0].toFixed(2), max: parts[1].toFixed(2) };
  }
  if (parts[0]) {
    return { exact: parts[0].toFixed(2) };
  }
  return {};
}

export function JournalScreen({
  apiClient,
  auth,
  entries,
  onAddEntry
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
}) {
  const [goal, setGoal] = useState("");
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [amountText, setAmountText] = useState("");
  const [amountDisplayMode, setAmountDisplayMode] = useState<AmountDisplayMode>("range");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const canSave = useMemo(() => decision.trim().length > 2, [decision]);

  async function saveEntry() {
    if (!canSave) return;
    setSaving(true);
    setStatus(null);
    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      goal: goal.trim() || "General",
      decision: decision.trim(),
      amountDisplayMode,
      amountText: amountDisplayMode === "hidden" ? "Hidden" : amountText.trim() || "Not set",
      reason: reason.trim(),
      createdAt: new Date().toLocaleDateString("en-KE")
    };

    if (auth) {
      try {
        const parsed = parseAmountRange(amountText);
        await apiClient.createJournalEntry(
          {
            goal: entry.goal,
            decision: entry.decision,
            amount_display_mode: amountDisplayMode,
            amount_exact: amountDisplayMode === "exact" ? parsed.exact : undefined,
            amount_range_min: amountDisplayMode === "range" ? parsed.min : undefined,
            amount_range_max: amountDisplayMode === "range" ? parsed.max : undefined,
            reason: entry.reason,
            visibility: "private"
          },
          auth
        );
        setStatus("Saved to backend and local list.");
      } catch (error) {
        setStatus(`Backend save failed; kept local only. ${error instanceof Error ? error.message : ""}`.trim());
      }
    } else {
      setStatus("Saved local-only. Add API credentials in the API tab to test backend writes.");
    }

    onAddEntry(entry);
    setGoal("");
    setDecision("");
    setReason("");
    setAmountText("");
    setAmountDisplayMode("range");
    setSaving(false);
  }

  return (
    <View>
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.copy}>Create local entries offline. If debug auth is set, PesaRoute also tries the backend.</Text>
      <View style={styles.form}>
        <TextInput onChangeText={setGoal} placeholder="Goal" placeholderTextColor="#7b8a83" style={styles.input} value={goal} />
        <TextInput
          onChangeText={setDecision}
          placeholder="Decision"
          placeholderTextColor="#7b8a83"
          style={styles.input}
          value={decision}
        />
        <TextInput
          onChangeText={setAmountText}
          placeholder="Amount e.g. KES 10k-20k"
          placeholderTextColor="#7b8a83"
          style={styles.input}
          value={amountText}
        />
        <View style={styles.modeRow}>
          {amountModes.map((mode) => (
            <Pressable
              accessibilityRole="button"
              key={mode}
              onPress={() => setAmountDisplayMode(mode)}
              style={[styles.mode, amountDisplayMode === mode && styles.modeActive]}
            >
              <Text style={[styles.modeText, amountDisplayMode === mode && styles.modeTextActive]}>{mode}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          multiline
          onChangeText={setReason}
          placeholder="Reason and risks considered"
          placeholderTextColor="#7b8a83"
          style={[styles.input, styles.multi]}
          textAlignVertical="top"
          value={reason}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!canSave || saving}
        onPress={saveEntry}
        style={({ pressed }) => [styles.save, (!canSave || saving) && styles.saveDisabled, pressed && canSave && styles.pressed]}
      >
        <Text style={styles.saveText}>{saving ? "Saving..." : "Create entry"}</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Text style={styles.listTitle}>Local entries</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>No journal entries yet.</Text>
      ) : (
        <View style={styles.entries}>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <Text style={styles.entryGoal}>{entry.goal}</Text>
              <Text style={styles.entryDecision}>{entry.decision}</Text>
              <Text style={styles.entryMeta}>
                {entry.amountDisplayMode}: {entry.amountText} - {entry.createdAt}
              </Text>
              {entry.reason ? <Text style={styles.entryReason}>{entry.reason}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: "#15221d", fontSize: 30, fontWeight: "900" },
  copy: { color: "#52645b", fontSize: 16, lineHeight: 24, marginTop: 10 },
  form: { gap: 10, marginTop: 20 },
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
  multi: { minHeight: 100, paddingTop: 14, textAlignVertical: "top" },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mode: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  modeActive: { backgroundColor: "#dff5ec", borderColor: "#0f7b5f" },
  modeText: { color: "#52645b", fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
  modeTextActive: { color: "#0f7b5f" },
  save: {
    alignItems: "center",
    backgroundColor: "#0f7b5f",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50
  },
  saveDisabled: { backgroundColor: "#91a39a" },
  saveText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  status: { color: "#52645b", fontSize: 13, lineHeight: 19, marginTop: 10 },
  listTitle: { color: "#15221d", fontSize: 18, fontWeight: "900", marginTop: 24 },
  empty: { color: "#52645b", fontSize: 14, marginTop: 10 },
  entries: { gap: 10, marginTop: 12 },
  entry: {
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14
  },
  entryGoal: { color: "#0f7b5f", fontSize: 13, fontWeight: "900" },
  entryDecision: { color: "#15221d", fontSize: 15, fontWeight: "900", lineHeight: 22, marginTop: 4 },
  entryMeta: { color: "#627469", fontSize: 12, fontWeight: "800", marginTop: 6 },
  entryReason: { color: "#52645b", fontSize: 13, lineHeight: 19, marginTop: 6 },
  pressed: { opacity: 0.78 }
});
