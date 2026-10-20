import React from "react";
import Link from "next/link";
import { SunMedium, LayoutDashboard, Calculator, UploadCloud, ShieldCheck } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 p-0.5 shadow-md shadow-emerald-950/60 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <SunMedium className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">
                EnergyTwin <span className="text-emerald-400">AI</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                SDG 7
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block -mt-1">
              Zero-Hardware Egyptian Solar Feasibility
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-emerald-400 transition-colors px-2 py-1"
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>Scan Bill</span>
          </Link>
          <Link
            href="/calculator"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-amber-400 transition-colors px-2 py-1"
          >
            <Calculator className="w-4 h-4 text-amber-400" />
            <span>Calculator</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-emerald-400 transition-colors px-2 py-1"
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
            <span>Dashboard</span>
          </Link>
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-800 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tariff 2026</span>
          </div>
        </nav>
      </div>
    </header>
  );
}
