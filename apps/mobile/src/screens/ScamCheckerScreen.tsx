import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { PesaRouteApiClient, ScamCheckApiResponse } from "../api/client";
import { runScamCheck, type ScamCheckResult } from "../utils/scamChecker";

function fromApiResponse(response: ScamCheckApiResponse): ScamCheckResult {
  return {
    riskScore: response.risk_score,
    riskLevel: response.risk_level,
    flags: response.flags,
    questionsToAsk: response.questions_to_ask
  };
}

export function ScamCheckerScreen({ apiClient }: { apiClient: PesaRouteApiClient }) {
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
    <View>
      <Text style={styles.title}>Scam Checker</Text>
      <Text style={styles.copy}>Submit to the backend when available. If the API is offline, the local red-flag checker runs.</Text>
      <TextInput
        multiline
        onChangeText={(value) => {
          setText(value);
          setHasRun(false);
          setApiResult(null);
          setError(null);
        }}
        placeholder="Paste the offer text here"
        placeholderTextColor="#7b8a83"
        style={styles.textArea}
        textAlignVertical="top"
        value={text}
      />

      <Pressable accessibilityRole="button" onPress={runCheck} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{loading ? "Checking..." : "Run check"}</Text>
      </Pressable>
      {hasRun ? (
        <Text style={[styles.source, source === "api" && styles.sourceApi]}>
          Result from {source === "api" ? "backend API" : "local fallback"}.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {hasRun ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Risk level: {result.riskLevel.toUpperCase()}</Text>
          <Text style={styles.score}>Score {result.riskScore}/100</Text>
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
        </View>
      ) : null}

      <View style={styles.questions}>
        <Text style={styles.questionsTitle}>Questions to ask before sending money</Text>
        {result.questionsToAsk.map((question) => (
          <Text key={question} style={styles.question}>
            - {question}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: "#15221d", fontSize: 30, fontWeight: "900" },
  copy: { color: "#52645b", fontSize: 16, lineHeight: 24, marginTop: 10 },
  textArea: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    color: "#15221d",
    fontSize: 15,
    marginTop: 20,
    minHeight: 140,
    padding: 14
  },
  button: {
    alignItems: "center",
    backgroundColor: "#15221d",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50
  },
  buttonText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  source: { color: "#627469", fontSize: 12, fontWeight: "900", marginTop: 10, textTransform: "uppercase" },
  sourceApi: { color: "#0f7b5f" },
  error: { color: "#7a431e", fontSize: 13, lineHeight: 19, marginTop: 6 },
  resultCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 16
  },
  resultTitle: { color: "#15221d", fontSize: 17, fontWeight: "900" },
  score: { color: "#c86f3c", fontSize: 13, fontWeight: "900", marginTop: 4 },
  flags: { gap: 10, marginTop: 14 },
  flag: {
    backgroundColor: "#fff2dc",
    borderRadius: 8,
    padding: 12
  },
  flagPhrase: { color: "#7a431e", fontSize: 13, fontWeight: "900" },
  flagReason: { color: "#7a431e", fontSize: 13, lineHeight: 19, marginTop: 4 },
  empty: { color: "#52645b", fontSize: 14, lineHeight: 21, marginTop: 12 },
  questions: { backgroundColor: "#edf8f3", borderRadius: 8, marginTop: 14, padding: 14 },
  questionsTitle: { color: "#0f7b5f", fontSize: 14, fontWeight: "900" },
  question: { color: "#52645b", fontSize: 13, lineHeight: 20, marginTop: 6 },
  pressed: { opacity: 0.78 }
});
