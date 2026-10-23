import type { Metadata } from 'next';
import './globals.css';
import { FirebaseAuthProvider } from '@/components/firebase-auth-provider';
import { AuthDialogProvider } from '@/components/auth-dialog-provider';
import { I18nProvider } from '@/lib/i18n';
import { dirForLocale } from '@/lib/i18n-config';
import { getServerLocale } from '@/lib/i18n-server';

export const metadata: Metadata = {
  title: 'EnergyTwin AI | تقييم التحول للطاقة الشمسية للشركات المصرية',
  description:
    'تقييم جدوى الطاقة الشمسية والتمويل البنكي الأخضر للمشاريع والشركات المصرية بدون أجهزة - Zero-Hardware Solar Feasibility for Egyptian SMEs',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} dir={dirForLocale(locale)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`antialiased min-h-screen bg-surface text-on-surface selection:bg-secondary-fixed selection:text-on-secondary-fixed ${
          locale === 'ar' ? 'font-arabic' : 'font-english'
        }`}
      >
        <I18nProvider initialLocale={locale}>
          <FirebaseAuthProvider>
            <AuthDialogProvider>{children}</AuthDialogProvider>
          </FirebaseAuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
