import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DataGrantApiResponse, PesaRouteApiClient, UserApiResponse } from "../api/client";
import { maliPrime, maliPrimeText } from "../components/maliprime";
import type { AuthCredentials } from "../types";

export function PrivacySettingsScreen({
  apiClient,
  auth,
  isAnonymous,
  isAuthenticated,
  loading,
  onLogout,
  onOpenAuth,
  user
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  isAnonymous: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  onLogout: () => Promise<void>;
  onOpenAuth: () => void;
  user: UserApiResponse | null;
}) {
  const accountLabel = isAuthenticated
    ? `Logged in as ${user?.username ?? "PesaRoute user"}`
    : isAnonymous
      ? "Using anonymous mode"
      : "Not started";
  const [grants, setGrants] = useState<DataGrantApiResponse[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantsError, setGrantsError] = useState<string | null>(null);

  async function loadGrants() {
    if (!auth) {
      setGrants([]);
      return;
    }
    setGrantsLoading(true);
    setGrantsError(null);
    try {
      setGrants(await apiClient.listDataGrants(auth));
    } catch (error) {
      setGrantsError(error instanceof Error ? error.message : "Could not load active sharing.");
    } finally {
      setGrantsLoading(false);
    }
  }

  async function revokeGrant(id: number) {
    if (!auth) return;
    setGrantsError(null);
    try {
      const revoked = await apiClient.revokeDataGrant(id, auth);
      setGrants((current) => current.map((grant) => (grant.id === id ? revoked : grant)));
    } catch (error) {
      setGrantsError(error instanceof Error ? error.message : "Could not revoke sharing.");
    }
  }

  useEffect(() => {
    void loadGrants();
  }, [auth?.token]);

  return (
    <View>
      <Text style={maliPrimeText.title}>Profile & Privacy</Text>
      <Text style={maliPrimeText.subtitle}>Plan privately. Share only when ready. Keep control of your money and your information.</Text>
      <Text style={styles.sectionTitle}>Profile/account</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Account status</Text>
        <Text style={styles.account}>{accountLabel}</Text>
        {user ? (
          <Text style={styles.meta}>
            Role: {user.profile.role} - Privacy mode: {user.profile.privacy_mode_enabled ? "on" : "off"}
          </Text>
        ) : (
          <Text style={styles.meta}>Learn, simulate, route, and scam-check without logging in.</Text>
        )}
        {isAuthenticated ? (
          <Pressable accessibilityRole="button" disabled={loading} onPress={onLogout} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{loading ? "Signing out..." : "Log out"}</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={onOpenAuth} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Log in or create account</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.sectionTitle}>Privacy Mode</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Default privacy posture</Text>
        <Text style={styles.meta}>
          Use ranges instead of exact amounts, keep anonymous learning available, and share with professionals only when
          you explicitly choose scopes.
        </Text>
      </View>
      <Text style={styles.sectionTitle}>Data Sharing</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Active sharing</Text>
        <Text style={styles.meta}>You control what professionals see. Access expires automatically. You can revoke access anytime.</Text>
        {!auth ? <Text style={styles.meta}>Log in to manage professional data sharing.</Text> : null}
        {grantsError ? <Text style={styles.error}>{grantsError}</Text> : null}
        {auth ? (
          <Pressable accessibilityRole="button" onPress={loadGrants} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{grantsLoading ? "Refreshing..." : "Refresh sharing"}</Text>
          </Pressable>
        ) : null}
        {auth && grants.filter((grant) => grant.status === "active" && !grant.revoked_at).length === 0 ? (
          <Text style={styles.meta}>No active sharing grants.</Text>
        ) : null}
        {grants
          .filter((grant) => grant.status === "active" && !grant.revoked_at)
          .map((grant) => (
            <View key={grant.id} style={styles.grantRow}>
              <Text style={styles.grantTitle}>
                {grant.grantee_type} #{grant.grantee_id}
              </Text>
              <Text style={styles.meta}>Scopes: {grant.scopes.join(", ")}</Text>
              <Text style={styles.meta}>Expires: {new Date(grant.expires_at).toLocaleDateString("en-KE")}</Text>
              <Pressable accessibilityRole="button" onPress={() => revokeGrant(grant.id)} style={styles.revokeButton}>
                <Text style={styles.revokeText}>Revoke access</Text>
              </Pressable>
            </View>
          ))}
      </View>
      <Text style={styles.sectionTitle}>Account Security</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Security placeholders</Text>
        <Text style={styles.meta}>Biometric app lock placeholder</Text>
        <Text style={styles.meta}>Password reset and email verification placeholder</Text>
      </View>
      <Text style={styles.sectionTitle}>Delete/Export</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Data controls roadmap</Text>
        <Text style={styles.meta}>Delete and export data placeholder</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
    ...maliPrime.shadow
  },
  label: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  sectionTitle: { color: maliPrime.colors.textPrimary, fontSize: 17, fontWeight: "900", marginTop: 22 },
  account: { color: maliPrime.colors.primary, fontSize: 16, fontWeight: "900", marginTop: 6 },
  meta: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 48
  },
  primaryText: { color: maliPrime.colors.surface, fontSize: 14, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44
  },
  secondaryText: { color: maliPrime.colors.primary, fontSize: 13, fontWeight: "900" },
  error: { color: maliPrime.colors.danger, fontSize: 13, lineHeight: 19, marginTop: 8 },
  grantRow: {
    borderTopColor: maliPrime.colors.border,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12
  },
  grantTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900" },
  revokeButton: {
    alignItems: "center",
    backgroundColor: "#FDECEC",
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 42
  },
  revokeText: { color: maliPrime.colors.danger, fontSize: 13, fontWeight: "900" },
});
