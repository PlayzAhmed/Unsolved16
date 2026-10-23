import React, { Suspense } from 'react';
import { Navbar } from '@/components/navbar';
import { DashboardClient } from '@/components/dashboard-client';
import { BottomNav } from '@/components/bottom-nav';
import { AppIcon } from '@/components/ui/app-icon';

export const metadata = {
  title: 'لوحة التوفير | EnergyTwin AI',
  description: 'لوحة التحكم التفاعلية لحساب التوفير وعائد الاستثمار في الطاقة الشمسية التجارية بمصر',
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <Navbar subtitle="لوحة التوفير" />
      <main className="flex-1 w-full pt-16 pb-24 px-4 max-w-lg mx-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-40">
              <AppIcon name="refresh" className="text-primary animate-spin" size={40} />
            </div>
          }
        >
          <DashboardClient />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
