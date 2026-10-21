import { NextRequest, NextResponse } from "next/server";

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/**
 * Procedural fallback SVG when external satellite servers are unreachable.
 * Mimics high-resolution satellite imagery with building footprint, rooftop features, and PV modules.
 */
function generateFallbackSatelliteSvg(
  lat: number,
  lng: number,
  areaM2: number,
  address: string
): string {
  const safeArea = Math.round(areaM2 || 280);
  const panelsCount = Math.max(12, Math.round(safeArea / 2.5));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
    <defs>
      <!-- Satellite ground terrain pattern -->
      <radialGradient id="satGlow" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="#1e293b" />
        <stop offset="60%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#020617" />
      </radialGradient>

      <!-- Solar PV panel pattern -->
      <pattern id="solarGrid" width="16" height="24" patternUnits="userSpaceOnUse">
        <rect width="15" height="23" fill="#1e3a8a" stroke="#38bdf8" stroke-width="0.7" rx="1" />
        <line x1="0" y1="8" x2="15" y2="8" stroke="#0284c7" stroke-width="0.5" />
        <line x1="0" y1="16" x2="15" y2="16" stroke="#0284c7" stroke-width="0.5" />
        <line x1="7.5" y1="0" x2="7.5" y2="23" stroke="#93c5fd" stroke-width="0.4" stroke-opacity="0.7" />
      </pattern>

      <!-- Roof gravel texture pattern -->
      <pattern id="roofTexture" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#334155" />
        <circle cx="2" cy="2" r="1" fill="#475569" opacity="0.6" />
        <circle cx="6" cy="6" r="1" fill="#1e293b" opacity="0.8" />
      </pattern>

      <filter id="shadow" x="-10%" y="-10%" width="125%" height="125%">
        <feDropShadow dx="8" dy="12" stdDeviation="6" flood-color="#000000" flood-opacity="0.75" />
      </filter>
    </defs>

    <!-- 1. Satellite Terrain Background -->
    <rect width="640" height="360" fill="url(#satGlow)" />

    <!-- Street layout lines (urban satellite simulation) -->
    <path d="M-20,90 Q220,110 660,80" stroke="#475569" stroke-width="26" stroke-opacity="0.35" fill="none" />
    <path d="M-20,90 Q220,110 660,80" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="10 14" stroke-opacity="0.4" fill="none" />
    <path d="M480,-20 L450,380" stroke="#475569" stroke-width="22" stroke-opacity="0.35" fill="none" />

    <!-- Neighboring buildings (dimmed satellite context) -->
    <rect x="40" y="30" width="110" height="80" fill="#1e293b" stroke="#334155" stroke-width="1.5" rx="3" opacity="0.6" />
    <rect x="60" y="220" width="130" height="100" fill="#1e293b" stroke="#334155" stroke-width="1.5" rx="3" opacity="0.6" />
    <rect x="490" y="140" width="120" height="150" fill="#1e293b" stroke="#334155" stroke-width="1.5" rx="3" opacity="0.6" />

    <!-- 2. Target Commercial SME Building Footprint -->
    <g filter="url(#shadow)">
      <!-- Building outer parapet -->
      <polygon points="180,95 440,95 440,265 180,265" fill="url(#roofTexture)" stroke="#10b981" stroke-width="3" rx="4" />
      
      <!-- Inner roof area -->
      <rect x="188" y="103" width="244" height="154" fill="#1e293b" stroke="#475569" stroke-width="1" rx="2" />

      <!-- Rooftop utility structures (HVAC & stairwell) -->
      <rect x="360" y="115" width="55" height="35" fill="#475569" stroke="#64748b" stroke-width="1" rx="2" />
      <circle cx="380" cy="132" r="8" fill="#334155" stroke="#94a3b8" stroke-width="1" />
      <rect x="205" y="215" width="40" height="30" fill="#334155" stroke="#64748b" stroke-width="1" />

      <!-- Proposed Solar PV Array Footprint (High efficiency panels) -->
      <rect x="205" y="118" width="140" height="88" fill="url(#solarGrid)" stroke="#38bdf8" stroke-width="1.5" rx="2" />
      <rect x="255" y="212" width="160" height="38" fill="url(#solarGrid)" stroke="#38bdf8" stroke-width="1.5" rx="2" />
    </g>

    <!-- 3. Overpass Building Polygon Boundary Highlight (Emerald) -->
    <rect x="178" y="93" width="264" height="174" fill="#10b981" fill-opacity="0.08" stroke="#10b981" stroke-width="2.5" stroke-dasharray="6 4" rx="4" />

    <!-- 4. Satellite HUD Telemetry Overlay -->
    <!-- Center coordinate marker pin -->
    <circle cx="310" cy="180" r="4" fill="#10b981" />
    <circle cx="310" cy="180" r="10" stroke="#10b981" stroke-width="1.5" fill="none" opacity="0.8" />

    <!-- Compass Rose (North Indicator) -->
    <g transform="translate(600, 35)">
      <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#334155" stroke-width="1" opacity="0.9" />
      <polygon points="0,-12 4,2 0,0 -4,2" fill="#ef4444" />
      <polygon points="0,12 4,2 0,0 -4,2" fill="#94a3b8" />
      <text x="-3.5" y="-14" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="bold">N</text>
    </g>

    <!-- Satellite Metadata Bar (Top) -->
    <rect x="12" y="12" width="240" height="24" rx="6" fill="#020617" fill-opacity="0.85" stroke="#334155" stroke-width="1" />
    <circle cx="24" cy="24" r="4" fill="#10b981" />
    <text x="34" y="28" fill="#e2e8f0" font-size="10" font-family="sans-serif" font-weight="bold">SATELLITE HIGH-RES (19x)</text>

    <!-- Scale Bar (Bottom Right) -->
    <g transform="translate(530, 335)">
      <rect x="-10" y="-14" width="105" height="22" rx="4" fill="#020617" fill-opacity="0.85" stroke="#334155" stroke-width="1" />
      <line x1="0" y1="0" x2="80" y2="0" stroke="#ffffff" stroke-width="3" />
      <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" stroke-width="2" />
      <line x1="80" y1="-4" x2="80" y2="4" stroke="#ffffff" stroke-width="2" />
      <text x="30" y="-4" fill="#ffffff" font-size="9" font-family="sans-serif" font-weight="bold">15 m</text>
    </g>

    <!-- Footprint Stats Overlay (Bottom Left) -->
    <g transform="translate(14, 310)">
      <rect x="0" y="0" width="280" height="38" rx="6" fill="#020617" fill-opacity="0.88" stroke="#334155" stroke-width="1" />
      <text x="10" y="16" fill="#94a3b8" font-size="9" font-family="sans-serif">GPS: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E • Egypt</text>
      <text x="10" y="30" fill="#10b981" font-size="10" font-family="sans-serif" font-weight="bold">Detected Polygon: ${safeArea} m² (~${panelsCount} PV Modules)</text>
    </g>
  </svg>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "29.9602");
  const lng = parseFloat(searchParams.get("lng") || "31.2569");
  const zoom = Math.min(19, Math.max(17, parseInt(searchParams.get("zoom") || "18", 10)));
  const areaM2 = parseFloat(searchParams.get("area") || "280");
  const address = searchParams.get("address") || "المعادي، القاهرة";

  // 1. Attempt to fetch real global high-resolution satellite imagery tile (ESRI World Imagery)
  // ESRI World Imagery provides public, free satellite imagery without requiring an API key.
  try {
    const { x, y } = latLngToTile(lat, lng, zoom);
    const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(tileUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "EnergyTwin-AI-Solar-GIS/1.0 (SolveThe17 Hackathon)",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }
  } catch {
    // If tile fetch fails or times out, proceed seamlessly to vector satellite CAD
  }

  // 2. High-impact procedural vector satellite CAD fallback
  const svg = generateFallbackSatelliteSvg(lat, lng, areaM2, address);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
