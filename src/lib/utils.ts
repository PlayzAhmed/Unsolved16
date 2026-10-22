import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Builds a satellite map image URL from coordinates.
 * Uses Google Static Maps if env key present, else returns an OSM tile URL.
 */
export function buildStaticMapUrl(lat: number, lng: number, zoom = 18): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (key) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=640x360&maptype=satellite&key=${key}`;
  }
  // Fallback: OpenStreetMap tile PNG (no key needed)
  const tileZoom = 17;
  const n = Math.floor(((lat + 90) / 180) * Math.pow(2, tileZoom));
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, tileZoom));
  return `https://tile.openstreetmap.org/${tileZoom}/${x}/${n}.png`;
}

