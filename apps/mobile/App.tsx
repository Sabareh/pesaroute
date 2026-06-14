import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PesaRouteApiClient } from "./src/api/client";
import { mockProductCategories, mockProductPassports } from "./src/data/mockData";
import { HealthDebugScreen } from "./src/screens/HealthDebugScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { JournalScreen } from "./src/screens/JournalScreen";
import { PortfolioMirrorScreen } from "./src/screens/PortfolioMirrorScreen";
import { PrivacySettingsScreen } from "./src/screens/PrivacySettingsScreen";
import { RouteResultScreen } from "./src/screens/RouteResultScreen";
import { ScamCheckerScreen } from "./src/screens/ScamCheckerScreen";
import { SimulatorsScreen } from "./src/screens/SimulatorsScreen";
import type { AmountRangeId, AuthCredentials, CatalogState, GoalId, JournalEntry, PortfolioItem, RouteProfile } from "./src/types";
import { buildRouteProfile } from "./src/utils/routePlanner";

type ScreenKey = "home" | "route" | "simulators" | "scam" | "journal" | "portfolio" | "privacy" | "debug";

const tabs: Array<{ key: ScreenKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "home", label: "Home", icon: "navigate" },
  { key: "route", label: "Route", icon: "map" },
  { key: "simulators", label: "Sim", icon: "calculator" },
  { key: "scam", label: "Scam", icon: "shield-checkmark" },
  { key: "journal", label: "Journal", icon: "create" },
  { key: "portfolio", label: "Mirror", icon: "pie-chart" },
  { key: "privacy", label: "Privacy", icon: "lock-closed" },
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
  apiClient,
  auth,
  catalog,
  portfolioItems,
  journalEntries,
  routeProfile,
  onAddJournalEntry,
  onAddPortfolioItem,
  onChooseRoute,
  onOpenScam,
  onRefreshCatalog,
  onSaveJournal,
  onSetAuth
}: {
  active: ScreenKey;
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  catalog: CatalogState;
  portfolioItems: PortfolioItem[];
  journalEntries: JournalEntry[];
  routeProfile: RouteProfile;
  onAddJournalEntry: (entry: JournalEntry) => void;
  onAddPortfolioItem: (item: PortfolioItem) => void;
  onChooseRoute: (amountRangeId: AmountRangeId, goalId: GoalId) => void;
  onOpenScam: () => void;
  onRefreshCatalog: () => Promise<void>;
  onSaveJournal: (entry: JournalEntry) => void;
  onSetAuth: (auth: AuthCredentials | null) => void;
}) {
  switch (active) {
    case "route":
      return <RouteResultScreen passports={catalog.passports} profile={routeProfile} onSaveJournal={onSaveJournal} />;
    case "simulators":
      return <SimulatorsScreen apiClient={apiClient} />;
    case "scam":
      return <ScamCheckerScreen apiClient={apiClient} />;
    case "journal":
      return <JournalScreen apiClient={apiClient} auth={auth} entries={journalEntries} onAddEntry={onAddJournalEntry} />;
    case "portfolio":
      return <PortfolioMirrorScreen apiClient={apiClient} auth={auth} items={portfolioItems} onAddItem={onAddPortfolioItem} />;
    case "privacy":
      return <PrivacySettingsScreen />;
    case "debug":
      return (
        <HealthDebugScreen
          apiClient={apiClient}
          auth={auth}
          catalog={catalog}
          onRefreshCatalog={onRefreshCatalog}
          onSetAuth={onSetAuth}
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

export default function App() {
  const apiClient = useMemo(() => new PesaRouteApiClient(), []);
  const [active, setActive] = useState<ScreenKey>("home");
  const [routeProfile, setRouteProfile] = useState<RouteProfile>(() => buildRouteProfile("5k-20k", "first-investment"));
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [auth, setAuth] = useState<AuthCredentials | null>(null);
  const [catalog, setCatalog] = useState<CatalogState>(initialCatalogState);
  const catalogCacheRef = useRef({
    categories: initialCatalogState.categories,
    passports: initialCatalogState.passports
  });
  const title = useMemo(() => tabs.find((tab) => tab.key === active)?.label ?? "Home", [active]);

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
  }, [apiClient]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  function chooseRoute(amountRangeId: AmountRangeId, goalId: GoalId) {
    setRouteProfile(buildRouteProfile(amountRangeId, goalId));
    setActive(goalId === "scam-check" ? "scam" : "route");
  }

  function addJournalEntry(entry: JournalEntry) {
    setJournalEntries((current) => [entry, ...current]);
  }

  function addPortfolioItem(item: PortfolioItem) {
    setPortfolioItems((current) => [item, ...current]);
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>PesaRoute</Text>
        <View style={styles.headerRight}>
          <Text style={styles.mode}>{catalog.source.toUpperCase()}</Text>
          <Text style={styles.headerScreen}>{title}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Screen
          active={active}
          apiClient={apiClient}
          auth={auth}
          catalog={catalog}
          portfolioItems={portfolioItems}
          journalEntries={journalEntries}
          routeProfile={routeProfile}
          onAddJournalEntry={addJournalEntry}
          onAddPortfolioItem={addPortfolioItem}
          onChooseRoute={chooseRoute}
          onOpenScam={() => setActive("scam")}
          onRefreshCatalog={refreshCatalog}
          onSaveJournal={addJournalEntry}
          onSetAuth={setAuth}
        />
      </ScrollView>
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
    </SafeAreaView>
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
