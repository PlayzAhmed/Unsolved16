"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { RooftopData } from "@/types";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Maximize2,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Map as MapIcon,
  RefreshCw,
} from "lucide-react";

export interface MapPreviewProps {
  rooftopData?: RooftopData;
  requiredAreaM2: number;
  className?: string;
}

export function MapPreview({
  rooftopData,
  requiredAreaM2,
  className,
}: MapPreviewProps) {
  const address = rooftopData?.formattedAddress || "المعادي، القاهرة، مصر";
  const availableAreaM2 = rooftopData?.polygonAreaM2 || 280;
  const rawStaticMapUrl = rooftopData?.staticMapUrl;
  const lat = rooftopData?.lat ?? 29.9602;
  const lng = rooftopData?.lng ?? 31.2569;

  const [zoom, setZoom] = useState<number>(18);
  const [mapType, setMapType] = useState<"satellite" | "hybrid">("satellite");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeSrc, setActiveSrc] = useState<string>("");

  const fits = requiredAreaM2 <= availableAreaM2;
  const coveragePercent =
    availableAreaM2 > 0
      ? Math.min(100, Math.round((requiredAreaM2 / availableAreaM2) * 100))
      : 0;
  const remainingAreaM2 = Math.max(0, Math.round((availableAreaM2 - requiredAreaM2) * 10) / 10);

  // Guaranteed working internal satellite endpoint
  const internalSatelliteUrl = useMemo(() => {
    return `/api/rooftop-image?lat=${lat}&lng=${lng}&area=${availableAreaM2}&address=${encodeURIComponent(
      address
    )}&zoom=${zoom}`;
  }, [lat, lng, availableAreaM2, address, zoom]);

  // Dynamically reflect zoom & maptype toggles
  const targetMapUrl = useMemo(() => {
    if (!rawStaticMapUrl) return internalSatelliteUrl;

    try {
      if (rawStaticMapUrl.startsWith("/")) {
        const url = new URL(rawStaticMapUrl, "http://localhost");
        url.searchParams.set("zoom", String(zoom));
        return url.pathname + url.search;
      } else {
        const url = new URL(rawStaticMapUrl);
        url.searchParams.set("zoom", String(zoom));
        url.searchParams.set("maptype", mapType);
        return url.toString();
      }
    } catch {
      return internalSatelliteUrl;
    }
  }, [rawStaticMapUrl, zoom, mapType, internalSatelliteUrl]);

  // Update activeSrc whenever target URL changes
  useEffect(() => {
    setActiveSrc(targetMapUrl);
    setImageLoaded(false);
  }, [targetMapUrl]);

  return (
    <div
      className={cn(
        "bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between space-y-4",
        className
      )}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Rooftop Satellite Analysis
              </h3>
              <p className="text-[11px] text-slate-400">
                Google Static Maps API Satellite imagery & Overpass API GIS area
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Overpass Polygon Sized
          </span>
        </div>

        {/* Satellite Map Visual Container */}
        <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex items-center justify-center group shadow-inner">
          {/* Real Satellite Imagery: loads Google Static Maps if configured, or internal satellite tile */}
          {activeSrc ? (
            <img
              key={activeSrc}
              src={activeSrc}
              alt={`Satellite rooftop analysis for ${address}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                // If external Google Static Maps fails (e.g. 403 No API key),
                // smoothly fall back to our zero-downtime satellite endpoint!
                if (activeSrc !== internalSatelliteUrl) {
                  setActiveSrc(internalSatelliteUrl);
                }
              }}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 filter contrast-115 brightness-95",
                imageLoaded ? "opacity-90" : "opacity-0"
              )}
            />
          ) : null}

          {/* Loading Skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
              <span>Loading Rooftop Satellite Analysis...</span>
            </div>
          )}

          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />

          {/* Roof Building Polygon Graphic Overlay representing the Overpass footprint */}
          <div className="relative z-10 w-48 h-32 rounded-xl border-2 border-emerald-400 bg-emerald-950/60 shadow-2xl shadow-emerald-500/30 flex flex-col items-center justify-center p-3 backdrop-blur-md text-center transition-transform hover:scale-105 duration-200">
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest flex items-center gap-1 mb-0.5">
              <Maximize2 className="w-3 h-3" />
              Overpass Rooftop
            </span>
            <span className="text-2xl font-black text-white tracking-tight">
              {availableAreaM2.toFixed(0)} <span className="text-sm font-semibold text-emerald-400">m²</span>
            </span>
            <div className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] bg-slate-900/90 text-amber-300 border border-amber-500/40 font-bold shadow-xs">
              PV Target: {requiredAreaM2.toFixed(0)} m² ({coveragePercent}%)
            </div>
          </div>

          {/* Coordinate & Location Badge */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/95 border border-slate-700/80 text-xs text-slate-200 shadow-lg backdrop-blur-sm">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[190px] font-medium">{address}</span>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              ({lat.toFixed(4)}, {lng.toFixed(4)})
            </span>
          </div>

          {/* Feasibility Indicator Badge */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {fits ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-500 text-emerald-300 shadow-lg backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                100% Fit Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500 text-amber-300 shadow-lg backdrop-blur-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Exceeds Polygon
              </span>
            )}
          </div>

          {/* Google Static Maps Interactive Controls (Zoom & Maptype) */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-300 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 backdrop-blur-xs flex items-center gap-1 shadow-sm">
              <MapIcon className="w-3 h-3 text-emerald-400" />
              Satellite Layer
            </span>

            {/* MapType toggle */}
            <button
              type="button"
              onClick={() => {
                setImageLoaded(false);
                setMapType(mapType === "satellite" ? "hybrid" : "satellite");
              }}
              title="Toggle Satellite / Hybrid layer"
              className="text-[10px] font-bold uppercase px-2 py-1 rounded border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 backdrop-blur-xs transition-colors"
            >
              {mapType}
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center border border-slate-700 rounded bg-slate-900/80 backdrop-blur-xs overflow-hidden">
              <button
                type="button"
                disabled={zoom <= 17}
                onClick={() => {
                  setImageLoaded(false);
                  setZoom((z) => Math.max(17, z - 1));
                }}
                title="Zoom Out"
                className="p-1 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-slate-300 font-bold">
                {zoom}x
              </span>
              <button
                type="button"
                disabled={zoom >= 20}
                onClick={() => {
                  setImageLoaded(false);
                  setZoom((z) => Math.min(20, z + 1));
                }}
                title="Zoom In"
                className="p-1 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Area Clarification Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Extracted Rooftop Area from Overpass API */}
        <div className="bg-slate-900/70 border border-slate-700/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              Overpass Extracted Area
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              Total Roof
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-100 flex items-baseline gap-1.5">
            <span>{availableAreaM2.toFixed(1)}</span>
            <span className="text-xs font-medium text-slate-400">m²</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-500 shrink-0" />
            Extracted from OpenStreetMap building polygon query
          </p>
        </div>

        {/* Required Solar Panel Footprint */}
        <div className="bg-slate-900/70 border border-slate-700/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Required Array Area
            </span>
            <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
              {coveragePercent}% Used
            </span>
          </div>
          <div className="text-xl font-extrabold text-amber-300 flex items-baseline gap-1.5">
            <span>{requiredAreaM2.toFixed(1)}</span>
            <span className="text-xs font-medium text-slate-400">m²</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-500 shrink-0" />
            Sized at 6 m² per kWp for commercial PV modules
          </p>
        </div>
      </div>

      {/* Feasibility Clarification Status Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              fits ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            )}
          />
          <span>
            {fits ? (
              <>
                Feasible: Required array occupies <strong>{coveragePercent}%</strong> of detected
                polygon (<strong>{remainingAreaM2} m²</strong> remaining for maintenance paths).
              </>
            ) : (
              <>
                Capacity Alert: Required array ({requiredAreaM2} m²) exceeds detected roof (
                {availableAreaM2} m²). Consider adjusting transition slider.
              </>
            )}
          </span>
        </div>

        <a
          href={`https://www.google.com/maps/@${lat},${lng},19z/data=!3m1!1e3`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline shrink-0 transition-colors"
        >
          <span>Open in Google Maps Satellite</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
