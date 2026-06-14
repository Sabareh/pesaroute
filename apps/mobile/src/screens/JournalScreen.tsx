import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { AmountDisplayMode, JournalEntry, JournalEntryDraft } from "../types";

const amountModes: AmountDisplayMode[] = ["exact", "rounded", "range", "hidden"];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-KE");
}

function statusLabel(entry: JournalEntry) {
  if (entry.pendingDelete) return "delete pending";
  return entry.syncStatus.replace("_", " ");
}

export function JournalScreen({
  entries,
  isAuthenticated,
  lastSyncAt,
  onDeleteEntry,
  onRequestAuth,
  onSaveEntry,
  onSyncNow,
  syncError,
  syncing,
  syncSummary
}: {
  entries: JournalEntry[];
  isAuthenticated: boolean;
  lastSyncAt: string | null;
  onDeleteEntry: (localId: string) => void;
  onRequestAuth: () => void;
  onSaveEntry: (entry: JournalEntryDraft, localId?: string) => void;
  onSyncNow: () => Promise<void>;
  syncError: string | null;
  syncing: boolean;
  syncSummary: { pending: number; failed: number; conflict: number; localOnly: number };
}) {
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [amountText, setAmountText] = useState("");
  const [amountDisplayMode, setAmountDisplayMode] = useState<AmountDisplayMode>("range");
  const [status, setStatus] = useState<string | null>(null);

  const canSave = useMemo(() => decision.trim().length > 2, [decision]);

  function resetForm() {
    setEditingLocalId(null);
    setGoal("");
    setDecision("");
    setReason("");
    setAmountText("");
    setAmountDisplayMode("range");
  }

  function startEdit(entry: JournalEntry) {
    setEditingLocalId(entry.localId);
    setGoal(entry.goal);
    setDecision(entry.decision);
    setReason(entry.reason);
    setAmountText(entry.amountDisplayMode === "hidden" ? "" : entry.amountText);
    setAmountDisplayMode(entry.amountDisplayMode);
    setStatus(null);
  }

  function saveEntry() {
    if (!canSave) return;
    onSaveEntry(
      {
        goal: goal.trim() || "General",
        decision: decision.trim(),
        amountDisplayMode,
        amountText: amountDisplayMode === "hidden" ? "Hidden" : amountText.trim() || "Not set",
        reason: reason.trim()
      },
      editingLocalId ?? undefined
    );
    setStatus(isAuthenticated ? "Saved locally and queued for sync." : "Saved local-only on this device.");
    resetForm();
  }

  return (
    <View>
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.copy}>Create and edit private entries offline. Logged-in accounts sync when the API is reachable.</Text>

      <View style={styles.syncCard}>
        <Text style={styles.syncTitle}>{isAuthenticated ? "Cloud sync" : "Anonymous local-only mode"}</Text>
        <Text style={styles.syncCopy}>
          {isAuthenticated
            ? `Pending ${syncSummary.pending} - Failed ${syncSummary.failed} - Conflicts ${syncSummary.conflict}`
            : "Journal entries stay on this device unless you log in."}
        </Text>
        {lastSyncAt && isAuthenticated ? <Text style={styles.syncCopy}>Last sync: {lastSyncAt}</Text> : null}
        {syncError ? <Text style={styles.error}>{syncError}</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={isAuthenticated ? onSyncNow : onRequestAuth}
          style={isAuthenticated ? styles.syncButton : styles.promptButton}
        >
          <Text style={isAuthenticated ? styles.syncButtonText : styles.promptButtonText}>
            {isAuthenticated ? (syncing ? "Syncing..." : "Sync now") : "Log in or create account"}
          </Text>
        </Pressable>
      </View>

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
          editable={amountDisplayMode !== "hidden"}
          onChangeText={setAmountText}
          placeholder="Amount e.g. KES 10k-20k"
          placeholderTextColor="#7b8a83"
          style={[styles.input, amountDisplayMode === "hidden" && styles.inputDisabled]}
          value={amountDisplayMode === "hidden" ? "" : amountText}
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
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={saveEntry}
          style={({ pressed }) => [styles.save, !canSave && styles.saveDisabled, pressed && canSave && styles.pressed]}
        >
          <Text style={styles.saveText}>{editingLocalId ? "Update entry" : "Create entry"}</Text>
        </Pressable>
        {editingLocalId ? (
          <Pressable accessibilityRole="button" onPress={resetForm} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Text style={styles.listTitle}>Entries</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>No journal entries yet.</Text>
      ) : (
        <View style={styles.entries}>
          {entries.map((entry) => (
            <View key={entry.localId} style={[styles.entry, entry.pendingDelete && styles.entryMuted]}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryGoal}>{entry.goal}</Text>
                <Text style={[styles.syncPill, entry.syncStatus === "failed" && styles.syncPillError]}>{statusLabel(entry)}</Text>
              </View>
              <Text style={styles.entryDecision}>{entry.decision}</Text>
              <Text style={styles.entryMeta}>
                {entry.amountDisplayMode}: {entry.amountDisplayMode === "hidden" ? "Hidden" : entry.amountText} - {formatDate(entry.createdAt)}
              </Text>
              {entry.reason ? <Text style={styles.entryReason}>{entry.reason}</Text> : null}
              {entry.syncError ? <Text style={styles.error}>{entry.syncError}</Text> : null}
              <View style={styles.itemActions}>
                <Pressable accessibilityRole="button" onPress={() => startEdit(entry)} style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>Edit</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => onDeleteEntry(entry.localId)} style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
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
  syncCard: {
    backgroundColor: "#fff8ef",
    borderColor: "#ead7bd",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 14
  },
  syncTitle: { color: "#7a431e", fontSize: 14, fontWeight: "900" },
  syncCopy: { color: "#7a5b3f", fontSize: 13, lineHeight: 19, marginTop: 4 },
  syncButton: {
    alignItems: "center",
    backgroundColor: "#15221d",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44
  },
  syncButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  promptButton: {
    alignItems: "center",
    backgroundColor: "#0f7b5f",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44
  },
  promptButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
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
  inputDisabled: { backgroundColor: "#eef3ef" },
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
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  save: { alignItems: "center", backgroundColor: "#0f7b5f", borderRadius: 8, flex: 1, justifyContent: "center", minHeight: 50 },
  saveDisabled: { backgroundColor: "#91a39a" },
  saveText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  cancel: { alignItems: "center", backgroundColor: "#dff5ec", borderRadius: 8, justifyContent: "center", minHeight: 50, paddingHorizontal: 14 },
  cancelText: { color: "#0f7b5f", fontSize: 13, fontWeight: "900" },
  status: { color: "#52645b", fontSize: 13, lineHeight: 19, marginTop: 10 },
  error: { color: "#7a431e", fontSize: 13, lineHeight: 19, marginTop: 8 },
  listTitle: { color: "#15221d", fontSize: 18, fontWeight: "900", marginTop: 24 },
  empty: { color: "#52645b", fontSize: 14, marginTop: 10 },
  entries: { gap: 10, marginTop: 12 },
  entry: { backgroundColor: "#ffffff", borderColor: "#e3ece7", borderRadius: 8, borderWidth: 1, padding: 14 },
  entryMuted: { opacity: 0.72 },
  entryHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  entryGoal: { color: "#0f7b5f", flex: 1, fontSize: 13, fontWeight: "900" },
  syncPill: {
    backgroundColor: "#dff5ec",
    borderRadius: 8,
    color: "#0f7b5f",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  syncPillError: { backgroundColor: "#fff0e4", color: "#7a431e" },
  entryDecision: { color: "#15221d", fontSize: 15, fontWeight: "900", lineHeight: 22, marginTop: 4 },
  entryMeta: { color: "#627469", fontSize: 12, fontWeight: "800", marginTop: 6 },
  entryReason: { color: "#52645b", fontSize: 13, lineHeight: 19, marginTop: 6 },
  itemActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: "#dff5ec", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: "#0f7b5f", fontSize: 12, fontWeight: "900" },
  deleteButton: { backgroundColor: "#fff0e4", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteButtonText: { color: "#7a431e", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.78 }
});
