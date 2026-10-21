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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
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
  const [parsedData, setParsedData] = useState<BillData | null>(null);
  const [showOcrDetails, setShowOcrDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderSectionRef = useRef<HTMLDivElement>(null);

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
        const data: BillData = json.data;
        setParsedData(data);

        if (data.totalCostEgp && data.totalCostEgp > 0) {
          onSpendChange(data.totalCostEgp);
        }
        if (data.kwhConsumption && data.kwhConsumption > 0) {
          onKwhChange(data.kwhConsumption);
        }
        if (onBillParsed) {
          onBillParsed(data);
        }

        // If OCR could not detect numbers, highlight the manual slider for user input
        if (data.lowConfidence) {
          sliderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    } catch {
      setParsedData({
        confidence: 0,
        lowConfidence: true,
        source: "tesseract",
        warning: "Could not read bill image. Please adjust using the manual slider.",
      });
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
    const demoData: BillData = {
      totalCostEgp: demo.spend,
      kwhConsumption: demo.kwh,
      meterNumber: demo.meter,
      customerName: demo.name,
      confidence: 1.0,
      lowConfidence: false,
      source: "demo",
    };
    setFileName(`Sample_${demo.name}.pdf`);
    setParsedData(demoData);
    onSpendChange(demo.spend);
    onKwhChange(demo.kwh);
    if (onBillParsed) {
      onBillParsed(demoData);
    }
  };

  const handleResetFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    setParsedData(null);
    setShowOcrDetails(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
        <div className="flex items-center gap-2">
          {parsedData && (
            <span
              className={cn(
                "text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1",
                parsedData.lowConfidence
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              )}
            >
              {parsedData.lowConfidence ? (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Manual Mode
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  OCR Read: {parsedData.totalCostEgp?.toLocaleString()} EGP
                </>
              )}
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-300 font-medium hidden sm:inline-block">
            Tesseract OCR & API
          </span>
        </div>
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
            ? "border-emerald-400 bg-emerald-500/10 scale-[1.01]"
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
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
            <p className="text-sm font-semibold text-slate-200">
              Running OCR on Electricity Bill...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Extracting text and detecting cost in EGP and kWh consumption
            </p>
          </div>
        ) : fileName ? (
          <div className="flex items-center justify-between py-2 px-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  parsedData?.lowConfidence
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-emerald-500/10 text-emerald-400"
                )}
              >
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-200">{fileName}</p>
                <p
                  className={cn(
                    "text-xs font-semibold",
                    parsedData?.lowConfidence ? "text-amber-400" : "text-emerald-400"
                  )}
                >
                  {parsedData?.totalCostEgp
                    ? `Read: ${parsedData.totalCostEgp.toLocaleString()} EGP (${parsedData.kwhConsumption} kWh)${
                        parsedData.meterNumber ? ` • Meter: ${parsedData.meterNumber}` : ""
                      }`
                    : "No clear numbers found • Please set slider below"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {parsedData?.extractedText && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOcrDetails(!showOcrDetails);
                  }}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{showOcrDetails ? "Hide OCR" : "View OCR Text"}</span>
                  {showOcrDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleResetFile}
                className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Change or reset bill"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
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
              Supports photos (JPEG, PNG) or PDFs • Reads Arabic & English bill figures
            </p>
          </div>
        )}
      </div>

      {/* Expandable OCR Inspection Drawer */}
      {showOcrDetails && parsedData && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              OCR Raw Text & Extraction
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Engine: {parsedData.source || "Tesseract OCR"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded bg-slate-800/60">
              <div className="text-slate-400">Total Bill (EGP)</div>
              <div className="text-slate-100 font-bold text-xs mt-0.5">
                {parsedData.totalCostEgp ? `${parsedData.totalCostEgp.toLocaleString()} EGP` : "Not detected"}
              </div>
            </div>
            <div className="p-2 rounded bg-slate-800/60">
              <div className="text-slate-400">Consumption (kWh)</div>
              <div className="text-slate-100 font-bold text-xs mt-0.5">
                {parsedData.kwhConsumption ? `${Math.round(parsedData.kwhConsumption)} kWh` : "Not detected"}
              </div>
            </div>
            <div className="p-2 rounded bg-slate-800/60">
              <div className="text-slate-400">Meter Number</div>
              <div className="text-slate-100 font-bold text-xs mt-0.5 truncate">
                {parsedData.meterNumber || "Not detected"}
              </div>
            </div>
          </div>

          {parsedData.extractedText && (
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Extracted Text Output:</p>
              <div className="text-[10px] text-slate-300 font-mono bg-slate-950/80 p-2.5 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                {parsedData.extractedText}
              </div>
            </div>
          )}
        </div>
      )}

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
              className="text-left p-2.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors cursor-pointer"
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
      <div
        ref={sliderSectionRef}
        className={cn(
          "mt-5 pt-4 border-t transition-all duration-300 rounded-xl p-3",
          parsedData?.lowConfidence
            ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30"
            : "border-slate-700/60"
        )}
      >
        {parsedData?.lowConfidence && (
          <div className="mb-3.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                Manual Adjustment Active
              </p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                {parsedData.warning ||
                  "Could not detect clear electricity figures from this image. Please adjust your monthly spend using the slider below."}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            Monthly Electricity Bill (EGP)
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
