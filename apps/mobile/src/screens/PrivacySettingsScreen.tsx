import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DataGrantApiResponse, PesaRouteApiClient, UserApiResponse } from "../api/client";
import type { AuthCredentials } from "../types";

const settings = [
  "We do not ask for M-Pesa PIN.",
  "We do not ask for bank passwords.",
  "We do not ask for broker credentials.",
  "You can use ranges instead of exact amounts.",
  "You control what you share with professionals.",
  "We do not hold or execute investments."
];

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
      <Text style={styles.title}>Profile & Privacy</Text>
      <Text style={styles.copy}>Trust promises for the consumer MVP. Keep control of your money and your information.</Text>
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
      <View style={styles.list}>
        {settings.map((setting) => (
          <View key={setting} style={styles.row}>
            <View style={styles.dot} />
            <Text style={styles.setting}>{setting}</Text>
          </View>
        ))}
      </View>
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
      <View style={styles.card}>
        <Text style={styles.label}>Coming later</Text>
        <Text style={styles.meta}>Biometric app lock placeholder</Text>
        <Text style={styles.meta}>Delete and export data placeholder</Text>
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
    marginTop: 16,
    padding: 14
  },
  label: { color: "#15221d", fontSize: 15, fontWeight: "900" },
  account: { color: "#0f7b5f", fontSize: 16, fontWeight: "900", marginTop: 6 },
  meta: { color: "#627469", fontSize: 13, lineHeight: 19, marginTop: 6 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0f7b5f",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 48
  },
  primaryText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#dff5ec",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44
  },
  secondaryText: { color: "#0f7b5f", fontSize: 13, fontWeight: "900" },
  error: { color: "#7a431e", fontSize: 13, lineHeight: 19, marginTop: 8 },
  grantRow: {
    borderTopColor: "#e3ece7",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12
  },
  grantTitle: { color: "#15221d", fontSize: 14, fontWeight: "900" },
  revokeButton: {
    alignItems: "center",
    backgroundColor: "#fff0e4",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 42
  },
  revokeText: { color: "#7a431e", fontSize: 13, fontWeight: "900" },
  list: { gap: 10, marginTop: 20 },
  row: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  dot: { backgroundColor: "#0f7b5f", borderRadius: 6, height: 12, width: 12 },
  setting: { color: "#15221d", flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 20 }
});
