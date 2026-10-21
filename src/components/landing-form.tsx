"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BillUploader } from "@/components/bill-uploader";
import { AddressSearch } from "@/components/address-search";
import { calculateKwhFromEgp } from "@/lib/egypt-tariffs";
import type { BillData } from "@/types";
import { MapPin, ArrowRight, Sparkles, Calculator } from "lucide-react";
import Link from "next/link";

const QUICK_LOCATIONS = [
  "المعادي، القاهرة",
  "العاشر من رمضان، الشرقية",
  "مدينة نصر، القاهرة",
  "السادس من أكتوبر، الجيزة",
];

export function LandingForm() {
  const router = useRouter();
  const [address, setAddress] = useState("المعادي، القاهرة");
  const [spendEgp, setSpendEgp] = useState(3850);
  const [monthlyKwh, setMonthlyKwh] = useState(calculateKwhFromEgp(3850));
  const [meterNumber, setMeterNumber] = useState("EGY-ME-90214");

  const handleBillParsed = (data: BillData) => {
    if (data.totalCostEgp) setSpendEgp(data.totalCostEgp);
    if (data.kwhConsumption) setMonthlyKwh(data.kwhConsumption);
    if (data.meterNumber) setMeterNumber(data.meterNumber);
  };

  const handleGenerateAudit = () => {
    const params = new URLSearchParams({
      address,
      spend: String(spendEgp),
      kwh: String(Math.round(monthlyKwh)),
      meter: meterNumber,
      ratio: "0.8",
    });
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Address Search Bar with Real-Time Suggestions */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative z-20">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-amber-400" />
          Step 1: Enter Commercial Facility Address (Egypt)
        </label>
        
        <div className="mt-1">
          <AddressSearch
            initialValue={address}
            onSelectAddress={(newAddress) => setAddress(newAddress)}
            placeholder="Search address e.g. المعادي، القاهرة or العاشر من رمضان"
          />
        </div>

        {/* Quick select pills */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold">
            Quick SME Zones:
          </span>
          {QUICK_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setAddress(loc)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors"
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Bill Upload Section */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 block px-1">
          Step 2: Upload Electricity Bill or Set Monthly Spend
        </label>
        <BillUploader
          monthlySpendEgp={spendEgp}
          monthlyKwh={monthlyKwh}
          onSpendChange={(s) => {
            setSpendEgp(s);
            setMonthlyKwh(calculateKwhFromEgp(s));
          }}
          onKwhChange={(k) => setMonthlyKwh(k)}
          onBillParsed={handleBillParsed}
        />
      </div>

      {/* 3. Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <Link
          href={`/calculator?spend=${spendEgp}&kwh=${Math.round(monthlyKwh)}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <Calculator className="w-4 h-4" />
          <span>Need only the quick formula? Open Isolated Calculator</span>
        </Link>

        <button
          type="button"
          onClick={handleGenerateAudit}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-base shadow-xl shadow-emerald-950/50 hover:shadow-emerald-900/60 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>Generate Solar Audit & Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
