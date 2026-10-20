"use client";

import React from "react";
import type { RooftopData } from "@/types";
import { cn } from "@/lib/utils";
import { MapPin, Maximize2, ShieldCheck, AlertTriangle, Layers } from "lucide-react";

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
  const fits = requiredAreaM2 <= availableAreaM2;
  const coveragePercent = Math.min(100, Math.round((requiredAreaM2 / availableAreaM2) * 100));

  return (
    <div
      className={cn(
        "bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between",
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">
              Rooftop Satellite Analysis
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-300 font-medium">
            Overpass & GIS Sizing
          </span>
        </div>

        {/* Satellite Map Visual Container */}
        <div className="relative w-full h-56 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex items-center justify-center">
          {/* Simulated Satellite Map Background with Grid & Building Footprint */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(#1e293b 1.5px, transparent 1.5px), radial-gradient(#0f172a 1.5px, #020617 1.5px)",
              backgroundSize: "24px 24px",
              backgroundPosition: "0 0, 12px 12px",
            }}
          />

          {/* Simulated Satellite imagery streets and terrain tints */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/60 to-emerald-950/20" />

          {/* Roof Building Polygon Graphic Overlay */}
          <div className="relative z-10 w-44 h-32 rounded-lg border-2 border-emerald-400 bg-emerald-500/20 shadow-2xl shadow-emerald-500/30 flex flex-col items-center justify-center p-2 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5" />
              Detected Roof
            </span>
            <span className="text-lg font-extrabold text-white">
              {availableAreaM2.toFixed(0)} m²
            </span>
            <div className="mt-1 px-2 py-0.5 rounded text-[10px] bg-slate-900/80 text-amber-300 border border-amber-500/30 font-semibold">
              PV Array: {requiredAreaM2.toFixed(0)} m² ({coveragePercent}%)
            </div>
          </div>

          {/* Location Badge */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[200px]">{address}</span>
          </div>

          {/* Feasibility Indicator Tag */}
          <div className="absolute top-3 right-3 z-10">
            {fits ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500 text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                100% Fit Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 border border-amber-500 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                Exceeds Polygon
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rooftop Footprint Breakdown */}
      <div className="mt-4 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 block">Available Footprint:</span>
          <span className="text-sm font-bold text-slate-200">{availableAreaM2} m²</span>
        </div>
        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 block">Required Solar Footprint:</span>
          <span className="text-sm font-bold text-emerald-400">{requiredAreaM2} m²</span>
        </div>
      </div>
    </div>
  );
}
