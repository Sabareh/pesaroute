import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { BillingEntitlementSnapshot, PesaRouteApiClient } from "../api/client";
import { LiquidityBadge, PremiumCard, PrimaryButton, RiskBadge, SecondaryButton, maliPrime, maliPrimeText } from "../components/maliprime";
import type { AuthCredentials, JournalEntryDraft } from "../types";
import { formatKes, formatUsd, parseMoneyInput } from "../utils/format";
import { simulateGlobalRoute, simulateMMF, simulateSacco, simulateTBill } from "../utils/simulators";

function NumberField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput keyboardType="numeric" onChangeText={onChangeText} placeholderTextColor="#7D8794" style={styles.input} value={value} />
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

function readSimulationRunId(result?: Record<string, unknown>) {
  const value = result?.simulation_run_id;
  return typeof value === "number" ? value : null;
}

function DetailedSimulatorCard({
  beginnerMistake,
  liquidity,
  nextStep,
  risk,
  title,
  value,
  whatCanGoWrong
}: {
  beginnerMistake: string;
  liquidity: string;
  nextStep: string;
  risk: string;
  title: string;
  value: string;
  whatCanGoWrong: string;
}) {
  return (
    <PremiumCard>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <View style={styles.badgeRow}>
        <RiskBadge level={risk} />
        <LiquidityBadge level={liquidity} />
      </View>
      <Text style={styles.detailLabel}>What can go wrong</Text>
      <Text style={styles.detailCopy}>{whatCanGoWrong}</Text>
      <Text style={styles.detailLabel}>Beginner mistake</Text>
      <Text style={styles.detailCopy}>{beginnerMistake}</Text>
      <Text style={styles.detailLabel}>Next learning step</Text>
      <Text style={styles.detailCopy}>{nextStep}</Text>
      <Text style={styles.cardDisclaimer}>This is an educational simulation, not investment advice.</Text>
    </PremiumCard>
  );
}

export function SimulatorsScreen({
  apiClient,
  auth,
  entitlements,
  learningLessonContext,
  onLearningSimulationComplete,
  onSaveJournal,
  onOpenPricing
}: {
  apiClient: PesaRouteApiClient;
  auth?: AuthCredentials | null;
  entitlements: BillingEntitlementSnapshot | null;
  learningLessonContext?: { id: number; title: string } | null;
  onLearningSimulationComplete?: (simulationRunId: number) => Promise<void> | void;
  onSaveJournal?: (entry: JournalEntryDraft) => void;
  onOpenPricing: () => void;
}) {
  const [amount, setAmount] = useState("50000");
  const [months, setMonths] = useState("12");
  const [rate, setRate] = useState("12");
  const [fxRate, setFxRate] = useState("130");
  const [apiState, setApiState] = useState<ApiSimulationState>({ loading: false, source: "local", error: null });
  const [learningStatus, setLearningStatus] = useState<string | null>(null);
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
    setLearningStatus(null);
    const learning_lesson_id = learningLessonContext?.id;
    try {
      const [mmf, tbill, sacco, global] = await Promise.all([
        apiClient.simulateMMF({
          principal: parsedAmount.toFixed(2),
          annual_rate_percent: parsedRate.toFixed(2),
          months: parsedMonths,
          learning_lesson_id
        }),
        apiClient.simulateTBill({
          face_value: parsedAmount.toFixed(2),
          discount_rate_percent: parsedRate.toFixed(2),
          days: 91,
          learning_lesson_id
        }),
        apiClient.simulateSacco({
          monthly_deposit: parsedAmount.toFixed(2),
          months: parsedMonths,
          annual_dividend_percent: "8.00",
          learning_lesson_id
        }),
        apiClient.simulateGlobalRoute({
          amount_kes: parsedAmount.toFixed(2),
          fx_rate: parsedFx.toFixed(4),
          transfer_fee_percent: "2.00",
          learning_lesson_id
        })
      ]);
      setApiState({ loading: false, source: "api", error: null, mmf, tbill, sacco, global });
      const simulationRunId =
        readSimulationRunId(mmf) ?? readSimulationRunId(tbill) ?? readSimulationRunId(sacco) ?? readSimulationRunId(global);
      if (simulationRunId && onLearningSimulationComplete) {
        try {
          await onLearningSimulationComplete(simulationRunId);
          setLearningStatus(auth ? "Learning progress updated with simulator practice." : "Simulator completed. Log in to sync XP.");
        } catch {
          setLearningStatus("Simulator completed. Learning progress can retry when the API is reachable.");
        }
      }
    } catch (error) {
      setApiState({
        loading: false,
        source: "local",
        error: error instanceof Error ? error.message : "API unavailable; using local calculations"
      });
    }
  }

  function saveSimulatorReflection() {
    onSaveJournal?.({
      goal: learningLessonContext ? "Learning simulator reflection" : "Simulator reflection",
      decision: learningLessonContext?.title ?? "Reviewed simulator output",
      amountDisplayMode: "range",
      amountText: `KES ${amount}`,
      reason: "For education only. Compare before committing money and speak to a licensed professional when needed."
    });
    setLearningStatus("Reflection saved to journal. Use ranges if you do not want exact amounts.");
  }

  return (
    <View style={styles.screen}>
      <Text style={maliPrimeText.title}>Simulators</Text>
      <Text style={maliPrimeText.subtitle}>This is an educational simulation, not investment advice. Local calculations run offline.</Text>
      {learningLessonContext ? (
        <PremiumCard tone="alt">
          <Text style={styles.contextLabel}>Learning practice</Text>
          <Text style={styles.contextTitle}>{learningLessonContext.title}</Text>
          <Text style={styles.contextCopy}>Run a simulator, then save a reflection before making any real-world decision.</Text>
        </PremiumCard>
      ) : null}
      {!entitlements?.features.unlimited_simulations ? (
        <PremiumCard tone="warning">
          <Text style={styles.lockTitle}>Free simulation access</Text>
          <Text style={styles.lockCopy}>Premium is prepared for unlimited simulations. Core educational calculations remain available.</Text>
          <View style={styles.cardAction}>
            <PrimaryButton onPress={onOpenPricing}>View Premium</PrimaryButton>
          </View>
        </PremiumCard>
      ) : null}

      <View style={styles.form}>
        <NumberField label="Amount or face value (KES)" value={amount} onChangeText={setAmount} />
        <NumberField label="Months" value={months} onChangeText={setMonths} />
        <NumberField label="Annual rate %" value={rate} onChangeText={setRate} />
        <NumberField label="FX rate KES/USD" value={fxRate} onChangeText={setFxRate} />
      </View>

      <PrimaryButton onPress={runApiSimulators}>{apiState.loading ? "Running API..." : "Run with API"}</PrimaryButton>
      <Text style={[styles.source, apiState.source === "api" && styles.sourceApi]}>
        Showing {apiState.source === "api" ? "API response" : "local fallback"}.
      </Text>
      {apiState.error ? <Text style={styles.error}>{apiState.error}</Text> : null}
      {learningStatus ? <Text style={styles.learningStatus}>{learningStatus}</Text> : null}
      {onSaveJournal ? <SecondaryButton onPress={saveSimulatorReflection}>Save simulator reflection</SecondaryButton> : null}

      <DetailedSimulatorCard
        beginnerMistake="Chasing the highest posted yield without checking fees, withdrawal time, and provider regulation."
        liquidity="high"
        nextStep="Compare MMF fees, withdrawal timelines, and regulator/provider details."
        risk="low"
        title="MMF simulator"
        value={`Projected value: ${apiState.mmf?.projected_value ? `KES ${apiState.mmf.projected_value}` : formatKes(localResults.mmf.projectedValue)}`}
        whatCanGoWrong={`Yields can change, and access depends on the provider process. Estimated interest: ${formatKes(localResults.mmf.projectedInterest)}.`}
      />

      <DetailedSimulatorCard
        beginnerMistake="Confusing discounted purchase price with monthly income."
        liquidity="medium"
        nextStep="Learn face value, purchase price, auction rates, maturity, and tax treatment."
        risk="low"
        title="T-bill simulator"
        value={`Purchase price: ${
          apiState.tbill?.estimated_purchase_price ? `KES ${apiState.tbill.estimated_purchase_price}` : formatKes(localResults.tbill.estimatedPurchasePrice)
        }`}
        whatCanGoWrong={`Money may be needed before maturity, and rates vary by auction. Discount interest: ${formatKes(localResults.tbill.estimatedDiscountInterest)}.`}
      />

      <DetailedSimulatorCard
        beginnerMistake="Assuming dividends are guaranteed or ignoring exit rules."
        liquidity="low"
        nextStep="Read bylaws, share-capital rules, dividend history, and withdrawal timelines."
        risk="moderate"
        title="SACCO simulator"
        value={`Projected total: ${apiState.sacco?.projected_total ? `KES ${apiState.sacco.projected_total}` : formatKes(localResults.sacco.projectedTotal)}`}
        whatCanGoWrong={`Governance, loan exposure, and exit terms can affect access. Contributions: ${formatKes(localResults.sacco.totalContributions)}.`}
      />

      <DetailedSimulatorCard
        beginnerMistake="Ignoring FX spread, custody, tax, and broker verification."
        liquidity="medium"
        nextStep="Learn FX costs, broker custody, broad ETFs, and withdrawal settlement."
        risk="high"
        title="Global route simulator"
        value={`Estimated USD: ${
          apiState.global?.estimated_usd_before_broker_costs
            ? `USD ${apiState.global.estimated_usd_before_broker_costs}`
            : formatUsd(localResults.global.estimatedUsdBeforeBrokerCosts)
        }`}
        whatCanGoWrong={`Currency and market volatility can both move against you. Estimated transfer fees: ${formatKes(localResults.global.estimatedFeesKes)}.`}
      />

      <Text style={styles.disclaimer}>Educational simulation only. We do not execute investments or promise returns.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14 },
  contextLabel: { color: maliPrime.colors.textTertiary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  contextTitle: { color: maliPrime.colors.textPrimary, fontSize: 17, fontWeight: "900", lineHeight: 23, marginTop: 8 },
  contextCopy: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
  lockTitle: { color: "#A86500", fontSize: 14, fontWeight: "900" },
  lockCopy: { color: "#7A5B22", fontSize: 13, lineHeight: 19, marginTop: 5 },
  cardAction: { marginTop: 12 },
  form: { gap: 10 },
  field: { gap: 6 },
  fieldLabel: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  input: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    minHeight: 50,
    paddingHorizontal: 14
  },
  source: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  sourceApi: { color: maliPrime.colors.primary },
  error: { color: maliPrime.colors.danger, fontSize: 13, lineHeight: 19 },
  learningStatus: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  cardTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  cardValue: { color: maliPrime.colors.primary, fontSize: 17, fontWeight: "900", lineHeight: 24, marginTop: 8 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  detailLabel: { color: maliPrime.colors.textPrimary, fontSize: 12, fontWeight: "900", marginTop: 12, textTransform: "uppercase" },
  detailCopy: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  cardDisclaimer: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "800", lineHeight: 18, marginTop: 12 },
  disclaimer: { color: maliPrime.colors.textSecondary, fontSize: 12, lineHeight: 18 }
});
