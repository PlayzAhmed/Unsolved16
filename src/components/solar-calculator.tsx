"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { calculateSolarSavings } from "@/lib/solar-calculator";
import { calculateKwhFromEgp, calculateEgpFromKwh } from "@/lib/egypt-tariffs";
import type { SolarResult } from "@/types";
import { cn } from "@/lib/utils";
import {
  SunMedium,
  PiggyBank,
  TrendingUp,
  Calendar,
  Maximize2,
  Leaf,
  Zap,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export interface SolarCalculatorProps {
  initialSpendEgp?: number;
  initialKwh?: number;
  initialRatio?: number;
  className?: string;
  showDashboardLink?: boolean;
  onResultChange?: (result: SolarResult) => void;
}

const PRESET_SPENDS = [
  { label: "Small Shop", spend: 2000, desc: "2,000 EGP/mo" },
  { label: "Bakery / Cafe", spend: 4500, desc: "4,500 EGP/mo" },
  { label: "Clinic / Office", spend: 9000, desc: "9,000 EGP/mo" },
  { label: "Light Industrial", spend: 18000, desc: "18,000 EGP/mo" },
];

const RATIO_PRESETS = [
  { label: "50% Base", value: 0.5 },
  { label: "75% Optimal", value: 0.75 },
  { label: "90% High", value: 0.9 },
  { label: "100% Net Zero", value: 1.0 },
];

export function SolarCalculator({
  initialSpendEgp = 3850,
  initialKwh,
  initialRatio = 0.8,
  className,
  showDashboardLink = true,
  onResultChange,
}: SolarCalculatorProps) {
  const [monthlySpendEgp, setMonthlySpendEgp] = useState<number>(initialSpendEgp);
  const [monthlyKwh, setMonthlyKwh] = useState<number>(
    initialKwh || calculateKwhFromEgp(initialSpendEgp)
  );
  const [transitionRatio, setTransitionRatio] = useState<number>(initialRatio);

  // Pure deterministic solar calculation
  const solarResult: SolarResult = useMemo(() => {
    const res = calculateSolarSavings({
      monthlySpendEgp,
      monthlyKwh,
      transitionRatio,
    });
    if (onResultChange) {
      onResultChange(res);
    }
    return res;
  }, [monthlySpendEgp, monthlyKwh, transitionRatio, onResultChange]);

  const handleSpendChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setMonthlySpendEgp(safeVal);
    setMonthlyKwh(calculateKwhFromEgp(safeVal));
  };

  const handleKwhChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setMonthlyKwh(safeVal);
    setMonthlySpendEgp(calculateEgpFromKwh(safeVal));
  };

  const handleReset = () => {
    setMonthlySpendEgp(3850);
    setMonthlyKwh(calculateKwhFromEgp(3850));
    setTransitionRatio(0.8);
  };

  return (
    <div
      className={cn(
        "bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <SunMedium className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Solar Feasibility Calculator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic calculations based on Egyptian commercial electricity tariffs
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Electricity Spend */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Monthly Electricity Bill
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={500}
                max={250000}
                step={250}
                value={monthlySpendEgp || ""}
                onChange={(e) => handleSpendChange(Number(e.target.value) || 0)}
                className="w-28 px-2.5 py-1 text-sm font-extrabold text-right bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs font-bold text-slate-400">EGP</span>
            </div>
          </div>

          <input
            type="range"
            min={1000}
            max={40000}
            step={250}
            value={monthlySpendEgp || 3500}
            onChange={(e) => handleSpendChange(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
          />

          {/* Quick presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {PRESET_SPENDS.map((preset) => (
              <button
                key={preset.spend}
                type="button"
                onClick={() => handleSpendChange(preset.spend)}
                className={cn(
                  "p-2 rounded-lg border text-center transition-colors text-xs",
                  monthlySpendEgp === preset.spend
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                    : "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-600"
                )}
              >
                <div className="font-semibold">{preset.label}</div>
                <div className="text-[10px] text-slate-400">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Monthly Consumption (kWh) & Transition Ratio */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Monthly Consumption
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={100}
                max={150000}
                step={50}
                value={Math.round(monthlyKwh) || ""}
                onChange={(e) => handleKwhChange(Number(e.target.value) || 0)}
                className="w-24 px-2.5 py-1 text-sm font-extrabold text-right bg-slate-900 border border-slate-700 rounded-lg text-amber-400 focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-bold text-slate-400">kWh</span>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
              <span>Target Solar Transition Ratio:</span>
              <span className="text-emerald-400 font-extrabold text-sm">
                {Math.round(transitionRatio * 100)}%
              </span>
            </div>

            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={Math.round(transitionRatio * 100)}
              onChange={(e) => setTransitionRatio(Number(e.target.value) / 100)}
              className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
            />

            <div className="grid grid-cols-4 gap-1.5 mt-2.5">
              {RATIO_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setTransitionRatio(preset.value)}
                  className={cn(
                    "py-1.5 px-2 rounded-lg border text-center text-xs transition-colors",
                    Math.abs(transitionRatio - preset.value) < 0.02
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                      : "bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-600"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Outputs / Results Panel */}
      <div className="pt-4 border-t border-slate-700/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Calculated Solar Feasibility Outputs
          </h3>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
            {solarResult.greenScore}% SDG 7 Score
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Capacity */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Capacity
            </div>
            <div className="text-xl font-extrabold text-white">
              {solarResult.systemCapacityKwp.toFixed(2)}{" "}
              <span className="text-xs text-amber-400 font-normal">kWp</span>
            </div>
          </div>

          {/* 2. Capex */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
              Capex (EGP)
            </div>
            <div className="text-xl font-extrabold text-slate-100">
              {solarResult.initialCostEgp.toLocaleString()}
            </div>
          </div>

          {/* 3. Monthly Savings */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Savings/mo
            </div>
            <div className="text-xl font-extrabold text-emerald-400">
              {solarResult.monthlySavingsEgp.toLocaleString()}
            </div>
          </div>

          {/* 4. Payback */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Payback
            </div>
            <div className="text-xl font-extrabold text-slate-100">
              {solarResult.paybackPeriodYears > 0
                ? `${solarResult.paybackPeriodYears.toFixed(1)} yrs`
                : "—"}
            </div>
          </div>

          {/* 5. Roof Required */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              Roof Req.
            </div>
            <div className="text-xl font-extrabold text-slate-100">
              {solarResult.roofAreaRequiredM2.toFixed(0)}{" "}
              <span className="text-xs text-slate-400 font-normal">m²</span>
            </div>
          </div>

          {/* 6. CO2 Saved */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              CO₂ Avoided
            </div>
            <div className="text-xl font-extrabold text-emerald-400">
              {solarResult.co2ReductionTons.toFixed(1)}{" "}
              <span className="text-xs text-slate-400 font-normal">T/yr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Link to Full Dashboard */}
      {showDashboardLink && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Need GIS rooftop polygon scanning and Bank Micro-Finance proposal export?
          </span>
          <Link
            href={`/dashboard?spend=${monthlySpendEgp}&kwh=${Math.round(
              monthlyKwh
            )}&ratio=${transitionRatio}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shrink-0"
          >
            <span>Open in Full Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
