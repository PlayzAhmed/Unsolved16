'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/app-icon';
import { useI18n } from '@/lib/i18n';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const tabs = [
    { path: '/', icon: 'receipt_long', label: 'فحص الفاتورة', key: 'audit' },
    { path: '/dashboard', icon: 'trending_up', label: 'لوحة التوفير', key: 'dashboard' },
    { path: '/report', icon: 'verified', label: 'تقرير التمويل', key: 'report' },
    { path: '/history', icon: 'history', label: 'السجل', key: 'history' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(30,42,43,0.06)]">
      {/* SDG strip */}
      <div className="flex items-center justify-between px-4 pt-1 pb-0.5">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed-variant">
          <AppIcon name="solar_power" className="text-tertiary-container" size={15} />
          <span className="text-[11px] font-semibold tracking-normal">{t('SDG 7 طاقة نظيفة للشركات')}</span>
        </div>
        <span className="text-[11px] text-primary font-medium tracking-tight">{t('جمهورية مصر العربية')}</span>
      </div>
      {/* Tabs */}
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.key}
              href={tab.path}
              className={cn(
                'flex flex-col items-center justify-center min-w-[72px] h-full transition-colors active:scale-95',
                isActive ? 'text-primary font-semibold' : 'text-on-surface-variant'
              )}
            >
              <AppIcon name={tab.icon} className={isActive ? 'text-primary' : 'text-on-surface-variant'} size={24} />
              <span className="text-[11px] mt-0.5">{t(tab.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
