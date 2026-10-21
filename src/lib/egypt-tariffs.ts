/**
 * Egyptian Commercial Electricity Rates & Tiers
 * Source: Egyptian Electric Utility and Consumer Protection Regulatory Agency (EgyptERA)
 * Official Schedule: Electricity Tariff Starting From April 2026
 * Reference URL: https://egyptera.org/en/TarrifApril2026.aspx
 */

export const EGYPT_ERA_TARIFF_URL = "https://egyptera.org/en/TarrifApril2026.aspx";
export const EGYPT_ERA_EFFECTIVE_DATE = "April 2026";

// Egyptian commercial solar capex benchmarks (EGP per kWp) adhering to AGENTS.md
export const COMMERCIAL_SOLAR_COST_PER_KWP = 28000; // EGP per kWp (market range: 25,000 - 32,000 EGP)
export const MIN_COMMERCIAL_COST_PER_KWP = 25000;
export const MAX_COMMERCIAL_COST_PER_KWP = 32000;

export interface CommercialTariffTier {
  minKwh: number;
  maxKwh: number;
  ratePerKwhEgp: number; // Rate in EGP (e.g. 1.62 EGP)
  ratePerKwhPt: number; // Rate in Piastres (e.g. 162.0 Pt)
  customerServiceFeeEgp: number; // Monthly customer service charge in EGP
  label: string;
  arabicLabel?: string;
  description?: string;
}

/**
 * Official EgyptERA Low-Voltage Commercial Electricity Tariffs (Starting April 2026)
 * As published on https://egyptera.org/en/TarrifApril2026.aspx:
 * - 0 to 100 kWh: 162.0 Pt/kWh (Customer service: 5.0 EGP/mo)
 * - 101 to 250 kWh: 216.0 Pt/kWh from 0 to 250 (Customer service: 15.0 EGP/mo)
 * - 251 to 600 kWh: 264.0 Pt/kWh from 0 to 600 (Customer service: 20.0 EGP/mo)
 * - 601 to 1000 kWh: 264.0 Pt for first 600, 274.0 Pt/kWh for 601-1000 (Customer service: 25.0 EGP/mo)
 * - > 1000 kWh: 279.0 Pt/kWh from 0 to >1000 (Customer service: 40.0 EGP/mo)
 */
export const EGYPT_COMMERCIAL_TARIFFS: CommercialTariffTier[] = [
  {
    minKwh: 0,
    maxKwh: 100,
    ratePerKwhEgp: 1.62,
    ratePerKwhPt: 162.0,
    customerServiceFeeEgp: 5.0,
    label: "0 - 100 kWh (Tier 1)",
    arabicLabel: "من 0 إلى 100 ك.و.س (الشريحة الأولى)",
    description: "162.0 Pt/kWh + 5 EGP service fee",
  },
  {
    minKwh: 100,
    maxKwh: 250,
    ratePerKwhEgp: 2.16,
    ratePerKwhPt: 216.0,
    customerServiceFeeEgp: 15.0,
    label: "101 - 250 kWh (Tier 2)",
    arabicLabel: "من 101 إلى 250 ك.و.س (الشريحة الثانية)",
    description: "216.0 Pt/kWh + 15 EGP service fee (from 0 to 250 kWh)",
  },
  {
    minKwh: 250,
    maxKwh: 600,
    ratePerKwhEgp: 2.64,
    ratePerKwhPt: 264.0,
    customerServiceFeeEgp: 20.0,
    label: "251 - 600 kWh (Tier 3)",
    arabicLabel: "من 251 إلى 600 ك.و.س (الشريحة الثالثة)",
    description: "264.0 Pt/kWh + 20 EGP service fee (from 0 to 600 kWh)",
  },
  {
    minKwh: 600,
    maxKwh: 1000,
    ratePerKwhEgp: 2.74,
    ratePerKwhPt: 274.0,
    customerServiceFeeEgp: 25.0,
    label: "601 - 1000 kWh (Tier 4)",
    arabicLabel: "من 601 إلى 1000 ك.و.س (الشريحة الرابعة)",
    description: "264.0 Pt for first 600, 274.0 Pt/kWh for 601-1000 + 25 EGP service fee",
  },
  {
    minKwh: 1000,
    maxKwh: Infinity,
    ratePerKwhEgp: 2.79,
    ratePerKwhPt: 279.0,
    customerServiceFeeEgp: 40.0,
    label: "> 1000 kWh (Tier 5)",
    arabicLabel: "أكثر من 1000 ك.و.س (الشريحة الخامسة)",
    description: "279.0 Pt/kWh + 40 EGP service fee (from 0 to >1000 kWh)",
  },
];

/**
 * Calculates total commercial electricity bill in EGP from monthly kWh consumption
 * strictly adhering to EgyptERA April 2026 commercial tariff rules and customer service fees.
 *
 * @param monthlyKwh Monthly consumption in kilowatt-hours (kWh)
 * @param includeCustomerService Whether to include the regulatory monthly customer service charge (default true)
 */
export function calculateEgpFromKwh(
  monthlyKwh: number,
  includeCustomerService: boolean = true
): number {
  if (!monthlyKwh || monthlyKwh <= 0 || isNaN(monthlyKwh)) return 0;

  let energyCost = 0;
  let serviceFee = 0;

  if (monthlyKwh <= 100) {
    // Tier 1: 0 to 100 kWh at 1.62 EGP/kWh (162 Pt)
    energyCost = monthlyKwh * 1.62;
    serviceFee = 5.0;
  } else if (monthlyKwh <= 250) {
    // Tier 2: 101 to 250 kWh billed from 0 to 250 at 2.16 EGP/kWh (216 Pt)
    energyCost = monthlyKwh * 2.16;
    serviceFee = 15.0;
  } else if (monthlyKwh <= 600) {
    // Tier 3: 251 to 600 kWh billed from 0 to 600 at 2.64 EGP/kWh (264 Pt)
    energyCost = monthlyKwh * 2.64;
    serviceFee = 20.0;
  } else if (monthlyKwh <= 1000) {
    // Tier 4: 601 to 1000 kWh: 0-600 at 2.64, remainder (601-1000) at 2.74 EGP/kWh (274 Pt)
    energyCost = 600 * 2.64 + (monthlyKwh - 600) * 2.74;
    serviceFee = 25.0;
  } else {
    // Tier 5: > 1000 kWh billed from 0 to > 1000 at 2.79 EGP/kWh (279 Pt)
    energyCost = monthlyKwh * 2.79;
    serviceFee = 40.0;
  }

  const total = energyCost + (includeCustomerService ? serviceFee : 0);
  return Math.round(total * 100) / 100;
}

/**
 * Calculates monthly kWh consumption from bill total in EGP via exact tier reverse lookup
 * calibrated for EgyptERA April 2026 commercial tariffs.
 *
 * Guaranteed monotonic and invertible for seamless slider adjustment and OCR bill imports.
 *
 * @param monthlySpendEgp Monthly electricity bill in EGP
 * @param includeCustomerService Whether the input bill includes customer service fees (default true)
 */
export function calculateKwhFromEgp(
  monthlySpendEgp: number,
  includeCustomerService: boolean = true
): number {
  if (!monthlySpendEgp || monthlySpendEgp <= 0 || isNaN(monthlySpendEgp)) return 0;

  if (includeCustomerService) {
    // Tier threshold bill limits with customer service charges:
    // Tier 1 (100 kWh): 100 * 1.62 + 5 = 167.00 EGP
    // Tier 2 start (101 kWh): 101 * 2.16 + 15 = 233.16 EGP
    // Tier 2 end (250 kWh): 250 * 2.16 + 15 = 555.00 EGP
    // Tier 3 start (251 kWh): 251 * 2.64 + 20 = 682.64 EGP
    // Tier 3 end (600 kWh): 600 * 2.64 + 20 = 1604.00 EGP
    // Tier 4 start (601 kWh): 600 * 2.64 + 1 * 2.74 + 25 = 1611.74 EGP
    // Tier 4 end (1000 kWh): 1584 + 400 * 2.74 + 25 = 2705.00 EGP
    // Tier 5 start (1001 kWh): 1001 * 2.79 + 40 = 2832.79 EGP

    if (monthlySpendEgp <= 167.0) {
      const netSpend = Math.max(0, monthlySpendEgp - 5.0);
      return Math.round((netSpend / 1.62) * 100) / 100;
    }

    // Gap between Tier 1 and Tier 2 (167.0 to 233.16 EGP)
    if (monthlySpendEgp < 233.16) {
      const ratio = (monthlySpendEgp - 167.0) / (233.16 - 167.0);
      return Math.round((100 + ratio * 1) * 100) / 100;
    }

    if (monthlySpendEgp <= 555.0) {
      const netSpend = monthlySpendEgp - 15.0;
      return Math.round((netSpend / 2.16) * 100) / 100;
    }

    // Gap between Tier 2 and Tier 3 (555.0 to 682.64 EGP)
    if (monthlySpendEgp < 682.64) {
      const ratio = (monthlySpendEgp - 555.0) / (682.64 - 555.0);
      return Math.round((250 + ratio * 1) * 100) / 100;
    }

    if (monthlySpendEgp <= 1604.0) {
      const netSpend = monthlySpendEgp - 20.0;
      return Math.round((netSpend / 2.64) * 100) / 100;
    }

    // Gap between Tier 3 and Tier 4 (1604.0 to 1611.74 EGP)
    if (monthlySpendEgp < 1611.74) {
      const ratio = (monthlySpendEgp - 1604.0) / (1611.74 - 1604.0);
      return Math.round((600 + ratio * 1) * 100) / 100;
    }

    if (monthlySpendEgp <= 2705.0) {
      const variableSpend = monthlySpendEgp - 25.0 - 1584.0;
      return Math.round((600 + variableSpend / 2.74) * 100) / 100;
    }

    // Gap between Tier 4 and Tier 5 (2705.0 to 2832.79 EGP)
    if (monthlySpendEgp < 2832.79) {
      const ratio = (monthlySpendEgp - 2705.0) / (2832.79 - 2705.0);
      return Math.round((1000 + ratio * 1) * 100) / 100;
    }

    // Tier 5: > 1000 kWh
    const netSpend = monthlySpendEgp - 40.0;
    return Math.round((netSpend / 2.79) * 100) / 100;
  } else {
    // Pure energy charge reverse lookup without customer service fees:
    if (monthlySpendEgp <= 162.0) {
      return Math.round((monthlySpendEgp / 1.62) * 100) / 100;
    }
    if (monthlySpendEgp < 218.16) {
      const ratio = (monthlySpendEgp - 162.0) / (218.16 - 162.0);
      return Math.round((100 + ratio * 1) * 100) / 100;
    }
    if (monthlySpendEgp <= 540.0) {
      return Math.round((monthlySpendEgp / 2.16) * 100) / 100;
    }
    if (monthlySpendEgp < 662.64) {
      const ratio = (monthlySpendEgp - 540.0) / (662.64 - 540.0);
      return Math.round((250 + ratio * 1) * 100) / 100;
    }
    if (monthlySpendEgp <= 1584.0) {
      return Math.round((monthlySpendEgp / 2.64) * 100) / 100;
    }
    if (monthlySpendEgp < 1586.74) {
      const ratio = (monthlySpendEgp - 1584.0) / (1586.74 - 1584.0);
      return Math.round((600 + ratio * 1) * 100) / 100;
    }
    if (monthlySpendEgp <= 2680.0) {
      const variableSpend = monthlySpendEgp - 1584.0;
      return Math.round((600 + variableSpend / 2.74) * 100) / 100;
    }
    if (monthlySpendEgp < 2792.79) {
      const ratio = (monthlySpendEgp - 2680.0) / (2792.79 - 2680.0);
      return Math.round((1000 + ratio * 1) * 100) / 100;
    }
    return Math.round((monthlySpendEgp / 2.79) * 100) / 100;
  }
}

/**
 * Calculates effective blended rate per kWh in EGP for a given monthly consumption.
 */
export function calculateBlendedRatePerKwh(monthlyKwh: number): number {
  if (!monthlyKwh || monthlyKwh <= 0) return EGYPT_COMMERCIAL_TARIFFS[0].ratePerKwhEgp;
  const totalCost = calculateEgpFromKwh(monthlyKwh);
  return Math.round((totalCost / monthlyKwh) * 100) / 100;
}
