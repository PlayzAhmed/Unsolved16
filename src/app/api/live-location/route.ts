import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";
import { resolveNetworkLocation } from "@/lib/live-location";

const PRIVATE_IPV4 =
  /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  );
}

function getClientIp(request: NextRequest): string | undefined {
  const candidates = [
    request.headers.get("x-forwarded-for")?.split(",")[0],
    request.headers.get("x-real-ip"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0],
  ];

  for (const candidate of candidates) {
    const ip = candidate?.trim().replace(/^::ffff:/, "");
    if (!ip) continue;

    const version = isIP(ip);
    if (version === 4 && PRIVATE_IPV4.test(ip)) continue;
    if (version === 6 && isPrivateIpv6(ip)) continue;
    if (version !== 0) return ip;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const location = await resolveNetworkLocation({
      clientIp: getClientIp(request),
    });

    if (!location) {
      return NextResponse.json({
        success: false,
        message: "تعذر تحديد الموقع التقريبي عبر الشبكة.",
      });
    }

    return NextResponse.json({ success: true, data: location });
  } catch {
    return NextResponse.json({
      success: false,
      message: "تعذر تحديد الموقع التقريبي عبر الشبكة.",
    });
  }
}
