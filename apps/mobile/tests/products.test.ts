import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeFilterCount,
  buildProductQuery,
  canCompare,
  confidenceLabel,
  consultationCategoryForProductType,
  freshnessLabel,
  freshnessTone,
  rateSourceNote,
  summariseCategory,
  toggleCompareSelection,
  SIM_CATEGORIES
} from "../src/utils/products";
import type { InvestmentProduct } from "../src/types";

function makeProduct(overrides: Partial<InvestmentProduct> = {}): InvestmentProduct {
  return {
    id: 1,
    name: "Test MMF",
    slug: "test-mmf",
    category: { id: 1, name: "Money Market Funds", slug: "money-market-funds", description: "", status: "active" },
    provider: { id: 1, name: "Test Provider", slug: "test-provider", website: "" },
    product_type: "money_market_fund",
    currency: "KES",
    regulator: "CMA",
    regulator_category: "CIS",
    license_status: "",
    minimum_amount: "1000.00",
    liquidity_level: "high",
    risk_level: "low",
    typical_use_cases: [],
    not_ideal_for: [],
    documents_needed: [],
    beginner_mistakes: [],
    questions_to_ask: [],
    public_url: "",
    published_status: "published",
    last_verified_at: null,
    freshness_status: "fresh",
    source_confidence: "official",
    current_rate: null,
    educational_disclaimer: "",
    ...overrides
  };
}

test("buildProductQuery drops empty values and keeps set filters", () => {
  const query = buildProductQuery({
    product_type: "money_market_fund",
    risk_level: "",
    provider: undefined,
    has_current_rate: true
  });
  assert.deepEqual(query, { product_type: "money_market_fund", has_current_rate: true });
});

test("activeFilterCount counts only meaningful filters", () => {
  assert.equal(activeFilterCount({}), 0);
  assert.equal(activeFilterCount({ risk_level: "low", currency: "KES" }), 2);
  assert.equal(activeFilterCount({ risk_level: "", has_current_rate: false }), 0);
});

test("canCompare requires 2 to 4 products", () => {
  assert.equal(canCompare([1]), false);
  assert.equal(canCompare([1, 2]), true);
  assert.equal(canCompare([1, 2, 3, 4]), true);
  assert.equal(canCompare([1, 2, 3, 4, 5]), false);
});

test("toggleCompareSelection adds, removes, and caps at 4", () => {
  assert.deepEqual(toggleCompareSelection([], 1), [1]);
  assert.deepEqual(toggleCompareSelection([1, 2], 1), [2]);
  assert.deepEqual(toggleCompareSelection([1, 2, 3, 4], 5), [1, 2, 3, 4]);
});

test("freshness labels and tones reflect status", () => {
  assert.equal(freshnessLabel("stale"), "Data may be stale");
  assert.equal(freshnessLabel("fresh"), "Fresh data");
  assert.equal(freshnessLabel(undefined), "Freshness unknown");
  assert.equal(freshnessTone("stale"), "danger");
  assert.equal(freshnessTone("fresh"), "emerald");
  assert.equal(freshnessTone("acceptable"), "amber");
});

test("confidenceLabel maps source confidence to plain language", () => {
  assert.equal(confidenceLabel("official"), "Official source");
  assert.equal(confidenceLabel("provider_reported"), "Provider reported");
  assert.equal(confidenceLabel("unknown"), "Source unconfirmed");
});

test("rateSourceNote never fakes a live rate when none exists", () => {
  const note = rateSourceNote({ rate_mode: "latest_snapshot", rate_used: null, rate_snapshot_id: null, source_confidence: "unknown" });
  assert.match(note, /unavailable/i);
});

test("rateSourceNote flags a custom rate as a user assumption", () => {
  const note = rateSourceNote({ rate_mode: "user_custom", rate_used: "9.5", rate_snapshot_id: null, source_confidence: "unknown" });
  assert.match(note, /custom/i);
});

test("rateSourceNote attributes a latest snapshot to its source", () => {
  const note = rateSourceNote({ rate_mode: "latest_snapshot", rate_used: "11.5", rate_snapshot_id: 42, source_confidence: "official" });
  assert.match(note, /Official source/);
});

test("summariseCategory counts products, providers, and data availability", () => {
  const mmfCategory = SIM_CATEGORIES.find((category) => category.key === "mmf")!;
  const products = [
    makeProduct({ id: 1, provider: { id: 1, name: "A", slug: "a", website: "" } }),
    makeProduct({
      id: 2,
      provider: { id: 2, name: "B", slug: "b", website: "" },
      current_rate: {
        id: 9,
        snapshot_date: "2026-01-15",
        rate_type: "annual_yield",
        rate_value: "11.50",
        rate_period: "annual",
        currency: "KES",
        confidence: "official",
        is_current: true,
        raw_label: "",
        notes: ""
      }
    }),
    makeProduct({ id: 3, product_type: "treasury_bill", category: { id: 2, name: "T-Bills", slug: "treasury-bills", description: "", status: "active" } })
  ];
  const summary = summariseCategory(products, mmfCategory);
  assert.equal(summary.count, 2);
  assert.equal(summary.providers, 2);
  assert.equal(summary.hasData, true);
});

test("consultationCategoryForProductType maps product types to review categories", () => {
  assert.equal(consultationCategoryForProductType("money_market_fund"), "mmf");
  assert.equal(consultationCategoryForProductType("treasury_bond"), "treasury");
  assert.equal(consultationCategoryForProductType("sacco_deposit"), "sacco");
  assert.equal(consultationCategoryForProductType("global_etf_route"), "global_investing");
  assert.equal(consultationCategoryForProductType("land_due_diligence"), "land_literacy");
  assert.equal(consultationCategoryForProductType("reit"), "general_first_investment");
});
