// Pure financial & solar capacity equations for EnergyTwin AI
import type {
  SolarResult,
  CalculateSolarParams,
  RoofFeasibility,
  AnnualCashFlow,
} from "@/types";
import {
  COMMERCIAL_SOLAR_COST_PER_KWP,
  calculateEgpFromKwh,
  calculateKwhFromEgp,
} from "./egypt-tariffs";

export type { CalculateSolarParams, RoofFeasibility, AnnualCashFlow };

/**
 * Estimates available rooftop area in m² based on monthly electricity consumption
 * as specified in AGENTS.md fallback: Estimated Area (m²) = Monthly kWh / 15.
 */
export function estimateRoofAreaFallback(monthlyKwh: number): number {
  if (!monthlyKwh || monthlyKwh <= 0) return 0;
  return Math.round((monthlyKwh / 15) * 100) / 100;
}

/**
 * Validates whether the required roof area fits within available rooftop dimensions.
 */
export function checkRoofFeasibility(
  requiredAreaM2: number,
  availableAreaM2: number
): RoofFeasibility {
  if (!availableAreaM2 || availableAreaM2 <= 0) {
    return {
      fits: false,
      requiredM2: requiredAreaM2,
      availableM2: 0,
      coveragePercent: 0,
      maxCapacityKwp: 0,
    };
  }
  const coveragePercent = Math.round((requiredAreaM2 / availableAreaM2) * 100);
  const maxCapacityKwp = Math.round((availableAreaM2 / 6) * 100) / 100;
  return {
    fits: requiredAreaM2 <= availableAreaM2,
    requiredM2: requiredAreaM2,
    availableM2: availableAreaM2,
    coveragePercent,
    maxCapacityKwp,
  };
}

/**
 * Generates 25-year cashflow projections accounting for 0.5%/yr solar panel degradation
 * and conservative 8%/yr electricity tariff escalation in Egypt.
 */
export function calculate25YearProjection(
  solarResult: SolarResult,
  baselineAnnualSpendEgp: number,
  tariffEscalationRate: number = 0.08,
  panelDegradationRate: number = 0.005
): AnnualCashFlow[] {
  const projections: AnnualCashFlow[] = [];
  let cumulativeSavings = 0;

  for (let year = 1; year <= 25; year++) {
    const tariffMultiplier = Math.pow(1 + tariffEscalationRate, year - 1);
    const degradationMultiplier = Math.pow(1 - panelDegradationRate, year - 1);

    const projectedGridCostWithoutSolar = Math.round(
      baselineAnnualSpendEgp * tariffMultiplier
    );

    const projectedAnnualSavings = Math.round(
      solarResult.annualSavingsEgp * tariffMultiplier * degradationMultiplier
    );

    const projectedGridCostWithSolar = Math.max(
      0,
      projectedGridCostWithoutSolar - projectedAnnualSavings
    );

    cumulativeSavings += projectedAnnualSavings;
    const netCashFlowEgp = cumulativeSavings - solarResult.initialCostEgp;

    projections.push({
      year,
      gridCostWithoutSolarEgp: projectedGridCostWithoutSolar,
      gridCostWithSolarEgp: projectedGridCostWithSolar,
      annualSavingsEgp: projectedAnnualSavings,
      cumulativeSavingsEgp: cumulativeSavings,
      netCashFlowEgp,
    });
  }

  return projections;
}

/**
 * Calculates solar capacity requirements, installation cost, financial savings,
 * payback period (ROI), required roof area, and environmental impact.
 *
 * Deterministic pure function with zero side effects conforming to AGENTS.md.
 */
export function calculateSolarSavings(
  params: CalculateSolarParams
): SolarResult {
  const {
    monthlySpendEgp: rawSpend,
    monthlyKwh: rawKwh,
    transitionRatio: rawRatio = 1.0,
    installationCostPerKwpEgp = COMMERCIAL_SOLAR_COST_PER_KWP,
  } = params;

  // Normalize transition ratio: handles both 0.5-1.0 and 50-100 inputs
  let ratio = typeof rawRatio === "number" && !isNaN(rawRatio) ? rawRatio : 1.0;
  if (ratio > 1.0 && ratio <= 100) {
    ratio = ratio / 100;
  }
  const transitionRatio = Math.min(1.0, Math.max(0.5, ratio));

  // Determine monthly kWh consumption safely
  let calculatedMonthlyKwh = 0;
  let calculatedMonthlySpendEgp = 0;

  const validKwh =
    typeof rawKwh === "number" && !isNaN(rawKwh) && rawKwh > 0 ? rawKwh : 0;
  const validSpend =
    typeof rawSpend === "number" && !isNaN(rawSpend) && rawSpend > 0
      ? rawSpend
      : 0;

  if (validKwh > 0) {
    calculatedMonthlyKwh = validKwh;
    calculatedMonthlySpendEgp =
      validSpend > 0 ? validSpend : calculateEgpFromKwh(validKwh);
  } else if (validSpend > 0) {
    calculatedMonthlySpendEgp = validSpend;
    calculatedMonthlyKwh = calculateKwhFromEgp(validSpend);
  }

  if (calculatedMonthlyKwh <= 0) {
    return {
      systemCapacityKwp: 0,
      roofAreaRequiredM2: 0,
      initialCostEgp: 0,
      monthlySavingsEgp: 0,
      annualSavingsEgp: 0,
      paybackPeriodYears: 0,
      greenScore: 0,
      co2ReductionTons: 0,
    };
  }

  // Monthly kWh produced by solar system based on target transition ratio
  const solarMonthlyKwh = calculatedMonthlyKwh * transitionRatio;

  // Sizing Formula: kWp = (Monthly kWh / 30 days / 5 Peak Sun Hours) * 1.2 Losses
  const systemCapacityKwp =
    Math.round(((solarMonthlyKwh / 30 / 5) * 1.2) * 100) / 100;

  // Roof Area Required: 6 m² per kWp
  const roofAreaRequiredM2 = Math.round(systemCapacityKwp * 6 * 100) / 100;

  // Total Initial System Cost in EGP
  const initialCostEgp = Math.round(
    systemCapacityKwp * installationCostPerKwpEgp
  );

  // Financial Savings based on tariff tiers
  const remainingGridKwh = calculatedMonthlyKwh * (1 - transitionRatio);
  const remainingGridCostEgp = calculateEgpFromKwh(remainingGridKwh);
  const monthlySavingsEgp = Math.max(
    0,
    Math.round((calculatedMonthlySpendEgp - remainingGridCostEgp) * 100) / 100
  );
  const annualSavingsEgp = Math.round(monthlySavingsEgp * 12 * 100) / 100;

  // Payback Period (ROI in Years)
  const paybackPeriodYears =
    annualSavingsEgp > 0
      ? Math.round((initialCostEgp / annualSavingsEgp) * 100) / 100
      : 0;

  // CO2 Reduction (Egypt Grid Factor ~0.53 kg CO2 per kWh = 0.00053 tons per kWh)
  const annualSolarKwh = solarMonthlyKwh * 12;
  const co2ReductionTons = Math.round(annualSolarKwh * 0.00053 * 100) / 100;

  // Green Score (Scale 0-100) based on transition ratio and environmental contribution
  const greenScore = Math.min(100, Math.round(transitionRatio * 100));

  return {
    systemCapacityKwp,
    roofAreaRequiredM2,
    initialCostEgp,
    monthlySavingsEgp,
    annualSavingsEgp,
    paybackPeriodYears,
    greenScore,
    co2ReductionTons,
  };
}
