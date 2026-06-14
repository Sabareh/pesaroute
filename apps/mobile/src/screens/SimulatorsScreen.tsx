import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { PesaRouteApiClient } from "../api/client";
import { formatKes, formatUsd, parseMoneyInput } from "../utils/format";
import { simulateGlobalRoute, simulateMMF, simulateSacco, simulateTBill } from "../utils/simulators";

function NumberField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput keyboardType="numeric" onChangeText={onChangeText} placeholderTextColor="#7b8a83" style={styles.input} value={value} />
    </View>
  );
}

type ApiSimulationState = {
  loading: boolean;
  source: "local" | "api";
  error: string | null;
  mmf?: Record<string, unknown>;
  tbill?: Record<string, unknown>;
  sacco?: Record<string, unknown>;
  global?: Record<string, unknown>;
};

export function SimulatorsScreen({ apiClient }: { apiClient: PesaRouteApiClient }) {
  const [amount, setAmount] = useState("50000");
  const [months, setMonths] = useState("12");
  const [rate, setRate] = useState("12");
  const [fxRate, setFxRate] = useState("130");
  const [apiState, setApiState] = useState<ApiSimulationState>({ loading: false, source: "local", error: null });
  const parsedAmount = parseMoneyInput(amount, 50000);
  const parsedMonths = Math.max(1, Math.round(parseMoneyInput(months, 12)));
  const parsedRate = parseMoneyInput(rate, 12);
  const parsedFx = parseMoneyInput(fxRate, 130);

  const localResults = useMemo(
    () => ({
      mmf: simulateMMF({ principal: parsedAmount, annualRatePercent: parsedRate, months: parsedMonths }),
      tbill: simulateTBill({ faceValue: parsedAmount, discountRatePercent: parsedRate, days: 91 }),
      sacco: simulateSacco({ monthlyDeposit: parsedAmount, months: parsedMonths, annualDividendPercent: 8 }),
      global: simulateGlobalRoute({ amountKes: parsedAmount, fxRate: parsedFx, transferFeePercent: 2 })
    }),
    [parsedAmount, parsedFx, parsedMonths, parsedRate]
  );

  async function runApiSimulators() {
    setApiState({ loading: true, source: "local", error: null });
    try {
      const [mmf, tbill, sacco, global] = await Promise.all([
        apiClient.simulateMMF({
          principal: parsedAmount.toFixed(2),
          annual_rate_percent: parsedRate.toFixed(2),
          months: parsedMonths
        }),
        apiClient.simulateTBill({
          face_value: parsedAmount.toFixed(2),
          discount_rate_percent: parsedRate.toFixed(2),
          days: 91
        }),
        apiClient.simulateSacco({
          monthly_deposit: parsedAmount.toFixed(2),
          months: parsedMonths,
          annual_dividend_percent: "8.00"
        }),
        apiClient.simulateGlobalRoute({
          amount_kes: parsedAmount.toFixed(2),
          fx_rate: parsedFx.toFixed(4),
          transfer_fee_percent: "2.00"
        })
      ]);
      setApiState({ loading: false, source: "api", error: null, mmf, tbill, sacco, global });
    } catch (error) {
      setApiState({
        loading: false,
        source: "local",
        error: error instanceof Error ? error.message : "API unavailable; using local calculations"
      });
    }
  }

  return (
    <View>
      <Text style={styles.title}>Simulators</Text>
      <Text style={styles.copy}>Local educational calculations run offline. Tap API run to submit the same inputs to Django.</Text>

      <View style={styles.form}>
        <NumberField label="Amount or face value (KES)" value={amount} onChangeText={setAmount} />
        <NumberField label="Months" value={months} onChangeText={setMonths} />
        <NumberField label="Annual rate %" value={rate} onChangeText={setRate} />
        <NumberField label="FX rate KES/USD" value={fxRate} onChangeText={setFxRate} />
      </View>

      <Pressable accessibilityRole="button" onPress={runApiSimulators} style={({ pressed }) => [styles.apiButton, pressed && styles.pressed]}>
        <Text style={styles.apiButtonText}>{apiState.loading ? "Running API..." : "Run with API"}</Text>
      </Pressable>
      <Text style={[styles.source, apiState.source === "api" && styles.sourceApi]}>
        Showing {apiState.source === "api" ? "API response" : "local fallback"}.
      </Text>
      {apiState.error ? <Text style={styles.error}>{apiState.error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>MMF simulator</Text>
        <Text style={styles.cardCopy}>
          Projected value: {apiState.mmf?.projected_value ? `KES ${apiState.mmf.projected_value}` : formatKes(localResults.mmf.projectedValue)}
        </Text>
        <Text style={styles.cardMeta}>Estimated interest: {formatKes(localResults.mmf.projectedInterest)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>T-bill simulator</Text>
        <Text style={styles.cardCopy}>
          Purchase price:{" "}
          {apiState.tbill?.estimated_purchase_price ? `KES ${apiState.tbill.estimated_purchase_price}` : formatKes(localResults.tbill.estimatedPurchasePrice)}
        </Text>
        <Text style={styles.cardMeta}>Discount interest: {formatKes(localResults.tbill.estimatedDiscountInterest)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SACCO simulator</Text>
        <Text style={styles.cardCopy}>
          Projected total: {apiState.sacco?.projected_total ? `KES ${apiState.sacco.projected_total}` : formatKes(localResults.sacco.projectedTotal)}
        </Text>
        <Text style={styles.cardMeta}>Contributions: {formatKes(localResults.sacco.totalContributions)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Global route simulator</Text>
        <Text style={styles.cardCopy}>
          Estimated USD:{" "}
          {apiState.global?.estimated_usd_before_broker_costs
            ? `USD ${apiState.global.estimated_usd_before_broker_costs}`
            : formatUsd(localResults.global.estimatedUsdBeforeBrokerCosts)}
        </Text>
        <Text style={styles.cardMeta}>Estimated transfer fees: {formatKes(localResults.global.estimatedFeesKes)}</Text>
      </View>

      <Text style={styles.disclaimer}>Educational simulation only. We do not execute investments or promise returns.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: "#15221d", fontSize: 30, fontWeight: "900" },
  copy: { color: "#52645b", fontSize: 16, lineHeight: 24, marginTop: 10 },
  form: { gap: 10, marginTop: 18 },
  field: { gap: 6 },
  fieldLabel: { color: "#52645b", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    color: "#15221d",
    fontSize: 18,
    fontWeight: "900",
    minHeight: 50,
    paddingHorizontal: 14
  },
  apiButton: {
    alignItems: "center",
    backgroundColor: "#15221d",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50
  },
  apiButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  source: { color: "#627469", fontSize: 12, fontWeight: "900", marginTop: 10, textTransform: "uppercase" },
  sourceApi: { color: "#0f7b5f" },
  error: { color: "#7a431e", fontSize: 13, lineHeight: 19, marginTop: 6 },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 16
  },
  cardTitle: { color: "#15221d", fontSize: 16, fontWeight: "900" },
  cardCopy: { color: "#0f7b5f", fontSize: 16, fontWeight: "900", lineHeight: 23, marginTop: 8 },
  cardMeta: { color: "#627469", fontSize: 13, lineHeight: 20, marginTop: 4 },
  disclaimer: { color: "#6a776f", fontSize: 12, lineHeight: 18, marginTop: 12 },
  pressed: { opacity: 0.78 }
});
