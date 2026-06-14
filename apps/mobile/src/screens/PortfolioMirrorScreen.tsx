import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { AmountDisplayMode, PortfolioItem, PortfolioItemDraft } from "../types";

const amountModes: AmountDisplayMode[] = ["exact", "rounded", "range", "hidden"];
const liquidityLevels: PortfolioItem["liquidityLevel"][] = ["high", "medium", "low", "locked"];
const riskLevels: PortfolioItem["riskLevel"][] = ["low", "moderate", "high", "very_high"];
const assetTypes = ["Money Market Funds", "Treasury Bills", "SACCO", "Global ETF", "Land", "Other"];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-KE");
}

function formatKes(value: number) {
  return `KES ${Math.round(value).toLocaleString("en-KE")}`;
}

function statusLabel(item: PortfolioItem) {
  if (item.pendingDelete) return "delete pending";
  return item.syncStatus.replace("_", " ");
}

export function PortfolioMirrorScreen({
  isAuthenticated,
  items,
  lastSyncAt,
  onDeleteItem,
  onRequestAuth,
  onSaveItem,
  onSyncNow,
  portfolioSummary,
  syncError,
  syncing,
  syncSummary
}: {
  isAuthenticated: boolean;
  items: PortfolioItem[];
  lastSyncAt: string | null;
  onDeleteItem: (localId: string) => void;
  onRequestAuth: () => void;
  onSaveItem: (item: PortfolioItemDraft, localId?: string) => void;
  onSyncNow: () => Promise<void>;
  portfolioSummary: {
    categories: Record<string, number>;
    exactTotal: number | null;
    hidesExactTotal: boolean;
    itemsCount: number;
    liquidityScore: number | null;
    riskNote: string;
  };
  syncError: string | null;
  syncing: boolean;
  syncSummary: { pending: number; failed: number; conflict: number; localOnly: number };
}) {
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [assetType, setAssetType] = useState("Money Market Funds");
  const [providerName, setProviderName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [amountDisplayMode, setAmountDisplayMode] = useState<AmountDisplayMode>("range");
  const [liquidityLevel, setLiquidityLevel] = useState<PortfolioItem["liquidityLevel"]>("high");
  const [riskLevel, setRiskLevel] = useState<PortfolioItem["riskLevel"]>("low");
  const [maturityDate, setMaturityDate] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const canSave = useMemo(() => assetType.trim().length > 2, [assetType]);
  const categoryText = Object.entries(portfolioSummary.categories)
    .map(([category, count]) => `${category} (${count})`)
    .join(", ");

  function resetForm() {
    setEditingLocalId(null);
    setAssetType("Money Market Funds");
    setProviderName("");
    setAmountText("");
    setAmountDisplayMode("range");
    setLiquidityLevel("high");
    setRiskLevel("low");
    setMaturityDate("");
  }

  function startEdit(item: PortfolioItem) {
    setEditingLocalId(item.localId);
    setAssetType(item.assetType);
    setProviderName(item.providerName);
    setAmountText(item.amountDisplayMode === "hidden" ? "" : item.amountText);
    setAmountDisplayMode(item.amountDisplayMode);
    setLiquidityLevel(item.liquidityLevel);
    setRiskLevel(item.riskLevel);
    setMaturityDate(item.maturityDate ?? "");
    setStatus(null);
  }

  function saveItem() {
    if (!canSave) return;
    onSaveItem(
      {
        assetType: assetType.trim(),
        providerName: providerName.trim(),
        amountDisplayMode,
        amountText: amountDisplayMode === "hidden" ? "Hidden" : amountText.trim() || "Not set",
        liquidityLevel,
        riskLevel,
        maturityDate: maturityDate.trim() || undefined
      },
      editingLocalId ?? undefined
    );
    setStatus(isAuthenticated ? "Saved locally and queued for sync." : "Saved local-only on this device.");
    resetForm();
  }

  return (
    <View>
      <Text style={styles.title}>Portfolio Mirror</Text>
      <Text style={styles.copy}>Manual mirror only. No account links, no broker credentials, and no execution.</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <Text style={styles.summaryLine}>Categories: {categoryText || "No items yet"}</Text>
        <Text style={styles.summaryLine}>
          Total:{" "}
          {portfolioSummary.itemsCount === 0
            ? "No items yet"
            : portfolioSummary.exactTotal !== null && !portfolioSummary.hidesExactTotal
              ? formatKes(portfolioSummary.exactTotal)
              : "Hidden while any item uses range or hidden mode"}
        </Text>
        <Text style={styles.summaryLine}>
          Liquidity score: {portfolioSummary.liquidityScore === null ? "Not enough data" : `${portfolioSummary.liquidityScore}/3`}
        </Text>
        <Text style={styles.summaryLine}>{portfolioSummary.riskNote}</Text>
      </View>

      <View style={styles.syncCard}>
        <Text style={styles.syncTitle}>{isAuthenticated ? "Cloud sync" : "Anonymous local-only mode"}</Text>
        <Text style={styles.syncCopy}>
          {isAuthenticated
            ? `Pending ${syncSummary.pending} - Failed ${syncSummary.failed} - Conflicts ${syncSummary.conflict}`
            : "Portfolio mirror items stay on this device unless you log in."}
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

      <Text style={styles.groupTitle}>Asset type</Text>
      <View style={styles.pillRow}>
        {assetTypes.map((type) => (
          <Pressable key={type} onPress={() => setAssetType(type)} style={[styles.pill, assetType === type && styles.pillActive]}>
            <Text style={[styles.pillText, assetType === type && styles.pillTextActive]}>{type}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.form}>
        <TextInput onChangeText={setAssetType} placeholder="Asset type" placeholderTextColor="#7b8a83" style={styles.input} value={assetType} />
        <TextInput
          onChangeText={setProviderName}
          placeholder="Provider name optional"
          placeholderTextColor="#7b8a83"
          style={styles.input}
          value={providerName}
        />
        <TextInput
          editable={amountDisplayMode !== "hidden"}
          onChangeText={setAmountText}
          placeholder="Amount e.g. KES 10k-20k"
          placeholderTextColor="#7b8a83"
          style={[styles.input, amountDisplayMode === "hidden" && styles.inputDisabled]}
          value={amountDisplayMode === "hidden" ? "" : amountText}
        />
        <TextInput
          onChangeText={setMaturityDate}
          placeholder="Maturity date optional YYYY-MM-DD"
          placeholderTextColor="#7b8a83"
          style={styles.input}
          value={maturityDate}
        />
      </View>

      <Text style={styles.groupTitle}>Amount mode</Text>
      <View style={styles.pillRow}>
        {amountModes.map((mode) => (
          <Pressable key={mode} onPress={() => setAmountDisplayMode(mode)} style={[styles.pill, amountDisplayMode === mode && styles.pillActive]}>
            <Text style={[styles.pillText, amountDisplayMode === mode && styles.pillTextActive]}>{mode}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.groupTitle}>Liquidity</Text>
      <View style={styles.pillRow}>
        {liquidityLevels.map((level) => (
          <Pressable key={level} onPress={() => setLiquidityLevel(level)} style={[styles.pill, liquidityLevel === level && styles.pillActive]}>
            <Text style={[styles.pillText, liquidityLevel === level && styles.pillTextActive]}>{level}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.groupTitle}>Risk</Text>
      <View style={styles.pillRow}>
        {riskLevels.map((level) => (
          <Pressable key={level} onPress={() => setRiskLevel(level)} style={[styles.pill, riskLevel === level && styles.pillActive]}>
            <Text style={[styles.pillText, riskLevel === level && styles.pillTextActive]}>{level}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={saveItem}
          style={({ pressed }) => [styles.save, !canSave && styles.saveDisabled, pressed && canSave && styles.pressed]}
        >
          <Text style={styles.saveText}>{editingLocalId ? "Update item" : "Add mirror item"}</Text>
        </Pressable>
        {editingLocalId ? (
          <Pressable accessibilityRole="button" onPress={resetForm} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Text style={styles.listTitle}>Mirror items</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No mirrored items yet.</Text>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.localId} style={[styles.item, item.pendingDelete && styles.itemMuted]}>
              <View style={styles.itemHeader}>
                <Text style={styles.asset}>{item.assetType}</Text>
                <Text style={[styles.syncPill, item.syncStatus === "failed" && styles.syncPillError]}>{statusLabel(item)}</Text>
              </View>
              <Text style={styles.meta}>
                {item.liquidityLevel} liquidity - {item.riskLevel} risk
              </Text>
              {item.providerName ? <Text style={styles.meta}>{item.providerName}</Text> : null}
              {item.maturityDate ? <Text style={styles.meta}>Matures {item.maturityDate}</Text> : null}
              <Text style={styles.amount}>{item.amountDisplayMode === "hidden" ? "Hidden" : item.amountText}</Text>
              <Text style={styles.meta}>Updated {formatDate(item.updatedAt)}</Text>
              {item.syncError ? <Text style={styles.error}>{item.syncError}</Text> : null}
              <View style={styles.itemActions}>
                <Pressable accessibilityRole="button" onPress={() => startEdit(item)} style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>Edit</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => onDeleteItem(item.localId)} style={styles.deleteButton}>
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
  summaryCard: {
    backgroundColor: "#edf8f3",
    borderColor: "#cfe8dd",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 14
  },
  summaryTitle: { color: "#0f7b5f", fontSize: 15, fontWeight: "900" },
  summaryLine: { color: "#234238", fontSize: 13, lineHeight: 19, marginTop: 5 },
  syncCard: {
    backgroundColor: "#fff8ef",
    borderColor: "#ead7bd",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
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
  form: { gap: 10, marginTop: 14 },
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
  groupTitle: { color: "#15221d", fontSize: 14, fontWeight: "900", marginTop: 14 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: { backgroundColor: "#ffffff", borderColor: "#dbe6df", borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  pillActive: { backgroundColor: "#dff5ec", borderColor: "#0f7b5f" },
  pillText: { color: "#52645b", fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
  pillTextActive: { color: "#0f7b5f" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  save: { alignItems: "center", backgroundColor: "#0f7b5f", borderRadius: 8, flex: 1, justifyContent: "center", minHeight: 50 },
  saveDisabled: { backgroundColor: "#91a39a" },
  saveText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  cancel: { alignItems: "center", backgroundColor: "#dff5ec", borderRadius: 8, justifyContent: "center", minHeight: 50, paddingHorizontal: 14 },
  cancelText: { color: "#0f7b5f", fontSize: 13, fontWeight: "900" },
  status: { color: "#52645b", fontSize: 13, lineHeight: 19, marginTop: 10 },
  error: { color: "#7a431e", fontSize: 13, lineHeight: 19, marginTop: 8 },
  listTitle: { color: "#15221d", fontSize: 18, fontWeight: "900", marginTop: 24 },
  empty: { color: "#52645b", fontSize: 14, marginTop: 10 },
  list: { gap: 10, marginTop: 12 },
  item: { backgroundColor: "#ffffff", borderColor: "#e3ece7", borderRadius: 8, borderWidth: 1, padding: 14 },
  itemMuted: { opacity: 0.72 },
  itemHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  asset: { color: "#15221d", flex: 1, fontSize: 15, fontWeight: "900" },
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
  meta: { color: "#627469", fontSize: 12, marginTop: 4 },
  amount: { color: "#0f7b5f", fontSize: 13, fontWeight: "900", marginTop: 8 },
  itemActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: "#dff5ec", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: "#0f7b5f", fontSize: 12, fontWeight: "900" },
  deleteButton: { backgroundColor: "#fff0e4", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteButtonText: { color: "#7a431e", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.78 }
});
