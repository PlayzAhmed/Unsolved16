"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { calculateSolarSavings } from "@/lib/solar-calculator";
import { calculateKwhFromEgp, calculateEgpFromKwh } from "@/lib/egypt-tariffs";
import type { SolarResult } from "@/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  SunMedium,
  PiggyBank,
  TrendingUp,
  Calendar,
  Maximize2,
  Leaf,
  Zap,
  ArrowLeft,
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
  { label: "محل تجاري", spend: 2000 },
  { label: "مخبز أو كافيه", spend: 4500 },
  { label: "عيادة أو مكتب", spend: 9000 },
  { label: "ورشة تصنيع", spend: 18000 },
];

const RATIO_PRESETS = [
  { label: "٥٠٪ أساسي", value: 0.5 },
  { label: "٧٥٪ متوازن", value: 0.75 },
  { label: "٩٠٪ متقدم", value: 0.9 },
  { label: "١٠٠٪ كامل", value: 1.0 },
];

export function SolarCalculator({
  initialSpendEgp = 3850,
  initialKwh,
  initialRatio = 0.8,
  className,
  showDashboardLink = true,
  onResultChange,
}: SolarCalculatorProps) {
  const { t, formatNumber } = useI18n();
  const [monthlySpendEgp, setMonthlySpendEgp] = useState<number>(initialSpendEgp);
  const [monthlyKwh, setMonthlyKwh] = useState<number>(
    initialKwh || calculateKwhFromEgp(initialSpendEgp)
  );
  const [transitionRatio, setTransitionRatio] = useState<number>(initialRatio);

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
        "bg-white border border-teal/15 rounded-2xl p-6 sm:p-8 shadow-soft space-y-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal/15 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal/10 text-teal border border-teal/20">
            <SunMedium className="w-6 h-6 text-sunset" />
          </div>
          <div>
            <h2 className="text-xl font-black text-teal-deep tracking-tight">
              {t('حاسبة الجدوى الشمسية')}
            </h2>
            <p className="text-xs text-teal-deep/70 mt-0.5">
              {t('حسابات رياضية فورية وفقاً للتعريفات التجارية الرسمية للكهرباء بمصر')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-teal-deep/70 hover:text-teal px-3 py-1.5 rounded-lg border border-teal/20 hover:border-teal bg-sand/60 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('إعادة تعيين')}</span>
        </button>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Electricity Spend */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-teal-deep">
              {t('فاتورة الكهرباء الشهرية')}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={500}
                max={250000}
                step={250}
                value={monthlySpendEgp || ""}
                onChange={(e) => handleSpendChange(Number(e.target.value) || 0)}
                className="w-28 px-2.5 py-1 text-sm font-extrabold text-center bg-sand/60 border border-teal/30 rounded-lg text-teal focus:outline-none focus:border-teal"
              />
              <span className="text-xs font-bold text-teal-deep">{t('ج.م')}</span>
            </div>
          </div>

          <input
            type="range"
            min={1000}
            max={40000}
            step={250}
            value={monthlySpendEgp || 3500}
            onChange={(e) => handleSpendChange(Number(e.target.value))}
            className="w-full h-2.5 bg-sand rounded-lg appearance-none cursor-pointer accent-teal hover:accent-teal/90"
          />

          {/* Quick presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {PRESET_SPENDS.map((preset) => (
              <button
                key={preset.spend}
                type="button"
                onClick={() => handleSpendChange(preset.spend)}
                className={cn(
                  "p-2 rounded-lg border text-center transition-colors text-xs cursor-pointer",
                  monthlySpendEgp === preset.spend
                    ? "bg-teal/15 border-teal text-teal-deep font-black"
                    : "bg-sand/40 border-teal/20 text-teal-deep/80 hover:border-teal/50"
                )}
              >
                <div className="font-bold">{t(preset.label)}</div>
                <div className="text-[10px] text-teal-deep/60">{t('{amount} ج.م/شهر', { amount: formatNumber(preset.spend) })}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Monthly Consumption (kWh) & Transition Ratio */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-teal-deep">
              {t('الاستهلاك الشهري التقديري')}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={100}
                max={150000}
                step={50}
                value={Math.round(monthlyKwh) || ""}
                onChange={(e) => handleKwhChange(Number(e.target.value) || 0)}
                className="w-24 px-2.5 py-1 text-sm font-extrabold text-center bg-sand/60 border border-teal/30 rounded-lg text-sunset focus:outline-none focus:border-teal"
              />
              <span className="text-xs font-bold text-teal-deep">{t('ك.و.س')}</span>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-teal-deep mb-2">
              <span>{t('نسبة التحول المستهدفة للشمس:')}</span>
              <span className="text-teal font-black text-sm">
                <span dir="ltr">{formatNumber(Math.round(transitionRatio * 100))}%</span>
              </span>
            </div>

            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={Math.round(transitionRatio * 100)}
              onChange={(e) => setTransitionRatio(Number(e.target.value) / 100)}
              className="w-full h-2.5 bg-sand rounded-lg appearance-none cursor-pointer accent-teal hover:accent-teal/90"
            />

            <div className="grid grid-cols-4 gap-1.5 mt-2.5">
              {RATIO_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setTransitionRatio(preset.value)}
                  className={cn(
                    "py-1.5 px-2 rounded-lg border text-center text-xs transition-colors cursor-pointer",
                    Math.abs(transitionRatio - preset.value) < 0.02
                      ? "bg-teal/15 border-teal text-teal-deep font-black"
                      : "bg-sand/40 border-teal/20 text-teal-deep/70 hover:border-teal/50"
                  )}
                >
                  {t(preset.label)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Outputs / Results Panel */}
      <div className="pt-4 border-t border-teal/15">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-teal-deep flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sunset" />
            <span>{t('مؤشرات الجدوى المحسوبة')}</span>
          </h3>
          <span className="text-xs px-3 py-0.5 rounded-full bg-teal/10 text-teal font-bold border border-teal/20">
            {t('{score}% تغطية خضراء (SDG 7)', { score: formatNumber(solarResult.greenScore) })}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Capacity */}
          <div className="p-3.5 rounded-xl bg-sand/60 border border-teal/15">
            <div className="flex items-center gap-1.5 text-teal-deep/70 text-[11px] font-bold mb-1">
              <Zap className="w-3.5 h-3.5 text-sunset" />
              {t('القدرة')}
            </div>
            <div className="text-xl font-black text-teal-deep">
              <span dir="ltr">{formatNumber(Number(solarResult.systemCapacityKwp.toFixed(2)))}</span>{" "}
              <span className="text-xs text-sunset font-bold">kWp</span>
            </div>
          </div>

          {/* 2. Capex */}
          <div className="p-3.5 rounded-xl bg-sand/60 border border-teal/15">
            <div className="flex items-center gap-1.5 text-teal-deep/70 text-[11px] font-bold mb-1">
              <PiggyBank className="w-3.5 h-3.5 text-teal" />
              {t('التكلفة')}
            </div>
            <div className="text-xl font-black text-teal-deep">
              <span dir="ltr">{formatNumber(solarResult.initialCostEgp)}</span>{" "}
              <span className="text-xs text-teal-deep/70">{t('ج.م')}</span>
            </div>
          </div>

          {/* 3. Monthly Savings */}
          <div className="p-3.5 rounded-xl bg-sand/60 border border-teal/15">
            <div className="flex items-center gap-1.5 text-teal-deep/70 text-[11px] font-bold mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-teal" />
              {t('الوفر الشهري')}
            </div>
            <div className="text-xl font-black text-teal">
              <span dir="ltr">{formatNumber(solarResult.monthlySavingsEgp)}</span>{" "}
              <span className="text-xs text-teal">{t('ج.م')}</span>
            </div>
          </div>

          {/* 4. Payback */}
          <div className="p-3.5 rounded-xl bg-sand/60 border border-teal/15">
            <div className="flex items-center gap-1.5 text-teal-deep/70 text-[11px] font-bold mb-1">
              <Calendar className="w-3.5 h-3.5 text-sunset" />
              {t('الاسترداد')}
            </div>
            <div className="text-xl font-black text-teal-deep">
              <span dir="ltr">{solarResult.paybackPeriodYears > 0 ? formatNumber(Number(solarResult.paybackPeriodYears.toFixed(1))) : "—"}</span>{" "}
              <span className="text-xs text-teal">{t('سنين')}</span>
            </div>
          </div>

          {/* 5. Roof Required */}
          <div className="p-3.5 rounded-xl bg-sand/60 border border-teal/15">
            <div className="flex items-center gap-1.5 text-teal-deep/70 text-[11px] font-bold mb-1">
              <Maximize2 className="w-3.5 h-3.5 text-teal" />
              {t('السطح المطلوب')}
            </div>
            <div className="text-xl font-black text-teal-deep">
              <span dir="ltr">{formatNumber(Number(solarResult.roofAreaRequiredM2.toFixed(0)))}</span>{" "}
              <span className="text-xs text-teal-deep/70">{t('م²')}</span>
            </div>
          </div>

          {/* 6. CO2 Saved */}
          <div className="p-3.5 rounded-xl bg-sand/60 border border-teal/15">
            <div className="flex items-center gap-1.5 text-teal-deep/70 text-[11px] font-bold mb-1">
              <Leaf className="w-3.5 h-3.5 text-leaf" />
              {t('وفر الكربون')}
            </div>
            <div className="text-xl font-black text-leaf">
              <span dir="ltr">{formatNumber(Number(solarResult.co2ReductionTons.toFixed(1)))}</span>{" "}
              <span className="text-xs text-leaf">{t('طن/سنة')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Link to Full Dashboard */}
      {showDashboardLink && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-teal-deep/70">
          <span>
            {t('عايز تفحص السطح بالأقمار الصناعية وتطلع تقرير جاهز للبنك؟')}
          </span>
          <Link
            href={`/dashboard?spend=${monthlySpendEgp}&kwh=${Math.round(
              monthlyKwh
            )}&ratio=${transitionRatio}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal hover:bg-teal/90 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
          >
            <span>{t('انتقل إلى لوحة النتائج الكاملة')}</span>
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0 rotate-180" />
          </Link>
        </div>
      )}
    </div>
  );
}
