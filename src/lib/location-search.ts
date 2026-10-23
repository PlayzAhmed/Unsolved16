export interface LatLng {
  lat: number;
  lng: number;
}

export interface KnownLocation {
  lat: number;
  lng: number;
  area: number;
  label: string;
  aliases: string[];
  coords?: LatLng[];
}

export interface ResolvedLocation extends LatLng {
  formattedAddress: string;
  presetCoords?: LatLng[];
  locationResolved: boolean;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  locationResolved: boolean;
}

export const KNOWN_LOCATIONS: Record<string, KnownLocation> = {
  maadi: {
    lat: 29.9602,
    lng: 31.2569,
    area: 280,
    label: "المعادي، القاهرة، مصر",
    aliases: ["maadi", "المعادي", "المعادي القاهرة", "المعادي القاهرة مصر"],
    coords: [
      { lat: 29.9604, lng: 31.2566 },
      { lat: 29.9604, lng: 31.2573 },
      { lat: 29.96, lng: 31.2573 },
      { lat: 29.96, lng: 31.2566 },
    ],
  },
  "10th": {
    lat: 30.2988,
    lng: 31.7431,
    area: 950,
    label: "المنطقة الصناعية، العاشر من رمضان، الشرقية",
    aliases: ["10th of ramadan", "العاشر من رمضان"],
    coords: [
      { lat: 30.2993, lng: 31.7425 },
      { lat: 30.2993, lng: 31.7438 },
      { lat: 30.2982, lng: 31.7438 },
      { lat: 30.2982, lng: 31.7425 },
    ],
  },
  nasr: {
    lat: 30.0561,
    lng: 31.3301,
    area: 420,
    label: "مدينة نصر، القاهرة، مصر",
    aliases: ["nasr city", "مدينة نصر", "مدينة نصر القاهرة"],
    coords: [
      { lat: 30.0564, lng: 31.3297 },
      { lat: 30.0564, lng: 31.3306 },
      { lat: 30.0558, lng: 31.3306 },
      { lat: 30.0558, lng: 31.3297 },
    ],
  },
  october: {
    lat: 29.9723,
    lng: 30.9419,
    area: 600,
    label: "المنطقة الصناعية، السادس من أكتوبر، الجيزة",
    aliases: ["6th of october", "السادس من أكتوبر"],
    coords: [
      { lat: 29.9727, lng: 30.9413 },
      { lat: 29.9727, lng: 30.9426 },
      { lat: 29.9718, lng: 30.9426 },
      { lat: 29.9718, lng: 30.9413 },
    ],
  },
};

export function isValidCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/[،,]/g, " ").replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getGoogleResult(value: unknown): ResolvedLocation | null {
  if (!isRecord(value) || value.status !== "OK" || !Array.isArray(value.results)) return null;
  for (const result of value.results) {
    if (!isRecord(result) || !isRecord(result.geometry) || !isRecord(result.geometry.location)) continue;
    const lat = Number(result.geometry.location.lat);
    const lng = Number(result.geometry.location.lng);
    if (isValidCoordinates(lat, lng)) {
      return {
        lat,
        lng,
        formattedAddress: typeof result.formatted_address === "string" ? result.formatted_address : "",
        locationResolved: true,
      };
    }
  }
  return null;
}

function getNominatimResult(value: unknown): ResolvedLocation | null {
  if (!Array.isArray(value)) return null;
  for (const result of value) {
    if (!isRecord(result)) continue;
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (isValidCoordinates(lat, lng)) {
      return {
        lat,
        lng,
        formattedAddress: typeof result.display_name === "string" ? result.display_name : "",
        locationResolved: true,
      };
    }
  }
  return null;
}

export async function resolveAddress(
  address: string,
  options: { googleApiKey?: string; fetcher?: typeof fetch; timeoutMs?: number } = {}
): Promise<ResolvedLocation> {
  const normalizedAddress = normalizeAddress(address);
  const preset = Object.values(KNOWN_LOCATIONS).find((location) =>
    [location.label, ...location.aliases].some((alias) => normalizeAddress(alias) === normalizedAddress)
  );
  if (preset) {
    return {
      lat: preset.lat,
      lng: preset.lng,
      formattedAddress: preset.label,
      presetCoords: preset.coords,
      locationResolved: true,
    };
  }

  const fetcher = options.fetcher || fetch;
  const timeoutMs = options.timeoutMs ?? 6000;

  if (options.googleApiKey) {
    try {
      const googleAddress = /,\s*(Egypt|مصر)\s*$/i.test(address) ? address : `${address}, Egypt`;
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", googleAddress);
      url.searchParams.set("region", "eg");
      url.searchParams.set("language", "ar");
      url.searchParams.set("key", options.googleApiKey);
      const response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) {
        const location = getGoogleResult(await response.json());
        if (location) return { ...location, formattedAddress: location.formattedAddress || address };
      }
    } catch {
      // Try Nominatim if Google is unavailable or has no match.
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "eg");
    url.searchParams.set("accept-language", "ar,en");
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "EnergyTwin-AI-Solar-GIS/1.0 (SolveThe17)",
        "Accept-Language": "ar,en",
      },
    });
    if (response.ok) {
      const location = getNominatimResult(await response.json());
      if (location) return { ...location, formattedAddress: location.formattedAddress || address };
    }
  } catch {
    // Use the marked demo fallback below so the dashboard remains available.
  }

  const fallback = KNOWN_LOCATIONS.maadi;
  return {
    lat: fallback.lat,
    lng: fallback.lng,
    formattedAddress: address || fallback.label,
    locationResolved: false,
  };
}

export function formatCurrentLocationLabel(lat: number, lng: number): string {
  return `موقعك الحالي (${lat.toFixed(5)}، ${lng.toFixed(5)})`;
}

/**
 * Resolves a device coordinate into a human-readable Arabic address.
 * The coordinate itself is always authoritative, so a provider outage only
 * affects the label, never the rooftop location used by the calculator.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
  options: { googleApiKey?: string; fetcher?: typeof fetch; timeoutMs?: number } = {}
): Promise<ReverseGeocodeResult> {
  if (!isValidCoordinates(lat, lng)) {
    return { formattedAddress: "موقعك الحالي", locationResolved: false };
  }

  const fetcher = options.fetcher || fetch;
  const timeoutMs = options.timeoutMs ?? 4000;

  if (options.googleApiKey) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("latlng", `${lat},${lng}`);
      url.searchParams.set("language", "ar");
      url.searchParams.set("region", "eg");
      url.searchParams.set("key", options.googleApiKey);

      const response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) {
        const json = await response.json();
        if (isRecord(json) && json.status === "OK" && Array.isArray(json.results)) {
          for (const result of json.results) {
            if (isRecord(result) && typeof result.formatted_address === "string") {
              const formattedAddress = result.formatted_address.trim();
              if (formattedAddress) {
                return { formattedAddress, locationResolved: true };
              }
            }
          }
        }
      }
    } catch {
      // Try OpenStreetMap reverse geocoding next.
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "ar,en");

    const response = await fetcher(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "EnergyTwin-AI-Solar-GIS/1.0 (SolveThe17)",
        "Accept-Language": "ar,en",
      },
    });
    if (response.ok) {
      const json = await response.json();
      if (isRecord(json) && typeof json.display_name === "string") {
        const formattedAddress = json.display_name.trim();
        if (formattedAddress) {
          return { formattedAddress, locationResolved: true };
        }
      }
    }
  } catch {
    // Fall back to the coordinate label below.
  }

  return {
    formattedAddress: formatCurrentLocationLabel(lat, lng),
    locationResolved: true,
  };
}
