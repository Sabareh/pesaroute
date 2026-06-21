import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path as SvgPath, Text as SvgText } from "react-native-svg";

import countiesGeo from "../data/kenya-counties.json";

import type { PesaRouteApiClient } from "../api/client";
import {
  EmptyState,
  ErrorState,
  GoalChip,
  LoadingState,
  PremiumCard,
  PrimaryButton,
  RiskBadge,
  SecondaryButton,
  TrustBadge,
  maliPrime,
  maliPrimeText
} from "../components/maliprime";
import type {
  AuthCredentials,
  LandComparisonResult,
  LandCountyMarketRow,
  LandDueDiligenceItem,
  LandOpportunity,
  LandRiskScoreResult
} from "../types";

// Land module accent (matches the web "MaliPrime Liquid" primary green and the
// Land Mobile.dc.html design). The shared mobile theme uses ink-black as its
// primary, so the Land surfaces define their own green accent locally.
const ACCENT = "#1A6B45";
const ACCENT_SOFT = "#E6F2EA";
const MAP_BG = "#E7EEE7";
const TRACK = "#ECEAE2";
const INK = "#11110F";
const INK2 = "#5B5A55";
const INK3 = "#85827A";
const AMBER = "#8D6A2E";
const AMBER_SOFT = "rgba(141,106,46,0.14)";
const DANGER = "#A33B32";
const DANGER_SOFT = "rgba(163,59,50,0.1)";
const SURFACE_INK = "#10182B";

const SCREEN = Dimensions.get("window");
const MAP_H = Math.max(470, Math.round(SCREEN.height - 250));
// The screen renders inside App.tsx's content padding (18) plus this screen's
// own ScrollView padding (maliPrime.spacing.lg = 16). The map breaks out of both
// to sit edge-to-edge under the app header.
const OUTER_PAD = 18;
const BREAKOUT = OUTER_PAD + maliPrime.spacing.lg;
const PEEK_H = 250;
const EXPANDED_H = Math.max(360, MAP_H - 96);

const SCALE = ["#D6E7DC", "#9FCBB0", "#5FAE81", "#2E8659", "#1A6B45"];

// Real Kenya county boundaries (geoBoundaries ADM1, slimmed) projected once with a
// plain cos-lat equirectangular fit so the mobile map matches the web choropleth.
type Geom = { type: string; coordinates: number[][][] | number[][][][] };
const GEO = countiesGeo as { features: Array<{ properties: { name: string }; geometry: Geom }> };

function ringsOf(g: Geom): number[][][] {
  if (g.type === "Polygon") return g.coordinates as number[][][];
  if (g.type === "MultiPolygon") return (g.coordinates as number[][][][]).flat();
  return [];
}
function buildCountyPaths() {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const f of GEO.features) for (const ring of ringsOf(f.geometry)) for (const pt of ring) {
    if (pt[0] < minLng) minLng = pt[0];
    if (pt[0] > maxLng) maxLng = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  }
  const cosL = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const lngSpan = (maxLng - minLng) * cosL || 1;
  const latSpan = maxLat - minLat || 1;
  const H = 760;
  const W = Math.round(H * (lngSpan / latSpan));
  const px = (lng: number) => ((lng - minLng) * cosL) / lngSpan * W;
  const py = (lat: number) => ((maxLat - lat) / latSpan) * H;
  const paths = GEO.features.map((f) => {
    let d = "";
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const ring of ringsOf(f.geometry)) {
      d += "M" + ring.map((pt) => `${px(pt[0]).toFixed(1)},${py(pt[1]).toFixed(1)}`).join("L") + "Z";
      for (const pt of ring) {
        sx += px(pt[0]);
        sy += py(pt[1]);
        n += 1;
      }
    }
    return { name: f.properties.name, d, cx: n ? sx / n : 0, cy: n ? sy / n : 0 };
  });
  return { paths, W, H };
}
const MAP_PROJ = buildCountyPaths();

type LandView = "map" | "checklist" | "compare" | "guide" | "create" | "detail" | "list";

type CountyMarket = {
  id: string;
  name: string;
  region: string;
  hotspot: boolean;
  avgAcre: string;
  appreciation: string;
  yieldPct: string;
  // marker position as a percent of the map area
  mx: number;
  my: number;
  r: number;
  tone: string;
  totalReturn: { land: number; mmf: number; tbill: number };
  sponsored: { name: string; meta: string; price: string };
};

// When the real backend data loads, the selected county's sponsored card may be absent.
type DisplayCounty = Omit<CountyMarket, "sponsored"> & { sponsored?: CountyMarket["sponsored"] };

function fmtMillions(v: string): string {
  const m = Number(v);
  return m >= 1 ? `KES ${m % 1 === 0 ? m : m.toFixed(1)}M` : `KES ${Math.round(m * 1000)}k`;
}
function fmtKesFull(v: string): string {
  const full = Number(v);
  if (full >= 1_000_000) return `KES ${(full / 1_000_000).toFixed(full % 1_000_000 === 0 ? 0 : 1)}M`;
  if (full >= 1000) return `KES ${Math.round(full / 1000)}k`;
  return `KES ${Math.round(full)}`;
}
// Overlay real API metrics + sponsored listing onto a positioned county; falls
// back to the static placeholder when the backend is unreachable.
function mergeCounty(base: CountyMarket, api?: LandCountyMarketRow): DisplayCounty {
  if (!api) return base;
  const apprec = Number(api.appreciation_pct);
  const yld = Number(api.rental_yield_pct);
  const listing = api.listings[0];
  return {
    ...base,
    region: api.region || base.region,
    hotspot: api.tier === "Hotspot",
    avgAcre: fmtMillions(api.avg_price_per_acre),
    appreciation: `+${apprec}%`,
    yieldPct: `${yld}%`,
    totalReturn: { land: Math.round((apprec + yld) * 10) / 10, mmf: 11.8, tbill: 16 },
    sponsored: listing ? { name: listing.name, meta: `${listing.kind} · ${listing.place}`, price: fmtKesFull(listing.price_kes) } : undefined
  };
}

function placeholderCounty(name: string): CountyMarket {
  return {
    id: name,
    name,
    region: "Kenya",
    hotspot: false,
    avgAcre: "-",
    appreciation: "-",
    yieldPct: "-",
    mx: 0,
    my: 0,
    r: 0,
    tone: "#9FCBB0",
    totalReturn: { land: 0, mmf: 11.8, tbill: 16 },
    sponsored: { name: "", meta: "", price: "" }
  };
}

// Placeholder county market data. Structured so it can be swapped for a backend
// feed (e.g. apiClient.landCountyMarket()) without touching the UI.
const COUNTIES: CountyMarket[] = [
  {
    id: "kiambu",
    name: "Kiambu",
    region: "Central",
    hotspot: true,
    avgAcre: "KES 18M",
    appreciation: "+12%",
    yieldPct: "6%",
    mx: 55,
    my: 60,
    r: 25,
    tone: "#2E8659",
    totalReturn: { land: 18, mmf: 11.8, tbill: 16 },
    sponsored: { name: "Tilisi Gardens", meta: "Serviced plots · Limuru", price: "KES 4.9M" }
  },
  {
    id: "kajiado",
    name: "Kajiado",
    region: "Rift Valley",
    hotspot: true,
    avgAcre: "KES 9M",
    appreciation: "+15%",
    yieldPct: "4%",
    mx: 60,
    my: 82,
    r: 20,
    tone: "#1A6B45",
    totalReturn: { land: 20, mmf: 11.8, tbill: 16 },
    sponsored: { name: "Kitengela Acacia", meta: "50x100 plots · Kitengela", price: "KES 1.4M" }
  },
  {
    id: "nakuru",
    name: "Nakuru",
    region: "Rift Valley",
    hotspot: false,
    avgAcre: "KES 6.5M",
    appreciation: "+9%",
    yieldPct: "5%",
    mx: 38,
    my: 70,
    r: 20,
    tone: "#5FAE81",
    totalReturn: { land: 14, mmf: 11.8, tbill: 16 },
    sponsored: { name: "Greenpark Estate", meta: "Quarter-acre · Nakuru East", price: "KES 2.1M" }
  },
  {
    id: "machakos",
    name: "Machakos",
    region: "Eastern",
    hotspot: false,
    avgAcre: "KES 4.8M",
    appreciation: "+8%",
    yieldPct: "5%",
    mx: 74,
    my: 73,
    r: 20,
    tone: "#9FCBB0",
    totalReturn: { land: 12, mmf: 11.8, tbill: 16 },
    sponsored: { name: "Malaa Ridge", meta: "Eighth-acre · Malaa", price: "KES 0.9M" }
  },
  {
    id: "nyeri",
    name: "Nyeri",
    region: "Central",
    hotspot: false,
    avgAcre: "KES 5.2M",
    appreciation: "+7%",
    yieldPct: "6%",
    mx: 50,
    my: 48,
    r: 18,
    tone: "#5FAE81",
    totalReturn: { land: 11, mmf: 11.8, tbill: 16 },
    sponsored: { name: "Mt. Kenya View", meta: "Quarter-acre · Nyeri", price: "KES 1.8M" }
  }
];

const METRICS = [
  { key: "price", label: "Avg price" },
  { key: "appreciation", label: "Appreciation" },
  { key: "yield", label: "Yield" }
] as const;
type MetricKey = (typeof METRICS)[number]["key"];

const BEFORE_YOU_PAY_STEPS = [
  {
    title: "See the title first",
    body: "Confirm the parcel number matches the plot. A title you haven't seen is a red flag."
  },
  {
    title: "Do an official search",
    body: "Via Ardhisasa / Ministry of Lands, ideally through an advocate."
  },
  {
    title: "Use a qualified advocate",
    body: "Review title, search, and agreement before any money moves."
  }
];

const SELLER_TYPES = ["individual", "company", "agent", "chama", "family_member", "unknown"];
const TITLE_STATUSES = ["title_seen", "title_not_seen", "mother_title", "allotment_letter", "unknown"];
const INTENDED_USES = ["residential", "agricultural", "commercial", "speculation", "chama_project", "diaspora_investment"];
const SCENARIOS = ["conservative", "neutral", "optimistic"];
const REVIEW_TYPES = ["land_lawyer", "surveyor", "valuer", "diaspora_land_adviser", "chama_land_adviser"];

function label(value: string): string {
  return value.replace(/_/g, " ");
}

function metricValue(county: CountyMarket, metric: MetricKey): string {
  if (metric === "appreciation") return county.appreciation;
  if (metric === "yield") return county.yieldPct;
  return county.avgAcre;
}

type Props = {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  onRequestAuth: () => void;
};

export function LandDecisionSafetyScreen({ apiClient, auth, onRequestAuth }: Props) {
  const [view, setView] = useState<LandView>("map");
  const [opportunities, setOpportunities] = useState<LandOpportunity[]>([]);
  const [selected, setSelected] = useState<LandOpportunity | null>(null);
  const [risk, setRisk] = useState<LandRiskScoreResult | null>(null);
  const [comparison, setComparison] = useState<LandComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Map state
  const [selectedName, setSelectedName] = useState<string>("Kiambu");
  const [metric, setMetric] = useState<MetricKey>("price");
  const [expanded, setExpanded] = useState(false);
  const [marketByName, setMarketByName] = useState<Map<string, LandCountyMarketRow>>(new Map());
  const sheetH = useRef(new Animated.Value(PEEK_H)).current;
  const apiRow = marketByName.get(selectedName);
  const fallbackCounty = COUNTIES.find((c) => c.name === selectedName) ?? placeholderCounty(selectedName);
  const county = apiRow ? mergeCounty(fallbackCounty, apiRow) : fallbackCounty;
  const metricNum = (api: LandCountyMarketRow) =>
    metric === "appreciation" ? Number(api.appreciation_pct) : metric === "yield" ? Number(api.rental_yield_pct) : Number(api.avg_price_per_acre);
  const metricVals = [...marketByName.values()].map(metricNum);
  const metricLo = metricVals.length ? Math.min(...metricVals) : 0;
  const metricHi = metricVals.length ? Math.max(...metricVals) : 1;
  const colorForCounty = (name: string) => {
    const api = marketByName.get(name);
    if (!api) return "#DDE6DD";
    const t = metricHi === metricLo ? 1 : (metricNum(api) - metricLo) / (metricHi - metricLo);
    return SCALE[Math.min(SCALE.length - 1, Math.floor(t * SCALE.length))];
  };
  const selPath = MAP_PROJ.paths.find((p) => p.name === selectedName);

  // --- map pan (1-finger drag) + zoom (pinch / +- buttons) -------------------
  const mapPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const mapScale = useRef(new Animated.Value(1)).current;
  const mapScaleCur = useRef(1);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  useEffect(() => {
    const id = mapScale.addListener(({ value }) => {
      mapScaleCur.current = value;
    });
    return () => mapScale.removeListener(id);
  }, [mapScale]);
  const shouldPan = (e: { nativeEvent: { touches: unknown[] } }, g: { dx: number; dy: number }) =>
    e.nativeEvent.touches.length === 2 || Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6;
  const mapResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: shouldPan,
      onMoveShouldSetPanResponderCapture: shouldPan,
      onPanResponderGrant: (e) => {
        mapPan.extractOffset();
        const t = e.nativeEvent.touches;
        pinchStartDist.current =
          t.length === 2 ? Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) : 0;
        pinchStartScale.current = mapScaleCur.current;
      },
      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;
        if (t.length === 2) {
          const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
          if (pinchStartDist.current === 0) {
            pinchStartDist.current = d;
            pinchStartScale.current = mapScaleCur.current;
          }
          mapScale.setValue(Math.max(1, Math.min(5, pinchStartScale.current * (d / pinchStartDist.current))));
        } else {
          mapPan.setValue({ x: g.dx, y: g.dy });
        }
      },
      onPanResponderRelease: () => {
        mapPan.flattenOffset();
        pinchStartDist.current = 0;
      },
      onPanResponderTerminate: () => {
        mapPan.flattenOffset();
        pinchStartDist.current = 0;
      }
    })
  ).current;
  function zoomMap(factor: number) {
    const next = Math.max(1, Math.min(5, mapScaleCur.current * factor));
    Animated.timing(mapScale, { toValue: next, duration: 140, useNativeDriver: false }).start();
  }
  function recenterMap() {
    mapPan.flattenOffset();
    Animated.parallel([
      Animated.spring(mapPan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
      Animated.timing(mapScale, { toValue: 1, duration: 180, useNativeDriver: false })
    ]).start();
  }

  // Create form
  const [form, setForm] = useState({
    title: "",
    location_text: "",
    county: "",
    asking_price: "",
    deposit_requested: "",
    plot_size: "",
    seller_type: "unknown",
    title_status: "unknown",
    intended_use: "unknown"
  });

  // Compare form
  const [compareForm, setCompareForm] = useState({
    land_price: "1500000",
    holding_period_years: "5",
    appreciation_scenario: "neutral",
    transaction_cost_estimate: "",
    liquidity_need: ""
  });

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    Animated.timing(sheetH, {
      toValue: expanded ? EXPANDED_H : PEEK_H,
      duration: 240,
      useNativeDriver: false
    }).start();
  }, [expanded, sheetH]);

  // Pull the real indicative county market data (public endpoint).
  useEffect(() => {
    void apiClient
      .landCountyMarket()
      .then((rows) => setMarketByName(new Map(rows.map((r) => [r.name, r]))))
      .catch(() => {});
  }, [apiClient]);

  const loadList = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      setOpportunities(await apiClient.listLandOpportunities(auth));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your land checks.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, auth]);

  useEffect(() => {
    if (view === "list") void loadList();
  }, [view, loadList]);

  // When the user opens the checklist with nothing selected, surface their most
  // recent saved land check so the design's checklist screen has real data.
  useEffect(() => {
    if (view === "checklist" && !selected && auth) void loadList();
  }, [view, selected, auth, loadList]);

  async function openDetail(id: number) {
    if (!auth) return;
    setLoading(true);
    setError(null);
    setRisk(null);
    try {
      const opp = await apiClient.getLandOpportunity(id, auth);
      setSelected(opp);
      setView("detail");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this land check.");
    } finally {
      setLoading(false);
    }
  }

  async function openChecklistFor(id: number) {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const opp = await apiClient.getLandOpportunity(id, auth);
      setSelected(opp);
      setView("checklist");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this checklist.");
    } finally {
      setLoading(false);
    }
  }

  async function createOpportunity() {
    if (!auth) {
      onRequestAuth();
      return;
    }
    if (!form.title.trim() || !form.location_text.trim()) {
      setError("Add at least a title and a location.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const opp = await apiClient.createLandOpportunity(
        {
          title: form.title.trim(),
          location_text: form.location_text.trim(),
          county: form.county.trim() || undefined,
          asking_price: form.asking_price.trim() || undefined,
          deposit_requested: form.deposit_requested.trim() || undefined,
          plot_size: form.plot_size.trim() || undefined,
          seller_type: form.seller_type as never,
          title_status: form.title_status as never,
          intended_use: form.intended_use as never,
          decision_stage: "before_deposit"
        },
        auth
      );
      setSelected(opp);
      setView("checklist");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this land check.");
    } finally {
      setLoading(false);
    }
  }

  async function runRiskScore() {
    if (!auth || !selected) return;
    setLoading(true);
    try {
      const result = await apiClient.scoreLandRisk(selected.id, {}, auth);
      setRisk(result);
      setSelected((prev) => (prev ? { ...prev, risk_level: result.risk_level } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score risk.");
    } finally {
      setLoading(false);
    }
  }

  function nextStatus(status: string): string {
    // Checklist tap toggles done <-> not done (design is a binary checkbox).
    return status === "verified_by_user" || status === "reviewed_by_professional" ? "not_started" : "verified_by_user";
  }

  async function toggleItem(item: LandDueDiligenceItem) {
    if (!auth || !selected) {
      onRequestAuth();
      return;
    }
    const next = nextStatus(item.status);
    try {
      await apiClient.updateLandChecklistItem(item.id, { status: next }, auth);
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              due_diligence_items: (prev.due_diligence_items ?? []).map((i) =>
                i.id === item.id ? { ...i, status: next as never } : i
              )
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the item.");
    }
  }

  async function saveToJournal() {
    if (!auth || !selected) {
      onRequestAuth();
      return;
    }
    setNotice(null);
    try {
      await apiClient.saveLandToJournal(selected.id, "Saved my land decision reasoning.", auth);
      setNotice("Saved to your private journal.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save to journal.");
    }
  }

  async function requestReview(professionalType: string) {
    if (!auth || !selected) {
      onRequestAuth();
      return;
    }
    setNotice(null);
    try {
      await apiClient.requestLandReview(
        selected.id,
        { professional_type: professionalType, question: "Please review my land due diligence." },
        auth
      );
      setNotice(`Review requested (${label(professionalType)}). Documents stay private until you share them.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request review.");
    }
  }

  async function runComparison() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.compareLand({
        land_price: compareForm.land_price || "0",
        holding_period_years: Math.max(1, parseInt(compareForm.holding_period_years || "1", 10)),
        appreciation_scenario: compareForm.appreciation_scenario as never,
        transaction_cost_estimate: compareForm.transaction_cost_estimate || undefined,
        liquidity_need: compareForm.liquidity_need || undefined
      });
      setComparison(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run the comparison.");
    } finally {
      setLoading(false);
    }
  }

  function selectCounty(name: string) {
    setSelectedName(name);
    // Keep the map visible — show the peek card, not the full-height sheet.
    setExpanded(false);
  }

  // --- Sub-view chrome -------------------------------------------------------

  function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
    return (
      <View style={s.subHeader}>
        <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [s.backBtn, pressed && s.pressed]}>
          <Ionicons name="chevron-back" size={20} color={INK} />
        </Pressable>
        <Text style={s.subTitle}>{title}</Text>
      </View>
    );
  }

  // --- 01 / 02  MAP + COUNTY SHEET -------------------------------------------

  function renderMap() {
    return (
      <View style={s.mapBreakout}>
        <View style={[s.mapArea, { height: MAP_H }]}>
          {/* real Kenya county boundaries — drag to pan, pinch / +- to zoom */}
          <Animated.View
            style={[s.mapSvg, { transform: [{ translateX: mapPan.x }, { translateY: mapPan.y }, { scale: mapScale }] }]}
            {...mapResponder.panHandlers}
          >
            <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_PROJ.W} ${MAP_PROJ.H}`}>
              {MAP_PROJ.paths.map((p) => {
                const active = p.name === selectedName;
                return (
                  <SvgPath
                    key={p.name}
                    d={p.d}
                    fill={colorForCounty(p.name)}
                    stroke={active ? "#11110F" : "#ffffff"}
                    strokeWidth={active ? 1.6 : 0.4}
                    onPress={() => selectCounty(p.name)}
                  />
                );
              })}
              {selPath ? (
                <SvgText x={selPath.cx} y={selPath.cy} fontSize={11} fontWeight="700" fill="#11110F" textAnchor="middle">
                  {selectedName}
                </SvgText>
              ) : null}
            </Svg>
          </Animated.View>

          {/* zoom + recenter controls */}
          <View style={s.zoomControls} pointerEvents="box-none">
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => zoomMap(1.5)} style={({ pressed }) => [s.zoomBtn, pressed && s.pressed]}>
              <Ionicons name="add" size={22} color={INK} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => zoomMap(1 / 1.5)} style={({ pressed }) => [s.zoomBtn, pressed && s.pressed]}>
              <Ionicons name="remove" size={22} color={INK} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Recenter map" onPress={recenterMap} style={({ pressed }) => [s.zoomBtn, pressed && s.pressed]}>
              <Ionicons name="scan-outline" size={18} color={INK} />
            </Pressable>
          </View>

          {/* floating search bar */}
          <View style={s.mapTopBar} pointerEvents="box-none">
            <View style={s.searchPill}>
              <Ionicons name="search" size={16} color={INK3} />
              <Text style={s.searchText}>Search a county</Text>
            </View>
          </View>

          {/* metric chips */}
          <View style={s.metricRow} pointerEvents="box-none">
            {METRICS.map((m) => {
              const active = m.key === metric;
              return (
                <Pressable
                  key={m.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMetric(m.key)}
                  style={[s.metricChip, active && s.metricChipActive]}
                >
                  <Text style={[s.metricChipText, active && s.metricChipTextActive]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* bottom sheet */}
          <Animated.View style={[s.sheet, { height: sheetH }]}>
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              style={s.handleHit}
              accessibilityRole="button"
              accessibilityLabel={expanded ? "Collapse details, back to map" : "Expand county details"}
            >
              <View style={s.handle} />
              {expanded ? <Ionicons name="chevron-down" size={16} color={INK3} style={{ marginTop: 2 }} /> : null}
            </Pressable>

            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetEyebrow}>{county.region}</Text>
                <Text style={s.sheetTitle}>{county.name} County</Text>
              </View>
              {county.hotspot ? (
                <View style={s.hotspotBadge}>
                  <Text style={s.hotspotText}>Hotspot</Text>
                </View>
              ) : null}
            </View>

            {expanded ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetScroll}>
                <Text style={s.sheetSection}>Total return vs alternatives</Text>
                <View style={{ gap: 10, marginTop: 11 }}>
                  <ReturnBar name={`${county.name} land`} value={`~${county.totalReturn.land}%`} pct={Math.min(100, county.totalReturn.land * 3.6)} tone={ACCENT} strong />
                  <ReturnBar name="MMF" value={`${county.totalReturn.mmf}%`} pct={Math.min(100, county.totalReturn.mmf * 3.6)} tone="#9FCBB0" />
                  <ReturnBar name="T-bill" value={`${county.totalReturn.tbill}%`} pct={Math.min(100, county.totalReturn.tbill * 3.6)} tone="#9FCBB0" />
                </View>

                <View style={s.sheetCtaRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setView("compare")}
                    style={({ pressed }) => [s.sheetPrimary, pressed && s.pressed]}
                  >
                    <Text style={s.sheetPrimaryText}>Compare</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setView(selected ? "checklist" : auth ? "list" : "create")}
                    style={({ pressed }) => [s.sheetGhost, pressed && s.pressed]}
                  >
                    <Text style={s.sheetGhostText}>Checklist</Text>
                  </Pressable>
                </View>

                {county.sponsored?.name ? (
                  <>
                    <Text style={[s.sheetSection, { marginTop: 18 }]}>Sponsored in {county.name}</Text>
                    <View style={s.sponsorCard}>
                      <View style={s.sponsorThumb}>
                        <Ionicons name="home-outline" size={30} color="rgba(255,255,255,0.85)" />
                        <View style={s.sponsorTag}>
                          <Text style={s.sponsorTagText}>Sponsored</Text>
                        </View>
                      </View>
                      <View style={s.sponsorBody}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.sponsorName}>{county.sponsored.name}</Text>
                          <Text style={s.sponsorMeta}>{county.sponsored.meta}</Text>
                        </View>
                        <Text style={s.sponsorPrice}>{county.sponsored.price}</Text>
                      </View>
                    </View>
                  </>
                ) : null}
              </ScrollView>
            ) : (
              <View>
                <View style={s.statRow}>
                  <Stat label="Avg/acre" value={county.avgAcre} />
                  <Stat label="Apprec." value={county.appreciation} tone={ACCENT} />
                  <Stat label="Yield" value={county.yieldPct} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setExpanded(true)}
                  style={({ pressed }) => [s.sheetPrimaryFull, pressed && s.pressed]}
                >
                  <Text style={s.sheetPrimaryText}>View county details</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    );
  }

  // --- 03  CHECKLIST ---------------------------------------------------------

  function renderChecklist() {
    if (!selected) {
      return (
        <View style={s.stack}>
          <SubHeader title="Land checklist" onBack={() => setView("map")} />
          {!auth ? (
            <>
              <EmptyState title="Sign in required" body="Sign in to build and track a before-you-pay checklist for a specific plot." />
              <PrimaryButton onPress={onRequestAuth}>Sign in</PrimaryButton>
            </>
          ) : loading ? (
            <LoadingState label="Loading your land checks..." />
          ) : opportunities.length ? (
            <>
              <Text style={s.muted}>Pick a land check to open its checklist.</Text>
              {opportunities.map((opp) => (
                <Pressable key={opp.id} onPress={() => openChecklistFor(opp.id)} style={({ pressed }) => [s.pickRow, pressed && s.pressed]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickTitle}>{opp.title}</Text>
                    <Text style={s.muted}>{opp.location_text}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={INK3} />
                </Pressable>
              ))}
              <SecondaryButton onPress={() => setView("create")}>New land check</SecondaryButton>
            </>
          ) : (
            <>
              <EmptyState title="No land check yet" body="Start a land check to build a before-you-pay due-diligence checklist." />
              <PrimaryButton onPress={() => setView("create")}>Start a land check</PrimaryButton>
            </>
          )}
        </View>
      );
    }

    const items = selected.due_diligence_items ?? [];
    const done = items.filter((i) => i.status === "verified_by_user" || i.status === "reviewed_by_professional").length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;

    return (
      <View style={s.stack}>
        <SubHeader title="Land checklist" onBack={() => setView("map")} />
        <Text style={s.muted}>{selected.title}</Text>

        <View style={s.progressRow}>
          <Text style={s.progressCaption}>Before you send money</Text>
          <Text style={s.progressCount}>
            {done}/{items.length || 8}
          </Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${pct}%` }]} />
        </View>

        <View style={{ gap: 9, marginTop: 4 }}>
          {items.map((item) => {
            const checked = item.status === "verified_by_user" || item.status === "reviewed_by_professional";
            const failed = item.status === "failed";
            return (
              <Pressable
                key={item.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggleItem(item)}
                style={({ pressed }) => [s.checkItem, checked && s.checkItemDone, pressed && s.pressed]}
              >
                <View style={[s.checkBox, checked && s.checkBoxOn, failed && s.checkBoxFail]}>
                  {checked ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.checkTitleRow}>
                    <Text style={[s.checkTitle, checked && s.checkTitleDone]}>{item.title}</Text>
                    {item.importance === "critical" ? (
                      <Pill text="Critical" color={DANGER} bg={DANGER_SOFT} />
                    ) : item.importance === "high" ? (
                      <Pill text="High" color={AMBER} bg={AMBER_SOFT} />
                    ) : null}
                  </View>
                  {!checked && item.source_note ? <Text style={s.checkNote}>{item.source_note}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={s.dangerCard}>
          <Text style={s.dangerCardText}>
            PesaRoute does not verify ownership or guarantee a deal is safe. Verify with official sources (Ardhisasa /
            Ministry of Lands) and a qualified advocate before sending money.
          </Text>
        </View>

        <SecondaryButton onPress={saveToJournal}>Save reasoning to journal</SecondaryButton>
        <Text style={s.fieldLabel}>Request a verified professional</Text>
        <View style={s.chips}>
          {REVIEW_TYPES.map((t) => (
            <GoalChip key={t} label={label(t)} onPress={() => requestReview(t)} />
          ))}
        </View>
        {notice ? (
          <PremiumCard tone="success">
            <Text style={s.body}>{notice}</Text>
          </PremiumCard>
        ) : null}
        <SecondaryButton onPress={() => openDetail(selected.id)}>Open full risk view</SecondaryButton>
      </View>
    );
  }

  // --- 04  COMPARE -----------------------------------------------------------

  function renderCompare() {
    const landValue = comparison ? String((comparison.land_scenario as Record<string, unknown>).estimated_value) : null;
    return (
      <View style={s.stack}>
        <SubHeader title="Compare land" onBack={() => setView("map")} />

        <View style={s.compareCard}>
          <Text style={s.inputLabel}>Land price (KES)</Text>
          <TextInput
            style={s.input}
            value={compareForm.land_price}
            onChangeText={(t) => setCompareForm((f) => ({ ...f, land_price: t }))}
            keyboardType="numeric"
            placeholderTextColor={INK3}
          />
          <View style={s.compareInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>Years</Text>
              <TextInput
                style={s.input}
                value={compareForm.holding_period_years}
                onChangeText={(t) => setCompareForm((f) => ({ ...f, holding_period_years: t }))}
                keyboardType="numeric"
                placeholderTextColor={INK3}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>Scenario</Text>
              <View style={s.scenarioRow}>
                {SCENARIOS.map((sc) => {
                  const active = compareForm.appreciation_scenario === sc;
                  return (
                    <Pressable
                      key={sc}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setCompareForm((f) => ({ ...f, appreciation_scenario: sc }))}
                      style={[s.scenarioChip, active && s.scenarioChipActive]}
                    >
                      <Text style={[s.scenarioText, active && s.scenarioTextActive]}>{sc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        <View style={s.warnRow}>
          <Ionicons name="warning-outline" size={16} color={AMBER} />
          <Text style={s.warnText}>Appreciation not guaranteed. Land is illiquid with legal &amp; transfer costs.</Text>
        </View>

        <PrimaryButton disabled={loading} onPress={runComparison}>
          {loading ? "Comparing..." : "Compare"}
        </PrimaryButton>

        {comparison ? (
          <>
            <View style={s.resultCard}>
              <View style={s.resultHead}>
                <Text style={s.resultName}>Land</Text>
                <Pill text="liquidity: low" color={INK2} bg="#F6F5F0" border />
              </View>
              <Text style={s.resultMeta}>
                After {compareForm.holding_period_years} yr: <Text style={s.resultStrong}>KES {landValue}</Text>
              </Text>
            </View>
            <View style={s.altRow}>
              {comparison.alternatives.map((alt, idx) => (
                <View key={idx} style={s.altCard}>
                  <Text style={s.altName}>{String(alt.label)}</Text>
                  <Text style={s.altMeta}>
                    <Text style={s.resultStrong}>KES {String(alt.estimated_value)}</Text>
                  </Text>
                </View>
              ))}
            </View>
            <Text style={s.muted}>{comparison.liquidity_comparison}</Text>
            <Text style={s.muted}>{comparison.disclaimer}</Text>
          </>
        ) : null}
      </View>
    );
  }

  // --- 05  BEFORE YOU PAY ----------------------------------------------------

  function renderGuide() {
    return (
      <View style={s.stack}>
        <SubHeader title="Before you pay" onBack={() => setView("map")} />

        <View style={s.guideHero}>
          <Text style={s.guideEyebrow}>Public guide</Text>
          <Text style={s.guideHeadline}>Most land losses happen when money moves before verification.</Text>
        </View>

        <View style={{ gap: 10 }}>
          {BEFORE_YOU_PAY_STEPS.map((step, idx) => (
            <View key={idx} style={s.stepCard}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setView(selected ? "checklist" : auth ? "list" : "create")}
          style={({ pressed }) => [s.sheetPrimaryFull, pressed && s.pressed]}
        >
          <Text style={s.sheetPrimaryText}>Open the full checklist →</Text>
        </Pressable>
      </View>
    );
  }

  // --- Workflow: list / create / detail (wired, lightly reskinned) -----------

  function renderList() {
    if (!auth) {
      return (
        <View style={s.stack}>
          <SubHeader title="My land checks" onBack={() => setView("map")} />
          <EmptyState title="Sign in required" body="Sign in from the Profile tab to save and track land checks." />
          <PrimaryButton onPress={onRequestAuth}>Sign in</PrimaryButton>
        </View>
      );
    }
    return (
      <View style={s.stack}>
        <SubHeader title="My land checks" onBack={() => setView("map")} />
        <PrimaryButton onPress={() => setView("create")}>New land opportunity</PrimaryButton>
        {loading ? <LoadingState /> : null}
        {!loading && opportunities.length === 0 ? (
          <EmptyState title="No land checks yet" body="Create one to start a due-diligence checklist." />
        ) : null}
        {opportunities.map((opp) => (
          <PremiumCard key={opp.id}>
            <Text style={maliPrimeText.sectionTitle}>{opp.title}</Text>
            <Text style={s.muted}>{opp.location_text}</Text>
            <View style={s.row}>
              <RiskBadge level={opp.risk_level} />
              <TrustBadge tone="muted">{label(opp.decision_stage)}</TrustBadge>
            </View>
            <SecondaryButton onPress={() => openChecklistFor(opp.id)}>Open checklist</SecondaryButton>
          </PremiumCard>
        ))}
      </View>
    );
  }

  function selector(title: string, options: string[], value: string, onPick: (v: string) => void) {
    return (
      <View style={s.field}>
        <Text style={s.fieldLabel}>{title}</Text>
        <View style={s.chips}>
          {options.map((opt) => (
            <GoalChip key={opt} active={value === opt} label={label(opt)} onPress={() => onPick(opt)} />
          ))}
        </View>
      </View>
    );
  }

  function input(title: string, key: keyof typeof form, placeholder: string, numeric = false) {
    return (
      <View style={s.field}>
        <Text style={s.fieldLabel}>{title}</Text>
        <TextInput
          style={s.input}
          value={form[key]}
          onChangeText={(t) => setField(key, t)}
          placeholder={placeholder}
          placeholderTextColor={INK3}
          keyboardType={numeric ? "numeric" : "default"}
        />
      </View>
    );
  }

  function renderCreate() {
    return (
      <View style={s.stack}>
        <SubHeader title="New land check" onBack={() => setView(auth ? "list" : "map")} />
        <Text style={s.muted}>This is your private decision workspace. Nothing is shared unless you choose to.</Text>
        {input("Title", "title", "e.g. 2 acres in Kitengela")}
        {input("Location", "location_text", "Town, county")}
        {input("County", "county", "e.g. Kajiado")}
        {input("Asking price (KES)", "asking_price", "1500000", true)}
        {input("Deposit requested (KES)", "deposit_requested", "200000", true)}
        {input("Plot size", "plot_size", "e.g. 50x100")}
        {selector("Seller type", SELLER_TYPES, form.seller_type, (v) => setField("seller_type", v))}
        {selector("Title status", TITLE_STATUSES, form.title_status, (v) => setField("title_status", v))}
        {selector("Intended use", INTENDED_USES, form.intended_use, (v) => setField("intended_use", v))}
        <PrimaryButton disabled={loading} onPress={createOpportunity}>
          Save and build checklist
        </PrimaryButton>
      </View>
    );
  }

  function renderDetail() {
    if (!selected) return null;
    const items = selected.due_diligence_items ?? [];
    return (
      <View style={s.stack}>
        <SubHeader title={selected.title} onBack={() => setView("checklist")} />
        <Text style={s.muted}>{selected.location_text}</Text>

        <PremiumCard tone={risk && (risk.risk_level === "high" || risk.risk_level === "very_high") ? "danger" : "alt"}>
          <Text style={maliPrimeText.sectionTitle}>Visible risk</Text>
          {risk ? (
            <>
              <View style={s.row}>
                <RiskBadge level={risk.risk_level} />
              </View>
              <Text style={s.body}>{risk.summary}</Text>
              {risk.risk_flags.map((f, idx) => (
                <View key={idx} style={s.flag}>
                  <Text style={s.flagTitle}>
                    {label(f.flag_type)} · {f.severity}
                  </Text>
                  <Text style={s.body}>{f.message}</Text>
                  {f.suggested_action ? <Text style={s.muted}>→ {f.suggested_action}</Text> : null}
                </View>
              ))}
              {risk.suggested_next_steps.length ? <Text style={s.muted}>Next: {risk.suggested_next_steps[0]}</Text> : null}
            </>
          ) : (
            <Text style={s.muted}>Run the check to see visible risk based on your checklist.</Text>
          )}
          <PrimaryButton disabled={loading} onPress={runRiskScore}>
            {risk ? "Re-check risk" : "Check risk"}
          </PrimaryButton>
        </PremiumCard>

        <Text style={maliPrimeText.sectionTitle}>Due-diligence checklist</Text>
        {items.map((item) => (
          <PremiumCard key={item.id}>
            <Text style={s.body}>{item.title}</Text>
            <View style={s.row}>
              <TrustBadge
                tone={
                  item.status === "verified_by_user" || item.status === "reviewed_by_professional"
                    ? "emerald"
                    : item.status === "failed"
                      ? "danger"
                      : "muted"
                }
              >
                {label(item.status)}
              </TrustBadge>
              {item.importance === "critical" ? <TrustBadge tone="danger">critical</TrustBadge> : null}
            </View>
            <SecondaryButton onPress={() => toggleItem(item)}>Toggle done</SecondaryButton>
          </PremiumCard>
        ))}
        <SecondaryButton onPress={() => setView("checklist")}>Back to checklist</SecondaryButton>
      </View>
    );
  }

  // --- Land sub-navigation (shown under the map) -----------------------------

  function LandNav() {
    const tabs: Array<{ key: LandView; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
      { key: "map", label: "Map", icon: "map-outline" },
      { key: "checklist", label: "Checklist", icon: "checkbox-outline" },
      { key: "compare", label: "Compare", icon: "stats-chart-outline" },
      { key: "guide", label: "Before you pay", icon: "shield-checkmark-outline" }
    ];
    return (
      <View style={s.landNav}>
        {tabs.map((t) => {
          const active = view === t.key || (t.key === "checklist" && (view === "create" || view === "detail" || view === "list"));
          return (
            <Pressable
              key={t.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setView(t.key)}
              style={({ pressed }) => [s.landNavItem, active && s.landNavItemActive, pressed && s.pressed]}
            >
              <Ionicons name={t.icon} size={16} color={active ? "#FFFFFF" : INK2} />
              <Text style={[s.landNavText, active && s.landNavTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" scrollEnabled={view !== "map"}>
      {error ? <ErrorState message={error} /> : null}
      {view === "map" ? renderMap() : null}
      {view !== "map" ? <LandNav /> : null}
      {view === "checklist" && renderChecklist()}
      {view === "compare" && renderCompare()}
      {view === "guide" && renderGuide()}
      {view === "list" && renderList()}
      {view === "create" && renderCreate()}
      {view === "detail" && renderDetail()}
      {view === "map" ? <LandNav /> : null}
    </ScrollView>
  );
}

// --- small presentational helpers --------------------------------------------

function Stat({ label: l, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={s.statTile}>
      <Text style={s.statLabel}>{l}</Text>
      <Text style={[s.statValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

function ReturnBar({ name, value, pct, tone, strong }: { name: string; value: string; pct: number; tone: string; strong?: boolean }) {
  return (
    <View>
      <View style={s.returnRow}>
        <Text style={[s.returnName, strong && { color: INK }]}>{name}</Text>
        <Text style={[s.returnValue, strong && { color: ACCENT }]}>{value}</Text>
      </View>
      <View style={s.returnTrack}>
        <View style={[s.returnFill, { width: `${pct}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

function Pill({ text, color, bg, border }: { text: string; color: string; bg: string; border?: boolean }) {
  return (
    <View style={[s.pill, { backgroundColor: bg }, border ? s.pillBorder : null]}>
      <Text style={[s.pillText, { color }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: maliPrime.spacing.lg, gap: maliPrime.spacing.lg, paddingBottom: 64 },
  stack: { gap: maliPrime.spacing.md },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginVertical: 6 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pressed: { opacity: 0.82 },

  // sub-view header
  subHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: maliPrime.colors.surface,
    borderWidth: 1,
    borderColor: maliPrime.colors.border
  },
  subTitle: { fontSize: 18, fontWeight: "700", color: INK },

  // Land sub-nav
  landNav: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  landNavItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: maliPrime.colors.surface,
    borderWidth: 1,
    borderColor: maliPrime.colors.border
  },
  landNavItemActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  landNavText: { fontSize: 12.5, fontWeight: "700", color: INK2 },
  landNavTextActive: { color: "#FFFFFF" },

  // --- MAP ---
  mapBreakout: { marginHorizontal: -BREAKOUT, marginTop: -BREAKOUT },
  mapArea: { backgroundColor: MAP_BG, overflow: "hidden", position: "relative" },
  mapSvg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  zoomControls: { position: "absolute", right: 14, top: 110, gap: 8, zIndex: 4 },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(17,17,15,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  landmass: {
    position: "absolute",
    left: "14%",
    right: "12%",
    top: "16%",
    bottom: "12%",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(17,17,15,0.12)",
    borderWidth: 1.5,
    borderRadius: 140,
    transform: [{ rotate: "-8deg" }]
  },
  marker: { position: "absolute", alignItems: "center", justifyContent: "center" },
  markerLabel: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },

  mapTopBar: { position: "absolute", top: 12, left: 16, right: 16, zIndex: 3 },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#11110F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3
  },
  searchText: { color: INK3, fontSize: 13 },

  metricRow: { position: "absolute", top: 64, left: 16, flexDirection: "row", gap: 6, zIndex: 3 },
  metricChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    shadowColor: "#11110F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2
  },
  metricChipActive: { backgroundColor: ACCENT },
  metricChipText: { fontSize: 11.5, fontWeight: "700", color: INK2 },
  metricChipTextActive: { color: "#FFFFFF" },

  // bottom sheet
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: "#11110F",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 12
  },
  handleHit: { alignItems: "center", paddingTop: 8, paddingBottom: 6 },
  handle: { width: 38, height: 4, borderRadius: 999, backgroundColor: "#D9D5CC", marginBottom: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetEyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: INK3 },
  sheetTitle: { fontSize: 19, fontWeight: "700", color: INK, marginTop: 3 },
  hotspotBadge: { backgroundColor: AMBER_SOFT, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
  hotspotText: { fontSize: 11, fontWeight: "700", color: AMBER },
  sheetScroll: { paddingBottom: 24 },
  sheetSection: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", color: INK3, marginTop: 18 },

  statRow: { flexDirection: "row", gap: 9, marginTop: 14 },
  statTile: { flex: 1, backgroundColor: "#F6F5F0", borderRadius: 12, padding: 11 },
  statLabel: { fontSize: 10, fontWeight: "700", color: INK3 },
  statValue: { fontSize: 15, fontWeight: "800", color: INK, marginTop: 4 },

  returnRow: { flexDirection: "row", justifyContent: "space-between" },
  returnName: { fontSize: 12.5, fontWeight: "700", color: INK2 },
  returnValue: { fontSize: 12.5, fontWeight: "800", color: INK },
  returnTrack: { height: 8, borderRadius: 999, backgroundColor: TRACK, marginTop: 6, overflow: "hidden" },
  returnFill: { height: "100%", borderRadius: 999 },

  sheetCtaRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  sheetPrimary: { flex: 1, alignItems: "center", backgroundColor: ACCENT, borderRadius: 999, paddingVertical: 12 },
  sheetPrimaryFull: { alignItems: "center", backgroundColor: ACCENT, borderRadius: 999, paddingVertical: 14, marginTop: 14 },
  sheetPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  sheetGhost: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: maliPrime.colors.border,
    borderRadius: 999,
    paddingVertical: 12
  },
  sheetGhostText: { color: INK, fontSize: 14, fontWeight: "700" },

  // sponsored
  sponsorCard: { borderWidth: 1, borderColor: maliPrime.colors.border, borderRadius: 14, overflow: "hidden", marginTop: 10 },
  sponsorThumb: { height: 90, backgroundColor: "#3E5A47", alignItems: "center", justifyContent: "center" },
  sponsorTag: { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(17,17,15,0.55)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sponsorTagText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", color: "#FFFFFF" },
  sponsorBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, gap: 10 },
  sponsorName: { fontSize: 14, fontWeight: "700", color: INK },
  sponsorMeta: { fontSize: 11, color: INK2, marginTop: 2 },
  sponsorPrice: { fontSize: 13, fontWeight: "800", color: INK },

  // --- CHECKLIST ---
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressCaption: { fontSize: 13, color: INK2 },
  progressCount: { fontSize: 22, fontWeight: "800", color: ACCENT },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: TRACK, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: ACCENT, borderRadius: 999 },
  checkItem: {
    flexDirection: "row",
    gap: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: maliPrime.colors.border,
    borderRadius: 13,
    padding: 13
  },
  checkItemDone: { borderColor: "rgba(31,158,99,0.35)" },
  checkBox: {
    width: 21,
    height: 21,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(17,17,15,0.25)",
    alignItems: "center",
    justifyContent: "center"
  },
  checkBoxOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkBoxFail: { borderColor: DANGER },
  checkTitleRow: { flexDirection: "row", gap: 7, alignItems: "center", flexWrap: "wrap" },
  checkTitle: { fontSize: 13.5, fontWeight: "600", color: INK },
  checkTitleDone: { color: INK3, textDecorationLine: "line-through" },
  checkNote: { fontSize: 12, color: INK2, marginTop: 6, lineHeight: 17 },

  dangerCard: { backgroundColor: "#FBF7EF", borderWidth: 1, borderColor: "rgba(141,106,46,0.2)", borderRadius: 12, padding: 13 },
  dangerCardText: { fontSize: 12, color: INK2, lineHeight: 18 },

  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: maliPrime.colors.border,
    borderRadius: 13,
    padding: 14
  },
  pickTitle: { fontSize: 14, fontWeight: "700", color: INK },

  // --- COMPARE ---
  compareCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: maliPrime.colors.border, borderRadius: 16, padding: 16 },
  compareInputRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  inputLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", color: INK3 },
  input: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.borderStrong,
    borderRadius: 10,
    borderWidth: 1,
    color: INK,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 7
  },
  scenarioRow: { flexDirection: "row", gap: 6, marginTop: 7, flexWrap: "wrap" },
  scenarioChip: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: maliPrime.colors.border,
    backgroundColor: "#FFFFFF"
  },
  scenarioChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  scenarioText: { fontSize: 13, fontWeight: "700", color: INK2, textTransform: "capitalize" },
  scenarioTextActive: { color: "#FFFFFF" },

  warnRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#FBF7EF",
    borderWidth: 1,
    borderColor: "rgba(141,106,46,0.2)",
    borderRadius: 12,
    padding: 12
  },
  warnText: { flex: 1, fontSize: 11.5, lineHeight: 17, color: INK2 },

  resultCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: maliPrime.colors.border, borderRadius: 16, padding: 15 },
  resultHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultName: { fontSize: 14, fontWeight: "700", color: INK },
  resultMeta: { fontSize: 12.5, color: INK2, marginTop: 9 },
  resultStrong: { color: INK, fontWeight: "800", fontSize: 15 },
  altRow: { flexDirection: "row", gap: 10 },
  altCard: { flex: 1, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: maliPrime.colors.border, borderRadius: 14, padding: 13 },
  altName: { fontSize: 12, fontWeight: "700", color: INK },
  altMeta: { fontSize: 13, color: INK2, marginTop: 6 },

  // --- GUIDE ---
  guideHero: { backgroundColor: SURFACE_INK, borderRadius: 18, padding: 16 },
  guideEyebrow: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(237,241,248,0.55)" },
  guideHeadline: { fontSize: 16, fontWeight: "700", color: "#EDF1F8", marginTop: 7, lineHeight: 21 },
  stepCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: maliPrime.colors.border,
    borderRadius: 14,
    padding: 14
  },
  stepNum: { width: 26, height: 26, borderRadius: 999, backgroundColor: ACCENT_SOFT, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 12, fontWeight: "800", color: ACCENT },
  stepTitle: { fontSize: 13.5, fontWeight: "700", color: INK },
  stepBody: { fontSize: 12, color: INK2, marginTop: 4, lineHeight: 17 },

  // shared text
  body: { color: INK, fontSize: 14, lineHeight: 21 },
  muted: { color: INK2, fontSize: 13, lineHeight: 19 },
  field: { gap: 6 },
  fieldLabel: { color: INK3, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  flag: { borderTopColor: maliPrime.colors.border, borderTopWidth: 1, paddingVertical: 8, gap: 2 },
  flagTitle: { color: INK, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },

  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillBorder: { borderWidth: 1, borderColor: "rgba(17,17,15,0.08)" },
  pillText: { fontSize: 9.5, fontWeight: "800", textTransform: "uppercase" }
});
