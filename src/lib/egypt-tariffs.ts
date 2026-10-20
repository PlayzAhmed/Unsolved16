// Egyptian commercial electricity rates & tiers
export const COMMERCIAL_SOLAR_COST_PER_KWP = 28000; // EGP per kWp (Egyptian market average: 25,000 - 32,000 EGP)
export const MIN_COMMERCIAL_COST_PER_KWP = 25000;
export const MAX_COMMERCIAL_COST_PER_KWP = 32000;

export interface CommercialTariffTier {
  minKwh: number;
  maxKwh: number;
  ratePerKwhEgp: number;
  label?: string;
}

export const EGYPT_COMMERCIAL_TARIFFS: CommercialTariffTier[] = [
  { minKwh: 0, maxKwh: 100, ratePerKwhEgp: 0.80, label: "0 - 100 kWh (Tier 1)" },
  { minKwh: 100, maxKwh: 250, ratePerKwhEgp: 1.40, label: "100 - 250 kWh (Tier 2)" },
  { minKwh: 250, maxKwh: 600, ratePerKwhEgp: 1.75, label: "250 - 600 kWh (Tier 3)" },
  { minKwh: 600, maxKwh: 1000, ratePerKwhEgp: 2.10, label: "600 - 1000 kWh (Tier 4)" },
  { minKwh: 1000, maxKwh: Infinity, ratePerKwhEgp: 2.23, label: "> 1000 kWh (Tier 5)" },
];

/**
 * Calculates total bill in EGP from monthly kWh consumption for Egyptian commercial tiering.
 */
export function calculateEgpFromKwh(monthlyKwh: number): number {
  if (!monthlyKwh || monthlyKwh <= 0 || isNaN(monthlyKwh)) return 0;
  
  let remainingKwh = monthlyKwh;
  let totalCostEgp = 0;

  for (const tier of EGYPT_COMMERCIAL_TARIFFS) {
    const tierCapacity = tier.maxKwh - tier.minKwh;
    if (remainingKwh <= 0) break;

    const kwhInTier = Math.min(remainingKwh, tierCapacity);
    totalCostEgp += kwhInTier * tier.ratePerKwhEgp;
    remainingKwh -= kwhInTier;
  }

  return Math.round(totalCostEgp * 100) / 100;
}

/**
 * Calculates monthly kWh consumption from bill total in EGP via tier reverse lookup.
 */
export function calculateKwhFromEgp(monthlySpendEgp: number): number {
  if (!monthlySpendEgp || monthlySpendEgp <= 0 || isNaN(monthlySpendEgp)) return 0;

  let remainingSpend = monthlySpendEgp;
  let totalKwh = 0;

  for (const tier of EGYPT_COMMERCIAL_TARIFFS) {
    const tierCapacity = tier.maxKwh - tier.minKwh;
    const maxTierCost = tierCapacity * tier.ratePerKwhEgp;

    if (remainingSpend <= maxTierCost) {
      totalKwh += remainingSpend / tier.ratePerKwhEgp;
      remainingSpend = 0;
      break;
    } else {
      totalKwh += tierCapacity;
      remainingSpend -= maxTierCost;
    }
  }

  if (remainingSpend > 0) {
    const lastTier = EGYPT_COMMERCIAL_TARIFFS[EGYPT_COMMERCIAL_TARIFFS.length - 1];
    totalKwh += remainingSpend / lastTier.ratePerKwhEgp;
  }

  return Math.round(totalKwh * 100) / 100;
}

/**
 * Calculates effective blended rate per kWh in EGP for a given monthly consumption.
 */
export function calculateBlendedRatePerKwh(monthlyKwh: number): number {
  if (!monthlyKwh || monthlyKwh <= 0) return EGYPT_COMMERCIAL_TARIFFS[0].ratePerKwhEgp;
  const totalCost = calculateEgpFromKwh(monthlyKwh);
  return Math.round((totalCost / monthlyKwh) * 100) / 100;
}
