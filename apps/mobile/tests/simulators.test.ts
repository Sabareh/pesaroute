import assert from "node:assert/strict";
import { test } from "node:test";
import { simulateGlobalRoute, simulateMMF, simulateSacco, simulateTBill } from "../src/utils/simulators";

test("MMF simulator compounds monthly", () => {
  const result = simulateMMF({ principal: 10000, annualRatePercent: 12, months: 6 });
  assert.equal(result.projectedValue, 10615.2);
  assert.equal(result.projectedInterest, 615.2);
});

test("T-bill simulator estimates discount and purchase price", () => {
  const result = simulateTBill({ faceValue: 100000, discountRatePercent: 12, days: 91 });
  assert.equal(result.estimatedDiscountInterest, 3000);
  assert.equal(result.estimatedPurchasePrice, 97000);
});

test("SACCO simulator totals contributions and projected dividend", () => {
  const result = simulateSacco({ monthlyDeposit: 1000, months: 12, annualDividendPercent: 8 });
  assert.equal(result.totalContributions, 12000);
  assert.equal(result.projectedDividend, 960);
  assert.equal(result.projectedTotal, 12960);
});

test("Global route simulator estimates fees and USD amount", () => {
  const result = simulateGlobalRoute({ amountKes: 10000, fxRate: 130, transferFeePercent: 2 });
  assert.equal(result.estimatedFeesKes, 200);
  assert.equal(result.estimatedUsdBeforeBrokerCosts, 75.38);
});
