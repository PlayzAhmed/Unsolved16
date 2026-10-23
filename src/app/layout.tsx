import type { Metadata } from 'next';
import './globals.css';
import { FirebaseAuthProvider } from '@/components/firebase-auth-provider';

export const metadata: Metadata = {
  title: 'EnergyTwin AI | تقييم التحول للطاقة الشمسية للشركات المصرية',
  description:
    'تقييم جدوى الطاقة الشمسية والتمويل البنكي الأخضر للمشاريع والشركات المصرية بدون أجهزة - Zero-Hardware Solar Feasibility for Egyptian SMEs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-surface text-on-surface font-arabic selection:bg-secondary-fixed selection:text-on-secondary-fixed">
        <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
      </body>
    </html>
  );
}
