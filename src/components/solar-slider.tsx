'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/app-icon';

export interface SolarSliderProps {
  value: number; // 0.5 to 1.0 or 50 to 100
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  roofInsufficient?: boolean;
}

const SLIDER_NOTES: Record<number, string> = {
  0.5: 'خيار ٥٠٪ (نصف الشغل): استثمار أولي خفيف يغطي أحمال الإضاءة والمراوح وثلاجات العرض، مع الاعتماد الجزئي على الشبكة.',
  0.8: 'خيار ٨٠٪ (الأنسب لمحلك): يشغل أفران العجن وثلاجات التبريد بالكامل أثناء ساعات الذروة النهارية دون الحاجة لبطاريات غالية.',
  1.0: 'خيار ١٠٠٪ (استقلال كامل): تغطية شاملة للطاقة وتصدير صافي فائض شهرياً لشبكة الكهرباء القومية للحصول على رصيد نقدي.',
};

export function SolarSlider({
  value,
  onChange,
  className,
  disabled = false,
  roofInsufficient = false,
}: SolarSliderProps) {
  const normalizedValue = value > 1.0 ? value / 100 : value;

  // Determine active preset (0.5, 0.8, 1.0)
  const activePreset =
    Math.abs(normalizedValue - 0.5) < 0.15
      ? 0.5
      : Math.abs(normalizedValue - 1.0) < 0.1
      ? 1.0
      : 0.8;

  return (
    <div
      className={cn(
        'rounded-xl bg-surface-container-lowest shadow-sm p-4 flex flex-col',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <AppIcon name="tune" className="text-primary" size={20} />
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">حجم التحول الشمسي</h2>
        </div>
        <span className="font-label-sm text-label-sm text-primary font-medium bg-primary-fixed/40 px-2.5 py-0.5 rounded-full">
          جرّب السيناريوهات
        </span>
      </div>

      {/* Segmented 3-Stop Control */}
      <div
        aria-label="خيارات نسبة الطاقة الشمسية"
        className="grid grid-cols-3 gap-2 p-1 bg-surface-container rounded-lg mb-3"
        role="radiogroup"
      >
        {/* Stop 1: 50% */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(0.5)}
          className={cn(
            'flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all duration-200 cursor-pointer',
            activePreset === 0.5
              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          <span className="font-headline-sm text-headline-sm font-bold">٥٠٪</span>
          <span className="font-label-sm text-label-sm truncate">نص الشغل</span>
        </button>

        {/* Stop 2: 80% */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(0.8)}
          className={cn(
            'flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all duration-200 cursor-pointer',
            activePreset === 0.8
              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          <div className="flex items-center gap-1">
            <span className="font-headline-sm text-headline-sm font-bold">٨٠٪</span>
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
          </div>
          <span className="font-label-sm text-label-sm font-bold">الخيار الأمثل</span>
        </button>

        {/* Stop 3: 100% */}
        <button
          type="button"
          disabled={disabled || roofInsufficient}
          onClick={() => !roofInsufficient && onChange(1.0)}
          className={cn(
            'flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all duration-200 cursor-pointer',
            activePreset === 1.0
              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface',
            roofInsufficient && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="font-headline-sm text-headline-sm font-bold">١٠٠٪</span>
          <span className="font-label-sm text-label-sm truncate">
            {roofInsufficient ? 'السطح لا يكفي' : 'استقلال تام'}
          </span>
        </button>
      </div>

      {/* Active Tier Description Callout */}
      <div className="rounded-lg bg-surface-container-low p-3 flex items-start gap-2 text-on-surface-variant">
        <AppIcon name="tips_and_updates" className="text-secondary shrink-0 mt-0.5" size={20} />
        <p className="font-body-sm text-body-sm leading-relaxed">
          {SLIDER_NOTES[activePreset]}
        </p>
      </div>
    </div>
  );
}
