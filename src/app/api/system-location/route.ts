import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CACHE_TTL_MS = 30_000;

interface SystemLocation {
  lat: number;
  lng: number;
  accuracy: number;
  source: string;
}

let cachedLocation: { data: SystemLocation; expiresAt: number } | null = null;

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized === "::1" ||
    /^127\./.test(normalized)
  ) {
    return true;
  }

  return (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(normalized) ||
    /^169\.254\.\d{1,3}\.\d{1,3}$/.test(normalized)
  );
}

export async function GET(request: NextRequest) {
  if (!isPrivateHostname(request.nextUrl.hostname)) {
    return NextResponse.json(
      {
        success: false,
        message: "خدمة موقع الجهاز متاحة فقط عند تشغيل التطبيق محليًا.",
      },
      { status: 403 }
    );
  }

  if (process.platform !== "win32") {
    return NextResponse.json(
      {
        success: false,
        message: "خدمة موقع الجهاز غير متاحة على هذا النظام.",
      },
      { status: 501 }
    );
  }

  if (cachedLocation && cachedLocation.expiresAt > Date.now()) {
    return NextResponse.json({ success: true, data: cachedLocation.data });
  }

  try {
    const scriptPath = path.join(process.cwd(), "scripts", "system-location.ps1");
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
      ],
      {
        timeout: 20_000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      }
    );

    const parsed = JSON.parse(stdout.trim()) as Record<string, unknown>;
    const lat = Number(parsed.latitude);
    const lng = Number(parsed.longitude);
    const accuracy = Number(parsed.accuracy);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(accuracy) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      throw new Error("Invalid system location payload.");
    }

    const data: SystemLocation = {
      lat,
      lng,
      accuracy,
      source: typeof parsed.source === "string" ? parsed.source : "Windows",
    };

    cachedLocation = { data, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "تعذر قراءة موقع الجهاز من نظام التشغيل.",
      },
      { status: 503 }
    );
  }
}
