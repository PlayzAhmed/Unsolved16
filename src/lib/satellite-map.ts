export type SatelliteImageLayer = "imagery" | "labels";

export interface SatelliteImageParams {
  lat: number;
  lng: number;
  zoom: number;
  area?: number;
  address?: string;
  layer?: SatelliteImageLayer;
}

export function clampRooftopZoom(zoom: number): number {
  return Number.isFinite(zoom) ? Math.min(19, Math.max(17, Math.trunc(zoom))) : 18;
}

export function buildRooftopImageUrl(params: SatelliteImageParams): string {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    zoom: String(clampRooftopZoom(params.zoom)),
  });
  if (params.area !== undefined) query.set("area", String(params.area));
  if (params.address) query.set("address", params.address);
  if (params.layer) query.set("layer", params.layer);
  return `/api/rooftop-image?${query.toString()}`;
}

export function buildEsriTileUrl(
  lat: number,
  lng: number,
  zoom: number,
  layer: SatelliteImageLayer
): string {
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const safeLng = Math.max(-180, Math.min(180, lng));
  const tileCount = 2 ** zoom;
  const x = Math.floor(((safeLng + 180) / 360) * tileCount);
  const latRadians = (safeLat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.asinh(Math.tan(latRadians)) / Math.PI) / 2) * tileCount
  );
  const service = layer === "labels" ? "Reference/World_Boundaries_and_Places" : "World_Imagery";
  return `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/${zoom}/${y}/${x}`;
}
