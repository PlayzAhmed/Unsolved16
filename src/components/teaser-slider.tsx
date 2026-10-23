'use client';

import React, { useState } from 'react';
import { AppIcon } from '@/components/ui/app-icon';
import { useI18n } from '@/lib/i18n';

export function TeaserSlider() {
  const [billAmount, setBillAmount] = useState(4000);
  const { t, formatNumber } = useI18n();
  const annualSavings = Math.round(billAmount * 12 * 0.70);
  const percentage = Math.round((annualSavings / (billAmount * 12)) * 100);

  return (
    <div className="w-full bg-surface-container rounded-xl p-4 mb-6 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AppIcon name="calculate" className="text-primary" size={20} />
          <span className="text-[15px] font-bold text-on-surface">{t('حاسبة التوفير السريع المتوقعة')}</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[11px] font-bold">
          {t('توفير {percentage}٪', { percentage: formatNumber(percentage) })}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
          <span>{t('فاتورتك التقريبية حالياً:')}</span>
          <span className="text-[28px] font-bold text-on-surface leading-none">
            {formatNumber(billAmount)} {t('ج.م')}
          </span>
        </div>
        <input
          type="range"
          min={1500}
          max={15000}
          step={250}
          value={billAmount}
          onChange={(e) => setBillAmount(Number(e.target.value))}
          className="w-full accent-primary h-2 bg-surface-dim rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-on-surface-variant">
          <span>{t('١,٥٠٠ ج.م')}</span>
          <span>{t('٨,٠٠٠ ج.م')}</span>
          <span>{t('١٥,٠٠٠ ج.م')}</span>
        </div>
      </div>
      <div className="w-full bg-surface-container-lowest rounded-lg p-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] text-on-surface-variant">{t('توفيرك السنوي المباشر:')}</span>
          <span className="text-[28px] font-black text-tertiary leading-none">
            {formatNumber(annualSavings)} {t('ج.م')}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[11px] text-on-surface-variant">{t('سعر الكيلووات بعد الطاقة')}</span>
          <span className="text-[13px] text-primary font-bold">{t('٠.٤٢ ج.م فقط')}</span>
        </div>
      </div>
    </div>
  );
}
