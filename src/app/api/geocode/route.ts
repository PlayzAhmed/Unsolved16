import { NextRequest, NextResponse } from "next/server";
import type { RoofAreaSource } from "@/types";
import {
  DEFAULT_ROOF_UTILIZATION_FACTOR,
  calculateUsableRoofArea,
  estimateRoofAreaFallback,
} from "@/lib/solar-calculator";
import { reverseGeocodeCoordinates } from "@/lib/location-search";

// Egyptian SME demo coordinates & baseline rooftop profiles
const KNOWN_LOCATIONS: Record<
  string,
  { lat: number; lng: number; area: number; label: string; coords?: { lat: number; lng: number }[] }
> = {
  maadi: {
    lat: 29.9602,
    lng: 31.2569,
    area: 280,
    label: "المعادي، القاهرة، مصر",
    coords: [
      { lat: 29.960275, lng: 31.256813 },
      { lat: 29.960275, lng: 31.256987 },
      { lat: 29.960125, lng: 31.256987 },
      { lat: 29.960125, lng: 31.256813 },
    ],
  },
  "10th": {
    lat: 30.2988,
    lng: 31.7431,
    area: 950,
    label: "المنطقة الصناعية، العاشر من رمضان، الشرقية",
    coords: [
      { lat: 30.298938, lng: 31.742940 },
      { lat: 30.298938, lng: 31.743260 },
      { lat: 30.298662, lng: 31.743260 },
      { lat: 30.298662, lng: 31.742940 },
    ],
  },
  nasr: {
    lat: 30.0561,
    lng: 31.3301,
    area: 420,
    label: "مدينة نصر، القاهرة، مصر",
    coords: [
      { lat: 30.056192, lng: 31.329994 },
      { lat: 30.056192, lng: 31.330206 },
      { lat: 30.056008, lng: 31.330206 },
      { lat: 30.056008, lng: 31.329994 },
    ],
  },
  october: {
    lat: 29.9723,
    lng: 30.9419,
    area: 600,
    label: "المنطقة الصناعية، السادس من أكتوبر، الجيزة",
    coords: [
      { lat: 29.972410, lng: 30.941773 },
      { lat: 29.972410, lng: 30.942027 },
      { lat: 29.972190, lng: 30.942027 },
      { lat: 29.972190, lng: 30.941773 },
    ],
  },
};

interface LatLng {
  lat: number;
  lng: number;
}

interface OverpassBuildingResult {
  area: number;
  coords: LatLng[];
}

interface GoogleSolarBuildingResult {
  wholeRoofAreaMeters2: number;
  maxArrayAreaMeters2: number;
}

interface PresetLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  presetCoords?: LatLng[];
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/**
 * Matches the curated Egyptian SME hubs before any external lookup.
 */
function findPresetLocation(address: string): PresetLocation | null {
  const lowerAddress = address.toLowerCase();

  if (lowerAddress.includes("رمضان") || lowerAddress.includes("10th")) {
    const location = KNOWN_LOCATIONS["10th"];
    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: location.label,
      presetCoords: location.coords,
    };
  }
  if (lowerAddress.includes("نصر") || lowerAddress.includes("nasr")) {
    const location = KNOWN_LOCATIONS.nasr;
    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: location.label,
      presetCoords: location.coords,
    };
  }
  if (lowerAddress.includes("أكتوبر") || lowerAddress.includes("october")) {
    const location = KNOWN_LOCATIONS.october;
    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: location.label,
      presetCoords: location.coords,
    };
  }
  if (lowerAddress.includes("معادي") || lowerAddress.includes("maadi")) {
    const location = KNOWN_LOCATIONS.maadi;
    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: location.label,
      presetCoords: location.coords,
    };
  }

  return null;
}

/**
 * Calculates planar rooftop polygon area in m² using geodesic projection.
 */
function calculateSphericalPolygonArea(coords: LatLng[]): number {
  if (!coords || coords.length < 3) return 0;

  const meanLatRad = ((coords.reduce((sum, c) => sum + c.lat, 0) / coords.length) * Math.PI) / 180;
  const metersPerDegreeLat = 111132.954 - 559.822 * Math.cos(2 * meanLatRad);
  const metersPerDegreeLng = 111412.84 * Math.cos(meanLatRad);

  let planarArea = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const x1 = p1.lng * metersPerDegreeLng;
    const y1 = p1.lat * metersPerDegreeLat;
    const x2 = p2.lng * metersPerDegreeLng;
    const y2 = p2.lat * metersPerDegreeLat;
    planarArea += x1 * y2 - x2 * y1;
  }

  const result = Math.abs(planarArea) / 2;
  return Math.round(result * 100) / 100;
}

/**
 * Rapid geocoding matching presets first, with Google Geocoding & Nominatim fallback.
 */
async function geocodeAddress(
  address: string,
  googleApiKey?: string
): Promise<PresetLocation & { locationResolved: boolean }> {
  const preset = findPresetLocation(address);
  if (preset) {
    return { ...preset, locationResolved: true };
  }

  // Google Geocoding API if configured
  if (googleApiKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address + ", Egypt"
      )}&key=${googleApiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(gUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return {
            lat: loc.lat,
            lng: loc.lng,
            formattedAddress: data.results[0].formatted_address || address,
            locationResolved: true,
          };
        }
      }
    } catch {
      // Proceed to Nominatim fallback
    }
  }

  // OpenStreetMap Nominatim with quick 2s timeout
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      address + ", Egypt"
    )}&format=json&limit=1&countrycodes=eg`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(nomUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "EnergyTwin-AI-Solar-GIS/1.0 (SolveThe17)",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          formattedAddress: item.display_name || address,
          locationResolved: true,
        };
      }
    }
  } catch {
    // Fallback to default Maadi location
  }

  return {
    lat: KNOWN_LOCATIONS.maadi.lat,
    lng: KNOWN_LOCATIONS.maadi.lng,
    formattedAddress: address.length > 3 ? address : KNOWN_LOCATIONS.maadi.label,
    presetCoords: KNOWN_LOCATIONS.maadi.coords,
    locationResolved: false,
  };
}

/**
 * Queries Overpass API (OpenStreetMap) with a safe 2.5s timeout.
 */
async function fetchBuildingAreaFromOverpass(
  lat: number,
  lng: number
): Promise<OverpassBuildingResult | null> {
  const overpassQuery = `
    [out:json][timeout:3];
    (
      way["building"](around:50,${lat},${lng});
      relation["building"](around:50,${lat},${lng});
    );
    out geom;
  `;

  const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
    overpassQuery
  )}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(overpassUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const json = await res.json();
    if (!json.elements || json.elements.length === 0) return null;

    let bestArea = 0;
    let bestCoords: LatLng[] = [];
    let minDistance = Infinity;

    for (const elem of json.elements) {
      let coords: LatLng[] = [];

      if (elem.type === "way" && Array.isArray(elem.geometry)) {
        coords = elem.geometry.map((g: { lat: number; lon: number }) => ({
          lat: g.lat,
          lng: g.lon,
        }));
      } else if (elem.type === "relation" && Array.isArray(elem.members)) {
        const outer = elem.members.find(
          (m: { role: string; type: string; geometry: unknown }) =>
            m.role === "outer" && Array.isArray(m.geometry)
        );
        if (outer) {
          coords = outer.geometry.map((g: { lat: number; lon: number }) => ({
            lat: g.lat,
            lng: g.lon,
          }));
        }
      }

      if (coords.length >= 3) {
        const area = calculateSphericalPolygonArea(coords);
        const centroidLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
        const centroidLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
        const dist = Math.hypot(centroidLat - lat, centroidLng - lng);

        if (area >= 30 && area <= 20000) {
          if (dist < minDistance) {
            minDistance = dist;
            bestArea = area;
            bestCoords = coords;
          }
        }
      }
    }

    if (bestArea > 0) {
      return { area: bestArea, coords: bestCoords };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Optional Google Solar API lookup. Returns both the gross roof area and the
 * net array area when the Solar API is enabled for the provided key.
 */
async function fetchGoogleSolarBuildingInsights(
  lat: number,
  lng: number,
  apiKey: string
): Promise<GoogleSolarBuildingResult | null> {
  const url = new URL("https://solar.googleapis.com/v1/buildingInsights:findClosest");
  url.searchParams.set("location.latitude", String(lat));
  url.searchParams.set("location.longitude", String(lng));
  url.searchParams.set("requiredQuality", "HIGH");
  url.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2800);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const json = await res.json();
    const potential = json?.solarPotential;
    const wholeRoofAreaMeters2 = Number(potential?.wholeRoofAreaMeters2);
    if (!Number.isFinite(wholeRoofAreaMeters2) || wholeRoofAreaMeters2 <= 0) {
      return null;
    }

    const maxArrayAreaMeters2 = Number(potential?.maxArrayAreaMeters2);
    return {
      wholeRoofAreaMeters2: Math.round(wholeRoofAreaMeters2 * 100) / 100,
      maxArrayAreaMeters2:
        Number.isFinite(maxArrayAreaMeters2) && maxArrayAreaMeters2 > 0
          ? Math.round(maxArrayAreaMeters2 * 100) / 100
          : 0,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Builds standard Google Static Maps API URL.
 */
function buildGoogleStaticMapUrl(params: {
  lat: number;
  lng: number;
  zoom?: number;
  size?: string;
  scale?: number;
  maptype?: "satellite" | "hybrid";
  polygonCoords?: LatLng[];
  apiKey?: string;
}): string {
  const {
    lat,
    lng,
    zoom = 19,
    size = "640x480",
    scale = 2,
    maptype = "satellite",
    polygonCoords,
    apiKey,
  } = params;

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${lat},${lng}`);
  url.searchParams.set("zoom", String(zoom));
  url.searchParams.set("size", size);
  url.searchParams.set("scale", String(scale));
  url.searchParams.set("maptype", maptype);
  url.searchParams.set("format", "png");

  // Emerald facility marker
  url.searchParams.set("markers", `color:0x10b981|size:mid|label:S|${lat},${lng}`);

  // Overlay building polygon footprint if coords are available
  if (polygonCoords && polygonCoords.length >= 3) {
    const simplified = polygonCoords.slice(0, 20);
    const pathStr = simplified.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join("|");
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    const closedPath =
      first.lat === last.lat && first.lng === last.lng
        ? pathStr
        : `${pathStr}|${first.lat.toFixed(6)},${first.lng.toFixed(6)}`;

    url.searchParams.set("path", `color:0x10b981ff|weight:2|fillcolor:0x10b98140|${closedPath}`);
  }

  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }

  return url.toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawAddress = typeof body.address === "string" ? body.address.trim() : "";
    const address = rawAddress || "المعادي، القاهرة";
    const monthlyKwh = Number(body.monthlyKwh || 1800);
    const googleApiKey =
      process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const googleSolarKey = process.env.GOOGLE_SOLAR_API_KEY || googleApiKey;

    // 1. Resolve the address. A suggestion or the browser's current location can
    // supply exact coordinates, which avoids a second geocoding round-trip and
    // keeps the selected place precise. When only coordinates are supplied, we
    // reverse geocode them to show a human-readable address.
    const requestedLat = Number(body.lat);
    const requestedLng = Number(body.lng);
    const hasRequestedCoordinates = isValidCoordinate(requestedLat, requestedLng);
    const shouldReverseGeocode =
      hasRequestedCoordinates && Boolean(body.reverse || !rawAddress);
    const presetLocation = rawAddress ? findPresetLocation(rawAddress) : null;
    const reversePromise =
      hasRequestedCoordinates && shouldReverseGeocode
        ? reverseGeocodeCoordinates(requestedLat, requestedLng, {
            googleApiKey,
          })
        : Promise.resolve(null);
    let resolved: PresetLocation & { locationResolved: boolean };
    if (hasRequestedCoordinates) {
      resolved = {
        lat: requestedLat,
        lng: requestedLng,
        formattedAddress: rawAddress || "موقع محدد على الخريطة",
        presetCoords: presetLocation?.presetCoords,
        locationResolved: true,
      };
    } else if (presetLocation) {
      resolved = { ...presetLocation, locationResolved: true };
    } else {
      resolved = await geocodeAddress(address, googleApiKey);
    }
    const { lat, lng, presetCoords, locationResolved } = resolved;

    // 2. Query OSM, Google Solar, and reverse geocoding in parallel. OSM is the
    // primary footprint source of truth; Google Solar supplies a higher-quality
    // net array area when the key has the Solar API enabled.
    const [overpassResult, googleSolarResult, reverseResult] = await Promise.all([
      fetchBuildingAreaFromOverpass(lat, lng),
      googleSolarKey
        ? fetchGoogleSolarBuildingInsights(lat, lng, googleSolarKey)
        : Promise.resolve<GoogleSolarBuildingResult | null>(null),
      reversePromise,
    ]);
    const formattedAddress =
      reverseResult?.formattedAddress || resolved.formattedAddress;

    let roofAreaM2 = 0;
    let polygonCoords: LatLng[] | undefined = undefined;
    let areaSource: RoofAreaSource = "overpass_polygon";

    if (overpassResult && overpassResult.area > 0) {
      roofAreaM2 = overpassResult.area;
      polygonCoords = overpassResult.coords;
      areaSource = "overpass_polygon";
    } else if (
      googleSolarResult &&
      googleSolarResult.wholeRoofAreaMeters2 > 0
    ) {
      roofAreaM2 = googleSolarResult.wholeRoofAreaMeters2;
      areaSource = "google_solar";
    } else if (presetCoords && presetCoords.length >= 3) {
      roofAreaM2 = calculateSphericalPolygonArea(presetCoords);
      polygonCoords = presetCoords;
      areaSource = "preset_polygon";
    } else {
      // 3. Fallback per AGENTS.md:
      // If Overpass returns no building polygon, estimate roof capacity using:
      // Estimated Area (m²) = Monthly kWh / 15
      roofAreaM2 = estimateRoofAreaFallback(monthlyKwh);
      areaSource = "fallback_formula";
    }

    // 4. Split gross roof area and net PV area. Prefer Google Solar's max
    // array area; otherwise apply a conservative utilization factor.
    const googleUsableAreaM2 = googleSolarResult?.maxArrayAreaMeters2 ?? 0;
    const usableAreaM2 =
      googleUsableAreaM2 > 0
        ? Math.min(
            roofAreaM2,
            Math.round(googleUsableAreaM2 * 100) / 100
          )
        : calculateUsableRoofArea(roofAreaM2);
    const usableAreaSource =
      googleUsableAreaM2 > 0 ? "google_solar" : "utilization_factor";
    const areaUtilizationFactor =
      roofAreaM2 > 0
        ? Math.round((usableAreaM2 / roofAreaM2) * 1000) / 1000
        : DEFAULT_ROOF_UTILIZATION_FACTOR;

    // Backward-compatible alias: existing consumers treat polygonAreaM2 as the
    // measured roof area, which is now explicitly the gross footprint.
    const polygonAreaM2 = roofAreaM2;

    // 5. Construct satellite imagery URL:
    // If a Google API Key is present, build direct Google Static Maps URL.
    // If no key is set yet, point directly to the zero-downtime satellite image endpoint (/api/rooftop-image)
    // which serves real high-resolution satellite tiles and vector CAD without key errors!
    const staticMapUrl = googleApiKey
      ? buildGoogleStaticMapUrl({
          lat,
          lng,
          zoom: 19,
          size: "640x480",
          scale: 2,
          maptype: "satellite",
          polygonCoords,
          apiKey: googleApiKey,
        })
      : `/api/rooftop-image?lat=${lat}&lng=${lng}&area=${roofAreaM2}&address=${encodeURIComponent(
          formattedAddress
        )}&zoom=19`;

    return NextResponse.json({
      success: true,
      data: {
        lat,
        lng,
        formattedAddress,
        locationResolved,
        roofAreaM2,
        usableAreaM2,
        areaUtilizationFactor,
        polygonAreaM2,
        staticMapUrl,
        polygonCoords,
        meta: {
          areaSource,
          usableAreaSource,
          hasGoogleKey: Boolean(googleApiKey),
          zoom: 19,
        },
      },
    });
  } catch {
    // AGENTS.md Zero-Downtime Fallback Architecture
    const fallbackKwh = 1800;
    const fallbackArea = estimateRoofAreaFallback(fallbackKwh);
    const fallbackUsableArea = calculateUsableRoofArea(fallbackArea);
    const googleApiKey =
      process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const fallbackLat = KNOWN_LOCATIONS.maadi.lat;
    const fallbackLng = KNOWN_LOCATIONS.maadi.lng;

    const staticMapUrl = googleApiKey
      ? buildGoogleStaticMapUrl({
          lat: fallbackLat,
          lng: fallbackLng,
          zoom: 19,
          apiKey: googleApiKey,
        })
      : `/api/rooftop-image?lat=${fallbackLat}&lng=${fallbackLng}&area=${fallbackArea}&address=${encodeURIComponent(
          "المعادي، القاهرة، مصر"
        )}&zoom=19`;

    return NextResponse.json({
      success: true,
      data: {
        lat: fallbackLat,
        lng: fallbackLng,
        formattedAddress: "المعادي، القاهرة، مصر",
        locationResolved: false,
        roofAreaM2: fallbackArea || 250,
        usableAreaM2:
          fallbackUsableArea || calculateUsableRoofArea(250),
        areaUtilizationFactor: DEFAULT_ROOF_UTILIZATION_FACTOR,
        polygonAreaM2: fallbackArea || 250,
        staticMapUrl,
        meta: {
          areaSource: "fallback_formula",
          usableAreaSource: "utilization_factor",
          hasGoogleKey: Boolean(googleApiKey),
          zoom: 19,
        },
      },
    });
  }
}
