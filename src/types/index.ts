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
  lowConfidence?: boolean;
  extractedText?: string;
  source?: "gemini" | "vision" | "tesseract" | "pdf_text" | "regex" | "fallback" | "demo" | "manual";
  warning?: string;
  isElectricityBill?: boolean;
  isEgyptianBusinessBill?: boolean;
  validationReason?: string;
}

export type RoofAreaSource =
  | "google_solar"
  | "overpass_polygon"
  | "preset_polygon"
  | "fallback_formula"
  | "manual";

export interface RooftopData {
  lat: number;
  lng: number;
  formattedAddress: string;
  /** Gross roof/footprint area measured from GIS or the map selection. */
  roofAreaM2?: number;
  /** Net area available for PV after obstructions and access setbacks. */
  usableAreaM2?: number;
  /** Ratio between usable and gross roof area (0–1). */
  areaUtilizationFactor?: number;
  /** False when the address could not be resolved and demo coordinates were used. */
  locationResolved?: boolean;
  /** Backward-compatible alias for the gross polygon area. */
  polygonAreaM2?: number;
  staticMapUrl?: string;
  polygonCoords?: { lat: number; lng: number }[];
  meta?: {
    areaSource?: RoofAreaSource;
    usableAreaSource?: "google_solar" | "utilization_factor" | "manual";
    hasGoogleKey?: boolean;
    zoom?: number;
    businessName?: string;
  };
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
