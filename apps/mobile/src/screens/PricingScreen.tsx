import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  BillingEntitlementSnapshot,
  BillingPlanApiResponse,
  OneOffPackApiResponse,
  PesaRouteApiClient
} from "../api/client";
import { PremiumCard, maliPrime, maliPrimeText } from "../components/maliprime";
import type { AuthCredentials } from "../types";

const fallbackPlans: BillingPlanApiResponse[] = [
  {
    id: 1,
    code: "free",
    name: "Free",
    audience: "consumer",
    price_kes: 0,
    billing_period: "none",
    included_entitlements: ["core_learning", "limited_simulations", "limited_scam_checks"],
    is_active: true
  },
  {
    id: 2,
    code: "premium_monthly",
    name: "Premium monthly",
    audience: "consumer",
    price_kes: 300,
    billing_period: "monthly",
    included_entitlements: [
      "unlimited_simulations",
      "unlimited_scam_checks",
      "portfolio_mirror",
      "advanced_route_engine",
      "professional_request_priority"
    ],
    is_active: true
  },
  {
    id: 3,
    code: "premium_yearly",
    name: "Premium yearly",
    audience: "consumer",
    price_kes: 3000,
    billing_period: "yearly",
    included_entitlements: [
      "unlimited_simulations",
      "unlimited_scam_checks",
      "portfolio_mirror",
      "advanced_route_engine",
      "professional_request_priority"
    ],
    is_active: true
  },
  {
    id: 4,
    code: "professional_basic",
    name: "Professional basic",
    audience: "professional",
    price_kes: 1000,
    billing_period: "monthly",
    included_entitlements: ["professional_dashboard", "professional_leads"],
    is_active: true
  },
  {
    id: 5,
    code: "professional_pro",
    name: "Professional pro",
    audience: "professional",
    price_kes: 2500,
    billing_period: "monthly",
    included_entitlements: ["professional_dashboard", "professional_leads", "professional_analytics"],
    is_active: true
  }
];

const fallbackPacks: OneOffPackApiResponse[] = [
  { code: "global_investing_pack", name: "Global investing pack", price_kes: 500, payment_provider: "manual_placeholder" },
  { code: "treasury_bills_pack", name: "Treasury bills pack", price_kes: 300, payment_provider: "manual_placeholder" },
  { code: "sacco_chama_pack", name: "SACCO/chama pack", price_kes: 300, payment_provider: "manual_placeholder" },
  {
    code: "land_due_diligence_literacy_pack",
    name: "Land due diligence literacy pack",
    price_kes: 500,
    payment_provider: "manual_placeholder"
  },
  { code: "diaspora_pack", name: "Diaspora pack", price_kes: 500, payment_provider: "manual_placeholder" }
];

function priceText(plan: BillingPlanApiResponse) {
  if (plan.price_kes === 0) return "Free";
  return `KES ${plan.price_kes.toLocaleString("en-KE")}/${plan.billing_period}`;
}

function entitlementLabel(code: string) {
  return code.replace(/_/g, " ");
}

export function PricingScreen({
  apiClient,
  auth,
  entitlements,
  isAuthenticated,
  onRefreshEntitlements,
  onRequestAuth
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  entitlements: BillingEntitlementSnapshot | null;
  isAuthenticated: boolean;
  onRefreshEntitlements: () => Promise<void>;
  onRequestAuth: () => void;
}) {
  const [plans, setPlans] = useState<BillingPlanApiResponse[]>(fallbackPlans);
  const [packs, setPacks] = useState<OneOffPackApiResponse[]>(fallbackPacks);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadPricing() {
      try {
        const [apiPlans, apiPacks] = await Promise.all([apiClient.billingPlans(), apiClient.billingPacks()]);
        if (!mounted) return;
        setPlans(apiPlans.length > 0 ? apiPlans : fallbackPlans);
        setPacks(apiPacks.length > 0 ? apiPacks : fallbackPacks);
      } catch {
        if (!mounted) return;
        setPlans(fallbackPlans);
        setPacks(fallbackPacks);
      }
    }
    void loadPricing();
    return () => {
      mounted = false;
    };
  }, [apiClient]);

  async function mockSubscription(planCode: BillingPlanApiResponse["code"]) {
    if (!auth || !isAuthenticated) {
      onRequestAuth();
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const response = await apiClient.devMockPurchase({ kind: "subscription", plan_code: planCode, days: 30 }, auth);
      setStatus(response.detail);
      await onRefreshEntitlements();
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : "Could not create development purchase.");
    } finally {
      setLoading(false);
    }
  }

  async function mockPack(packCode: OneOffPackApiResponse["code"]) {
    if (!auth || !isAuthenticated) {
      onRequestAuth();
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const response = await apiClient.devMockPurchase({ kind: "pack", pack_code: packCode }, auth);
      setStatus(response.detail);
      await onRefreshEntitlements();
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : "Could not create development pack.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text style={maliPrimeText.title}>Pricing</Text>
      <Text style={maliPrimeText.subtitle}>
        Billing is a development skeleton only. No M-Pesa, cards, payouts, or real payment collection are connected.
      </Text>

      <PremiumCard tone="warning">
        <Text style={styles.devTitle}>Development placeholder</Text>
        <Text style={styles.devCopy}>
          Mock purchases only change local backend entitlement state for testing. They do not collect money.
        </Text>
      </PremiumCard>

      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>Current access</Text>
        <Text style={styles.cardCopy}>
          {entitlements?.features.portfolio_mirror ? "Premium features active" : "Free learning access active"}
        </Text>
        <Text style={styles.meta}>
          {entitlements?.entitlements.map(entitlementLabel).join(", ") || "core learning, limited simulations, limited scam checks"}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Consumer plans</Text>
      <View style={styles.list}>
        {plans
          .filter((plan) => plan.audience === "consumer")
          .map((plan) => (
            <PlanCard
              key={plan.code}
              loading={loading}
              onMockPurchase={() => mockSubscription(plan.code)}
              plan={plan}
              purchased={plan.code === "free" || Boolean(entitlements?.features.portfolio_mirror)}
            />
          ))}
      </View>

      <Text style={styles.sectionTitle}>One-off guide packs</Text>
      <View style={styles.list}>
        {packs.map((pack) => (
          <View key={pack.code} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{pack.name}</Text>
              <Text style={styles.badge}>KES {pack.price_kes.toLocaleString("en-KE")}</Text>
            </View>
            <Text style={styles.cardCopy}>Unlocks the guide pack later. Current flow is development-only.</Text>
            <Pressable accessibilityRole="button" disabled={loading} onPress={() => mockPack(pack.code)} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>{entitlements?.packs[pack.code] ? "Granted" : "Dev grant pack"}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Professional subscriptions</Text>
      <View style={styles.list}>
        {plans
          .filter((plan) => plan.audience === "professional")
          .map((plan) => (
            <PlanCard
              key={plan.code}
              loading={loading}
              onMockPurchase={() => mockSubscription(plan.code)}
              plan={plan}
              purchased={Boolean(entitlements?.features.professional_dashboard)}
            />
          ))}
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function PlanCard({
  loading,
  onMockPurchase,
  plan,
  purchased
}: {
  loading: boolean;
  onMockPurchase: () => void;
  plan: BillingPlanApiResponse;
  purchased: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{plan.name}</Text>
        <Text style={styles.badge}>{priceText(plan)}</Text>
      </View>
      <View style={styles.featureList}>
        {plan.included_entitlements.map((code) => (
          <Text key={code} style={styles.feature}>
            - {entitlementLabel(code)}
          </Text>
        ))}
      </View>
      {plan.code !== "free" ? (
        <Pressable accessibilityRole="button" disabled={loading} onPress={onMockPurchase} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{purchased ? "Dev grant again" : "Dev mock purchase"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  devTitle: { color: "#A86500", fontSize: 14, fontWeight: "900" },
  devCopy: { color: "#7A5B22", fontSize: 13, lineHeight: 19, marginTop: 5 },
  statusCard: {
    backgroundColor: "#E9F8F1",
    borderColor: "#C9EDDD",
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 14
  },
  sectionTitle: { color: maliPrime.colors.textPrimary, fontSize: 18, fontWeight: "900", marginTop: 22 },
  list: { gap: 12, marginTop: 12 },
  card: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    padding: 16,
    ...maliPrime.shadow
  },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  cardTitle: { color: maliPrime.colors.textPrimary, flex: 1, fontSize: 16, fontWeight: "900" },
  badge: {
    backgroundColor: "#EAF0FF",
    borderRadius: maliPrime.radius.pill,
    color: maliPrime.colors.primary,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  cardCopy: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  meta: { color: maliPrime.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6, textTransform: "capitalize" },
  featureList: { gap: 6, marginTop: 12 },
  feature: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, textTransform: "capitalize" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 46
  },
  primaryText: { color: maliPrime.colors.surface, fontSize: 13, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 44
  },
  secondaryText: { color: maliPrime.colors.primary, fontSize: 13, fontWeight: "900" },
  status: { color: maliPrime.colors.emerald, fontSize: 13, fontWeight: "900", lineHeight: 19, marginTop: 12 },
  error: { color: maliPrime.colors.danger, fontSize: 13, lineHeight: 19, marginTop: 12 }
});
