'use client';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const { locale, toggleLocale, t } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t('تبديل اللغة')}
      title={t('تبديل اللغة')}
      className="h-9 px-3 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
    >
      <span className={cn(locale === 'ar' ? 'text-primary font-extrabold' : 'opacity-60')}>
        عربي
      </span>
      <span className="mx-1 opacity-50">|</span>
      <span className={cn(locale === 'en' ? 'text-primary font-extrabold' : 'opacity-60')}>EN</span>
    </button>
  );
}
