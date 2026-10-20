import assert from "node:assert";
import test from "node:test";
import {
  calculateEgpFromKwh,
  calculateKwhFromEgp,
  COMMERCIAL_SOLAR_COST_PER_KWP,
} from "../egypt-tariffs";
import {
  calculateSolarSavings,
  estimateRoofAreaFallback,
  checkRoofFeasibility,
  calculate25YearProjection,
} from "../solar-calculator";

test("Egyptian Tariffs - forward and reverse conversions", () => {
  const kwh = 1000;
  const egp = calculateEgpFromKwh(kwh);
  assert.strictEqual(egp > 0, true);

  const calculatedKwh = calculateKwhFromEgp(egp);
  assert.strictEqual(Math.abs(calculatedKwh - kwh) < 1, true);
});

test("Solar Calculator - calculates 100% solar transition correctly", () => {
  const monthlySpendEgp = 3000;
  const result = calculateSolarSavings({
    monthlySpendEgp,
    transitionRatio: 1.0,
  });

  assert.strictEqual(result.systemCapacityKwp > 0, true);
  assert.strictEqual(result.roofAreaRequiredM2 > 0, true);
  assert.strictEqual(result.roofAreaRequiredM2, result.systemCapacityKwp * 6);
  assert.strictEqual(result.initialCostEgp, Math.round(result.systemCapacityKwp * COMMERCIAL_SOLAR_COST_PER_KWP));
  assert.strictEqual(result.monthlySavingsEgp > 0, true);
  assert.strictEqual(result.annualSavingsEgp, result.monthlySavingsEgp * 12);
  assert.strictEqual(result.paybackPeriodYears > 0, true);
  assert.strictEqual(result.greenScore, 100);
  assert.strictEqual(result.co2ReductionTons > 0, true);
});

test("Solar Calculator - calculates 50% solar transition correctly", () => {
  const monthlyKwh = 1500;
  const result100 = calculateSolarSavings({
    monthlyKwh,
    transitionRatio: 1.0,
  });

  const result50 = calculateSolarSavings({
    monthlyKwh,
    transitionRatio: 0.5,
  });

  assert.strictEqual(result50.systemCapacityKwp, Math.round((result100.systemCapacityKwp / 2) * 100) / 100);
  assert.strictEqual(result50.greenScore, 50);
});

test("Solar Calculator - handles percentage input format (e.g., 75 for 75%)", () => {
  const monthlyKwh = 2000;
  const resultDecimal = calculateSolarSavings({ monthlyKwh, transitionRatio: 0.75 });
  const resultPercent = calculateSolarSavings({ monthlyKwh, transitionRatio: 75 });

  assert.strictEqual(resultDecimal.systemCapacityKwp, resultPercent.systemCapacityKwp);
  assert.strictEqual(resultDecimal.greenScore, 75);
});

test("Solar Calculator - handles zero input gracefully", () => {
  const result = calculateSolarSavings({
    monthlySpendEgp: 0,
    monthlyKwh: 0,
  });

  assert.strictEqual(result.systemCapacityKwp, 0);
  assert.strictEqual(result.roofAreaRequiredM2, 0);
  assert.strictEqual(result.initialCostEgp, 0);
  assert.strictEqual(result.monthlySavingsEgp, 0);
  assert.strictEqual(result.annualSavingsEgp, 0);
  assert.strictEqual(result.paybackPeriodYears, 0);
  assert.strictEqual(result.greenScore, 0);
  assert.strictEqual(result.co2ReductionTons, 0);
});

test("Rooftop Estimations - fallback calculation per AGENTS.md", () => {
  const monthlyKwh = 3000;
  const estimatedRoofM2 = estimateRoofAreaFallback(monthlyKwh);
  // AGENTS.md rule: Monthly kWh / 15
  assert.strictEqual(estimatedRoofM2, 200);

  const feasibility = checkRoofFeasibility(60, 200);
  assert.strictEqual(feasibility.fits, true);
  assert.strictEqual(feasibility.coveragePercent, 30);
});

test("Cashflow Projections - 25 year projection output", () => {
  const result = calculateSolarSavings({ monthlySpendEgp: 5000, transitionRatio: 0.8 });
  const projections = calculate25YearProjection(result, 5000 * 12);

  assert.strictEqual(projections.length, 25);
  assert.strictEqual(projections[0].year, 1);
  assert.strictEqual(projections[24].year, 25);
  assert.strictEqual(projections[24].cumulativeSavingsEgp > result.initialCostEgp, true);
});
