export interface NetworkLocation {
  lat: number;
  lng: number;
  label?: string;
  source: "network";
}

const DEFAULT_TIMEOUT_MS = 2500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseProviderPayload(value: unknown): NetworkLocation | null {
  if (!isRecord(value)) return null;
  if (value.success === false || value.error === true) return null;

  const lat = Number(value.latitude);
  const lng = Number(value.longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return null;

  const labelParts = [value.city, value.region, value.country ?? value.country_name]
    .filter((part): part is string => typeof part === "string")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return {
    lat,
    lng,
    label: labelParts.length > 0 ? labelParts.join(", ") : undefined,
    source: "network",
  };
}

function buildProviderUrls(clientIp?: string): string[] {
  return clientIp
    ? [`https://ipwho.is/${clientIp}`, `https://ipapi.co/${clientIp}/json/`]
    : ["https://ipwho.is/", "https://ipapi.co/json/"];
}

export async function resolveNetworkLocation(
  options: { clientIp?: string; fetcher?: typeof fetch; timeoutMs?: number } = {}
): Promise<NetworkLocation | null> {
  const fetcher = options.fetcher || fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (const rawUrl of buildProviderUrls(options.clientIp)) {
    try {
      const response = await fetcher(new URL(rawUrl), {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: "application/json",
          "User-Agent": "EnergyTwin-AI-Solar-GIS/1.0 (SolveThe17)",
        },
      });
      if (!response.ok) continue;

      const location = parseProviderPayload(await response.json());
      if (location) return location;
    } catch {
      // Try the next provider so the demo never throws.
    }
  }

  return null;
}
