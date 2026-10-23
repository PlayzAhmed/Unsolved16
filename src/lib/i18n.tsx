'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  dirForLocale,
  localeTag,
  LOCALE_COOKIE,
  normalizeLocale,
  type Locale,
} from './i18n-config';
import { EN_MESSAGES } from './i18n-messages';

type TranslationValues = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
  tag: string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, values?: TranslationValues) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(message: string, values?: TranslationValues): string {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (placeholder, key: string) => {
    const value = values[key];
    return value === undefined ? placeholder : String(value);
  });
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirForLocale(locale);
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    const normalized = normalizeLocale(nextLocale);
    setLocaleState(normalized);
    document.cookie = `${LOCALE_COOKIE}=${normalized};path=/;max-age=31536000;samesite=lax`;
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      const message = locale === 'en' ? EN_MESSAGES[key] ?? key : key;
      return interpolate(message, values);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(localeTag(locale), options).format(value),
    [locale]
  );

  const formatDate = useCallback(
    (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(localeTag(locale), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options,
      }).format(typeof value === 'string' || typeof value === 'number' ? new Date(value) : value),
    [locale]
  );

  const formatCurrency = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(localeTag(locale), {
        maximumFractionDigits: 0,
        ...options,
      }).format(value),
    [locale]
  );

  const formatPercent = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      `${new Intl.NumberFormat(localeTag(locale), {
        maximumFractionDigits: 0,
        ...options,
      }).format(value)}%`,
    [locale]
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: dirForLocale(locale),
      isRtl: locale === 'ar',
      tag: localeTag(locale),
      setLocale,
      toggleLocale,
      t,
      formatNumber,
      formatDate,
      formatCurrency,
      formatPercent,
    }),
    [locale, setLocale, toggleLocale, t, formatNumber, formatDate, formatCurrency, formatPercent]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
