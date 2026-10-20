import React from "react";
import type { SolarResult } from "@/types";
import { cn } from "@/lib/utils";
import {
  SunMedium,
  PiggyBank,
  TrendingUp,
  Leaf,
  Maximize2,
  Calendar,
  ShieldCheck,
  Zap,
} from "lucide-react";

export interface MetricsCardsProps {
  result: SolarResult;
  availableRoofM2?: number;
  className?: string;
}

export function MetricsCards({
  result,
  availableRoofM2,
  className,
}: MetricsCardsProps) {
  const roofCoverage =
    availableRoofM2 && availableRoofM2 > 0
      ? Math.min(100, Math.round((result.roofAreaRequiredM2 / availableRoofM2) * 100))
      : null;

  const treesEquivalent = Math.round(result.co2ReductionTons * 45); // ~45 urban trees per ton CO2/yr

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {/* 1. System Capacity */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            System Capacity
          </span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <SunMedium className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {result.systemCapacityKwp.toFixed(2)}
          </span>
          <span className="text-sm font-medium text-amber-400">kWp</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Optimal Egyptian Solar Tier</span>
        </div>
      </div>

      {/* 2. Initial Investment */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Estimated Capex
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {result.initialCostEgp.toLocaleString()}
          </span>
          <span className="text-sm font-medium text-emerald-400">EGP</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Commercial Tier (~28k EGP/kWp)</span>
        </div>
      </div>

      {/* 3. Monthly & Annual Savings */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Monthly Savings
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
            {result.monthlySavingsEgp.toLocaleString()}
          </span>
          <span className="text-sm font-medium text-emerald-500">EGP / mo</span>
        </div>
        <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
          <span>Annual Savings:</span>
          <span className="font-semibold text-slate-200">
            {result.annualSavingsEgp.toLocaleString()} EGP
          </span>
        </div>
      </div>

      {/* 4. Payback Period (ROI) */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm hover:border-amber-500/50 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Payback Period
          </span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {result.paybackPeriodYears > 0 ? result.paybackPeriodYears.toFixed(1) : "—"}
          </span>
          <span className="text-sm font-medium text-amber-400">Years</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>Target ROI:</span>
          <span className="font-semibold text-emerald-400">
            {result.paybackPeriodYears > 0
              ? `${Math.round((1 / result.paybackPeriodYears) * 100)}% / year`
              : "0%"}
          </span>
        </div>
      </div>

      {/* 5. Green Score (SDG 7) */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm lg:col-span-2 hover:border-emerald-500/50 transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Clean Energy Score (SDG 7)
            </span>
            <h4 className="text-lg font-bold text-slate-100 mt-0.5">
              {result.greenScore}% Renewable Offset
            </h4>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Leaf className="w-5 h-5" />
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-3 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-amber-400 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(10, result.greenScore))}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>Grid Dependent (Tiered)</span>
          <span className="text-emerald-400 font-semibold">Net-Zero Commercial SME</span>
        </div>
      </div>

      {/* 6. CO2 & Environmental Impact */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm hover:border-emerald-500/50 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            CO₂ Avoided
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Leaf className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {result.co2ReductionTons.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-emerald-400">Tons / yr</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <span>≈ {treesEquivalent} urban trees planted</span>
        </div>
      </div>

      {/* 7. Rooftop Footprint */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm hover:border-amber-500/50 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Required Roof Area
          </span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Maximize2 className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {result.roofAreaRequiredM2.toFixed(0)}
          </span>
          <span className="text-sm font-medium text-amber-400">m²</span>
        </div>
        <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
          <span>Coverage:</span>
          <span className="font-semibold text-slate-200">
            {roofCoverage !== null ? `${roofCoverage}% of roof` : "6 m² / kWp"}
          </span>
        </div>
      </div>
    </div>
  );
}
