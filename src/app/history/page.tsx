import React from 'react';
import { Navbar } from '@/components/navbar';
import { HistoryClient } from '@/components/history-client';
import { BottomNav } from '@/components/bottom-nav';

export const metadata = {
  title: 'سجل التحليلات | EnergyTwin AI',
  description: 'كل حسابات الطاقة الشمسية والتوفير المحفوظة في حسابك على EnergyTwin AI',
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <Navbar subtitle="سجل التحليلات" />
      <main className="flex-1 w-full pt-20 pb-28 px-4 max-w-lg mx-auto">
        <HistoryClient />
      </main>
      <BottomNav />
    </div>
  );
}
