import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type {
  BillingPlanApiResponse,
  OneOffPackApiResponse,
  PaymentIntentApiResponse,
  PaymentIntentStatus,
  PesaRouteApiClient
} from "../api/client";
import { PremiumCard, maliPrime, maliPrimeText } from "../components/maliprime";
import type { AuthCredentials } from "../types";

export type CheckoutItem =
  | {
      amountKes: number;
      kind: "subscription";
      planCode: BillingPlanApiResponse["code"];
      title: string;
    }
  | {
      amountKes: number;
      kind: "pack";
      packCode: OneOffPackApiResponse["code"];
      title: string;
    };

type CheckoutState = "ready" | "initiating" | "waiting" | "success" | "failed" | "expired";

function createIdempotencyKey(item: CheckoutItem) {
  const itemKey = item.kind === "subscription" ? item.planCode : item.packCode;
  return `${item.kind}-${itemKey}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function friendlyStatus(status: PaymentIntentStatus) {
  if (status === "successful") return "Payment confirmed";
  if (status === "failed") return "Payment failed";
  if (status === "cancelled") return "Payment cancelled";
  if (status === "expired") return "Prompt expired";
  if (status === "initiated") return "Waiting for M-Pesa confirmation";
  return "Ready";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function CheckoutScreen({
  apiClient,
  auth,
  item,
  onBack,
  onRefreshEntitlements
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials;
  item: CheckoutItem;
  onBack: () => void;
  onRefreshEntitlements: () => Promise<void>;
}) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [state, setState] = useState<CheckoutState>("ready");
  const [intent, setIntent] = useState<PaymentIntentApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(createIdempotencyKey(item));

  const amountText = useMemo(() => `KES ${item.amountKes.toLocaleString("en-KE")}`, [item.amountKes]);

  useEffect(() => {
    let cancelled = false;

    async function pollPayment() {
      if (!intent || state !== "waiting") return;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await wait(3000);
        if (cancelled) return;
        try {
          const freshIntent = await apiClient.getPaymentIntent(intent.id, auth);
          if (cancelled) return;
          setIntent(freshIntent);
          if (freshIntent.status === "successful") {
            setState("success");
            await onRefreshEntitlements();
            return;
          }
          if (freshIntent.status === "failed" || freshIntent.status === "cancelled") {
            setState("failed");
            return;
          }
          if (freshIntent.status === "expired") {
            setState("expired");
            return;
          }
        } catch {
          if (!cancelled) {
            setError("Network error while checking payment status. You can refresh again.");
          }
        }
      }
    }

    void pollPayment();
    return () => {
      cancelled = true;
    };
  }, [apiClient, auth, intent?.id, onRefreshEntitlements, state]);

  async function startCheckout() {
    if (!phoneNumber.trim()) {
      setError("Enter the M-Pesa phone number that should receive the prompt.");
      return;
    }

    setState("initiating");
    setError(null);
    try {
      const created = await apiClient.createPaymentIntent(
        item.kind === "subscription"
          ? {
              purpose: "subscription",
              plan_code: item.planCode,
              phone_number: phoneNumber,
              idempotency_key: idempotencyKey.current
            }
          : {
              purpose: "one_off_pack",
              pack_code: item.packCode,
              phone_number: phoneNumber,
              idempotency_key: idempotencyKey.current
            },
        auth
      );
      const initiated = await apiClient.initiatePaymentIntent(created.id, phoneNumber, auth);
      setIntent(initiated);
      if (initiated.status === "successful") {
        setState("success");
        await onRefreshEntitlements();
        return;
      }
      if (initiated.status === "expired") {
        setState("expired");
        return;
      }
      setState("waiting");
    } catch (checkoutError) {
      setState("failed");
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not start M-Pesa checkout.");
    }
  }

  async function refreshStatus() {
    if (!intent) return;
    setError(null);
    try {
      const freshIntent = await apiClient.getPaymentIntent(intent.id, auth);
      setIntent(freshIntent);
      if (freshIntent.status === "successful") {
        setState("success");
        await onRefreshEntitlements();
      } else if (freshIntent.status === "failed" || freshIntent.status === "cancelled") {
        setState("failed");
      } else if (freshIntent.status === "expired") {
        setState("expired");
      } else {
        setState("waiting");
      }
    } catch {
      setError("Backend unavailable. Keep your local receipt and try refreshing again.");
    }
  }

  return (
    <View>
      <Text style={maliPrimeText.title}>M-Pesa checkout</Text>
      <Text style={maliPrimeText.subtitle}>
        This checkout is only for PesaRoute subscriptions, learning packs, and future review fees. It is not for
        investment execution.
      </Text>

      <PremiumCard tone="info">
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.amount}>{amountText}</Text>
        <Text style={styles.copy}>You will receive an M-Pesa prompt on your phone.</Text>
      </PremiumCard>

      <View style={styles.card}>
        <Text style={styles.label}>M-Pesa phone number</Text>
        <TextInput
          autoComplete="tel"
          keyboardType="phone-pad"
          onChangeText={setPhoneNumber}
          placeholder="0712 345 678"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={styles.input}
          value={phoneNumber}
        />
        <Text style={styles.notice}>We never ask for your M-Pesa PIN inside PesaRoute.</Text>
        <Text style={styles.notice}>Only approve the prompt on your phone if the amount is correct.</Text>
      </View>

      {intent ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{friendlyStatus(intent.status)}</Text>
          <Text style={styles.copy}>
            Status: {intent.status}. Phone: {intent.phone_number_masked || "masked after initiation"}.
          </Text>
        </View>
      ) : null}

      {state === "waiting" ? (
        <PremiumCard tone="warning">
          <Text style={styles.waitingTitle}>Waiting for confirmation</Text>
          <Text style={styles.copy}>Do not close this screen until the backend confirms the payment status.</Text>
        </PremiumCard>
      ) : null}

      {state === "success" ? (
        <PremiumCard tone="success">
          <Text style={styles.successTitle}>Payment confirmed</Text>
          <Text style={styles.copy}>Your entitlement unlock is active after backend confirmation.</Text>
        </PremiumCard>
      ) : null}

      {state === "failed" || state === "expired" ? (
        <PremiumCard tone="danger">
          <Text style={styles.errorTitle}>{state === "expired" ? "Prompt timeout" : "Payment not completed"}</Text>
          <Text style={styles.copy}>
            Check the phone number, confirm the amount, and try again. You are not charged by PesaRoute unless M-Pesa
            confirms success.
          </Text>
        </PremiumCard>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
        {intent ? (
          <Pressable accessibilityRole="button" onPress={refreshStatus} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Refresh status</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={state === "initiating" || state === "waiting" || state === "success"}
          onPress={startCheckout}
          style={[
            styles.primaryButton,
            (state === "initiating" || state === "waiting" || state === "success") && styles.disabledButton
          ]}
        >
          <Text style={styles.primaryText}>{state === "initiating" ? "Starting..." : "Start M-Pesa prompt"}</Text>
        </Pressable>
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
    marginTop: 14,
    padding: 16,
    ...maliPrime.shadow
  },
  itemTitle: { color: maliPrime.colors.textPrimary, fontSize: 17, fontWeight: "900" },
  amount: { color: maliPrime.colors.textPrimary, fontSize: 24, fontWeight: "700", marginTop: 6 },
  copy: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 6 },
  label: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900" },
  input: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 15,
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 12
  },
  notice: { color: maliPrime.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 8 },
  statusCard: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 14
  },
  statusTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  waitingTitle: { color: "#A86500", fontSize: 14, fontWeight: "900" },
  successTitle: { color: maliPrime.colors.emerald, fontSize: 14, fontWeight: "900" },
  errorTitle: { color: maliPrime.colors.danger, fontSize: 14, fontWeight: "900" },
  error: { color: maliPrime.colors.danger, fontSize: 13, lineHeight: 19, marginTop: 12 },
  actions: { gap: 10, marginTop: 16 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    minHeight: 48
  },
  disabledButton: { opacity: 0.55 },
  primaryText: { color: maliPrime.colors.surface, fontSize: 13, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    minHeight: 46
  },
  secondaryText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" }
});
