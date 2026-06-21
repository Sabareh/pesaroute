import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PesaRouteApiClient } from "./src/api/client";
import type { BillingEntitlementSnapshot } from "./src/api/client";
import { AssessmentsScreen } from "./src/screens/AssessmentsScreen";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { maliPrime } from "./src/components/maliprime";
import { mockProductCategories, mockProductPassports } from "./src/data/mockData";
import { AuthScreen } from "./src/screens/AuthScreen";
import { BetaSupportScreen } from "./src/screens/BetaSupportScreen";
import { HealthDebugScreen } from "./src/screens/HealthDebugScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { JournalScreen } from "./src/screens/JournalScreen";
import { LandDecisionSafetyScreen } from "./src/screens/LandDecisionSafetyScreen";
import { LearnScreen } from "./src/screens/LearnScreen";
import { MarketplaceScreen } from "./src/screens/MarketplaceScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { PortfolioMirrorScreen } from "./src/screens/PortfolioMirrorScreen";
import { PracticeScreen } from "./src/screens/PracticeScreen";
import { ProductPassportsScreen } from "./src/screens/ProductPassportsScreen";
import { ProductSimulationScreen } from "./src/screens/ProductSimulationScreen";
import { ProfessionalsScreen } from "./src/screens/ProfessionalsScreen";
import { PricingScreen } from "./src/screens/PricingScreen";
import { PrivacyOnboardingScreen } from "./src/screens/PrivacyOnboardingScreen";
import { PrivacySettingsScreen } from "./src/screens/PrivacySettingsScreen";
import { RouteResultScreen } from "./src/screens/RouteResultScreen";
import { ScamCheckerScreen } from "./src/screens/ScamCheckerScreen";
import { SimulatorsScreen } from "./src/screens/SimulatorsScreen";
import { TermsScreen } from "./src/screens/TermsScreen";
import { useCloudSync } from "./src/sync/useCloudSync";
import type { AmountRangeId, CatalogState, GoalId, JournalEntryDraft, ReviewPrefill, RouteProfile } from "./src/types";
import { buildRouteProfile } from "./src/utils/routePlanner";

type ScreenKey =
  | "home"
  | "learn"
  | "practice"
  | "assessments"
  | "route"
  | "simulators"
  | "scam"
  | "journal"
  | "portfolio"
  | "land"
  | "marketplace"
  | "passports"
  | "professionals"
  | "pricing"
  | "notifications"
  | "support"
  | "terms"
  | "privacy"
  | "more"
  | "debug"
  | "auth";

const apiClient = new PesaRouteApiClient();

const primaryTabs: Array<{ key: ScreenKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "home", label: "Home", icon: "navigate" },
  { key: "learn", label: "Learn", icon: "book" },
  { key: "practice", label: "Practice", icon: "barbell" },
  { key: "simulators", label: "Simulate", icon: "calculator" },
  { key: "privacy", label: "Profile", icon: "person-circle" }
];

type MoreScreenKey = Exclude<ScreenKey, "home" | "learn" | "practice" | "simulators" | "privacy" | "more" | "auth">;

const secondaryTabs: Array<{ key: MoreScreenKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "assessments", label: "Assess", icon: "clipboard" },
  { key: "journal", label: "Journal", icon: "create" },
  { key: "route", label: "Route", icon: "map" },
  { key: "scam", label: "Scam check", icon: "shield-checkmark" },
  { key: "portfolio", label: "Mirror", icon: "pie-chart" },
  { key: "marketplace", label: "Market", icon: "storefront" },
  { key: "land", label: "Land", icon: "map" },
  { key: "passports", label: "Passports", icon: "document-text" },
  { key: "professionals", label: "Review", icon: "people" },
  { key: "pricing", label: "Premium", icon: "diamond" },
  { key: "notifications", label: "Inbox", icon: "notifications" },
  { key: "support", label: "Help", icon: "help-circle" },
  { key: "terms", label: "Terms", icon: "document" },
  { key: "debug", label: "API", icon: "pulse" }
];

const screenLabels: Record<ScreenKey, string> = {
  home: "Home",
  learn: "Learn",
  practice: "Practice",
  assessments: "Assessments",
  route: "Route",
  simulators: "Simulators",
  scam: "Scam checker",
  journal: "Journal",
  portfolio: "Portfolio mirror",
  land: "Land decision safety",
  marketplace: "Marketplace",
  passports: "Product passports",
  professionals: "Professional review",
  pricing: "Premium",
  notifications: "Inbox",
  support: "Help",
  terms: "Terms",
  privacy: "Profile",
  more: "More",
  debug: "API",
  auth: "Account"
};

const moreDescriptions: Record<MoreScreenKey, string> = {
  assessments: "Money profile, risk, scam, and liquidity self-checks.",
  journal: "Private investment decision journal.",
  route: "Learning route from amount and goal.",
  scam: "Check investment red flags.",
  portfolio: "Manual portfolio mirror and summary.",
  land: "Check a land deal before you pay a deposit.",
  marketplace: "Search, compare, and simulate products.",
  passports: "Search public product passports.",
  professionals: "Request scoped professional review.",
  pricing: "Premium and paid pack placeholders.",
  notifications: "Payment and review updates.",
  support: "Private beta feedback and support.",
  terms: "Service boundaries and privacy notices.",
  debug: "Backend health and catalog checks."
};

const DRAWER_WIDTH = Math.min(312, Math.round(Dimensions.get("window").width * 0.84));

// Left navigation drawer: 13 destinations grouped, replacing the bottom tab bar.
const drawerGroups: Array<{ group: string; items: Array<{ key: ScreenKey; label: string; icon: keyof typeof Ionicons.glyphMap }> }> = [
  {
    group: "Main",
    items: [
      { key: "home", label: "Home", icon: "home-outline" },
      { key: "learn", label: "Learn", icon: "book-outline" },
      { key: "practice", label: "Practice", icon: "barbell-outline" },
      { key: "simulators", label: "Simulate", icon: "calculator-outline" },
      { key: "assessments", label: "Assessments", icon: "clipboard-outline" }
    ]
  },
  {
    group: "Money",
    items: [
      { key: "marketplace", label: "Marketplace", icon: "storefront-outline" },
      { key: "passports", label: "Passports", icon: "document-text-outline" },
      { key: "route", label: "Route planner", icon: "map-outline" },
      { key: "portfolio", label: "Portfolio mirror", icon: "pie-chart-outline" },
      { key: "journal", label: "Journal", icon: "create-outline" }
    ]
  },
  {
    group: "Safety & account",
    items: [
      { key: "scam", label: "Scam checker", icon: "shield-checkmark-outline" },
      { key: "land", label: "Land safety", icon: "leaf-outline" },
      { key: "professionals", label: "Professional review", icon: "people-outline" },
      { key: "privacy", label: "Settings", icon: "settings-outline" }
    ]
  },
  {
    group: "More",
    items: [
      { key: "pricing", label: "Premium", icon: "diamond-outline" },
      { key: "notifications", label: "Inbox", icon: "notifications-outline" },
      { key: "support", label: "Help", icon: "help-circle-outline" },
      { key: "terms", label: "Terms", icon: "document-outline" },
      { key: "debug", label: "API", icon: "pulse-outline" }
    ]
  }
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
  onRefreshEntitlements,
  onSaveJournal,
  learningSimulatorContext,
  forceGenericSimulator,
  onOpenLearningSimulator,
  onOpenGenericSimulator,
  onRequestReview,
  reviewPrefill,
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
  forceGenericSimulator: boolean;
  onAuthDone: () => void;
  onChooseRoute: (amountRangeId: AmountRangeId, goalId: GoalId) => void;
  onOpenLearningSimulator: (lesson?: { id: number; title: string } | null) => void;
  onOpenGenericSimulator: () => void;
  onRequestReview: (prefill: ReviewPrefill) => void;
  reviewPrefill: ReviewPrefill | null;
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
      if (learningSimulatorContext || forceGenericSimulator) {
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
      }
      return (
        <ProductSimulationScreen
          apiClient={apiClient}
          auth={auth}
          entitlements={entitlements}
          onSaveJournal={onSaveJournal}
          onOpenPricing={onOpenPricing}
          onOpenProfessionals={onRequestReview}
          onOpenGenericSimulator={onOpenGenericSimulator}
          onOpenPassports={() => onNavigateScreen("passports")}
        />
      );
    case "practice":
      return (
        <PracticeScreen
          apiClient={apiClient}
          auth={auth}
          entitlements={entitlements}
          onOpenPricing={onOpenPricing}
          onRequestAuth={onOpenAuth}
        />
      );
    case "assessments":
      return (
        <AssessmentsScreen
          apiClient={apiClient}
          auth={auth}
          entitlements={entitlements}
          onOpenPricing={onOpenPricing}
          onRequestAuth={onOpenAuth}
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
    case "land":
      return <LandDecisionSafetyScreen apiClient={apiClient} auth={auth} onRequestAuth={onOpenAuth} />;
    case "marketplace":
      return <MarketplaceScreen apiClient={apiClient} auth={auth} onRequestAuth={onOpenAuth} />;
    case "passports":
      return <ProductPassportsScreen apiClient={apiClient} catalog={catalog} />;
    case "professionals":
      return <ProfessionalsScreen apiClient={apiClient} auth={auth} onRequestAuth={onOpenAuth} prefill={reviewPrefill} />;
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
    case "terms":
      return <TermsScreen />;
    case "privacy":
      return (
        <View style={styles.profileTab}>
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
          <MoreScreen onNavigate={onNavigateScreen} />
        </View>
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
          onOpenPractice={() => onNavigateScreen("practice")}
          onOpenSimulate={() => onNavigateScreen("simulators")}
          onOpenAssessments={() => onNavigateScreen("assessments")}
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

function NavDrawer({
  active,
  user,
  isAuthenticated,
  onNavigate,
  onSignOut,
  onOpenAuth
}: {
  active: ScreenKey;
  user: { first_name?: string | null; username?: string | null } | null;
  isAuthenticated: boolean;
  onNavigate: (screen: ScreenKey) => void;
  onSignOut: () => void;
  onOpenAuth: () => void;
}) {
  const name = user?.first_name || user?.username || "Guest";
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <View style={styles.drawerInner}>
      <View style={styles.drawerUser}>
        <View style={styles.drawerAvatar}>
          <Text style={styles.drawerAvatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.drawerName}>
            {name}
          </Text>
          {isAuthenticated ? (
            <View style={styles.drawerBadge}>
              <Text style={styles.drawerBadgeText}>Member</Text>
            </View>
          ) : (
            <Text style={styles.drawerGuest}>Anonymous mode</Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.drawerScrollView} contentContainerStyle={styles.drawerScroll} showsVerticalScrollIndicator={false}>
        {drawerGroups.map((group) => (
          <View key={group.group} style={styles.drawerGroup}>
            <Text style={styles.drawerGroupLabel}>{group.group.toUpperCase()}</Text>
            {group.items.map((item) => {
              const selected = item.key === active;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={item.key}
                  onPress={() => onNavigate(item.key)}
                  style={({ pressed }) => [styles.drawerItem, selected && styles.drawerItemActive, pressed && styles.pressed]}
                >
                  <Ionicons name={item.icon} size={20} color={selected ? "#38C772" : "rgba(237,241,248,0.66)"} />
                  <Text style={[styles.drawerItemText, selected && styles.drawerItemTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <Pressable accessibilityRole="button" onPress={isAuthenticated ? onSignOut : onOpenAuth} style={({ pressed }) => [styles.drawerSignOut, pressed && styles.pressed]}>
        <Ionicons name={isAuthenticated ? "log-out-outline" : "log-in-outline"} size={18} color="#E2685E" />
        <Text style={styles.drawerSignOutText}>{isAuthenticated ? "Sign out" : "Sign in"}</Text>
      </Pressable>
    </View>
  );
}

function AppShell() {
  const { auth, initializing, isAnonymous, isAuthenticated, logout, needsPrivacyOnboarding, user } = useAuth();
  const [active, setActive] = useState<ScreenKey>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const [routeProfile, setRouteProfile] = useState<RouteProfile>(() => buildRouteProfile("5k-20k", "first-investment"));
  const [catalog, setCatalog] = useState<CatalogState>(initialCatalogState);
  const [entitlements, setEntitlements] = useState<BillingEntitlementSnapshot | null>(null);
  const [learningSimulatorContext, setLearningSimulatorContext] = useState<{ id: number; title: string } | null>(null);
  const [forceGenericSimulator, setForceGenericSimulator] = useState(false);
  const [reviewPrefill, setReviewPrefill] = useState<ReviewPrefill | null>(null);
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

  function openDrawer() {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerX, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 1, duration: 220, useNativeDriver: true })
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.timing(drawerX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start(({ finished }) => {
      if (finished) setDrawerOpen(false);
    });
  }

  function navigateScreen(screen: ScreenKey) {
    if (screen !== "simulators") {
      setLearningSimulatorContext(null);
    } else {
      // Tapping the Simulate tab always returns to the product-aware flow.
      setForceGenericSimulator(false);
    }
    if (screen !== "professionals") {
      setReviewPrefill(null);
    }
    setActive(screen);
    closeDrawer();
  }

  function openLearningSimulator(lesson?: { id: number; title: string } | null) {
    setLearningSimulatorContext(lesson ?? null);
    setForceGenericSimulator(false);
    setActive("simulators");
  }

  function requestReview(prefill: ReviewPrefill) {
    setReviewPrefill(prefill);
    setActive("professionals");
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
        forceGenericSimulator={forceGenericSimulator}
        reviewPrefill={reviewPrefill}
        routeProfile={routeProfile}
        onAuthDone={() => setActive("privacy")}
        onChooseRoute={chooseRoute}
        onOpenAuth={() => setActive("auth")}
        onOpenLearningSimulator={openLearningSimulator}
        onOpenGenericSimulator={() => setForceGenericSimulator(true)}
        onRequestReview={requestReview}
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

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showTabs ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={openDrawer} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Ionicons name="menu" size={24} color={maliPrime.colors.textPrimary} />
            </Pressable>
          ) : null}
          <View>
            <Text style={styles.brand}>PesaRoute</Text>
            <Text style={styles.headerScreen}>{needsPrivacyOnboarding ? "Privacy setup" : title}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {showTabs ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Inbox" onPress={() => navigateScreen("notifications")} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Ionicons name="notifications-outline" size={20} color={maliPrime.colors.textSecondary} />
            </Pressable>
          ) : null}
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
      {showTabs && drawerOpen ? (
        <>
          <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} pointerEvents="auto">
            <Pressable style={styles.scrimFill} onPress={closeDrawer} accessibilityRole="button" accessibilityLabel="Close menu" />
          </Animated.View>
          <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerX }] }]}>
            <NavDrawer
              active={active}
              user={user}
              isAuthenticated={isAuthenticated}
              onNavigate={navigateScreen}
              onSignOut={() => {
                closeDrawer();
                logout();
              }}
              onOpenAuth={() => navigateScreen("auth")}
            />
          </Animated.View>
        </>
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
  profileTab: { gap: maliPrime.spacing.xl },
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
  moreItemMeta: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3 },
  headerLeft: { alignItems: "center", flexDirection: "row", gap: 10 },
  iconBtn: { alignItems: "center", borderRadius: 999, height: 40, justifyContent: "center", width: 40 },
  scrim: { backgroundColor: "rgba(17,17,15,0.45)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 40 },
  scrimFill: { flex: 1 },
  drawer: { backgroundColor: "#10182B", bottom: 0, left: 0, position: "absolute", top: 0, width: DRAWER_WIDTH, zIndex: 50 },
  drawerInner: { flex: 1 },
  drawerUser: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 18
  },
  drawerAvatar: { alignItems: "center", backgroundColor: "rgba(56,199,114,0.18)", borderRadius: 999, height: 44, justifyContent: "center", width: 44 },
  drawerAvatarText: { color: "#38C772", fontSize: 16, fontWeight: "800" },
  drawerName: { color: "#EDF1F8", fontSize: 16, fontWeight: "700" },
  drawerBadge: { alignSelf: "flex-start", backgroundColor: "rgba(56,199,114,0.18)", borderRadius: 999, marginTop: 4, paddingHorizontal: 8, paddingVertical: 2 },
  drawerBadgeText: { color: "#38C772", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  drawerGuest: { color: "rgba(237,241,248,0.5)", fontSize: 12, marginTop: 3 },
  drawerScrollView: { flex: 1 },
  drawerScroll: { paddingBottom: 12, paddingHorizontal: 12 },
  drawerGroup: { marginTop: 10 },
  drawerGroupLabel: { color: "rgba(237,241,248,0.42)", fontSize: 11, fontWeight: "700", letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 6 },
  drawerItem: {
    alignItems: "center",
    borderLeftColor: "transparent",
    borderLeftWidth: 3,
    borderRadius: 10,
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  drawerItemActive: { backgroundColor: "rgba(26,107,69,0.22)", borderLeftColor: "#38C772" },
  drawerItemText: { color: "rgba(237,241,248,0.66)", fontSize: 14, fontWeight: "500" },
  drawerItemTextActive: { color: "#38C772", fontWeight: "700" },
  drawerSignOut: {
    alignItems: "center",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  drawerSignOutText: { color: "#E2685E", fontSize: 14, fontWeight: "700" }
});
