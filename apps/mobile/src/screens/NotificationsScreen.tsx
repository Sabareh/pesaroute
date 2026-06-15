import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NotificationApiResponse, PesaRouteApiClient } from "../api/client";
import { EmptyState, PremiumCard, maliPrime, maliPrimeText } from "../components/maliprime";
import type { AuthCredentials } from "../types";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

export function NotificationsScreen({
  apiClient,
  auth,
  onRequestAuth
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  onRequestAuth: () => void;
}) {
  const [items, setItems] = useState<NotificationApiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications() {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await apiClient.notifications(auth));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: number) {
    if (!auth) return;
    try {
      const updated = await apiClient.markNotificationRead(id, auth);
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not mark notification read.");
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, [auth?.token]);

  if (!auth) {
    return (
      <View>
        <Text style={maliPrimeText.title}>Notifications</Text>
        <Text style={maliPrimeText.subtitle}>Create an account to receive payment, review, and privacy notices.</Text>
        <Pressable accessibilityRole="button" onPress={onRequestAuth} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Log in or create account</Text>
        </Pressable>
      </View>
    );
  }

  const unreadCount = items.filter((item) => item.status === "unread").length;

  return (
    <View>
      <Text style={maliPrimeText.title}>Notifications</Text>
      <Text style={maliPrimeText.subtitle}>
        {unreadCount} unread. Push notifications are a future placeholder; beta uses in-app notices first.
      </Text>
      <Pressable accessibilityRole="button" disabled={loading} onPress={loadNotifications} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>{loading ? "Refreshing..." : "Refresh inbox"}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.list}>
        {items.length === 0 ? <EmptyState title="No notifications yet" body="Payment, offer, and privacy notices will appear here." /> : null}
        {items.map((item) => (
          <PremiumCard key={item.id}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={[styles.badge, item.status === "read" && styles.badgeRead]}>{item.status}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{formatDate(item.created_at)}</Text>
            {item.status === "unread" ? (
              <Pressable accessibilityRole="button" onPress={() => markRead(item.id)} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Mark read</Text>
              </Pressable>
            ) : null}
          </PremiumCard>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, marginTop: 16 },
  row: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  title: { color: maliPrime.colors.textPrimary, flex: 1, fontSize: 16, fontWeight: "700" },
  body: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  meta: { color: maliPrime.colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 8 },
  badge: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.pill,
    color: maliPrime.colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  badgeRead: { backgroundColor: maliPrime.colors.surfaceAlt, color: maliPrime.colors.textSecondary },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 50
  },
  primaryText: { color: maliPrime.colors.surface, fontSize: 14, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44
  },
  secondaryText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  error: { color: maliPrime.colors.danger, fontSize: 13, lineHeight: 19, marginTop: 10 }
});
