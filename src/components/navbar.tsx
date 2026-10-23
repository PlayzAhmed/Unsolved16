'use client';

import React from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/app-icon';
import { AccountMenu } from '@/components/account-menu';
import { HowItWorksButton } from '@/components/how-it-works-button';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/lib/i18n';

export function Navbar({ subtitle = 'الرئيسية' }: { subtitle?: string }) {
  const { t } = useI18n();

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
            <span className="text-[11px] text-on-surface-variant font-medium leading-tight">
              {t(subtitle)}
            </span>
          </div>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <HowItWorksButton />
          <LanguageToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
