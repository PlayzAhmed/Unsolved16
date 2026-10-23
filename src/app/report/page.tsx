import React, { Suspense } from 'react';
import { Navbar } from '@/components/navbar';
import { GreenReport } from '@/components/green-report';
import { BottomNav } from '@/components/bottom-nav';
import { AppIcon } from '@/components/ui/app-icon';

export const metadata = {
  title: 'تقرير التمويل الأخضر | EnergyTwin AI',
  description: 'تقرير معتمد للبنوك المصرية لتمويل محطات الطاقة الشمسية للمشروعات والورش والمصانع',
};

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar subtitle="تقرير التمويل الأخضر" />
      <main className="flex-1 w-full pt-16 pb-32 px-4 max-w-lg mx-auto">
        <Suspense
          fallback={
            <div className="flex justify-center pt-20">
              <AppIcon name="refresh" className="text-primary animate-spin" size={40} />
            </div>
          }
        >
          <GreenReport />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
