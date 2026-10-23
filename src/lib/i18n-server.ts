import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale, type Locale } from './i18n-config';

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}
