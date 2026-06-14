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
  onOpenPricing,
  onRequestAuth,
  onSaveItem,
  onSyncNow,
  portfolioSummary,
  premiumEnabled,
  syncError,
  syncing,
  syncSummary
}: {
  isAuthenticated: boolean;
  items: PortfolioItem[];
  lastSyncAt: string | null;
  onDeleteItem: (localId: string) => void;
  onOpenPricing: () => void;
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
  premiumEnabled: boolean;
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
      <Text style={styles.copy}>Manual mirror only. No account links, no broker credentials, and no execution. Exact amounts are optional.</Text>

      {!premiumEnabled ? (
        <View style={styles.lockCard}>
          <Text style={styles.lockTitle}>Premium feature</Text>
          <Text style={styles.lockCopy}>
            Portfolio Mirror is prepared as a premium entitlement. You can still test local behavior during MVP development.
          </Text>
          <Pressable accessibilityRole="button" onPress={onOpenPricing} style={styles.upgradeButton}>
            <Text style={styles.upgradeText}>View Premium</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Portfolio summary</Text>
        <Text style={styles.summaryKicker}>Privacy mode: ranges and hidden values stay hidden in totals.</Text>
        <Text style={styles.summaryLine}>Asset mix: {categoryText || "No items yet"}</Text>
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
        <Text style={styles.summaryLine}>Risk concentration: {portfolioSummary.riskNote}</Text>
        <Text style={styles.summaryLine}>Maturity reminders: add optional maturity dates to track lockups.</Text>
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
        <TextInput onChangeText={setAssetType} placeholder="Asset type" placeholderTextColor="#7D8794" style={styles.input} value={assetType} />
        <TextInput
          onChangeText={setProviderName}
          placeholder="Provider name optional"
          placeholderTextColor="#7D8794"
          style={styles.input}
          value={providerName}
        />
        <TextInput
          editable={amountDisplayMode !== "hidden"}
          onChangeText={setAmountText}
          placeholder="Amount e.g. KES 10k-20k"
          placeholderTextColor="#7D8794"
          style={[styles.input, amountDisplayMode === "hidden" && styles.inputDisabled]}
          value={amountDisplayMode === "hidden" ? "" : amountText}
        />
        <TextInput
          onChangeText={setMaturityDate}
          placeholder="Maturity date optional YYYY-MM-DD"
          placeholderTextColor="#7D8794"
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
              <Text style={styles.amount}>Amount mode: {item.amountDisplayMode} - {item.amountDisplayMode === "hidden" ? "Hidden" : item.amountText}</Text>
              <Text style={styles.privacyPill}>Private mirror item</Text>
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
  title: { color: "#0B1220", fontSize: 30, fontWeight: "900" },
  copy: { color: "#5B6472", fontSize: 16, lineHeight: 24, marginTop: 10 },
  lockCard: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F7D79A",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 14
  },
  lockTitle: { color: "#A86500", fontSize: 14, fontWeight: "900" },
  lockCopy: { color: "#A86500", fontSize: 13, lineHeight: 19, marginTop: 5 },
  upgradeButton: {
    alignItems: "center",
    backgroundColor: "#A86500",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 42
  },
  upgradeText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  summaryCard: {
    backgroundColor: "#F1F4F9",
    borderColor: "#cfe8dd",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 14
  },
  summaryTitle: { color: "#2457FF", fontSize: 15, fontWeight: "900" },
  summaryKicker: { color: "#5B6472", fontSize: 12, fontWeight: "800", lineHeight: 18, marginTop: 5 },
  summaryLine: { color: "#0B1220", fontSize: 13, lineHeight: 19, marginTop: 5 },
  syncCard: {
    backgroundColor: "#fff8ef",
    borderColor: "#F7D79A",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    padding: 14
  },
  syncTitle: { color: "#A86500", fontSize: 14, fontWeight: "900" },
  syncCopy: { color: "#7A5B22", fontSize: 13, lineHeight: 19, marginTop: 4 },
  syncButton: {
    alignItems: "center",
    backgroundColor: "#0B1220",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44
  },
  syncButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  promptButton: {
    alignItems: "center",
    backgroundColor: "#2457FF",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44
  },
  promptButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  form: { gap: 10, marginTop: 14 },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#E5EAF0",
    borderRadius: 16,
    borderWidth: 1,
    color: "#0B1220",
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14
  },
  inputDisabled: { backgroundColor: "#F1F4F9" },
  groupTitle: { color: "#0B1220", fontSize: 14, fontWeight: "900", marginTop: 14 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: { backgroundColor: "#ffffff", borderColor: "#E5EAF0", borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  pillActive: { backgroundColor: "#EAF0FF", borderColor: "#2457FF" },
  pillText: { color: "#5B6472", fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
  pillTextActive: { color: "#2457FF" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  save: { alignItems: "center", backgroundColor: "#2457FF", borderRadius: 16, flex: 1, justifyContent: "center", minHeight: 50 },
  saveDisabled: { backgroundColor: "#9FB2D6" },
  saveText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  cancel: { alignItems: "center", backgroundColor: "#EAF0FF", borderRadius: 16, justifyContent: "center", minHeight: 50, paddingHorizontal: 14 },
  cancelText: { color: "#2457FF", fontSize: 13, fontWeight: "900" },
  status: { color: "#5B6472", fontSize: 13, lineHeight: 19, marginTop: 10 },
  error: { color: "#A86500", fontSize: 13, lineHeight: 19, marginTop: 8 },
  listTitle: { color: "#0B1220", fontSize: 18, fontWeight: "900", marginTop: 24 },
  empty: { color: "#5B6472", fontSize: 14, marginTop: 10 },
  list: { gap: 10, marginTop: 12 },
  item: { backgroundColor: "#ffffff", borderColor: "#E5EAF0", borderRadius: 16, borderWidth: 1, padding: 14 },
  itemMuted: { opacity: 0.72 },
  itemHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  asset: { color: "#0B1220", flex: 1, fontSize: 15, fontWeight: "900" },
  syncPill: {
    backgroundColor: "#EAF0FF",
    borderRadius: 16,
    color: "#2457FF",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  syncPillError: { backgroundColor: "#FDECEC", color: "#A86500" },
  meta: { color: "#5B6472", fontSize: 12, marginTop: 4 },
  amount: { color: "#2457FF", fontSize: 13, fontWeight: "900", marginTop: 8 },
  privacyPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E9F8F1",
    borderRadius: 16,
    color: "#0FA36B",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 8,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  itemActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: "#EAF0FF", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: "#2457FF", fontSize: 12, fontWeight: "900" },
  deleteButton: { backgroundColor: "#FDECEC", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  deleteButtonText: { color: "#A86500", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.78 }
});
