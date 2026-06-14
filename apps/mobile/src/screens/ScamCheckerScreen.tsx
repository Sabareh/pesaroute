import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { BillingEntitlementSnapshot, PesaRouteApiClient, ScamCheckApiResponse } from "../api/client";
import { PremiumCard, PrimaryButton, TrustBadge, maliPrime, maliPrimeText } from "../components/maliprime";
import { runScamCheck, type ScamCheckResult } from "../utils/scamChecker";

function fromApiResponse(response: ScamCheckApiResponse): ScamCheckResult {
  return {
    riskScore: response.risk_score,
    riskLevel: response.risk_level,
    flags: response.flags,
    questionsToAsk: response.questions_to_ask
  };
}

export function ScamCheckerScreen({
  apiClient,
  entitlements,
  onOpenPricing
}: {
  apiClient: PesaRouteApiClient;
  entitlements: BillingEntitlementSnapshot | null;
  onOpenPricing: () => void;
}) {
  const [text, setText] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"local" | "api">("local");
  const [error, setError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<ScamCheckResult | null>(null);
  const localResult = useMemo(() => runScamCheck(text), [text]);
  const result = apiResult ?? localResult;
  const visibleFlags = hasRun ? result.flags : [];

  async function runCheck() {
    setHasRun(true);
    setLoading(true);
    setError(null);
    setApiResult(null);
    try {
      const response = await apiClient.scamCheck(text);
      setApiResult(fromApiResponse(response));
      setSource("api");
    } catch (requestError) {
      setSource("local");
      setError(requestError instanceof Error ? requestError.message : "API unavailable; using local red-flag checker");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={maliPrimeText.title}>Before uweke pesa, check red flags.</Text>
      <Text style={maliPrimeText.subtitle}>Paste a WhatsApp message, flyer text, or investment pitch.</Text>
      {!entitlements?.features.unlimited_scam_checks ? (
        <PremiumCard tone="warning">
          <Text style={styles.lockTitle}>Free scam-check access</Text>
          <Text style={styles.lockCopy}>Premium is prepared for unlimited scam checks. Core local red-flag checking remains available.</Text>
          <View style={styles.cardAction}>
            <PrimaryButton onPress={onOpenPricing}>View Premium</PrimaryButton>
          </View>
        </PremiumCard>
      ) : null}
      <TextInput
        multiline
        onChangeText={(value) => {
          setText(value);
          setHasRun(false);
          setApiResult(null);
          setError(null);
        }}
        placeholder="Paste the offer text here"
        placeholderTextColor="#7D8794"
        style={styles.textArea}
        textAlignVertical="top"
        value={text}
      />

      <PrimaryButton onPress={runCheck}>{loading ? "Checking..." : "Run check"}</PrimaryButton>
      {hasRun ? (
        <Text style={[styles.source, source === "api" && styles.sourceApi]}>
          Result from {source === "api" ? "backend API" : "local fallback"}.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {hasRun ? (
        <PremiumCard>
          <TrustBadge tone={result.riskLevel === "low" ? "emerald" : result.riskLevel === "medium" ? "amber" : "danger"}>
            Risk level: {result.riskLevel.toUpperCase()}
          </TrustBadge>
          <Text style={styles.score}>Score {result.riskScore}/100</Text>
          {result.riskScore >= 60 ? (
            <Text style={styles.resultAdvice}>This has high-risk indicators. Verify before sending money.</Text>
          ) : (
            <Text style={styles.resultAdvice}>No listed high-risk phrase was found, but still verify the provider and terms.</Text>
          )}
          {visibleFlags.length > 0 ? (
            <View style={styles.flags}>
              {visibleFlags.map((flag) => (
                <View key={flag.phrase} style={styles.flag}>
                  <Text style={styles.flagPhrase}>{flag.phrase}</Text>
                  <Text style={styles.flagReason}>{flag.reason}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>No listed red-flag phrase found. Still verify the provider and terms.</Text>
          )}
        </PremiumCard>
      ) : null}

      <PremiumCard tone="alt">
        <Text style={styles.questionsTitle}>Questions to ask before sending money</Text>
        {result.questionsToAsk.map((question) => (
          <Text key={question} style={styles.question}>
            - {question}
          </Text>
        ))}
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.questionsTitle}>Safer next step</Text>
        <Text style={styles.question}>Do not send money under pressure. Verify provider registration, fees, withdrawal rules, and who legally holds your funds.</Text>
      </PremiumCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14 },
  lockTitle: { color: "#A86500", fontSize: 14, fontWeight: "900" },
  lockCopy: { color: "#7A5B22", fontSize: 13, lineHeight: 19, marginTop: 5 },
  cardAction: { marginTop: 12 },
  textArea: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 15,
    minHeight: 140,
    padding: 14
  },
  source: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  sourceApi: { color: maliPrime.colors.primary },
  error: { color: maliPrime.colors.danger, fontSize: 13, lineHeight: 19 },
  score: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "900", marginTop: 8 },
  resultAdvice: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 21, marginTop: 10 },
  flags: { gap: 10, marginTop: 14 },
  flag: {
    backgroundColor: "#FFF7E8",
    borderRadius: maliPrime.radius.md,
    padding: 12
  },
  flagPhrase: { color: "#A86500", fontSize: 13, fontWeight: "900" },
  flagReason: { color: "#7A5B22", fontSize: 13, lineHeight: 19, marginTop: 4 },
  empty: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 12 },
  questionsTitle: { color: maliPrime.colors.primary, fontSize: 14, fontWeight: "900" },
  question: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 6 }
});
