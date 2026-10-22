'use client';

import React, { useEffect, useState, useRef } from 'react';
import type { SolarResult } from '@/types';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/app-icon';

export interface MetricsCardsProps {
  result: SolarResult;
  availableRoofM2?: number;
  className?: string;
}

function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current === target ? 0 : prevTarget.current;
    prevTarget.current = target;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(start + (target - start) * progress));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

export function MetricsCards({
  result,
  availableRoofM2,
  className,
}: MetricsCardsProps) {
  const animatedAnnualSavings = useCountUp(result.annualSavingsEgp, 600);
  const animatedMonthlySavings = useCountUp(result.monthlySavingsEgp, 600);
  const animatedInitialCost = useCountUp(result.initialCostEgp, 600);

  const roofCoverage =
    availableRoofM2 && availableRoofM2 > 0
      ? Math.min(100, Math.round((result.roofAreaRequiredM2 / availableRoofM2) * 100))
      : null;

  const treesEquivalent = Math.round(result.co2ReductionTons * 45);

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {/* 1. Hero Savings Card: Full Width */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-surface-container-lowest rounded-xl p-5 shadow-soft border-2 border-sun hover:shadow-lift transition-all relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-ink shadow-xs bg-sun-gradient">
                <AppIcon name="wb_sunny" size={18} />
              </span>
              <span className="text-sm font-bold text-teal-deep">
                هتوفر سنويًا ☀️
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              عن فاتورتك الحالية بالتعريفة التجارية المصرية
            </p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-primary tracking-tight font-latin" dir="ltr">
              {animatedAnnualSavings.toLocaleString('ar-EG')}
            </span>
            <span className="text-lg font-bold text-on-surface">ج.م / سنة</span>
          </div>

          <div className="bg-surface-container px-4 py-2 rounded-xl border border-primary/15 text-xs text-on-surface flex items-center gap-2">
            <AppIcon name="trending_down" className="text-leaf" size={18} />
            <span>
              الوفر الشهري:{' '}
              <strong className="text-primary font-extrabold font-latin" dir="ltr">
                {animatedMonthlySavings.toLocaleString('ar-EG')}
              </strong>{' '}
              ج.م / شهر
            </span>
          </div>
        </div>
      </div>

      {/* 2. System Cost Card */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-soft border border-primary/15 hover:shadow-lift transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-on-surface-variant">
            تكلفة النظام
          </span>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <AppIcon name="solar_power" size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight font-latin" dir="ltr">
            {animatedInitialCost.toLocaleString('ar-EG')}
          </span>
          <span className="text-xs font-bold text-primary">ج.م</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-on-surface-variant">
          <AppIcon name="verified" className="text-leaf" size={15} />
          <span>شامل التركيب والربط بالشبكة</span>
        </div>
      </div>

      {/* 3. Payback Card */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-soft border border-primary/15 hover:shadow-lift transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-on-surface-variant">
            هتسترد فلوسك في
          </span>
          <div className="p-2 rounded-lg bg-secondary-fixed/50 text-secondary">
            <AppIcon name="hourglass_top" size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-secondary tracking-tight font-latin" dir="ltr">
            {result.paybackPeriodYears > 0 ? result.paybackPeriodYears.toFixed(1) : '—'}
          </span>
          <span className="text-xs font-bold text-secondary">سنين</span>
        </div>
        <div className="mt-2 text-[11px] text-primary font-semibold">
          وبعدها الكهربا ببلاش لمدة ٢٠ سنة!
        </div>
      </div>

      {/* 4. Coverage / Green Score */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-soft border border-primary/15 hover:shadow-lift transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-on-surface-variant">
            نسبة تغطية الطاقة النظيفة
          </span>
          <div className="p-2 rounded-lg bg-leaf/15 text-leaf">
            <AppIcon name="energy_savings_leaf" size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-leaf tracking-tight font-latin" dir="ltr">
            {result.greenScore}%
          </span>
          <span className="text-xs font-bold text-on-surface-variant">طاقة متجددة</span>
        </div>
        <div className="w-full bg-surface-container rounded-full h-2 mt-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500 bg-leaf"
            style={{ width: `${Math.min(100, Math.max(10, result.greenScore))}%` }}
          />
        </div>
      </div>

      {/* 5. CO2 Card */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-soft border border-primary/15 hover:shadow-lift transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-on-surface-variant">
            خفض انبعاثات الكربون
          </span>
          <div className="p-2 rounded-lg bg-leaf/15 text-leaf">
            <AppIcon name="eco" size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight font-latin" dir="ltr">
            {result.co2ReductionTons.toFixed(1)}
          </span>
          <span className="text-xs font-bold text-leaf">طن / سنة</span>
        </div>
        <div className="mt-2 text-[11px] text-on-surface-variant">
          يعادل زراعة ≈ {treesEquivalent} شجرة سنوياً
        </div>
      </div>

      {/* 6. System Capacity */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-soft border border-primary/15 hover:shadow-lift transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-on-surface-variant">
            قدرة المحطة
          </span>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <AppIcon name="solar_power" size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight font-latin" dir="ltr">
            {result.systemCapacityKwp.toFixed(2)}
          </span>
          <span className="text-xs font-bold text-sunset">kWp</span>
        </div>
        <div className="mt-2 text-[11px] text-on-surface-variant">
          مطابق لكود شبكة الجهد المنخفض
        </div>
      </div>

      {/* 7. Rooftop Footprint */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-soft border border-primary/15 hover:shadow-lift transition-all sm:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-on-surface-variant">
            مساحة السطح المطلوبة
          </span>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <AppIcon name="square_foot" size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight font-latin" dir="ltr">
            {result.roofAreaRequiredM2.toFixed(0)}
          </span>
          <span className="text-xs font-bold text-on-surface-variant">م² من السطح</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-on-surface-variant">
          <span>نسبة إشغال السطح:</span>
          <strong className="text-primary font-bold">
            {roofCoverage !== null ? `${roofCoverage}% من مساحة السطح` : '٦ م² لكل كيلوواط'}
          </strong>
        </div>
      </div>
    </div>
  );
}
