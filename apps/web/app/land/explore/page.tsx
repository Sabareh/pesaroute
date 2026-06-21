"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// TODO(api): replace with a county land-market endpoint. Indicative learning
// averages only (price = KES millions/acre, appreciation/yield = %/yr).
type County = {
  id: string;
  name: string;
  region: string;
  cx: number;
  cy: number;
  price: number;
  apprec: number;
  yield: number;
  tier: "Prime" | "Hotspot" | "Stable" | "Emerging";
};
const COUNTIES: County[] = [
  { id: "eldoret", name: "Uasin Gishu", region: "Rift Valley", cx: 240, cy: 290, price: 3.5, apprec: 10, yield: 5.5, tier: "Emerging" },
  { id: "kisumu", name: "Kisumu", region: "Nyanza", cx: 205, cy: 385, price: 4.0, apprec: 9, yield: 7.0, tier: "Emerging" },
  { id: "nakuru", name: "Nakuru", region: "Rift Valley", cx: 270, cy: 355, price: 4.5, apprec: 13, yield: 6.5, tier: "Hotspot" },
  { id: "nyeri", name: "Nyeri", region: "Central", cx: 335, cy: 325, price: 5.0, apprec: 8, yield: 5.0, tier: "Stable" },
  { id: "meru", name: "Meru", region: "Eastern", cx: 395, cy: 300, price: 2.5, apprec: 9, yield: 4.0, tier: "Emerging" },
  { id: "kiambu", name: "Kiambu", region: "Central", cx: 315, cy: 360, price: 18, apprec: 12, yield: 6.0, tier: "Hotspot" },
  { id: "nairobi", name: "Nairobi", region: "Nairobi Metro", cx: 332, cy: 398, price: 45, apprec: 6, yield: 5.5, tier: "Prime" },
  { id: "machakos", name: "Machakos", region: "Eastern", cx: 378, cy: 405, price: 6, apprec: 11, yield: 5.0, tier: "Hotspot" },
  { id: "kajiado", name: "Kajiado", region: "Rift Valley", cx: 305, cy: 442, price: 9, apprec: 15, yield: 4.5, tier: "Hotspot" },
  { id: "kilifi", name: "Kilifi", region: "Coast", cx: 425, cy: 432, price: 8, apprec: 14, yield: 9.0, tier: "Hotspot" },
  { id: "mombasa", name: "Mombasa", region: "Coast", cx: 442, cy: 478, price: 30, apprec: 7, yield: 8.0, tier: "Prime" }
];
const SUBS: Record<string, Array<[string, number, number]>> = {
  nairobi: [["Karen", 95, 5], ["Westlands", 180, 4], ["Embakasi", 38, 7], ["Ruai", 14, 11]],
  kiambu: [["Tilisi / Limuru", 24, 13], ["Ruiru", 16, 14], ["Thika", 11, 12], ["Juja", 9, 13]],
  kajiado: [["Kitengela", 12, 16], ["Ngong", 14, 13], ["Isinya", 6, 18], ["Kajiado town", 4, 15]],
  mombasa: [["Nyali", 42, 6], ["Bamburi", 22, 8], ["Likoni", 14, 9], ["Mtwapa", 18, 11]],
  kilifi: [["Kilifi town", 7, 13], ["Watamu", 12, 16], ["Malindi", 9, 12], ["Mtwapa", 10, 15]],
  nakuru: [["Nakuru East", 6, 12], ["Naivasha", 7, 16], ["Gilgil", 4, 13], ["Njoro", 3, 11]]
};
type Listing = { name: string; kind: string; place: string; price: string; tag1: string; tag2: string; img: string };
const LISTINGS: Record<string, Listing[]> = {
  kiambu: [
    { name: "Tilisi Gardens", kind: "Serviced plots", place: "Limuru, Kiambu", price: "KES 4.9M", tag1: "Title ready", tag2: "1/8 acre", img: "linear-gradient(135deg,#3E5A47,#6B8E76)" },
    { name: "Tatu City Residences", kind: "Apartments", place: "Ruiru, Kiambu", price: "KES 6.8M", tag1: "8% est. yield", tag2: "2-bed", img: "linear-gradient(135deg,#42566E,#7188A3)" }
  ],
  _default: [
    { name: "Greenpark Estate", kind: "Serviced plots", place: "Eastern bypass", price: "KES 2.4M", tag1: "Title ready", tag2: "50×100", img: "linear-gradient(135deg,#3E5A47,#6B8E76)" },
    { name: "Coastline Apartments", kind: "Apartments", place: "Beachfront", price: "KES 9.5M", tag1: "9% est. yield", tag2: "Furnished", img: "linear-gradient(135deg,#42566E,#7188A3)" }
  ]
};

const SCALE = ["#D6E7DC", "#9FCBB0", "#5FAE81", "#2E8659", "#1A6B45"];
const ACCENT = "#1A6B45";
const fmtPrice = (m: number) => (m >= 1 ? `KES ${m % 1 === 0 ? m : m.toFixed(1)}M` : `KES ${Math.round(m * 1000)}k`);

type Metric = "price" | "apprec" | "yield";
type Tab = "insights" | "listings" | "advertise";

const TIER_CLS: Record<County["tier"], string> = {
  Prime: "bg-violet/[0.14] text-violet",
  Hotspot: "bg-amber/[0.14] text-amber",
  Stable: "bg-surfaceSubtle text-textSecondary",
  Emerging: "bg-primary/10 text-primary"
};
const tierClass = (t: County["tier"]) => TIER_CLS[t];

export default function LandExplorePage() {
  const [metric, setMetric] = useState<Metric>("price");
  const [selectedId, setSelectedId] = useState("kiambu");
  const [tab, setTab] = useState<Tab>("insights");

  const metricVal = (c: County) => (metric === "price" ? c.price : metric === "apprec" ? c.apprec : c.yield);
  const { lo, hi } = useMemo(() => {
    const vals = COUNTIES.map(metricVal);
    return { lo: Math.min(...vals), hi: Math.max(...vals) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric]);
  const colorFor = (v: number) => {
    const t = hi === lo ? 1 : (v - lo) / (hi - lo);
    return SCALE[Math.min(SCALE.length - 1, Math.floor(t * SCALE.length))];
  };

  const sel = COUNTIES.find((c) => c.id === selectedId) ?? COUNTIES[0];
  const subsRaw = SUBS[sel.id] ?? [
    ["Town centre", Math.round(sel.price * 0.6 * 10) / 10, sel.apprec + 1],
    ["Outskirts", Math.round(sel.price * 0.35 * 10) / 10, sel.apprec + 2],
    ["Rural belt", Math.round(sel.price * 0.2 * 10) / 10, sel.apprec]
  ];
  const listings = LISTINGS[sel.id] ?? LISTINGS._default;
  const landTotal = sel.apprec + sel.yield;
  const maxBar = 28;
  const barW = (v: number) => `${Math.min(100, (v / maxBar) * 100)}%`;

  const legend =
    metric === "price"
      ? { title: "Average price / acre", low: fmtPrice(lo), high: fmtPrice(hi) }
      : metric === "apprec"
        ? { title: "Annual appreciation", low: `${lo}%`, high: `${hi}%` }
        : { title: "Gross rental yield", low: `${lo}%`, high: `${hi}%` };

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col lg:block">
      {/* MAP STAGE */}
      <div className="relative h-[58vh] w-full overflow-hidden bg-[#E7EEE7] lg:h-[calc(100vh-3.5rem)]">
        <svg width="100%" height="100%" viewBox="0 0 560 540" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 block">
          <defs>
            <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(17,17,15,0.05)" />
            </pattern>
          </defs>
          <rect x="-200" y="-200" width="960" height="940" fill="url(#dots)" />
          <path
            d="M250,60 C300,45 360,55 410,52 C470,50 520,90 540,150 C548,180 520,210 515,250 C510,300 470,340 450,380 C435,415 470,470 455,500 C448,515 420,505 395,495 C350,478 300,470 255,460 C215,452 185,440 170,470 C160,452 150,430 165,410 C150,400 140,380 150,360 C148,320 152,280 150,240 C150,200 160,160 175,120 C195,95 220,75 250,60 Z"
            fill="rgba(255,255,255,0.55)"
            stroke="rgba(17,17,15,0.18)"
            strokeWidth="1.5"
          />
          <path d="M150,400 C140,410 142,430 158,438 C172,444 184,432 182,418 C180,404 164,396 150,400 Z" fill="#BBD7E8" stroke="rgba(17,17,15,0.12)" strokeWidth="1" />
          <text x="150" y="424" fontSize="9" fill="#5B7E92" textAnchor="middle">L. Victoria</text>
          {COUNTIES.map((c) => {
            const active = c.id === selectedId;
            return (
              <circle
                key={c.id}
                cx={c.cx}
                cy={c.cy}
                r={active ? 26 : 21}
                fill={colorFor(metricVal(c))}
                stroke={active ? "#11110F" : "#ffffff"}
                strokeWidth={active ? 3 : 2}
                className="cursor-pointer transition-[filter] hover:brightness-95"
                onClick={() => setSelectedId(c.id)}
              />
            );
          })}
          {COUNTIES.map((c) => (
            <text key={`${c.id}-l`} x={c.cx} y={c.cy + (c.id === selectedId ? 40 : 35)} fontSize="9.5" fontWeight="600" fill="#3A3A36" textAnchor="middle" className="pointer-events-none">
              {c.name}
            </text>
          ))}
        </svg>

        {/* breadcrumb + title + metric toggle */}
        <div className="absolute left-4 top-4 max-w-[330px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(17,17,15,0.1)] bg-white/95 px-3 py-1.5 text-xs">
            <span className="text-[#85827A]">Kenya</span>
            <span className="text-[#C5C1B8]">›</span>
            <span className="font-semibold text-[#11110F]">{sel.name}</span>
          </div>
          <h1 className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-[#11110F] [text-shadow:0_1px_2px_rgba(231,238,231,0.8)]">Where does land make sense?</h1>
          <div className="mt-3 inline-flex gap-1 rounded-full border border-[rgba(17,17,15,0.1)] bg-white p-1 shadow-[0_2px_10px_rgba(17,17,15,0.06)]">
            {([["price", "Avg price"], ["apprec", "Appreciation"], ["yield", "Rental yield"]] as Array<[Metric, string]>).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMetric(k)}
                className={`rounded-full px-3 py-[7px] text-xs font-semibold transition ${metric === k ? "text-white" : "text-[#5B5A55]"}`}
                style={metric === k ? { background: ACCENT } : undefined}
              >
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
          <div className="mt-1.5 flex justify-between">
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-textTertiary">{sel.region}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.015em] text-textPrimary">{sel.name} County</h2>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tierClass(sel.tier)}`}>{sel.tier}</span>
          </div>
          <div className="mt-4 flex gap-[18px] border-b border-border">
            {([["insights", "Insights"], ["listings", "Listings"], ["advertise", "Advertise"]] as Array<[Tab, string]>).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`-mb-px border-b-2 pb-3 text-[13.5px] font-semibold transition ${tab === k ? "border-primary text-textPrimary" : "border-transparent text-textTertiary"}`}
              >
                {label}
                {k === "listings" ? <span className="ml-1 text-[11px] font-bold text-amber">2</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-[18px]">
          {tab === "insights" ? (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <Tile label="Avg / acre" value={fmtPrice(sel.price)} />
                <Tile label="Appreciation" value={`+${sel.apprec}%`} accent />
                <Tile label="Rental yield" value={`${sel.yield}%`} />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Indicative total return vs alternatives</p>
              <div className="mt-3 flex flex-col gap-3">
                <Bar name={`${sel.name} land`} value={`~${landTotal}%`} width={barW(landTotal)} strong note="Appreciation + rental, before costs & illiquidity" />
                <Bar name="Money Market Fund" value="11.8%" width={barW(11.8)} tone="#9FCBB0" />
                <Bar name="91-day T-bill" value="16.0%" width={barW(16)} tone="#9FCBB0" />
              </div>
              <div className="mt-3.5 flex gap-2.5 rounded-xl border border-amber/20 bg-amber/[0.08] p-3">
                <span className="flex-none text-amber">
                  <Warn />
                </span>
                <p className="text-xs leading-[1.5] text-textSecondary">
                  Land is <strong className="text-textPrimary">illiquid</strong> and carries legal, survey, and transfer costs. High headline returns are not directly comparable to liquid funds.
                </p>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.04em] text-textTertiary">Subcounties</p>
              <div className="mt-2 flex flex-col">
                {subsRaw.map(([name, price, ap], i) => (
                  <div key={name} className={`flex items-center justify-between py-2.5 ${i < subsRaw.length - 1 ? "border-b border-border" : ""}`}>
                    <span className="text-[13.5px] font-medium text-textPrimary">{name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-textPrimary">{fmtPrice(price)}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">+{ap}%</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-[18px] flex gap-2.5">
                <Link href="/land/compare" className="flex-1 rounded-full bg-primary py-2.5 text-center text-[13.5px] font-semibold text-white transition hover:bg-primaryDark">
                  Compare in simulator
                </Link>
                <Link href="/land/checklist" className="flex-none rounded-full border border-border bg-surface px-4 py-2.5 text-center text-[13.5px] font-semibold text-textPrimary transition hover:bg-surfaceSubtle">
                  Checklist
                </Link>
              </div>
            </>
          ) : tab === "listings" ? (
            <>
              <p className="mb-3.5 text-[12.5px] leading-[1.5] text-textSecondary">
                Developments advertised in <strong className="text-textPrimary">{sel.name}</strong>. Sponsored, PesaRoute does not endorse listings; verify independently.
              </p>
              {listings.map((l) => (
                <div key={l.name} className="pr-card-hover mb-3 overflow-hidden rounded-2xl border border-border">
                  <div className="relative flex h-[118px] items-center justify-center" style={{ background: l.img }}>
                    <Home />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.04em] text-white">Sponsored</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <p className="text-[15px] font-semibold text-textPrimary">{l.name}</p>
                        <p className="mt-0.5 text-xs text-textSecondary">{l.kind} · {l.place}</p>
                      </div>
                      <p className="flex-none text-sm font-bold text-textPrimary">{l.price}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-primary/10 px-2.5 py-[3px] text-[11px] font-semibold text-primary">{l.tag1}</span>
                      <span className="rounded-full border border-border bg-surfaceSubtle px-2.5 py-[3px] text-[11px] font-semibold text-textSecondary">{l.tag2}</span>
                    </div>
                    <div className="mt-3.5 flex gap-2">
                      <button type="button" className="flex-1 rounded-full bg-primary py-2.5 text-center text-[13px] font-semibold text-white">View listing</button>
                      <Link href="/land/compare" className="flex-none rounded-full border border-border bg-surface px-3.5 py-2.5 text-center text-[13px] font-semibold text-textPrimary">Compare</Link>
                    </div>
                  </div>
                </div>
              ))}
              <p className="mt-1.5 text-[11.5px] leading-[1.5] text-textTertiary">Listings are clearly separated from neutral county data and never reorder the map.</p>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-bannerBg p-[18px] text-bannerText">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-bannerMuted">For developers &amp; agents</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em]">Reach buyers at the moment of decision.</h3>
                <p className="mt-2 text-[13px] leading-[1.55] text-bannerMuted">Place your plots or apartments in front of users actively comparing land in your county.</p>
                <div className="mt-3.5 flex gap-[18px]">
                  <div>
                    <p className="text-xl font-bold text-accent">14k</p>
                    <p className="mt-0.5 text-[11px] text-bannerMuted">monthly land searches</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-accent">In-context</p>
                    <p className="mt-0.5 text-[11px] text-bannerMuted">shown by county</p>
                  </div>
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
                  <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">Land · {sel.name}</span>
                  <span className="rounded-full border border-border bg-surfaceSubtle px-3 py-1.5 text-xs font-semibold text-textSecondary">Apartments</span>
                  <span className="rounded-full border border-border bg-surfaceSubtle px-3 py-1.5 text-xs font-semibold text-textSecondary">+ add county</span>
                </div>
                <div className="mt-3.5 flex items-center justify-between">
                  <span className="text-xs text-textTertiary">Est. from</span>
                  <span className="text-lg font-bold text-textPrimary">
                    KES 4,500<span className="text-xs font-medium text-textTertiary">/mo</span>
                  </span>
                </div>
              </div>
              <button type="button" className="mt-3.5 w-full rounded-full bg-primary py-3 text-center text-sm font-semibold text-white transition hover:bg-primaryDark">
                Become a partner →
              </button>
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
