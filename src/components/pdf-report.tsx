"use client";

import React, { useState, useSyncExternalStore } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { SolarResult, BillData, RooftopData } from "@/types";
import { cn } from "@/lib/utils";
import { Download, FileText, Loader2 } from "lucide-react";

export interface PdfReportProps {
  solarResult: SolarResult;
  billData?: BillData;
  rooftopData?: RooftopData;
  className?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#059669",
    paddingBottom: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 11,
    color: "#059669",
    marginTop: 3,
    fontWeight: "bold",
  },
  badge: {
    backgroundColor: "#ecfdf5",
    color: "#047857",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  section: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%",
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 2,
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#059669",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
  },
});

export function BankProposalDocument({
  solarResult,
  billData,
  rooftopData,
}: {
  solarResult: SolarResult;
  billData?: BillData;
  rooftopData?: RooftopData;
}) {
  const dateStr = new Date().toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document title="EnergyTwin_Solar_MicroFinance_Proposal">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>EnergyTwin AI</Text>
            <Text style={styles.subtitle}>
              Egyptian Green Micro-Finance Solar Proposal (SDG 7)
            </Text>
          </View>
          <View>
            <Text style={styles.badge}>BANQUE MISR / NBE QUALIFIED</Text>
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4, textAlign: "right" }}>
              Date: {dateStr}
            </Text>
          </View>
        </View>

        {/* Facility Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Facility & Location Profile</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Location / Address</Text>
              <Text style={styles.value}>
                {rooftopData?.formattedAddress || "Maadi, Cairo, Egypt"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Electricity Meter ID</Text>
              <Text style={styles.value}>
                {billData?.meterNumber || "EGY-ME-90214"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Baseline Monthly Spend</Text>
              <Text style={styles.value}>
                {billData?.totalCostEgp
                  ? `${billData.totalCostEgp.toLocaleString()} EGP`
                  : "3,850 EGP"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Estimated Rooftop Polygon</Text>
              <Text style={styles.value}>
                {rooftopData?.polygonAreaM2 || 280} m²
              </Text>
            </View>
          </View>
        </View>

        {/* Engineering System Specification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Proposed Solar PV System Specs</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>System Peak Capacity</Text>
              <Text style={styles.highlightValue}>
                {solarResult.systemCapacityKwp.toFixed(2)} kWp
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Roof Footprint Required</Text>
              <Text style={styles.value}>
                {solarResult.roofAreaRequiredM2.toFixed(1)} m²
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Solar Transition Ratio</Text>
              <Text style={styles.value}>{solarResult.greenScore}% Renewable</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Annual Clean Energy Yield</Text>
              <Text style={styles.value}>
                {Math.round(solarResult.systemCapacityKwp * 5 * 365).toLocaleString()} kWh / yr
              </Text>
            </View>
          </View>
        </View>

        {/* Financial Feasibility & ROI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Financial & Micro-Finance Assessment</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Total Turnkey Capex</Text>
              <Text style={styles.highlightValue}>
                {solarResult.initialCostEgp.toLocaleString()} EGP
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Annual Cash Savings</Text>
              <Text style={styles.highlightValue}>
                {solarResult.annualSavingsEgp.toLocaleString()} EGP / yr
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Simple Payback Period</Text>
              <Text style={styles.value}>
                {solarResult.paybackPeriodYears.toFixed(1)} Years
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Estimated 25-Year Net Value</Text>
              <Text style={styles.value}>
                {(solarResult.annualSavingsEgp * 25 - solarResult.initialCostEgp).toLocaleString()} EGP
              </Text>
            </View>
          </View>
        </View>

        {/* Environmental Impact (SDG 7 & 13) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Environmental & SDG Impact</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>CO2 Emissions Avoided</Text>
              <Text style={styles.highlightValue}>
                {solarResult.co2ReductionTons.toFixed(1)} Tons / yr
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Tree Offset Equivalent</Text>
              <Text style={styles.value}>
                ≈ {Math.round(solarResult.co2ReductionTons * 45)} trees planted
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>EnergyTwin AI - Zero-Hardware Solar Feasibility Evaluator (SolveThe17)</Text>
          <Text>Compliant with Egyptian Solar Tariffs & Regulations</Text>
        </View>
      </Page>
    </Document>
  );
}

const emptySubscribe = () => () => {};

export function PdfReport({
  solarResult,
  billData,
  rooftopData,
  className,
}: PdfReportProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      const doc = (
        <BankProposalDocument
          solarResult={solarResult}
          billData={billData}
          rooftopData={rooftopData}
        />
      );
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `EnergyTwin_Bank_Proposal_${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isClient) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600/50 text-white font-semibold text-sm cursor-not-allowed opacity-70"
      >
        <FileText className="w-4 h-4" />
        Prepare Proposal
      </button>
    );
  }

  return (
    <button
      onClick={handleDownloadPdf}
      disabled={isGenerating}
      className={cn(
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/60 active:scale-95 transition-all duration-150 disabled:opacity-60",
        className
      )}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Building PDF Proposal...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Download Bank Proposal PDF
        </>
      )}
    </button>
  );
}
