export type SatelliteImageLayer = "imagery" | "labels";

export interface MapPoint {
  x: number;
  y: number;
}

export const MAP_VIEWBOX_WIDTH = 400;
export const MAP_VIEWBOX_HEIGHT = 300;

/**
 * Satellite images are requested at a fixed 4:3 resolution that matches the
 * viewBox aspect, so one viewBox unit covers the same ground distance on
 * both axes.
 */
export const SATELLITE_IMAGE_WIDTH = 512;
export const SATELLITE_IMAGE_HEIGHT = 384;

/**
 * The image covers the same ground extent as a 640x480 map at the selected
 * zoom. Keeping the export below 640x480 avoids ArcGIS export limits while
 * preserving the exact centre and scale of the Google Static Maps fallback.
 */
const SATELLITE_GROUND_WIDTH_PX = 640;

const WEB_MERCATOR_EARTH_RADIUS = 6378137;
const WEB_MERCATOR_MAX_LAT = 85.05112878;

/** Default detected rooftop outline, expressed in map viewBox units. */
export const DEFAULT_ROOF_POLYGON: readonly MapPoint[] = [
  { x: 80, y: 55 },
  { x: 310, y: 40 },
  { x: 335, y: 215 },
  { x: 105, y: 235 },
];

export interface SatelliteImageParams {
  lat: number;
  lng: number;
  zoom: number;
  area?: number;
  address?: string;
  layer?: SatelliteImageLayer;
  /**
   * Surrounding pan tiles must never render the procedural demo image:
   * when the upstream imagery request fails, the route returns a blank tile
   * instead so real and synthetic imagery are never spliced together.
   */
  tile?: boolean;
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
  if (params.tile) query.set("tile", "1");
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

/** Shoelace area of a polygon drawn on the rooftop map, in viewBox units². */
export function calculatePolygonArea(points: readonly MapPoint[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2;
}

export function polygonToPointsAttr(points: readonly MapPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

/**
 * Ground distance covered by one map viewBox unit at the supplied latitude
 * and zoom. Both axes share this scale because the served image is 4:3.
 */
export function metersPerMapUnit(lat: number, zoom: number): number {
  const safeLat = Math.max(-WEB_MERCATOR_MAX_LAT, Math.min(WEB_MERCATOR_MAX_LAT, lat));
  const safeZoom = clampRooftopZoom(zoom);
  const metersPerPixel =
    (156543.03392 * Math.cos((safeLat * Math.PI) / 180)) / 2 ** safeZoom;
  return (metersPerPixel * SATELLITE_GROUND_WIDTH_PX) / MAP_VIEWBOX_WIDTH;
}

/** Real-world area in m² of a polygon drawn on the georeferenced map. */
export function calculateMapPolygonAreaM2(
  points: readonly MapPoint[],
  lat: number,
  zoom: number
): number {
  const metersPerUnit = metersPerMapUnit(lat, zoom);
  return Math.max(
    0,
    Math.round(calculatePolygonArea(points) * metersPerUnit * metersPerUnit)
  );
}

/** Real-world area in m² of a rectangular map selection. */
export function calculateMapRectAreaM2(
  widthUnits: number,
  heightUnits: number,
  lat: number,
  zoom: number
): number {
  const metersPerUnit = metersPerMapUnit(lat, zoom);
  return Math.max(
    0,
    Math.round(
      Math.abs(widthUnits) * Math.abs(heightUnits) * metersPerUnit * metersPerUnit
    )
  );
}

/** Scales a polygon around the map centre without moving it off-centre. */
export function scalePolygonAboutCenter(
  points: readonly MapPoint[],
  scale: number
): MapPoint[] {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const centerX = MAP_VIEWBOX_WIDTH / 2;
  const centerY = MAP_VIEWBOX_HEIGHT / 2;

  return points.map((point) => ({
    x: centerX + (point.x - centerX) * safeScale,
    y: centerY + (point.y - centerY) * safeScale,
  }));
}

/** Scales a polygon around its own centroid, preserving its position. */
export function scalePolygonAboutCentroid(
  points: readonly MapPoint[],
  scale: number
): MapPoint[] {
  if (points.length === 0) return [];
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;

  return points.map((point) => ({
    x: centerX + (point.x - centerX) * safeScale,
    y: centerY + (point.y - centerY) * safeScale,
  }));
}

/**
 * Rebuilds a rooftop outline so its real-world area matches the detected
 * area from the geocoder, keeping the outline centred on the facility.
 */
export function fitPolygonToArea(
  referencePoints: readonly MapPoint[],
  targetAreaM2: number,
  lat: number,
  zoom: number
): MapPoint[] {
  const copied = referencePoints.map((point) => ({ ...point }));
  if (targetAreaM2 <= 0) return copied;

  const referenceAreaM2 = calculateMapPolygonAreaM2(copied, lat, zoom);
  if (referenceAreaM2 <= 0) return copied;

  return scalePolygonAboutCenter(
    copied,
    Math.sqrt(targetAreaM2 / referenceAreaM2)
  );
}

/**
 * Builds a centred ESRI export request. Unlike raw tiles, the export image is
 * centred on the facility and covers a known ground extent on both axes.
 */
export function buildEsriExportUrl(lat: number, lng: number, zoom: number): string {
  const safeLat = Math.max(-WEB_MERCATOR_MAX_LAT, Math.min(WEB_MERCATOR_MAX_LAT, lat));
  const safeLng = Math.max(-180, Math.min(180, lng));
  const safeZoom = clampRooftopZoom(zoom);
  const metersPerUnit = metersPerMapUnit(safeLat, safeZoom);

  const halfWidth = (metersPerUnit * MAP_VIEWBOX_WIDTH) / 2;
  const halfHeight = (metersPerUnit * MAP_VIEWBOX_HEIGHT) / 2;

  const x = (WEB_MERCATOR_EARTH_RADIUS * safeLng * Math.PI) / 180;
  const y =
    WEB_MERCATOR_EARTH_RADIUS *
    Math.log(Math.tan(Math.PI / 4 + (safeLat * Math.PI) / 360));

  const bbox = [x - halfWidth, y - halfHeight, x + halfWidth, y + halfHeight]
    .map((value) => value.toFixed(3))
    .join(",");

  const params = new URLSearchParams({
    bbox,
    bboxSR: "3857",
    imageSR: "3857",
    size: `${SATELLITE_IMAGE_WIDTH},${SATELLITE_IMAGE_HEIGHT}`,
    format: "jpg",
    f: "image",
  });

  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params.toString()}`;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Offsets a geographic point by metres east/north using the Web Mercator
 * projection, matching the projection used by the satellite export requests.
 */
export function offsetGeoPointByMeters(
  point: GeoPoint,
  eastMeters: number,
  northMeters: number
): GeoPoint {
  const safeLat = Math.max(-WEB_MERCATOR_MAX_LAT, Math.min(WEB_MERCATOR_MAX_LAT, point.lat));
  const mercatorX = (WEB_MERCATOR_EARTH_RADIUS * point.lng * Math.PI) / 180;
  const mercatorY =
    WEB_MERCATOR_EARTH_RADIUS *
    Math.log(Math.tan(Math.PI / 4 + (safeLat * Math.PI) / 360));

  const nextX = mercatorX + eastMeters;
  const nextY = mercatorY + northMeters;

  return {
    lat: (2 * Math.atan(Math.exp(nextY / WEB_MERCATOR_EARTH_RADIUS)) - Math.PI / 2) * (180 / Math.PI),
    lng: (nextX / WEB_MERCATOR_EARTH_RADIUS) * (180 / Math.PI),
  };
}

/**
 * Projects geographic building coordinates into the map viewBox around the
 * facility centre. The satellite image is north-up, so latitude maps to -y.
 */
export function projectPolygonToViewBox(
  points: readonly GeoPoint[],
  centerLat: number,
  centerLng: number,
  zoom: number
): MapPoint[] {
  const latRad = (centerLat * Math.PI) / 180;
  const metersPerDegreeLat = 111132.954 - 559.822 * Math.cos(2 * latRad);
  const metersPerDegreeLng = 111412.84 * Math.cos(latRad);
  const metersPerUnit = metersPerMapUnit(centerLat, zoom);
  if (metersPerUnit <= 0) return [];

  return points.map((point) => ({
    x:
      MAP_VIEWBOX_WIDTH / 2 +
      ((point.lng - centerLng) * metersPerDegreeLng) / metersPerUnit,
    y:
      MAP_VIEWBOX_HEIGHT / 2 -
      ((point.lat - centerLat) * metersPerDegreeLat) / metersPerUnit,
  }));
}

/**
 * Picks the closest supported zoom that keeps the whole building polygon
 * inside the satellite image, leaving a small margin around it.
 */
export function chooseZoomForGeoPolygon(
  points: readonly GeoPoint[] | undefined,
  centerLat: number,
  centerLng: number,
  minZoom = 17,
  maxZoom = 19
): number {
  if (!points || points.length < 3) return clampRooftopZoom(maxZoom);

  const latRad = (centerLat * Math.PI) / 180;
  const metersPerDegreeLat = 111132.954 - 559.822 * Math.cos(2 * latRad);
  const metersPerDegreeLng = 111412.84 * Math.cos(latRad);
  const maxOffsetLng = Math.max(
    ...points.map((point) => Math.abs(point.lng - centerLng))
  );
  const maxOffsetLat = Math.max(
    ...points.map((point) => Math.abs(point.lat - centerLat))
  );
  const widthMeters = maxOffsetLng * 2 * metersPerDegreeLng;
  const heightMeters = maxOffsetLat * 2 * metersPerDegreeLat;
  const padding = 1.25;

  for (let zoom = maxZoom; zoom >= minZoom; zoom--) {
    const metersPerUnit = metersPerMapUnit(centerLat, zoom);
    const visibleWidth = metersPerUnit * MAP_VIEWBOX_WIDTH;
    const visibleHeight = metersPerUnit * MAP_VIEWBOX_HEIGHT;
    if (
      visibleWidth >= widthMeters * padding &&
      visibleHeight >= heightMeters * padding
    ) {
      return zoom;
    }
  }

  return clampRooftopZoom(minZoom);
}

/** Returns the zoom encoded in a satellite image URL, if present. */
export function readMapZoom(src?: string): number | null {
  if (!src) return null;

  try {
    const url = new URL(src, "https://energytwin.local");
    const rawZoom = url.searchParams.get("zoom");
    if (rawZoom === null || rawZoom.trim() === "") return null;

    const zoom = Number(rawZoom);
    return Number.isFinite(zoom) ? clampRooftopZoom(zoom) : null;
  } catch {
    return null;
  }
}

/** Updates the zoom on an existing satellite image URL without losing other params. */
export function updateMapZoom(src: string, zoom: number): string {
  if (!src) return src;

  try {
    const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(src);
    const url = new URL(src, "https://energytwin.local");
    url.searchParams.set("zoom", String(clampRooftopZoom(zoom)));
    return isAbsolute ? url.toString() : `${url.pathname}${url.search}`;
  } catch {
    return src;
  }
}
