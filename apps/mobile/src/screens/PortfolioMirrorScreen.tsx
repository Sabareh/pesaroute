import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { maliPrime } from "../components/maliprime";
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
        <TextInput
          onChangeText={setAssetType}
          placeholder="Asset type"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={styles.input}
          value={assetType}
        />
        <TextInput
          onChangeText={setProviderName}
          placeholder="Provider name optional"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={styles.input}
          value={providerName}
        />
        <TextInput
          editable={amountDisplayMode !== "hidden"}
          onChangeText={setAmountText}
          placeholder="Amount e.g. KES 10k-20k"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={[styles.input, amountDisplayMode === "hidden" && styles.inputDisabled]}
          value={amountDisplayMode === "hidden" ? "" : amountText}
        />
        <TextInput
          onChangeText={setMaturityDate}
          placeholder="Maturity date optional YYYY-MM-DD"
          placeholderTextColor={maliPrime.colors.textTertiary}
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
  title: { color: maliPrime.colors.textPrimary, fontSize: 30, fontWeight: "700", lineHeight: 36 },
  copy: { color: maliPrime.colors.textSecondary, fontSize: 16, lineHeight: 24, marginTop: 10 },
  lockCard: {
    backgroundColor: "#F7F2E7",
    borderColor: "rgba(141,106,46,0.22)",
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 14
  },
  lockTitle: { color: maliPrime.colors.amber, fontSize: 14, fontWeight: "700" },
  lockCopy: { color: maliPrime.colors.amber, fontSize: 13, lineHeight: 19, marginTop: 5 },
  upgradeButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 42
  },
  upgradeText: { color: maliPrime.colors.surface, fontSize: 13, fontWeight: "700" },
  summaryCard: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
    ...maliPrime.shadow
  },
  summaryTitle: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "700" },
  summaryKicker: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 5 },
  summaryLine: { color: maliPrime.colors.textPrimary, fontSize: 13, lineHeight: 19, marginTop: 5 },
  syncCard: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 14,
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
  form: { gap: 10, marginTop: 14 },
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
  groupTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "700", marginTop: 14 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: { backgroundColor: maliPrime.colors.surface, borderColor: maliPrime.colors.border, borderRadius: maliPrime.radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  pillActive: { backgroundColor: maliPrime.colors.primary, borderColor: maliPrime.colors.primary },
  pillText: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  pillTextActive: { color: maliPrime.colors.surface },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  save: { alignItems: "center", backgroundColor: maliPrime.colors.primary, borderRadius: maliPrime.radius.md, flex: 1, justifyContent: "center", minHeight: 50 },
  saveDisabled: { backgroundColor: maliPrime.colors.textTertiary },
  saveText: { color: maliPrime.colors.surface, fontSize: 15, fontWeight: "700" },
  cancel: { alignItems: "center", backgroundColor: maliPrime.colors.surfaceAlt, borderRadius: maliPrime.radius.md, justifyContent: "center", minHeight: 50, paddingHorizontal: 14 },
  cancelText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  status: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  error: { color: maliPrime.colors.warning, fontSize: 13, lineHeight: 19, marginTop: 8 },
  listTitle: { color: maliPrime.colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 24 },
  empty: { color: maliPrime.colors.textSecondary, fontSize: 14, marginTop: 10 },
  list: { gap: 10, marginTop: 12 },
  item: { backgroundColor: maliPrime.colors.surface, borderColor: maliPrime.colors.border, borderRadius: maliPrime.radius.lg, borderWidth: 1, padding: 14 },
  itemMuted: { opacity: 0.72 },
  itemHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  asset: { color: maliPrime.colors.textPrimary, flex: 1, fontSize: 15, fontWeight: "700" },
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
  meta: { color: maliPrime.colors.textSecondary, fontSize: 12, marginTop: 4 },
  amount: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700", marginTop: 8 },
  privacyPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F0EA",
    borderRadius: maliPrime.radius.pill,
    color: maliPrime.colors.emerald,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  itemActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: maliPrime.colors.surfaceAlt, borderRadius: maliPrime.radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: maliPrime.colors.textPrimary, fontSize: 12, fontWeight: "700" },
  deleteButton: { backgroundColor: "#FFF1F0", borderRadius: maliPrime.radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  deleteButtonText: { color: maliPrime.colors.danger, fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.78 }
});
