"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Sun } from "lucide-react";

export interface SolarSliderProps {
  value: number; // 0.5 to 1.0 or 50 to 100
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

const PRESETS = [
  { label: "50% Offset", value: 0.5, desc: "Cost-Effective Base" },
  { label: "75% Optimal", value: 0.75, desc: "Max Commercial ROI" },
  { label: "90% Resilient", value: 0.9, desc: "Peak Shaving" },
  { label: "100% Net Zero", value: 1.0, desc: "Zero Grid Bill" },
];

export function SolarSlider({
  value,
  onChange,
  className,
  disabled = false,
}: SolarSliderProps) {
  // Normalize value to 50-100 for native range input
  const percentValue = value <= 1.0 ? Math.round(value * 100) : Math.round(value);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = Number(e.target.value);
    // Emit as ratio (0.5 to 1.0)
    onChange(rawVal / 100);
  };

  const handlePresetClick = (presetVal: number) => {
    onChange(presetVal);
  };

  return (
    <div
      className={cn(
        "bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-slate-100">
              Solar Transition Ratio
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Adjust target solar energy replacement for your facility (50% to 100%)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-base font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {percentValue}% Solar Target
          </span>
        </div>
      </div>

      {/* Slider Input */}
      <div className="relative py-2">
        <input
          type="range"
          min={50}
          max={100}
          step={1}
          value={percentValue}
          onChange={handleSliderChange}
          disabled={disabled}
          className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <div className="flex justify-between text-xs font-semibold text-slate-400 mt-2 px-1">
          <span>50% (Partial Grid Relief)</span>
          <span>75% (Recommended)</span>
          <span>100% (Full Net-Zero)</span>
        </div>
      </div>

      {/* Quick Select Presets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
        {PRESETS.map((preset) => {
          const isSelected = Math.abs(percentValue - preset.value * 100) < 2;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePresetClick(preset.value)}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-150",
                isSelected
                  ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 font-semibold shadow-md shadow-emerald-950/40"
                  : "bg-slate-900/40 border-slate-700/60 text-slate-300 hover:bg-slate-750 hover:border-slate-600"
              )}
            >
              <div className="flex items-center gap-1 text-xs font-bold">
                {isSelected && <Sparkles className="w-3 h-3 text-emerald-400" />}
                {preset.label}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {preset.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
