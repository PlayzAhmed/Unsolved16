export interface SolarResult {
  systemCapacityKwp: number;
  roofAreaRequiredM2: number;
  initialCostEgp: number;
  monthlySavingsEgp: number;
  annualSavingsEgp: number;
  paybackPeriodYears: number;
  greenScore: number;
  co2ReductionTons: number;
}

export interface BillData {
  totalCostEgp?: number;
  kwhConsumption?: number;
  meterNumber?: string;
  customerName?: string;
  confidence?: number;
}

export interface RooftopData {
  lat: number;
  lng: number;
  formattedAddress: string;
  polygonAreaM2?: number;
  staticMapUrl?: string;
}

export interface CalculateSolarParams {
  monthlySpendEgp?: number;
  monthlyKwh?: number;
  transitionRatio?: number; // 0.5 to 1.0 (or 50 to 100)
  installationCostPerKwpEgp?: number;
}

export interface RoofFeasibility {
  fits: boolean;
  requiredM2: number;
  availableM2: number;
  coveragePercent: number;
  maxCapacityKwp: number;
}

export interface AnnualCashFlow {
  year: number;
  gridCostWithoutSolarEgp: number;
  gridCostWithSolarEgp: number;
  annualSavingsEgp: number;
  cumulativeSavingsEgp: number;
  netCashFlowEgp: number;
}
