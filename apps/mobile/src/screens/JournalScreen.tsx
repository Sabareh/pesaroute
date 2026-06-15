import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { maliPrime } from "../components/maliprime";
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
      <Text style={styles.title}>Private Journal</Text>
      <Text style={styles.copy}>Write the decision before money moves. Entries are private by default and can stay local-only.</Text>

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
        <TextInput
          onChangeText={setGoal}
          placeholder="Goal"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={styles.input}
          value={goal}
        />
        <TextInput
          onChangeText={setDecision}
          placeholder="Decision"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={styles.input}
          value={decision}
        />
        <TextInput
          editable={amountDisplayMode !== "hidden"}
          onChangeText={setAmountText}
          placeholder="Amount e.g. KES 10k-20k"
          placeholderTextColor={maliPrime.colors.textTertiary}
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
          placeholderTextColor={maliPrime.colors.textTertiary}
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
              <Text style={styles.entryDecision}>{entry.decision}</Text>
              <View style={styles.entryMetaGrid}>
                <Text style={styles.entryGoal}>{entry.goal}</Text>
                <Text style={styles.privateBadge}>
                  <Ionicons name="lock-closed" size={11} /> Private
                </Text>
                <Text style={styles.entryMeta}>Amount mode: {entry.amountDisplayMode}</Text>
                <Text style={styles.entryMeta}>Review date: Not set</Text>
                <Text style={styles.entryMeta}>Amount: {entry.amountDisplayMode === "hidden" ? "Hidden" : entry.amountText}</Text>
                <Text style={[styles.syncPill, entry.syncStatus === "failed" && styles.syncPillError]}>{statusLabel(entry)}</Text>
              </View>
              <Text style={styles.entryMeta}>Created {formatDate(entry.createdAt)}</Text>
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
  title: { color: maliPrime.colors.textPrimary, fontSize: 30, fontWeight: "700", lineHeight: 36 },
  copy: { color: maliPrime.colors.textSecondary, fontSize: 16, lineHeight: 24, marginTop: 10 },
  syncCard: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
    ...maliPrime.shadow
  },
  syncTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  syncCopy: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  syncButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44
  },
  syncButtonText: { color: maliPrime.colors.surface, fontSize: 13, fontWeight: "700" },
  promptButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44
  },
  promptButtonText: { color: maliPrime.colors.surface, fontSize: 13, fontWeight: "700" },
  form: { gap: 10, marginTop: 20 },
  input: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14
  },
  inputDisabled: { backgroundColor: maliPrime.colors.surfaceAlt },
  multi: { minHeight: 100, paddingTop: 14, textAlignVertical: "top" },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mode: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  modeActive: { backgroundColor: maliPrime.colors.primary, borderColor: maliPrime.colors.primary },
  modeText: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  modeTextActive: { color: maliPrime.colors.surface },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  save: { alignItems: "center", backgroundColor: maliPrime.colors.primary, borderRadius: maliPrime.radius.md, flex: 1, justifyContent: "center", minHeight: 50 },
  saveDisabled: { backgroundColor: maliPrime.colors.textTertiary },
  saveText: { color: maliPrime.colors.surface, fontSize: 15, fontWeight: "700" },
  cancel: { alignItems: "center", backgroundColor: maliPrime.colors.surfaceAlt, borderRadius: maliPrime.radius.md, justifyContent: "center", minHeight: 50, paddingHorizontal: 14 },
  cancelText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  status: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  error: { color: maliPrime.colors.warning, fontSize: 13, lineHeight: 19, marginTop: 8 },
  listTitle: { color: maliPrime.colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 24 },
  empty: { color: maliPrime.colors.textSecondary, fontSize: 14, marginTop: 10 },
  entries: { gap: 10, marginTop: 12 },
  entry: { backgroundColor: maliPrime.colors.surface, borderColor: maliPrime.colors.border, borderRadius: maliPrime.radius.lg, borderWidth: 1, padding: 14 },
  entryMuted: { opacity: 0.72 },
  entryGoal: { color: maliPrime.colors.textPrimary, flex: 1, fontSize: 13, fontWeight: "700" },
  privateBadge: {
    backgroundColor: "#E8F0EA",
    borderRadius: maliPrime.radius.pill,
    color: maliPrime.colors.emerald,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  entryMetaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  syncPill: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.pill,
    color: maliPrime.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  syncPillError: { backgroundColor: "#FFF1F0", color: maliPrime.colors.danger },
  entryDecision: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "700", lineHeight: 22, marginTop: 4 },
  entryMeta: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 6 },
  entryReason: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  itemActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: maliPrime.colors.surfaceAlt, borderRadius: maliPrime.radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: maliPrime.colors.textPrimary, fontSize: 12, fontWeight: "700" },
  deleteButton: { backgroundColor: "#FFF1F0", borderRadius: maliPrime.radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  deleteButtonText: { color: maliPrime.colors.danger, fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.78 }
});
