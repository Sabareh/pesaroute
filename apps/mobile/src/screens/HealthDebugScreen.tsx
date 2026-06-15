import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ApiStatus, PesaRouteApiClient, UserApiResponse } from "../api/client";
import { maliPrime } from "../components/maliprime";
import type { CatalogState } from "../types";

export function HealthDebugScreen({
  apiClient,
  catalog,
  isAnonymous,
  isAuthenticated,
  onRefreshCatalog,
  user
}: {
  apiClient: PesaRouteApiClient;
  catalog: CatalogState;
  isAnonymous: boolean;
  isAuthenticated: boolean;
  onRefreshCatalog: () => Promise<void>;
  user: UserApiResponse | null;
}) {
  const [health, setHealth] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <View>
      <Text style={styles.title}>API Debug</Text>
      <Text style={styles.copy}>
        Use this screen to check backend health and catalog fallback behavior. Account auth now lives in Profile & Privacy.
      </Text>

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
        <Text style={styles.label}>Account</Text>
        <Text style={isAuthenticated ? styles.success : styles.meta}>
          {isAuthenticated
            ? `Authenticated as ${user?.username ?? "PesaRoute user"}`
            : isAnonymous
              ? "Anonymous mode is active. Private writes stay local."
              : "No account mode selected yet."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: maliPrime.colors.textPrimary, fontSize: 30, fontWeight: "700", lineHeight: 36 },
  copy: { color: maliPrime.colors.textSecondary, fontSize: 16, lineHeight: 24, marginTop: 10 },
  card: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
    ...maliPrime.shadow
  },
  label: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "700" },
  value: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 6 },
  meta: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  success: { color: maliPrime.colors.emerald, fontSize: 13, fontWeight: "700", marginTop: 10 },
  error: { color: maliPrime.colors.warning, fontSize: 13, lineHeight: 19, marginTop: 8 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    flex: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 12
  },
  primaryText: { color: maliPrime.colors.surface, fontSize: 13, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    flex: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 12
  },
  secondaryText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" }
});
