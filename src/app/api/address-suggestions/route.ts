import { NextRequest, NextResponse } from "next/server";

export interface AddressSuggestion {
  label: string;
  subLabel?: string;
  query?: string;
  lat?: number;
  lng?: number;
  category: "industrial" | "commercial" | "hub" | "general";
}

export interface AddressSuggestionsMeta {
  fallbackUsed: boolean;
  message?: string;
}

// Curated high-priority Egyptian SME commercial & industrial facilities
const EGYPT_COMMERCIAL_ZONES: AddressSuggestion[] = [
  {
    label: "المعادي، القاهرة",
    subLabel: "منطقة تجارية ومكاتب - القاهرة",
    lat: 29.9602,
    lng: 31.2569,
    category: "commercial",
  },
  {
    label: "المنطقة الصناعية، العاشر من رمضان",
    subLabel: "منشآت ومصانع - محافظة الشرقية",
    lat: 30.2988,
    lng: 31.7431,
    category: "industrial",
  },
  {
    label: "شارع عباس العقاد، مدينة نصر، القاهرة",
    subLabel: "محلات ومراكز تجارية وعيادات - القاهرة",
    lat: 30.0561,
    lng: 31.3301,
    category: "commercial",
  },
  {
    label: "المنطقة الصناعية، السادس من أكتوبر",
    subLabel: "مصانع ومخازن كبرى - محافظة الجيزة",
    lat: 29.9723,
    lng: 30.9419,
    category: "industrial",
  },
  {
    label: "التجمع الخامس، القاهرة الجديدة",
    subLabel: "مجمعات ومقرات شركات - القاهرة",
    lat: 30.0074,
    lng: 31.4285,
    category: "hub",
  },
  {
    label: "القرية الذكية، طريق مصر إسكندرية الصحراوي",
    subLabel: "مجمع شركات وتكنولوجيا - الجيزة",
    lat: 30.0754,
    lng: 31.0182,
    category: "hub",
  },
  {
    label: "المنطقة الصناعية، برج العرب الجديدة، الإسكندرية",
    subLabel: "مصانع ومستودعات - الإسكندرية",
    lat: 30.9167,
    lng: 29.5833,
    category: "industrial",
  },
  {
    label: "المنطقة الصناعية، مدينة العبور",
    subLabel: "صناعات خفيفة وتغذية - القليوبية",
    lat: 30.2227,
    lng: 31.4789,
    category: "industrial",
  },
  {
    label: "شارع جامعة الدول العربية، المهندسين",
    subLabel: "محلات وأنشطة تجارية - الجيزة",
    lat: 30.0526,
    lng: 31.2001,
    category: "commercial",
  },
  {
    label: "المنطقة الصناعية، مدينة السادات",
    subLabel: "مصانع غذائية وصناعات ثقيلة - المنوفية",
    lat: 30.3833,
    lng: 30.5167,
    category: "industrial",
  },
  {
    label: "المنطقة الحرة العامة، مدينة نصر",
    subLabel: "صناعات تصديرية وشركات تجارية - القاهرة",
    lat: 30.0522,
    lng: 31.3414,
    category: "hub",
  },
  {
    label: "شارع التسعين الشمالي، التجمع الخامس",
    subLabel: "بنوك ومباني تجارية إدارية - القاهرة الجديدة",
    lat: 30.0267,
    lng: 31.4644,
    category: "commercial",
  },
  {
    label: "سموحة، الإسكندرية",
    subLabel: "مراكز طبية وتجارية - الإسكندرية",
    lat: 31.2156,
    lng: 29.9553,
    category: "commercial",
  },
  {
    label: "المنطقة الصناعية، بدر",
    subLabel: "صناعات متوسطة وخفيفة - شرق القاهرة",
    lat: 30.1389,
    lng: 31.7417,
    category: "industrial",
  },
  {
    label: "شارع الهرم، الجيزة",
    subLabel: "محلات ومطاعم ومنشآت سياحية - الجيزة",
    lat: 29.9967,
    lng: 31.1894,
    category: "commercial",
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query || query.length < 1) {
      // Return top prominent commercial zones if no query
      return NextResponse.json({
        success: true,
        data: EGYPT_COMMERCIAL_ZONES.slice(0, 6),
        meta: {
          fallbackUsed: false,
        } satisfies AddressSuggestionsMeta,
      });
    }

    const lowerQuery = query.toLowerCase();

    // 1. Search preset Egyptian commercial/industrial zones
    const presetMatches = EGYPT_COMMERCIAL_ZONES.filter((zone) => {
      return (
        zone.label.toLowerCase().includes(lowerQuery) ||
        (zone.subLabel && zone.subLabel.toLowerCase().includes(lowerQuery))
      );
    });

    const googleApiKey =
      process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    let externalMatches: AddressSuggestion[] = [];

    // 2. Query Google Places Autocomplete API if key is available
    if (googleApiKey && query.length >= 2) {
      try {
        const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&components=country:eg&language=ar&key=${googleApiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(placesUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json.status === "OK" && Array.isArray(json.predictions)) {
            externalMatches = json.predictions.map(
              (p: { description: string; structured_formatting?: { main_text?: string; secondary_text?: string } }) => ({
                label: p.structured_formatting?.main_text || p.description,
                subLabel: p.structured_formatting?.secondary_text || "موقع معتمد - مصر",
                query: p.description,
                category: "commercial" as const,
              })
            );
          }
        }
      } catch {
        // Fall back gracefully
      }
    }

    // 3. OpenStreetMap Nominatim live autocomplete fallback (if external matches empty & query > 2 chars)
    if (externalMatches.length === 0 && query.length >= 2 && presetMatches.length < 4) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query + ", Egypt"
        )}&format=json&limit=4&countrycodes=eg&addressdetails=1`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(nomUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "EnergyTwin-AI-Search/1.0 (SolveThe17)",
          },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            externalMatches = json.map((item: { display_name: string; lat: string; lon: string }) => {
              const parts = item.display_name.split(",");
              const mainText = parts.slice(0, 2).join(",").trim();
              const subText = parts.slice(2, 5).join(",").trim() || "موقع داخل مصر";
              return {
                label: mainText,
                subLabel: subText,
                query: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                category: "general" as const,
              };
            });
          }
        }
      } catch {
        // Fall back gracefully
      }
    }

    // Merge & deduplicate results
    const combined = [...presetMatches, ...externalMatches];
    const seenLabels = new Set<string>();
    const deduplicated = combined.filter((item) => {
      const normalized = item.label.trim().toLowerCase();
      if (seenLabels.has(normalized)) return false;
      seenLabels.add(normalized);
      return true;
    });

    return NextResponse.json({
      success: true,
      data: deduplicated.slice(0, 8),
      meta: {
        fallbackUsed: false,
      } satisfies AddressSuggestionsMeta,
    });
  } catch {
    // AGENTS.md Zero-downtime mock fallback
    return NextResponse.json({
      success: true,
      data: EGYPT_COMMERCIAL_ZONES.slice(0, 5),
      meta: {
        fallbackUsed: true,
        message:
          "تعذر تحميل الاقتراحات الحالية، ويتم عرض مناطق تجريبية بدلًا منها.",
      } satisfies AddressSuggestionsMeta,
    });
  }
}
