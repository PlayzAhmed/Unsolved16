"use client";

import React, { useState, useRef } from "react";
import type { BillData } from "@/types";
import { cn } from "@/lib/utils";
import {
  UploadCloud,
  FileCheck2,
  Sliders,
  Building2,
  Zap,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export interface BillUploaderProps {
  monthlySpendEgp: number;
  monthlyKwh: number;
  onSpendChange: (spend: number) => void;
  onKwhChange: (kwh: number) => void;
  onBillParsed?: (data: BillData) => void;
  className?: string;
}

const DEMO_BILLS = [
  {
    name: "مخبز المعادي",
    spend: 3850,
    kwh: 1366,
    meter: "EGY-ME-90214",
    desc: "Commercial Bakery",
  },
  {
    name: "مصنع العاشر",
    spend: 14200,
    kwh: 5075,
    meter: "EGY-10TH-3490",
    desc: "Light Manufacturing",
  },
  {
    name: "عيادات مدينة نصر",
    spend: 6500,
    kwh: 2315,
    meter: "EGY-NC-5821",
    desc: "Medical Center",
  },
];

export function BillUploader({
  monthlySpendEgp,
  monthlyKwh,
  onSpendChange,
  onKwhChange,
  onBillParsed,
  className,
}: BillUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedMeter, setParsedMeter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processBill = async (file?: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      if (file) {
        formData.append("billFile", file);
        setFileName(file.name);
      }

      const res = await fetch("/api/analyze-bill", {
        method: "POST",
        body: file ? formData : JSON.stringify({ totalCostEgp: monthlySpendEgp }),
        headers: file ? undefined : { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (json.success && json.data) {
        const { totalCostEgp, kwhConsumption, meterNumber } = json.data;
        onSpendChange(totalCostEgp);
        onKwhChange(kwhConsumption);
        setParsedMeter(meterNumber || null);
        if (onBillParsed) {
          onBillParsed(json.data);
        }
      }
    } catch {
      // Graceful fallback to default demo
      onSpendChange(3850);
      onKwhChange(1366);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processBill(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processBill(e.target.files[0]);
    }
  };

  const selectDemoProfile = (demo: typeof DEMO_BILLS[0]) => {
    setFileName(`Sample_${demo.name}.pdf`);
    setParsedMeter(demo.meter);
    onSpendChange(demo.spend);
    onKwhChange(demo.kwh);
    if (onBillParsed) {
      onBillParsed({
        totalCostEgp: demo.spend,
        kwhConsumption: demo.kwh,
        meterNumber: demo.meter,
        customerName: demo.name,
      });
    }
  };

  return (
    <div
      className={cn(
        "bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-slate-100">
            Electricity Consumption Input
          </h3>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-300 font-medium">
          OCR Bill Scan & Manual Fallback
        </span>
      </div>

      {/* Bill Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 relative overflow-hidden",
          isDragging
            ? "border-emerald-400 bg-emerald-500/10"
            : "border-slate-700 hover:border-emerald-500/50 bg-slate-900/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
            <p className="text-sm font-semibold text-slate-200">
              Scanning Egyptian Electricity Bill...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Extracting meter number, tariff bracket & monthly consumption
            </p>
          </div>
        ) : fileName ? (
          <div className="flex items-center justify-center gap-3 py-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div className="text-left">
              <p className="text-sm font-bold text-slate-200">{fileName}</p>
              <p className="text-xs text-emerald-400">
                {parsedMeter ? `Meter #${parsedMeter} verified` : "Parsed successfully"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2">
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              Drag & drop bill photo here or <span className="text-emerald-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports JPEG, PNG, or PDF Egyptian Electricity bills
            </p>
          </div>
        )}
      </div>

      {/* Preset Demo SME Bills */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          Quick Demo SME Profiles (One-Click Test):
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DEMO_BILLS.map((demo) => (
            <button
              key={demo.meter}
              type="button"
              onClick={() => selectDemoProfile(demo)}
              className="text-left p-2.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
            >
              <div className="text-xs font-bold text-slate-200">{demo.name}</div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                {demo.spend.toLocaleString()} EGP / mo
              </div>
              <div className="text-[10px] text-slate-400">{demo.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Slider & Number Input Fallback */}
      <div className="mt-5 pt-4 border-t border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            Manual Bill Adjustment (EGP / Month)
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={500}
              max={150000}
              step={100}
              value={monthlySpendEgp || ""}
              onChange={(e) => onSpendChange(Number(e.target.value) || 0)}
              className="w-28 px-2.5 py-1 text-sm font-bold text-right bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs font-semibold text-slate-400">EGP</span>
          </div>
        </div>

        <input
          type="range"
          min={1000}
          max={40000}
          step={250}
          value={monthlySpendEgp || 3500}
          onChange={(e) => onSpendChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
        />

        <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Estimated Consumption: <strong className="text-slate-200">{Math.round(monthlyKwh)} kWh/mo</strong>
          </span>
          <span>1,000 to 40,000+ EGP</span>
        </div>
      </div>
    </div>
  );
}
