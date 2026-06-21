"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getLandCountyMarket, type CountyMarket } from "../../lib/api";

// Real Kenya county/subcounty boundaries (geoBoundaries ADM1/ADM2, CC BY 4.0)
// live in /public/geo; indicative market metrics come from /api/land/county-market/.
type Geom = { type: string; coordinates: number[][][] | number[][][][] };
type Feature = { properties: { name: string; county?: string }; geometry: Geom };
type FC = { features: Feature[] };

const SCALE = ["#D6E7DC", "#9FCBB0", "#5FAE81", "#2E8659", "#1A6B45"];
const ACCENT = "#1A6B45";
const fmtPrice = (m: number) => (m >= 1 ? `KES ${m % 1 === 0 ? m : m.toFixed(1)}M` : `KES ${Math.round(m * 1000)}k`);

const TIER_CLS: Record<string, string> = {
  Prime: "bg-violet/[0.14] text-violet",
  Hotspot: "bg-amber/[0.14] text-amber",
  Stable: "bg-surfaceSubtle text-textSecondary",
  Emerging: "bg-primary/10 text-primary"
};

const listingGradient = (kind: string) =>
  /apartment|residence|flat|house|home/i.test(kind) ? "linear-gradient(135deg,#42566E,#7188A3)" : "linear-gradient(135deg,#3E5A47,#6B8E76)";
const fmtKesM = (full: number) =>
  full >= 1_000_000 ? `KES ${(full / 1_000_000).toFixed(full % 1_000_000 === 0 ? 0 : 1)}M` : full >= 1000 ? `KES ${Math.round(full / 1000)}k` : `KES ${Math.round(full)}`;

type Metric = "price" | "apprec" | "yield";
type Tab = "insights" | "listings" | "advertise";
type Projector = (lng: number, lat: number) => [number, number];

function ringsOf(g: Geom): number[][][] {
  if (g.type === "Polygon") return g.coordinates as number[][][];
  if (g.type === "MultiPolygon") return (g.coordinates as number[][][][]).flat();
  return [];
}
function geomToPath(g: Geom, project: Projector): string {
  let d = "";
  for (const ring of ringsOf(g)) {
    d += "M" + ring.map((pt) => { const [x, y] = project(pt[0], pt[1]); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join("L") + "Z";
  }
  return d;
}
function geomCentroid(g: Geom, project: Projector): [number, number] {
  let sx = 0, sy = 0, n = 0;
  for (const ring of ringsOf(g)) for (const pt of ring) { const [x, y] = project(pt[0], pt[1]); sx += x; sy += y; n++; }
  return n ? [sx / n, sy / n] : [0, 0];
}
function buildProjection(features: Feature[]) {
  if (!features.length) return { paths: [] as Array<{ name: string; d: string; cx: number; cy: number }>, W: 700, H: 760, project: null as Projector | null };
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of features) for (const ring of ringsOf(f.geometry)) for (const pt of ring) {
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
  const project: Projector = (lng, lat) => [((lng - minLng) * cosL) / lngSpan * W, ((maxLat - lat) / latSpan) * H];
  const paths = features.map((f) => {
    const [cx, cy] = geomCentroid(f.geometry, project);
    return { name: f.properties.name, d: geomToPath(f.geometry, project), cx, cy };
  });
  return { paths, W, H, project };
}

export default function LandExplorePage() {
  const [geo, setGeo] = useState<FC | null>(null);
  const [subGeo, setSubGeo] = useState<FC | null>(null);
  const [metrics, setMetrics] = useState<CountyMarket[]>([]);
  const [metric, setMetric] = useState<Metric>("price");
  const [selectedName, setSelectedName] = useState("Kiambu");
  const [tab, setTab] = useState<Tab>("insights");

  useEffect(() => {
    void fetch("/geo/kenya-counties.geojson").then((r) => r.json()).then(setGeo).catch(() => {});
    void getLandCountyMarket().then(setMetrics).catch(() => {});
  }, []);

  // Lazy-load subcounty boundaries the first time a county is opened.
  useEffect(() => {
    if (!subGeo) void fetch("/geo/kenya-subcounties.geojson").then((r) => r.json()).then(setSubGeo).catch(() => {});
  }, [subGeo]);

  const proj = useMemo(() => buildProjection(geo?.features ?? []), [geo]);
  const byName = useMemo(() => new Map(metrics.map((m) => [m.name, m])), [metrics]);

  const metricVal = (m: CountyMarket | undefined) =>
    !m ? null : metric === "price" ? Number(m.avg_price_per_acre) : metric === "apprec" ? Number(m.appreciation_pct) : Number(m.rental_yield_pct);
  const { lo, hi } = useMemo(() => {
    const vals = metrics.map((m) => metricVal(m)).filter((v): v is number => v != null);
    return vals.length ? { lo: Math.min(...vals), hi: Math.max(...vals) } : { lo: 0, hi: 1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, metric]);
  const colorFor = (v: number | null) => {
    if (v == null) return "#E7E5DF";
    const t = hi === lo ? 1 : (v - lo) / (hi - lo);
    return SCALE[Math.min(SCALE.length - 1, Math.floor(t * SCALE.length))];
  };

  const subPaths = useMemo(() => {
    if (!subGeo || !proj.project) return [] as string[];
    const p = proj.project;
    return subGeo.features.filter((f) => f.properties.county === selectedName).map((f) => geomToPath(f.geometry, p));
  }, [subGeo, selectedName, proj]);

  const sel = byName.get(selectedName);
  const subcounties = sel?.subcounties ?? [];
  const price = sel ? Number(sel.avg_price_per_acre) : 0;
  const apprec = sel ? Number(sel.appreciation_pct) : 0;
  const yld = sel ? Number(sel.rental_yield_pct) : 0;
  const landTotal = Math.round((apprec + yld) * 10) / 10;
  const maxBar = 28;
  const barW = (v: number) => `${Math.min(100, (v / maxBar) * 100)}%`;
  const listings = sel?.listings ?? [];

  const legend =
    metric === "price"
      ? { title: "Average price / acre", low: fmtPrice(lo), high: fmtPrice(hi) }
      : metric === "apprec"
        ? { title: "Annual appreciation", low: `${lo}%`, high: `${hi}%` }
        : { title: "Gross rental yield", low: `${lo}%`, high: `${hi}%` };

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col lg:block">
      {/* MAP STAGE */}
      <div className="relative h-[58vh] w-full overflow-hidden bg-[#EAF1EA] lg:h-[calc(100vh-3.5rem)]">
        {proj.project ? (
          <svg viewBox={`0 0 ${proj.W} ${proj.H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 block h-full w-full">
            {proj.paths.map((c) => {
              const active = c.name === selectedName;
              return (
                <path
                  key={c.name}
                  d={c.d}
                  fill={colorFor(metricVal(byName.get(c.name)))}
                  stroke={active ? "#11110F" : "#ffffff"}
                  strokeWidth={active ? 2 : 0.7}
                  className="cursor-pointer transition-[filter] hover:brightness-95"
                  onClick={() => setSelectedName(c.name)}
                >
                  <title>{c.name}</title>
                </path>
              );
            })}
            {/* selected county subcounty boundaries */}
            {subPaths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="rgba(17,17,15,0.45)" strokeWidth="0.6" strokeDasharray="2 2" pointerEvents="none" />
            ))}
            {/* county labels */}
            {proj.paths.map((c) => (
              <text
                key={`${c.name}-l`}
                x={c.cx}
                y={c.cy}
                fontSize={c.name === selectedName ? 12 : 8.5}
                fontWeight={c.name === selectedName ? 700 : 500}
                fill={c.name === selectedName ? "#11110F" : "rgba(17,17,15,0.6)"}
                textAnchor="middle"
                className="pointer-events-none"
              >
                {c.name}
              </text>
            ))}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#5B5A55]">Loading the map of Kenya…</div>
        )}

        {/* breadcrumb + title + metric toggle */}
        <div className="absolute left-4 top-4 max-w-[330px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(17,17,15,0.1)] bg-white/95 px-3 py-1.5 text-xs">
            <span className="text-[#85827A]">Kenya</span>
            <span className="text-[#C5C1B8]">›</span>
            <span className="font-semibold text-[#11110F]">{selectedName}</span>
          </div>
          <h1 className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-[#11110F] [text-shadow:0_1px_2px_rgba(234,241,234,0.9)]">Where does land make sense?</h1>
          <div className="mt-3 inline-flex gap-1 rounded-full border border-[rgba(17,17,15,0.1)] bg-white p-1 shadow-[0_2px_10px_rgba(17,17,15,0.06)]">
            {([["price", "Avg price"], ["apprec", "Appreciation"], ["yield", "Rental yield"]] as Array<[Metric, string]>).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMetric(k)} className={`rounded-full px-3 py-[7px] text-xs font-semibold transition ${metric === k ? "text-white" : "text-[#5B5A55]"}`} style={metric === k ? { background: ACCENT } : undefined}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* legend */}
        <div className="absolute bottom-4 left-4 hidden rounded-xl border border-[rgba(17,17,15,0.1)] bg-white/95 px-3 py-2.5 sm:block">
          <p className="text-[11px] font-semibold text-[#85827A]">{legend.title}</p>
          <div className="mt-2 flex">
            {SCALE.map((c, i) => (
              <span key={c} className="h-2.5 w-6" style={{ background: c, borderRadius: i === 0 ? "3px 0 0 3px" : i === SCALE.length - 1 ? "0 3px 3px 0" : 0 }} />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between gap-6">
            <span className="text-[10px] text-[#85827A]">{legend.low}</span>
            <span className="text-[10px] text-[#85827A]">{legend.high}</span>
          </div>
        </div>
      </div>

      {/* FLOATING PANEL */}
      <div className="flex flex-col overflow-hidden border-t border-border bg-surface lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:w-[372px] lg:rounded-[18px] lg:border lg:border-border lg:shadow-[0_20px_50px_rgba(17,17,15,0.16)]">
        <div className="px-5 pt-[18px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-textTertiary">{sel?.region ?? "Kenya"}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.015em] text-textPrimary">{selectedName} County</h2>
            </div>
            {sel ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TIER_CLS[sel.tier] ?? "bg-surfaceSubtle text-textSecondary"}`}>{sel.tier}</span> : null}
          </div>
          <div className="mt-4 flex gap-[18px] border-b border-border">
            {([["insights", "Insights"], ["listings", "Listings"], ["advertise", "Advertise"]] as Array<[Tab, string]>).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`-mb-px border-b-2 pb-3 text-[13.5px] font-semibold transition ${tab === k ? "border-primary text-textPrimary" : "border-transparent text-textTertiary"}`}>
                {label}
                {k === "listings" ? <span className="ml-1 text-[11px] font-bold text-amber">{listings.length}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-[18px]">
          {tab === "insights" ? (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <Tile label="Avg / acre" value={fmtPrice(price)} />
                <Tile label="Appreciation" value={`+${apprec}%`} accent />
                <Tile label="Rental yield" value={`${yld}%`} />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Indicative total return vs alternatives</p>
              <div className="mt-3 flex flex-col gap-3">
                <Bar name={`${selectedName} land`} value={`~${landTotal}%`} width={barW(landTotal)} strong note="Appreciation + rental, before costs & illiquidity" />
                <Bar name="Money Market Fund" value="11.8%" width={barW(11.8)} tone="#9FCBB0" />
                <Bar name="91-day T-bill" value="16.0%" width={barW(16)} tone="#9FCBB0" />
              </div>
              <div className="mt-3.5 flex gap-2.5 rounded-xl border border-amber/20 bg-amber/[0.08] p-3">
                <span className="flex-none text-amber"><Warn /></span>
                <p className="text-xs leading-[1.5] text-textSecondary">
                  Land is <strong className="text-textPrimary">illiquid</strong> and carries legal, survey, and transfer costs. High headline returns are not directly comparable to liquid funds.
                </p>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Subcounties</p>
              <div className="mt-2 flex flex-col">
                {subcounties.length === 0 ? (
                  <p className="py-2 text-[13px] text-textTertiary">No subcounty data for this county yet.</p>
                ) : (
                  subcounties.map((s, i) => (
                    <div key={s.name} className={`flex items-center justify-between py-2.5 ${i < subcounties.length - 1 ? "border-b border-border" : ""}`}>
                      <span className="text-[13.5px] font-medium text-textPrimary">{s.name}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-[13px] font-semibold text-textPrimary">{fmtPrice(Number(s.avg_price_per_acre))}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">+{Number(s.appreciation_pct)}%</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-[18px] flex gap-2.5">
                <Link href="/land/compare" className="flex-1 rounded-full bg-primary py-2.5 text-center text-[13.5px] font-semibold text-white transition hover:bg-primaryDark">Compare in simulator</Link>
                <Link href="/land/checklist" className="flex-none rounded-full border border-border bg-surface px-4 py-2.5 text-center text-[13.5px] font-semibold text-textPrimary transition hover:bg-surfaceSubtle">Checklist</Link>
              </div>
            </>
          ) : tab === "listings" ? (
            <>
              <p className="mb-3.5 text-[12.5px] leading-[1.5] text-textSecondary">
                Developments advertised in <strong className="text-textPrimary">{selectedName}</strong>. Sponsored, PesaRoute does not endorse listings; verify independently.
              </p>
              {listings.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surfaceSubtle p-6 text-center">
                  <p className="text-sm font-semibold text-textPrimary">No sponsored listings in {selectedName} yet</p>
                  <p className="mt-1.5 text-[13px] leading-[1.5] text-textSecondary">When a verified developer advertises here, it appears, clearly tagged Sponsored.</p>
                </div>
              ) : (
                listings.map((l) => (
                  <div key={l.id} className="pr-card-hover mb-3 overflow-hidden rounded-2xl border border-border">
                    <div className="relative flex h-[118px] items-center justify-center" style={{ background: listingGradient(l.kind) }}>
                      <Home />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.04em] text-white">Sponsored</span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2.5">
                        <div>
                          <p className="text-[15px] font-semibold text-textPrimary">{l.name}</p>
                          <p className="mt-0.5 text-xs text-textSecondary">{l.kind} · {l.place}</p>
                        </div>
                        <p className="flex-none text-sm font-bold text-textPrimary">{fmtKesM(Number(l.price_kes))}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {l.tag1 ? <span className="rounded-full bg-primary/10 px-2.5 py-[3px] text-[11px] font-semibold text-primary">{l.tag1}</span> : null}
                        {l.tag2 ? <span className="rounded-full border border-border bg-surfaceSubtle px-2.5 py-[3px] text-[11px] font-semibold text-textSecondary">{l.tag2}</span> : null}
                        {l.advertiser ? <span className="rounded-full border border-border bg-surfaceSubtle px-2.5 py-[3px] text-[11px] font-semibold text-textSecondary">{l.advertiser}</span> : null}
                      </div>
                      <div className="mt-3.5 flex gap-2">
                        {l.listing_url ? (
                          <a href={l.listing_url} target="_blank" rel="noreferrer" className="flex-1 rounded-full bg-primary py-2.5 text-center text-[13px] font-semibold text-white transition hover:bg-primaryDark">
                            View listing
                          </a>
                        ) : (
                          <span className="flex-1 cursor-default rounded-full bg-primary py-2.5 text-center text-[13px] font-semibold text-white">View listing</span>
                        )}
                        <Link href="/land/compare" className="flex-none rounded-full border border-border bg-surface px-3.5 py-2.5 text-center text-[13px] font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
                          Compare
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <p className="mt-1.5 text-[11.5px] leading-[1.5] text-textTertiary">Listings are clearly separated from neutral county data and never reorder the map.</p>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-bannerBg p-[18px] text-bannerText">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-bannerMuted">For developers &amp; agents</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em]">Reach buyers at the moment of decision.</h3>
                <p className="mt-2 text-[13px] leading-[1.55] text-bannerMuted">Place your plots or apartments in front of users actively comparing land in your county.</p>
                <div className="mt-3.5 flex gap-[18px]">
                  <div><p className="text-xl font-bold text-accent">14k</p><p className="mt-0.5 text-[11px] text-bannerMuted">monthly land searches</p></div>
                  <div><p className="text-xl font-bold text-accent">In-context</p><p className="mt-0.5 text-[11px] text-bannerMuted">shown by county</p></div>
                </div>
              </div>
              <p className="mt-[18px] text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">How it works</p>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {[
                  ["Verify your business", "Submit KRA PIN, registration, and title proof for listed plots."],
                  ["Create a listing", "Add location, price, photos, and yield, we tag it Sponsored."],
                  ["Target by county", "Pay per county placement; pause anytime."]
                ].map(([title, body], i) => (
                  <div key={title} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <div>
                      <p className="text-[13.5px] font-semibold text-textPrimary">{title}</p>
                      <p className="mt-0.5 text-xs leading-[1.45] text-textSecondary">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-border p-3.5">
                <p className="text-xs font-semibold text-textTertiary">Placement</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">Land · {selectedName}</span>
                  <span className="rounded-full border border-border bg-surfaceSubtle px-3 py-1.5 text-xs font-semibold text-textSecondary">Apartments</span>
                  <span className="rounded-full border border-border bg-surfaceSubtle px-3 py-1.5 text-xs font-semibold text-textSecondary">+ add county</span>
                </div>
                <div className="mt-3.5 flex items-center justify-between">
                  <span className="text-xs text-textTertiary">Est. from</span>
                  <span className="text-lg font-bold text-textPrimary">KES 4,500<span className="text-xs font-medium text-textTertiary">/mo</span></span>
                </div>
              </div>
              <button type="button" className="mt-3.5 w-full rounded-full bg-primary py-3 text-center text-sm font-semibold text-white transition hover:bg-primaryDark">Become a partner →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[14px] bg-surfaceSubtle p-3">
      <p className="text-[11px] font-semibold text-textTertiary">{label}</p>
      <p className={`mt-1.5 text-base font-bold tracking-[-0.01em] ${accent ? "text-primary" : "text-textPrimary"}`}>{value}</p>
    </div>
  );
}
function Bar({ name, value, width, tone = ACCENT, strong, note }: { name: string; value: string; width: string; tone?: string; strong?: boolean; note?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[12.5px]">
        <span className={`font-semibold ${strong ? "text-textPrimary" : "text-textSecondary"}`}>{name}</span>
        <span className={`font-bold ${strong ? "text-primary" : "text-textPrimary"}`}>{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surfaceSubtle">
        <div className="h-full rounded-full" style={{ width, background: tone }} />
      </div>
      {note ? <p className="mt-1.5 text-[10.5px] text-textTertiary">{note}</p> : null}
    </div>
  );
}
function Warn() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 9v4M12 17h0" />
      <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}
function Home() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11l9-7 9 7M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
