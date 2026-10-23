export type Locale = 'ar' | 'en';

export const LOCALE_COOKIE = 'energytwin_locale';

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === 'en' ? 'en' : 'ar';
}

export function dirForLocale(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function localeTag(locale: Locale): string {
  return locale === 'ar' ? 'ar-EG' : 'en-US';
}
