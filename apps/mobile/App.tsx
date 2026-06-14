import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PesaRouteApiClient } from "./src/api/client";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { mockProductCategories, mockProductPassports } from "./src/data/mockData";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HealthDebugScreen } from "./src/screens/HealthDebugScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { JournalScreen } from "./src/screens/JournalScreen";
import { PortfolioMirrorScreen } from "./src/screens/PortfolioMirrorScreen";
import { ProfessionalsScreen } from "./src/screens/ProfessionalsScreen";
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
  | "route"
  | "simulators"
  | "scam"
  | "journal"
  | "portfolio"
  | "professionals"
  | "privacy"
  | "debug"
  | "auth";

const apiClient = new PesaRouteApiClient();

const tabs: Array<{ key: Exclude<ScreenKey, "auth">; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "home", label: "Home", icon: "navigate" },
  { key: "route", label: "Route", icon: "map" },
  { key: "simulators", label: "Sim", icon: "calculator" },
  { key: "scam", label: "Scam", icon: "shield-checkmark" },
  { key: "journal", label: "Journal", icon: "create" },
  { key: "portfolio", label: "Mirror", icon: "pie-chart" },
  { key: "professionals", label: "Review", icon: "people" },
  { key: "privacy", label: "Profile", icon: "person-circle" },
  { key: "debug", label: "API", icon: "pulse" }
];

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
  onSaveJournal,
  routeProfile,
  sync
}: {
  active: ScreenKey;
  catalog: CatalogState;
  onAuthDone: () => void;
  onChooseRoute: (amountRangeId: AmountRangeId, goalId: GoalId) => void;
  onOpenAuth: () => void;
  onOpenScam: () => void;
  onRefreshCatalog: () => Promise<void>;
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
    case "simulators":
      return <SimulatorsScreen apiClient={apiClient} />;
    case "scam":
      return <ScamCheckerScreen apiClient={apiClient} />;
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
          onSyncNow={sync.syncNow}
          portfolioSummary={sync.portfolioSummary}
          syncError={sync.syncError}
          syncing={sync.syncing}
          syncSummary={sync.syncSummary}
        />
      );
    case "professionals":
      return <ProfessionalsScreen apiClient={apiClient} auth={auth} onRequestAuth={onOpenAuth} />;
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
          catalog={catalog}
          onChooseRoute={onChooseRoute}
          onOpenScam={onOpenScam}
          onRefreshCatalog={onRefreshCatalog}
          selectedGoalId={routeProfile.goalId}
        />
      );
  }
}

function AppShell() {
  const { auth, initializing, isAnonymous, isAuthenticated, needsPrivacyOnboarding } = useAuth();
  const [active, setActive] = useState<ScreenKey>("home");
  const [routeProfile, setRouteProfile] = useState<RouteProfile>(() => buildRouteProfile("5k-20k", "first-investment"));
  const [catalog, setCatalog] = useState<CatalogState>(initialCatalogState);
  const sync = useCloudSync({ apiClient, auth, isAuthenticated });
  const catalogCacheRef = useRef({
    categories: initialCatalogState.categories,
    passports: initialCatalogState.passports
  });
  const title = useMemo(() => tabs.find((tab) => tab.key === active)?.label ?? "Account", [active]);

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

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  function chooseRoute(amountRangeId: AmountRangeId, goalId: GoalId) {
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
        routeProfile={routeProfile}
        onAuthDone={() => setActive("privacy")}
        onChooseRoute={chooseRoute}
        onOpenAuth={() => setActive("auth")}
        onOpenScam={() => setActive("scam")}
        onRefreshCatalog={refreshCatalog}
        onSaveJournal={sync.saveJournalEntry}
        sync={sync}
      />
    );
  }

  const showTabs = !initializing && (isAnonymous || isAuthenticated) && !needsPrivacyOnboarding;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>PesaRoute</Text>
        <View style={styles.headerRight}>
          <Text style={styles.mode}>{catalog.source.toUpperCase()}</Text>
          <Text style={styles.headerScreen}>{needsPrivacyOnboarding ? "Privacy Setup" : title}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, !showTabs && styles.contentNoTabs]}>{mainContent()}</ScrollView>
      {showTabs ? (
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
            {tabs.map((tab) => {
              const selected = tab.key === active;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={tab.key}
                  onPress={() => setActive(tab.key)}
                  style={[styles.tab, selected && styles.tabActive]}
                >
                  <Ionicons name={tab.icon} size={18} color={selected ? "#ffffff" : "#0f7b5f"} />
                  <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
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
  safe: { backgroundColor: "#fbfdf9", flex: 1, minHeight: "100%" },
  header: {
    alignItems: "center",
    borderBottomColor: "#e1ebe5",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  brand: { color: "#15221d", fontSize: 20, fontWeight: "900" },
  headerRight: { alignItems: "flex-end", gap: 2 },
  mode: { color: "#c86f3c", fontSize: 10, fontWeight: "900" },
  headerScreen: { color: "#0f7b5f", fontSize: 13, fontWeight: "900" },
  content: { padding: 18, paddingBottom: 118 },
  contentNoTabs: { paddingBottom: 32 },
  centerState: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 28,
    padding: 20
  },
  centerTitle: { color: "#15221d", fontSize: 18, fontWeight: "900", textAlign: "center" },
  centerCopy: { color: "#52645b", fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  tabBar: {
    backgroundColor: "#ffffff",
    borderTopColor: "#dbe6df",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingVertical: 10,
    position: "absolute",
    right: 0
  },
  tabContent: { gap: 8, paddingHorizontal: 12 },
  tab: {
    alignItems: "center",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 12
  },
  tabActive: { backgroundColor: "#0f7b5f", borderColor: "#0f7b5f" },
  tabLabel: { color: "#0f7b5f", fontSize: 12, fontWeight: "900" },
  tabLabelActive: { color: "#ffffff" }
});
