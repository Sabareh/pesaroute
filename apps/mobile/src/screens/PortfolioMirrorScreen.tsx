import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { PesaRouteApiClient } from "../api/client";
import type { AmountDisplayMode, AuthCredentials, PortfolioItem } from "../types";

const amountModes: AmountDisplayMode[] = ["exact", "rounded", "range", "hidden"];
const liquidityLevels: PortfolioItem["liquidityLevel"][] = ["high", "medium", "low", "locked"];
const riskLevels: PortfolioItem["riskLevel"][] = ["low", "moderate", "high", "very_high"];

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

export function PortfolioMirrorScreen({
  apiClient,
  auth,
  items,
  onAddItem
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  items: PortfolioItem[];
  onAddItem: (item: PortfolioItem) => void;
}) {
  const [assetType, setAssetType] = useState("Money Market Funds");
  const [providerName, setProviderName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [amountDisplayMode, setAmountDisplayMode] = useState<AmountDisplayMode>("range");
  const [liquidityLevel, setLiquidityLevel] = useState<PortfolioItem["liquidityLevel"]>("high");
  const [riskLevel, setRiskLevel] = useState<PortfolioItem["riskLevel"]>("low");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const canSave = useMemo(() => assetType.trim().length > 2, [assetType]);

  async function saveItem() {
    if (!canSave) return;
    setSaving(true);
    setStatus(null);
    const item: PortfolioItem = {
      id: `portfolio-${Date.now()}`,
      assetType: assetType.trim(),
      providerName: providerName.trim(),
      amountDisplayMode,
      amountText: amountDisplayMode === "hidden" ? "Hidden" : amountText.trim() || "Not set",
      liquidityLevel,
      riskLevel,
      createdAt: new Date().toLocaleDateString("en-KE")
    };

    if (auth) {
      try {
        const parsed = parseAmountRange(amountText);
        await apiClient.createPortfolioItem(
          {
            asset_type: item.assetType,
            provider_name: item.providerName,
            amount_display_mode: amountDisplayMode,
            amount_exact: amountDisplayMode === "exact" ? parsed.exact : undefined,
            amount_range_min: amountDisplayMode === "range" ? parsed.min : undefined,
            amount_range_max: amountDisplayMode === "range" ? parsed.max : undefined,
            liquidity_level: liquidityLevel,
            risk_level: riskLevel,
            visibility: "private"
          },
          auth
        );
        setStatus("Saved to backend and local mirror.");
      } catch (error) {
        setStatus(`Backend save failed; kept local only. ${error instanceof Error ? error.message : ""}`.trim());
      }
    } else {
      setStatus("Saved local-only. Add API credentials in the API tab to test backend writes.");
    }

    onAddItem(item);
    setAssetType("Money Market Funds");
    setProviderName("");
    setAmountText("");
    setAmountDisplayMode("range");
    setLiquidityLevel("high");
    setRiskLevel("low");
    setSaving(false);
  }

  return (
    <View>
      <Text style={styles.title}>Portfolio Mirror</Text>
      <Text style={styles.copy}>Manual mirror only. No account links, no broker credentials, and no execution.</Text>

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
          onChangeText={setAmountText}
          placeholder="Amount e.g. KES 10k-20k"
          placeholderTextColor="#7b8a83"
          style={styles.input}
          value={amountText}
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

      <Pressable
        accessibilityRole="button"
        disabled={!canSave || saving}
        onPress={saveItem}
        style={({ pressed }) => [styles.save, (!canSave || saving) && styles.saveDisabled, pressed && canSave && styles.pressed]}
      >
        <Text style={styles.saveText}>{saving ? "Saving..." : "Add mirror item"}</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Text style={styles.listTitle}>Local mirror</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No mirrored items yet.</Text>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemText}>
                <Text style={styles.asset}>{item.assetType}</Text>
                <Text style={styles.meta}>
                  {item.liquidityLevel} liquidity - {item.riskLevel} risk
                </Text>
                {item.providerName ? <Text style={styles.meta}>{item.providerName}</Text> : null}
              </View>
              <Text style={styles.amount}>{item.amountText}</Text>
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
  groupTitle: { color: "#15221d", fontSize: 14, fontWeight: "900", marginTop: 14 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  pillActive: { backgroundColor: "#dff5ec", borderColor: "#0f7b5f" },
  pillText: { color: "#52645b", fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
  pillTextActive: { color: "#0f7b5f" },
  save: {
    alignItems: "center",
    backgroundColor: "#0f7b5f",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50
  },
  saveDisabled: { backgroundColor: "#91a39a" },
  saveText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  status: { color: "#52645b", fontSize: 13, lineHeight: 19, marginTop: 10 },
  listTitle: { color: "#15221d", fontSize: 18, fontWeight: "900", marginTop: 24 },
  empty: { color: "#52645b", fontSize: 14, marginTop: 10 },
  list: { gap: 10, marginTop: 12 },
  item: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14
  },
  itemText: { flex: 1, paddingRight: 10 },
  asset: { color: "#15221d", fontSize: 15, fontWeight: "900" },
  meta: { color: "#627469", fontSize: 12, marginTop: 4 },
  amount: { color: "#0f7b5f", fontSize: 13, fontWeight: "900" },
  pressed: { opacity: 0.78 }
});
