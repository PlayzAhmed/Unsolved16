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
}

export interface RooftopData {
  lat: number;
  lng: number;
  formattedAddress: string;
  polygonAreaM2?: number;
  staticMapUrl?: string;
}
