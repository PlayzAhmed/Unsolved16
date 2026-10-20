import React, { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { DashboardClient } from "@/components/dashboard-client";
import { LayoutDashboard, Loader2 } from "lucide-react";

export const metadata = {
  title: "Interactive Solar Dashboard | EnergyTwin AI",
  description: "Evaluate rooftop solar transition, payback period, and bank proposals for Egyptian SMEs",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                SME Solar Feasibility Dashboard
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time Egyptian tariff simulation, rooftop spatial sizing, and bank proposal generator
            </p>
          </div>
        </div>

        {/* Client Interactive Dashboard */}
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-slate-800/40 rounded-2xl border border-slate-800">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-300">
                Loading Solar Feasibility Models...
              </p>
            </div>
          }
        >
          <DashboardClient />
        </Suspense>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 EnergyTwin AI — SolveThe17 Hackathon</p>
          <p className="text-slate-400">
            Compliant with Egyptian Electricity Utility & Micro-finance Standards
          </p>
        </div>
      </footer>
    </div>
  );
}
