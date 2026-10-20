import React from "react";
import { Navbar } from "@/components/navbar";
import { LandingForm } from "@/components/landing-form";
import { Sparkles, Sun, Shield, Layers, TrendingUp } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>SolveThe17 Hackathon • SDG 7 Clean & Affordable Energy</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Solar Feasibility & Bank Proposals for{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              Egyptian SMEs
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Evaluate your commercial facility&apos;s rooftop solar capacity, tiered tariff savings,
            and bank-ready green proposal in seconds — <strong>pure software, zero hardware</strong>.
          </p>

          {/* Key Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              5 Peak Sun Hours / Day
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              GIS Satellite Rooftop Polygon
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Egyptian Commercial Tariffs
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Banque Misr & NBE Qualified
            </span>
          </div>
        </div>

        {/* Landing Page Step-by-Step Form */}
        <section className="pt-2">
          <LandingForm />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 EnergyTwin AI — SolveThe17 Hackathon MVP (SDG 7)</p>
          <p className="text-slate-400">
            Calibrated for Egyptian Commercial Electricity Tariffs & Micro-Finance Programs
          </p>
        </div>
      </footer>
    </div>
  );
}
