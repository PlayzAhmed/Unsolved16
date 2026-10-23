/** Conservative share of a gross roof that can host PV after setbacks and obstructions. */
export const DEFAULT_ROOF_UTILIZATION_FACTOR = 0.8;

/**
 * Converts a gross roof/footprint area into the net area available for PV panels.
 * The utilization factor is clamped to a realistic 50%-100% range.
 */
export function calculateUsableRoofArea(
  roofAreaM2: number,
  utilizationFactor: number = DEFAULT_ROOF_UTILIZATION_FACTOR
): number {
  if (!Number.isFinite(roofAreaM2) || roofAreaM2 <= 0) return 0;
  const safeFactor = Number.isFinite(utilizationFactor)
    ? Math.min(1, Math.max(0.5, utilizationFactor))
    : DEFAULT_ROOF_UTILIZATION_FACTOR;
  return Math.round(roofAreaM2 * safeFactor * 100) / 100;
}
