import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PesaRouteApiClient } from "./src/api/client";
import type { BillingEntitlementSnapshot } from "./src/api/client";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { maliPrime } from "./src/components/maliprime";
import { mockProductCategories, mockProductPassports } from "./src/data/mockData";
import { AuthScreen } from "./src/screens/AuthScreen";
import { BetaSupportScreen } from "./src/screens/BetaSupportScreen";
import { HealthDebugScreen } from "./src/screens/HealthDebugScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { JournalScreen } from "./src/screens/JournalScreen";
import { LearnScreen } from "./src/screens/LearnScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { PortfolioMirrorScreen } from "./src/screens/PortfolioMirrorScreen";
import { ProductPassportsScreen } from "./src/screens/ProductPassportsScreen";
import { ProfessionalsScreen } from "./src/screens/ProfessionalsScreen";
import { PricingScreen } from "./src/screens/PricingScreen";
import { PrivacyOnboardingScreen } from "./src/screens/PrivacyOnboardingScreen";
import { PrivacySettingsScreen } from "./src/screens/PrivacySettingsScreen";
import { RouteResultScreen } from "./src/screens/RouteResultScreen";
import { ScamCheckerScreen } from "./src/screens/ScamCheckerScreen";
import { SimulatorsScreen } from "./src/screens/SimulatorsScreen";
import { useCloudSync } from "./src/sync/useCloudSync";
import type { AmountRangeId, CatalogState, GoalId, JournalEntryDraft, RouteProfile } from "./src/types";
import { buildRouteProfile } from "./src/utils/routePlanner";

type ScreenKey =
  | "home"
  | "learn"
  | "route"
  | "simulators"
  | "scam"
  | "journal"
  | "portfolio"
  | "passports"
  | "professionals"
  | "pricing"
  | "notifications"
  | "support"
  | "privacy"
  | "more"
  | "debug"
  | "auth";

const apiClient = new PesaRouteApiClient();

const primaryTabs: Array<{ key: ScreenKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "home", label: "Home", icon: "navigate" },
  { key: "learn", label: "Learn", icon: "book" },
  { key: "simulators", label: "Simulate", icon: "calculator" },
  { key: "journal", label: "Journal", icon: "create" },
  { key: "privacy", label: "Profile", icon: "person-circle" }
];

type MoreScreenKey = Exclude<ScreenKey, "home" | "learn" | "simulators" | "journal" | "privacy" | "more" | "auth">;

const secondaryTabs: Array<{ key: MoreScreenKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "route", label: "Route", icon: "map" },
  { key: "scam", label: "Scam check", icon: "shield-checkmark" },
  { key: "portfolio", label: "Mirror", icon: "pie-chart" },
  { key: "passports", label: "Passports", icon: "document-text" },
  { key: "professionals", label: "Review", icon: "people" },
  { key: "pricing", label: "Premium", icon: "diamond" },
  { key: "notifications", label: "Inbox", icon: "notifications" },
  { key: "support", label: "Help", icon: "help-circle" },
  { key: "debug", label: "API", icon: "pulse" }
];

const screenLabels: Record<ScreenKey, string> = {
  home: "Home",
  learn: "Learn",
  route: "Route",
  simulators: "Simulators",
  scam: "Scam checker",
  journal: "Journal",
  portfolio: "Portfolio mirror",
  passports: "Product passports",
  professionals: "Professional review",
  pricing: "Premium",
  notifications: "Inbox",
  support: "Help",
  privacy: "Profile",
  more: "More",
  debug: "API",
  auth: "Account"
};

const moreDescriptions: Record<MoreScreenKey, string> = {
  route: "Learning route from amount and goal.",
  scam: "Check investment red flags.",
  portfolio: "Manual portfolio mirror and summary.",
  passports: "Search public product passports.",
  professionals: "Request scoped professional review.",
  pricing: "Premium and paid pack placeholders.",
  notifications: "Payment and review updates.",
  support: "Private beta feedback and support.",
  debug: "Backend health and catalog checks."
};

const initialCatalogState: CatalogState = {
  categories: mockProductCategories,
  passports: mockProductPassports,
  loading: false,
  error: null,
  source: "mock",
  lastUpdated: null
};

function Screen({
  active,
  catalog,
  onAuthDone,
  onChooseRoute,
  onOpenAuth,
  onOpenScam,
  onRefreshCatalog,
  onRefreshEntitlements,
  onSaveJournal,
  learningSimulatorContext,
  onOpenLearningSimulator,
  onNavigateScreen,
  onOpenPricing,
  routeProfile,
  sync,
  entitlements
}: {
  active: ScreenKey;
  catalog: CatalogState;
  entitlements: BillingEntitlementSnapshot | null;
  learningSimulatorContext: { id: number; title: string } | null;
  onAuthDone: () => void;
  onChooseRoute: (amountRangeId: AmountRangeId, goalId: GoalId) => void;
  onOpenLearningSimulator: (lesson?: { id: number; title: string } | null) => void;
  onOpenAuth: () => void;
  onOpenPricing: () => void;
  onNavigateScreen: (screen: ScreenKey) => void;
  onOpenScam: () => void;
  onRefreshCatalog: () => Promise<void>;
  onRefreshEntitlements: () => Promise<void>;
  onSaveJournal: (entry: JournalEntryDraft) => void;
  routeProfile: RouteProfile;
  sync: ReturnType<typeof useCloudSync>;
}) {
  const { auth, isAnonymous, isAuthenticated, loading, logout, user } = useAuth();

  switch (active) {
    case "auth":
      return <AuthScreen onDone={onAuthDone} />;
    case "route":
      return <RouteResultScreen passports={catalog.passports} profile={routeProfile} onSaveJournal={onSaveJournal} />;
    case "learn":
      return (
        <LearnScreen
          apiClient={apiClient}
          auth={auth}
          entitlements={entitlements}
          isAuthenticated={isAuthenticated}
          onOpenJournal={() => onNavigateScreen("journal")}
          onOpenPricing={onOpenPricing}
          onOpenProfessionals={() => onNavigateScreen("professionals")}
          onOpenScam={onOpenScam}
          onOpenSimulators={onOpenLearningSimulator}
          onRequestAuth={onOpenAuth}
          onSaveJournal={onSaveJournal}
        />
      );
    case "simulators":
      return (
        <SimulatorsScreen
          apiClient={apiClient}
          auth={auth}
          entitlements={entitlements}
          learningLessonContext={learningSimulatorContext}
          onLearningSimulationComplete={async (simulationRunId) => {
            if (!auth || !learningSimulatorContext) return;
            await apiClient.completeLearningLessonWithAction(
              learningSimulatorContext.id,
              { simulation_run_id: simulationRunId },
              auth
            );
          }}
          onOpenPricing={onOpenPricing}
          onSaveJournal={onSaveJournal}
        />
      );
    case "scam":
      return <ScamCheckerScreen apiClient={apiClient} entitlements={entitlements} onOpenPricing={onOpenPricing} />;
    case "journal":
      return (
        <JournalScreen
          entries={sync.journalEntries}
          isAuthenticated={isAuthenticated}
          lastSyncAt={sync.lastSyncAt}
          onDeleteEntry={sync.deleteJournalEntry}
          onRequestAuth={onOpenAuth}
          onSaveEntry={sync.saveJournalEntry}
          onSyncNow={sync.syncNow}
          syncError={sync.syncError}
          syncing={sync.syncing}
          syncSummary={sync.syncSummary}
        />
      );
    case "portfolio":
      return (
        <PortfolioMirrorScreen
          isAuthenticated={isAuthenticated}
          items={sync.portfolioItems}
          lastSyncAt={sync.lastSyncAt}
          onDeleteItem={sync.deletePortfolioItem}
          onRequestAuth={onOpenAuth}
          onSaveItem={sync.savePortfolioItem}
          onOpenPricing={onOpenPricing}
          onSyncNow={sync.syncNow}
          portfolioSummary={sync.portfolioSummary}
          premiumEnabled={Boolean(entitlements?.features.portfolio_mirror)}
          syncError={sync.syncError}
          syncing={sync.syncing}
          syncSummary={sync.syncSummary}
        />
      );
    case "passports":
      return <ProductPassportsScreen apiClient={apiClient} catalog={catalog} />;
    case "professionals":
      return <ProfessionalsScreen apiClient={apiClient} auth={auth} onRequestAuth={onOpenAuth} />;
    case "pricing":
      return (
        <PricingScreen
          apiClient={apiClient}
          auth={auth}
          entitlements={entitlements}
          isAuthenticated={isAuthenticated}
          onRefreshEntitlements={onRefreshEntitlements}
          onRequestAuth={onOpenAuth}
        />
      );
    case "notifications":
      return <NotificationsScreen apiClient={apiClient} auth={auth} onRequestAuth={onOpenAuth} />;
    case "support":
      return <BetaSupportScreen apiClient={apiClient} auth={auth} />;
    case "privacy":
      return (
        <PrivacySettingsScreen
          apiClient={apiClient}
          auth={auth}
          isAnonymous={isAnonymous}
          isAuthenticated={isAuthenticated}
          loading={loading}
          onLogout={logout}
          onOpenAuth={onOpenAuth}
          user={user}
        />
      );
    case "more":
      return <MoreScreen onNavigate={onNavigateScreen} />;
    case "debug":
      return (
        <HealthDebugScreen
          apiClient={apiClient}
          catalog={catalog}
          isAnonymous={isAnonymous}
          isAuthenticated={isAuthenticated}
          onRefreshCatalog={onRefreshCatalog}
          user={user}
        />
      );
    default:
      return (
        <HomeScreen
          apiClient={apiClient}
          auth={auth}
          catalog={catalog}
          onChooseRoute={onChooseRoute}
          onOpenLearn={() => onNavigateScreen("learn")}
          onOpenScam={onOpenScam}
          onRefreshCatalog={onRefreshCatalog}
          selectedGoalId={routeProfile.goalId}
        />
      );
  }
}

function MoreScreen({ onNavigate }: { onNavigate: (screen: ScreenKey) => void }) {
  return (
    <View style={styles.moreScreen}>
      <Text style={styles.moreTitle}>More</Text>
      <Text style={styles.moreCopy}>Tools and account areas that do not need to crowd the main navigation.</Text>
      <View style={styles.moreGrid}>
        {secondaryTabs.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.key}
            onPress={() => onNavigate(item.key)}
            style={({ pressed }) => [styles.moreItem, pressed && styles.pressed]}
          >
            <Ionicons name={item.icon} size={20} color={maliPrime.colors.textTertiary} />
            <View style={styles.moreItemText}>
              <Text style={styles.moreItemTitle}>{screenLabels[item.key]}</Text>
              <Text style={styles.moreItemMeta}>{moreDescriptions[item.key]}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function AppShell() {
  const { auth, initializing, isAnonymous, isAuthenticated, needsPrivacyOnboarding } = useAuth();
  const [active, setActive] = useState<ScreenKey>("home");
  const [routeProfile, setRouteProfile] = useState<RouteProfile>(() => buildRouteProfile("5k-20k", "first-investment"));
  const [catalog, setCatalog] = useState<CatalogState>(initialCatalogState);
  const [entitlements, setEntitlements] = useState<BillingEntitlementSnapshot | null>(null);
  const [learningSimulatorContext, setLearningSimulatorContext] = useState<{ id: number; title: string } | null>(null);
  const sync = useCloudSync({ apiClient, auth, isAuthenticated });
  const catalogCacheRef = useRef({
    categories: initialCatalogState.categories,
    passports: initialCatalogState.passports
  });
  const title = useMemo(() => screenLabels[active], [active]);

  const refreshCatalog = useCallback(async () => {
    setCatalog((current) => ({ ...current, loading: true, error: null }));
    try {
      const [categories, passports] = await Promise.all([apiClient.productCategories(), apiClient.productPassports()]);
      catalogCacheRef.current = { categories, passports };
      setCatalog({
        categories,
        passports,
        loading: false,
        error: null,
        source: "api",
        lastUpdated: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
      });
    } catch (error) {
      const hasCache = catalogCacheRef.current.categories.length > 0 || catalogCacheRef.current.passports.length > 0;
      setCatalog({
        categories: catalogCacheRef.current.categories,
        passports: catalogCacheRef.current.passports,
        loading: false,
        error: error instanceof Error ? error.message : "API unavailable",
        source: hasCache ? "cache" : "mock",
        lastUpdated: null
      });
    }
  }, []);

  const refreshEntitlements = useCallback(async () => {
    try {
      setEntitlements(await apiClient.billingEntitlements(auth));
    } catch {
      setEntitlements(null);
    }
  }, [auth?.token]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    if (isAnonymous || isAuthenticated) {
      void refreshEntitlements();
    }
  }, [isAnonymous, isAuthenticated, refreshEntitlements]);

  function chooseRoute(amountRangeId: AmountRangeId, goalId: GoalId) {
    setLearningSimulatorContext(null);
    setRouteProfile(buildRouteProfile(amountRangeId, goalId));
    if (goalId === "scam-check") {
      setActive("scam");
      return;
    }
    if (goalId === "speak-to-professional") {
      setActive("professionals");
      return;
    }
    setActive("route");
  }

  function navigateScreen(screen: ScreenKey) {
    if (screen !== "simulators") {
      setLearningSimulatorContext(null);
    }
    setActive(screen);
  }

  function openLearningSimulator(lesson?: { id: number; title: string } | null) {
    setLearningSimulatorContext(lesson ?? null);
    setActive("simulators");
  }

  function mainContent() {
    if (initializing) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Loading PesaRoute</Text>
          <Text style={styles.centerCopy}>Checking whether this device has a saved account session.</Text>
        </View>
      );
    }
    if (!isAuthenticated && !isAnonymous) {
      return <AuthScreen onDone={() => setActive("home")} />;
    }
    if (isAuthenticated && needsPrivacyOnboarding) {
      return <PrivacyOnboardingScreen />;
    }
    return (
      <Screen
        active={active}
        catalog={catalog}
        entitlements={entitlements}
        learningSimulatorContext={learningSimulatorContext}
        routeProfile={routeProfile}
        onAuthDone={() => setActive("privacy")}
        onChooseRoute={chooseRoute}
        onOpenAuth={() => setActive("auth")}
        onOpenLearningSimulator={openLearningSimulator}
        onNavigateScreen={navigateScreen}
        onOpenPricing={() => setActive("pricing")}
        onOpenScam={() => setActive("scam")}
        onRefreshCatalog={refreshCatalog}
        onRefreshEntitlements={refreshEntitlements}
        onSaveJournal={sync.saveJournalEntry}
        sync={sync}
      />
    );
  }

  const showTabs = !initializing && (isAnonymous || isAuthenticated) && !needsPrivacyOnboarding && active !== "auth";
  const primaryTabKeys = primaryTabs.map((tab) => tab.key);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>PesaRoute</Text>
          <Text style={styles.headerScreen}>{needsPrivacyOnboarding ? "Privacy setup" : title}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.mode}>{catalog.source.toUpperCase()}</Text>
        </View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardWrap}>
        <ScrollView
          contentContainerStyle={[styles.content, !showTabs && styles.contentNoTabs]}
          keyboardShouldPersistTaps="handled"
        >
          {mainContent()}
        </ScrollView>
      </KeyboardAvoidingView>
      {showTabs ? (
        <View style={styles.tabBar}>
          <View style={styles.tabContent}>
            {primaryTabs.map((tab) => {
              const selected = tab.key === active || (tab.key === "more" && !primaryTabKeys.includes(active));
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={tab.key}
                  onPress={() => navigateScreen(tab.key)}
                  style={({ pressed }) => [styles.tab, selected && styles.tabActive, pressed && styles.pressed]}
                >
                  <Ionicons name={tab.icon} size={20} color={selected ? maliPrime.colors.textPrimary : maliPrime.colors.textTertiary} />
                  <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider apiClient={apiClient}>
      <AppShell />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: maliPrime.colors.background, flex: 1, minHeight: "100%" },
  header: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderBottomColor: maliPrime.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  brand: { color: maliPrime.colors.textPrimary, fontSize: 22, fontWeight: "900" },
  headerRight: { alignItems: "flex-end", gap: 2 },
  mode: { color: maliPrime.colors.primary, fontSize: 10, fontWeight: "900" },
  headerScreen: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 2 },
  content: { padding: 18, paddingBottom: 118 },
  contentNoTabs: { paddingBottom: 32 },
  keyboardWrap: { flex: 1 },
  centerState: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 28,
    padding: 20,
    ...maliPrime.shadow
  },
  centerTitle: { color: maliPrime.colors.textPrimary, fontSize: 18, fontWeight: "900", textAlign: "center" },
  centerCopy: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  tabBar: {
    backgroundColor: maliPrime.colors.surface,
    borderTopColor: maliPrime.colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingBottom: Platform.OS === "ios" ? 16 : 8,
    paddingTop: 6,
    position: "absolute",
    right: 0
  },
  tabContent: { flexDirection: "row", gap: 2, paddingHorizontal: 6 },
  tab: {
    alignItems: "center",
    borderTopColor: "transparent",
    borderTopWidth: 2,
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 54,
    paddingTop: 5
  },
  tabActive: { borderTopColor: maliPrime.colors.textPrimary },
  tabLabel: { color: maliPrime.colors.textTertiary, fontSize: 10, fontWeight: "700" },
  tabLabelActive: { color: maliPrime.colors.textPrimary },
  pressed: { opacity: 0.72 },
  moreScreen: { gap: maliPrime.spacing.lg },
  moreTitle: { color: maliPrime.colors.textPrimary, fontSize: 30, fontWeight: "700", lineHeight: 36 },
  moreCopy: { color: maliPrime.colors.textSecondary, fontSize: 15, lineHeight: 22 },
  moreGrid: { gap: 10 },
  moreItem: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  moreItemText: { flex: 1 },
  moreItemTitle: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "700" },
  moreItemMeta: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3 }
});
