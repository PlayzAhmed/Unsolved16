import React from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/app-icon';

export function Navbar({ subtitle = 'Audit Home' }: { subtitle?: string }) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
      <div className="h-16 px-4 flex items-center justify-between gap-2">
        {/* Logo + Wordmark */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-sm">
            <AppIcon name="wb_sunny" className="text-secondary-container" size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] text-primary tracking-tight font-extrabold leading-tight">EnergyTwin AI</span>
            <span className="text-[11px] text-on-surface-variant font-medium leading-tight">{subtitle}</span>
          </div>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-full bg-surface-container-high text-on-surface text-[13px] flex items-center gap-1 active:scale-95 transition-transform">
            <AppIcon name="help_outline" className="text-primary" size={18} />
            <span className="text-[14px]">كيف يعمل؟</span>
          </button>
          <button aria-label="تبديل اللغة" className="h-9 px-3 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold hover:bg-surface-container-highest transition-colors">
            عربي | EN
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <AppIcon name="person" className="text-on-primary" size={18} />
          </div>
        </div>
      </div>
    </header>
  );
}
