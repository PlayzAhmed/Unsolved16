import React from "react";
import { Navbar } from "@/components/navbar";
import { SolarCalculator } from "@/components/solar-calculator";
import { EGYPT_COMMERCIAL_TARIFFS, EGYPT_ERA_TARIFF_URL, EGYPT_ERA_EFFECTIVE_DATE } from "@/lib/egypt-tariffs";
import { Calculator, Info, ShieldCheck, Zap, ExternalLink } from "lucide-react";

export const metadata = {
  title: "Solar Calculator | EnergyTwin AI",
  description: "Standalone solar sizing and financial calculator for Egyptian commercial electricity tariffs",
};

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Page Header */}
        <div className="border-b border-slate-800 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
            <Calculator className="w-3.5 h-3.5" />
            <span>Standalone Sizing Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Egyptian Commercial Solar Calculator
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Isolated deterministic calculator to test electricity spends, solar transition ratios,
            and immediate payback estimates without GIS or document requirements.
          </p>
        </div>

        {/* The Isolated Solar Calculator */}
        <SolarCalculator
          initialSpendEgp={3850}
          initialRatio={0.8}
          showDashboardLink={true}
        />

        {/* Egyptian Commercial Electricity Tariffs Reference Guide */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Official Egyptian Commercial Electricity Tariffs ({EGYPT_ERA_EFFECTIVE_DATE})
              </h3>
            </div>
            <a
              href={EGYPT_ERA_TARIFF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline transition-colors"
            >
              <span>Verify on EgyptERA Official Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Tariffs officially regulated by the Egyptian Electric Utility and Consumer Protection Regulatory Agency (EgyptERA) for low-voltage commercial establishments:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {EGYPT_COMMERCIAL_TARIFFS.map((tier, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/40 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-semibold text-slate-400">
                    Tier {idx + 1}
                  </div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {tier.maxKwh === Infinity
                      ? `> ${tier.minKwh} kWh`
                      : `${tier.minKwh} - ${tier.maxKwh} kWh`}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <div className="text-xs font-extrabold text-emerald-400">
                    {tier.ratePerKwhEgp.toFixed(2)} EGP / kWh
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {tier.ratePerKwhPt.toFixed(1)} Pt • +{tier.customerServiceFeeEgp} EGP fee
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Solar Insolation: 5.0 Peak Sun Hours/day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Commercial Solar Capex: ~28,000 EGP / kWp</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Loss Multiplier: 1.20 (20% balance of system)</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 EnergyTwin AI — SolveThe17 Hackathon</p>
          <p className="text-slate-400">Isolated Pure Solar Engine</p>
        </div>
      </footer>
    </div>
  );
}
