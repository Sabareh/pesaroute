import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ApiStatus, PesaRouteApiClient } from "../api/client";
import type { AuthCredentials, CatalogState } from "../types";

export function HealthDebugScreen({
  apiClient,
  auth,
  catalog,
  onRefreshCatalog,
  onSetAuth
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  catalog: CatalogState;
  onRefreshCatalog: () => Promise<void>;
  onSetAuth: (auth: AuthCredentials | null) => void;
}) {
  const [health, setHealth] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState(auth?.username ?? "");
  const [password, setPassword] = useState(auth?.password ?? "");

  async function checkHealth() {
    setLoading(true);
    setError(null);
    try {
      setHealth(await apiClient.health());
    } catch (requestError) {
      setHealth(null);
      setError(requestError instanceof Error ? requestError.message : "API unavailable");
    } finally {
      setLoading(false);
    }
  }

  function saveAuth() {
    if (username.trim() && password) {
      onSetAuth({ username: username.trim(), password });
    }
  }

  function clearAuth() {
    setUsername("");
    setPassword("");
    onSetAuth(null);
  }

  return (
    <View>
      <Text style={styles.title}>API Debug</Text>
      <Text style={styles.copy}>Use this screen to check backend health, refresh catalog data, and set temporary Basic Auth for private MVP writes.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Base URL</Text>
        <Text style={styles.value}>{apiClient.baseUrl}</Text>
        <Pressable accessibilityRole="button" onPress={checkHealth} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{loading ? "Checking..." : "Check health"}</Text>
        </Pressable>
        {health ? <Text style={styles.success}>{health.status} - {health.service}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Catalog</Text>
        <Text style={styles.value}>
          {catalog.categories.length} categories, {catalog.passports.length} passports
        </Text>
        <Text style={styles.meta}>
          Source: {catalog.source}
          {catalog.lastUpdated ? ` - ${catalog.lastUpdated}` : ""}
        </Text>
        {catalog.error ? <Text style={styles.error}>{catalog.error}</Text> : null}
        <Pressable accessibilityRole="button" onPress={onRefreshCatalog} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>{catalog.loading ? "Refreshing..." : "Refresh catalog"}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Private write auth</Text>
        <Text style={styles.meta}>Debug-only placeholder. Do not enter bank, M-Pesa, broker, or wallet credentials.</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setUsername}
          placeholder="Django username"
          placeholderTextColor="#7b8a83"
          style={styles.input}
          value={username}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Django password"
          placeholderTextColor="#7b8a83"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <View style={styles.buttonRow}>
          <Pressable accessibilityRole="button" onPress={saveAuth} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Use auth</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={clearAuth} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Clear</Text>
          </Pressable>
        </View>
        <Text style={auth ? styles.success : styles.meta}>{auth ? `Authenticated as ${auth.username}` : "Currently local-only for private writes."}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: "#15221d", fontSize: 30, fontWeight: "900" },
  copy: { color: "#52645b", fontSize: 16, lineHeight: 24, marginTop: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 16
  },
  label: { color: "#15221d", fontSize: 15, fontWeight: "900" },
  value: { color: "#0f7b5f", fontSize: 14, fontWeight: "900", lineHeight: 20, marginTop: 6 },
  meta: { color: "#627469", fontSize: 13, lineHeight: 19, marginTop: 6 },
  success: { color: "#0f7b5f", fontSize: 13, fontWeight: "900", marginTop: 10 },
  error: { color: "#7a431e", fontSize: 13, lineHeight: 19, marginTop: 8 },
  input: {
    backgroundColor: "#fbfdf9",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    color: "#15221d",
    fontSize: 15,
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 12
  },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#15221d",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 12
  },
  primaryText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#dff5ec",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 12
  },
  secondaryText: { color: "#0f7b5f", fontSize: 13, fontWeight: "900" }
});
