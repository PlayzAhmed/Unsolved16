"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  calculateSolarSavings,
  calculate25YearProjection,
  estimateRoofAreaFallback,
} from "@/lib/solar-calculator";
import { calculateKwhFromEgp } from "@/lib/egypt-tariffs";
import type { RooftopData, BillData } from "@/types";
import { MetricsCards } from "@/components/metrics-cards";
import { SolarSlider } from "@/components/solar-slider";
import { MapPreview } from "@/components/map-preview";
import { PdfReport } from "@/components/pdf-report";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  FileText,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  TableProperties,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export function DashboardClient() {
  const searchParams = useSearchParams();

  const spendParam = searchParams.get("spend");
  const kwhParam = searchParams.get("kwh");
  const ratioParam = searchParams.get("ratio");
  const addressParam = searchParams.get("address");
  const meterParam = searchParams.get("meter");

  const [monthlySpendEgp, setMonthlySpendEgp] = useState<number>(
    spendParam ? Number(spendParam) : 3850
  );
  const [monthlyKwh, setMonthlyKwh] = useState<number>(
    kwhParam ? Number(kwhParam) : calculateKwhFromEgp(spendParam ? Number(spendParam) : 3850)
  );
  const [transitionRatio, setTransitionRatio] = useState<number>(
    ratioParam ? Number(ratioParam) : 0.8
  );
  const [address] = useState<string>(
    addressParam ? decodeURIComponent(addressParam) : "المعادي، القاهرة"
  );
  const [meterNumber] = useState<string>(meterParam || "EGY-ME-90214");

  const [showProjections, setShowProjections] = useState<boolean>(false);
  const [rooftopData, setRooftopData] = useState<RooftopData>({
    lat: 29.9602,
    lng: 31.2569,
    formattedAddress: address,
    polygonAreaM2: 280,
  });

  // Calculate deterministic solar results
  const solarResult = useMemo(() => {
    return calculateSolarSavings({
      monthlySpendEgp,
      monthlyKwh,
      transitionRatio,
    });
  }, [monthlySpendEgp, monthlyKwh, transitionRatio]);

  // 25-Year Projection
  const cashFlows = useMemo(() => {
    return calculate25YearProjection(solarResult, monthlySpendEgp * 12);
  }, [solarResult, monthlySpendEgp]);

  const billData: BillData = useMemo(() => {
    return {
      totalCostEgp: monthlySpendEgp,
      kwhConsumption: monthlyKwh,
      meterNumber,
    };
  }, [monthlySpendEgp, monthlyKwh, meterNumber]);

  // Fetch geocoding data once for GIS rooftop area
  useEffect(() => {
    let isMounted = true;
    async function fetchRooftop() {
      try {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, monthlyKwh }),
        });
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setRooftopData(json.data);
        }
      } catch {
        if (isMounted) {
          setRooftopData({
            lat: 29.9602,
            lng: 31.2569,
            formattedAddress: address,
            polygonAreaM2: estimateRoofAreaFallback(monthlyKwh),
          });
        }
      }
    }
    fetchRooftop();
    return () => {
      isMounted = false;
    };
  }, [address, monthlyKwh]);

  return (
    <div className="space-y-6">
      {/* SME Facility Profile Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MapPin className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{address}</h2>
              <Badge variant="emerald">Audit Ready</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Meter ID: <strong className="text-slate-200">{meterNumber}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Monthly Baseline:{" "}
                <strong className="text-emerald-400">
                  {monthlySpendEgp.toLocaleString()} EGP ({Math.round(monthlyKwh)} kWh)
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit Facility Bill</span>
          </Link>
          <PdfReport
            solarResult={solarResult}
            billData={billData}
            rooftopData={rooftopData}
          />
        </div>
      </div>

      {/* Main Grid: Interactive Transition Slider + Satellite Rooftop GIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Transition Slider */}
        <div className="flex flex-col justify-between">
          <SolarSlider
            value={transitionRatio}
            onChange={(r) => setTransitionRatio(r)}
            className="h-full"
          />
        </div>

        {/* Spatial Satellite Rooftop Preview */}
        <MapPreview
          rooftopData={rooftopData}
          requiredAreaM2={solarResult.roofAreaRequiredM2}
        />
      </div>

      {/* Live Financial & Environmental Metrics Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Real-Time Solar KPI & ROI Assessment
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Updates synchronously as you adjust the solar target slider
            </p>
          </div>
          <Badge variant="amber">
            Payback: {solarResult.paybackPeriodYears.toFixed(1)} Years
          </Badge>
        </div>

        <MetricsCards
          result={solarResult}
          availableRoofM2={rooftopData.polygonAreaM2}
        />
      </div>

      {/* 25-Year Projection Accordion */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setShowProjections(!showProjections)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-slate-200">
                25-Year Commercial Cash Flow & Escalation Table
              </h4>
              <p className="text-xs text-slate-400">
                Accounts for 8% annual grid tariff inflation vs 0.5% panel degradation
              </p>
            </div>
          </div>
          <div className="p-1 rounded-lg bg-slate-700/60 text-slate-300">
            {showProjections ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </button>

        {showProjections && (
          <div className="mt-4 pt-4 border-t border-slate-700/60 overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-900/80 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Year</th>
                  <th className="py-2.5 px-3">Grid Cost (No Solar)</th>
                  <th className="py-2.5 px-3">Grid Cost (With Solar)</th>
                  <th className="py-2.5 px-3 text-emerald-400">Annual Savings</th>
                  <th className="py-2.5 px-3 text-amber-400">Cumulative Savings</th>
                  <th className="py-2.5 px-3">Net Cash Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {[1, 2, 3, 5, 7, 10, 15, 20, 25].map((year) => {
                  const cf = cashFlows[year - 1];
                  if (!cf) return null;
                  return (
                    <tr
                      key={year}
                      className={
                        cf.netCashFlowEgp >= 0
                          ? "hover:bg-emerald-950/20"
                          : "hover:bg-slate-750/30"
                      }
                    >
                      <td className="py-2 px-3 font-bold text-slate-200">
                        Year {cf.year}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {cf.gridCostWithoutSolarEgp.toLocaleString()} EGP
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {cf.gridCostWithSolarEgp.toLocaleString()} EGP
                      </td>
                      <td className="py-2 px-3 font-semibold text-emerald-400">
                        +{cf.annualSavingsEgp.toLocaleString()} EGP
                      </td>
                      <td className="py-2 px-3 font-semibold text-amber-300">
                        {cf.cumulativeSavingsEgp.toLocaleString()} EGP
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={
                            cf.netCashFlowEgp >= 0
                              ? "text-emerald-400 font-bold"
                              : "text-slate-400"
                          }
                        >
                          {cf.netCashFlowEgp >= 0 ? "+" : ""}
                          {cf.netCashFlowEgp.toLocaleString()} EGP
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Quick Adjustment Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>
            Quick Bill Adjustment: Baseline set at {monthlySpendEgp.toLocaleString()} EGP/mo.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1000}
            max={40000}
            step={500}
            value={monthlySpendEgp}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMonthlySpendEgp(val);
              setMonthlyKwh(calculateKwhFromEgp(val));
            }}
            className="w-36 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="font-bold text-slate-200 w-24 text-right">
            {monthlySpendEgp.toLocaleString()} EGP
          </span>
        </div>
      </div>
    </div>
  );
}
