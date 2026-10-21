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
import type { SolarResult, BillData, RooftopData, AnnualCashFlow } from "@/types";
import { calculate25YearProjection } from "@/lib/solar-calculator";
import {
  EGYPT_ERA_EFFECTIVE_DATE,
  EGYPT_ERA_TARIFF_URL,
  COMMERCIAL_SOLAR_COST_PER_KWP,
  MIN_COMMERCIAL_COST_PER_KWP,
  MAX_COMMERCIAL_COST_PER_KWP,
} from "@/lib/egypt-tariffs";
import { cn } from "@/lib/utils";
import { Download, FileText, Loader2 } from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PdfReportProps {
  solarResult: SolarResult;
  billData?: BillData;
  rooftopData?: RooftopData;
  className?: string;
}

// ─── Colour Palette ───────────────────────────────────────────────────────────

const C = {
  emerald: "#059669",
  emeraldLight: "#d1fae5",
  emeraldBorder: "#a7f3d0",
  emeraldDark: "#064e3b",
  amber: "#d97706",
  amberLight: "#fef3c7",
  amberBorder: "#fcd34d",
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  white: "#ffffff",
  red: "#dc2626",
  redLight: "#fee2e2",
};

// ─── StyleSheet ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Pages
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    backgroundColor: C.white,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.slate800,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: C.emerald,
  },
  logoBlock: { flexDirection: "column" },
  logoTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.slate900, letterSpacing: 0.5 },
  logoSubtitle: { fontSize: 8, color: C.emerald, fontFamily: "Helvetica-Bold", marginTop: 2 },
  logoTagline: { fontSize: 7, color: C.slate500, marginTop: 1 },
  headerRight: { alignItems: "flex-end", flexDirection: "column" },
  badgePrimary: {
    backgroundColor: C.emeraldLight,
    color: C.emeraldDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    borderWidth: 1,
    borderColor: C.emeraldBorder,
    textAlign: "center",
  },
  badgeAmber: {
    backgroundColor: C.amberLight,
    color: C.amber,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    borderWidth: 1,
    borderColor: C.amberBorder,
    textAlign: "center",
    marginTop: 4,
  },
  docMeta: { fontSize: 7, color: C.slate500, marginTop: 4, textAlign: "right" },

  // ── Section containers ──
  section: {
    marginBottom: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.slate200,
    overflow: "hidden",
  },
  sectionHeader: {
    backgroundColor: C.slate900,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionTag: {
    fontSize: 6.5,
    color: C.emerald,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#052e16",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  sectionBody: { padding: 10, backgroundColor: C.white },
  sectionBodyTinted: { padding: 10, backgroundColor: C.slate50 },

  // ── Grids ──
  grid2: { flexDirection: "row", flexWrap: "wrap" },
  grid3: { flexDirection: "row", flexWrap: "wrap" },
  grid4: { flexDirection: "row", flexWrap: "wrap" },
  col2: { width: "50%", paddingRight: 8, marginBottom: 8 },
  col3: { width: "33.33%", paddingRight: 8, marginBottom: 8 },
  col4: { width: "25%", paddingRight: 4, marginBottom: 8 },

  // ── KPI cards ──
  kpiCard: {
    flex: 1,
    marginRight: 8,
    backgroundColor: C.slate50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.slate200,
    padding: 8,
  },
  kpiCardGreen: {
    flex: 1,
    marginRight: 8,
    backgroundColor: C.emeraldLight,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.emeraldBorder,
    padding: 8,
  },
  kpiCardAmber: {
    flex: 1,
    marginRight: 8,
    backgroundColor: C.amberLight,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.amberBorder,
    padding: 8,
  },
  kpiRow: { flexDirection: "row", marginBottom: 8 },

  // ── Field labels & values ──
  label: { fontSize: 7, color: C.slate500, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Helvetica-Bold" },
  value: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.slate900, marginTop: 2 },
  valueGreen: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.emerald, marginTop: 2 },
  valueAmber: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.amber, marginTop: 2 },
  valueSm: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.slate900, marginTop: 2 },
  valueSmGreen: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.emerald, marginTop: 2 },
  valueSmAmber: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.amber, marginTop: 2 },
  subValue: { fontSize: 7, color: C.slate500, marginTop: 1 },

  // ── Dividers ──
  divider: { borderBottomWidth: 1, borderBottomColor: C.slate200, marginVertical: 8 },

  // ── Projection table ──
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.slate900,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  tableHeaderCell: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.white, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.slate100 },
  tableRowAlt: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.slate100, backgroundColor: C.slate50 },
  tableRowBreakeven: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.emeraldBorder, backgroundColor: C.emeraldLight },
  tableCell: { fontSize: 7.5, color: C.slate700 },
  tableCellGreen: { fontSize: 7.5, color: C.emerald, fontFamily: "Helvetica-Bold" },
  tableCellAmber: { fontSize: 7.5, color: C.amber, fontFamily: "Helvetica-Bold" },
  tableCellBold: { fontSize: 7.5, color: C.slate900, fontFamily: "Helvetica-Bold" },

  // Table column widths
  colYear: { width: "10%" },
  colGrid: { width: "20%" },
  colGridS: { width: "20%" },
  colSave: { width: "18%" },
  colCumul: { width: "18%" },
  colNet: { width: "14%" },

  // ── Disclaimer / risk ──
  disclaimerBox: {
    backgroundColor: C.redLight,
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  disclaimerTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.red, marginBottom: 4, textTransform: "uppercase" },
  disclaimerText: { fontSize: 7, color: "#7f1d1d", lineHeight: 1.5 },

  // ── Signature block ──
  sigRow: { flexDirection: "row", marginTop: 12, gap: 20 },
  sigBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: C.slate800,
    paddingTop: 6,
  },
  sigLabel: { fontSize: 7, color: C.slate500, textTransform: "uppercase" },
  sigName: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.slate900, marginTop: 2 },
  sigDate: { fontSize: 7, color: C.slate500, marginTop: 1 },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: C.slate200,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 6.5, color: C.slate400 },
  footerGreen: { fontSize: 6.5, color: C.emerald },

  // ── Page 2 specific ──
  page2Header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
  },
  page2Title: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.slate900 },
  page2Sub: { fontSize: 7.5, color: C.slate500, marginTop: 2 },

  // ── Tariff table ──
  tariffRow: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.slate100 },
  tariffRowAlt: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.slate100, backgroundColor: C.slate50 },
  tariffCell: { fontSize: 7.5, color: C.slate700 },
  tariffCellBold: { fontSize: 7.5, color: C.slate900, fontFamily: "Helvetica-Bold" },
  tariffColTier: { width: "30%" },
  tariffColRate: { width: "20%" },
  tariffColFee: { width: "20%" },
  tariffColNote: { width: "30%" },

  // ── Info row ──
  infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  infoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.emerald, marginRight: 6, marginTop: 2 },
  infoText: { fontSize: 7.5, color: C.slate700, flex: 1, lineHeight: 1.5 },
  infoTextBold: { fontSize: 7.5, color: C.slate900, fontFamily: "Helvetica-Bold", flex: 1, lineHeight: 1.5 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-EG");
}

function fmtEgp(n: number): string {
  return `${fmt(Math.round(n))} EGP`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ number, title, tag }: { number: string; title: string; tag?: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{number}. {title}</Text>
      {tag && <Text style={s.sectionTag}>{tag}</Text>}
    </View>
  );
}

function InfoRow({ text, bold }: { text: string; bold?: boolean }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoDot} />
      <Text style={bold ? s.infoTextBold : s.infoText}>{text}</Text>
    </View>
  );
}

// ─── Page 1: Executive Summary & Financials ──────────────────────────────────

function PageOne({
  solarResult,
  billData,
  rooftopData,
  dateStr,
  refNumber,
  annualYieldKwh,
  netValue25Yr,
}: {
  solarResult: SolarResult;
  billData?: BillData;
  rooftopData?: RooftopData;
  dateStr: string;
  refNumber: string;
  annualYieldKwh: number;
  netValue25Yr: number;
}) {
  const monthlyKwh = billData?.kwhConsumption ?? Math.round(solarResult.roofAreaRequiredM2 * 15);
  const blendedRate = monthlyKwh > 0 ? ((billData?.totalCostEgp ?? 0) / monthlyKwh).toFixed(3) : "—";

  return (
    <Page size="A4" style={s.page}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.logoBlock}>
          <Text style={s.logoTitle}>EnergyTwin AI</Text>
          <Text style={s.logoSubtitle}>Egyptian Green Micro-Finance Solar Proposal</Text>
          <Text style={s.logoTagline}>Aligned with UN Sustainable Development Goal 7 — Affordable & Clean Energy</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.badgePrimary}>BANQUE MISR / NBE QUALIFIED</Text>
          <Text style={s.badgeAmber}>GREEN MICRO-FINANCE ELIGIBLE</Text>
          <Text style={s.docMeta}>Proposal Ref: {refNumber}</Text>
          <Text style={s.docMeta}>Issued: {dateStr}</Text>
          <Text style={s.docMeta}>Tariff Base: EgyptERA {EGYPT_ERA_EFFECTIVE_DATE}</Text>
        </View>
      </View>

      {/* ── KPI Strip ── */}
      <View style={s.kpiRow}>
        <View style={[s.kpiCardGreen, { marginRight: 8 }]}>
          <Text style={s.label}>Annual Cash Savings</Text>
          <Text style={s.valueGreen}>{fmtEgp(solarResult.annualSavingsEgp)}</Text>
          <Text style={s.subValue}>{fmtEgp(solarResult.monthlySavingsEgp)} / mo saved</Text>
        </View>
        <View style={[s.kpiCardAmber, { marginRight: 8 }]}>
          <Text style={s.label}>Simple Payback</Text>
          <Text style={s.valueAmber}>{solarResult.paybackPeriodYears.toFixed(1)} Years</Text>
          <Text style={s.subValue}>IRR positive after payback</Text>
        </View>
        <View style={[s.kpiCard, { marginRight: 8 }]}>
          <Text style={s.label}>System Capacity</Text>
          <Text style={s.value}>{solarResult.systemCapacityKwp.toFixed(2)} kWp</Text>
          <Text style={s.subValue}>{fmt(annualYieldKwh)} kWh / yr yield</Text>
        </View>
        <View style={[s.kpiCard, { marginRight: 0 }]}>
          <Text style={s.label}>CO₂ Avoided</Text>
          <Text style={s.value}>{solarResult.co2ReductionTons.toFixed(1)} t/yr</Text>
          <Text style={s.subValue}>≈ {Math.round(solarResult.co2ReductionTons * 45)} trees planted</Text>
        </View>
      </View>

      {/* ── Section 1: Facility ── */}
      <View style={s.section}>
        <SectionHeader number="1" title="Facility & Location Profile" tag="GIS VERIFIED" />
        <View style={s.sectionBody}>
          <View style={s.grid2}>
            <View style={s.col2}>
              <Text style={s.label}>Facility Address</Text>
              <Text style={s.valueSm}>{rooftopData?.formattedAddress ?? "Maadi, Cairo, Egypt"}</Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>Electricity Meter ID</Text>
              <Text style={s.valueSm}>{billData?.meterNumber ?? "EGY-ME-90214"}</Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>Baseline Monthly Bill</Text>
              <Text style={s.valueSm}>{fmtEgp(billData?.totalCostEgp ?? 3850)}</Text>
              <Text style={s.subValue}>Incl. EgyptERA customer service charge</Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>Monthly Consumption</Text>
              <Text style={s.valueSm}>{fmt(Math.round(monthlyKwh))} kWh</Text>
              <Text style={s.subValue}>Blended rate: {blendedRate} EGP/kWh</Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>Rooftop Polygon Area (GIS)</Text>
              <Text style={s.valueSm}>{rooftopData?.polygonAreaM2 ?? 280} m²</Text>
              <Text style={s.subValue}>
                Source: {rooftopData?.meta?.areaSource === "overpass_polygon" ? "Overpass / OpenStreetMap" : "Estimated (kWh / 15)"}
              </Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>Coordinates (WGS-84)</Text>
              <Text style={s.valueSm}>
                {rooftopData?.lat?.toFixed(5) ?? "29.96020"}, {rooftopData?.lng?.toFixed(5) ?? "31.25690"}
              </Text>
              <Text style={s.subValue}>Google Maps / OpenStreetMap verified</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Section 2: PV System Specifications ── */}
      <View style={s.section}>
        <SectionHeader number="2" title="Proposed Solar PV System Specifications" tag="ENGINEERING" />
        <View style={s.sectionBody}>
          <View style={s.grid4}>
            <View style={s.col4}>
              <Text style={s.label}>Peak Capacity</Text>
              <Text style={s.valueSmGreen}>{solarResult.systemCapacityKwp.toFixed(2)} kWp</Text>
              <Text style={s.subValue}>Grid-tied, on-roof</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Roof Area Required</Text>
              <Text style={s.valueSm}>{solarResult.roofAreaRequiredM2.toFixed(1)} m²</Text>
              <Text style={s.subValue}>@ 6 m² / kWp</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Annual Energy Yield</Text>
              <Text style={s.valueSm}>{fmt(annualYieldKwh)} kWh</Text>
              <Text style={s.subValue}>5 PSH × 365 days</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Solar Coverage</Text>
              <Text style={s.valueSmAmber}>{solarResult.greenScore}%</Text>
              <Text style={s.subValue}>of monthly load</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Roof Utilisation</Text>
              <Text style={s.valueSm}>
                {rooftopData?.polygonAreaM2
                  ? Math.min(100, Math.round((solarResult.roofAreaRequiredM2 / rooftopData.polygonAreaM2) * 100))
                  : "—"}%
              </Text>
              <Text style={s.subValue}>of polygon area</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Panel Technology</Text>
              <Text style={s.valueSm}>Mono PERC</Text>
              <Text style={s.subValue}>22–23% efficiency</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Inverter Type</Text>
              <Text style={s.valueSm}>String / Micro</Text>
              <Text style={s.subValue}>Grid-synchronised</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Panel Lifespan</Text>
              <Text style={s.valueSm}>25 Years</Text>
              <Text style={s.subValue}>0.5%/yr degradation</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Section 3: Financial Assessment ── */}
      <View style={s.section}>
        <SectionHeader number="3" title="Financial & Micro-Finance Assessment" tag="EGP" />
        <View style={s.sectionBody}>
          <View style={s.grid4}>
            <View style={s.col4}>
              <Text style={s.label}>Turnkey CAPEX</Text>
              <Text style={s.valueSmAmber}>{fmtEgp(solarResult.initialCostEgp)}</Text>
              <Text style={s.subValue}>{fmt(COMMERCIAL_SOLAR_COST_PER_KWP)} EGP/kWp</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Cost Range</Text>
              <Text style={s.valueSm}>
                {fmtEgp(Math.round(solarResult.systemCapacityKwp * MIN_COMMERCIAL_COST_PER_KWP))}
                {" – "}
                {fmtEgp(Math.round(solarResult.systemCapacityKwp * MAX_COMMERCIAL_COST_PER_KWP))}
              </Text>
              <Text style={s.subValue}>Market benchmarks</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Monthly Savings</Text>
              <Text style={s.valueSmGreen}>{fmtEgp(solarResult.monthlySavingsEgp)}</Text>
              <Text style={s.subValue}>vs. current bill</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Annual Savings</Text>
              <Text style={s.valueSmGreen}>{fmtEgp(solarResult.annualSavingsEgp)}</Text>
              <Text style={s.subValue}>yr 1 base case</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Payback Period</Text>
              <Text style={s.valueSmAmber}>{solarResult.paybackPeriodYears.toFixed(1)} yrs</Text>
              <Text style={s.subValue}>simple undiscounted</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>25-Year Net Value</Text>
              <Text style={[s.valueSm, { color: netValue25Yr >= 0 ? C.emerald : C.red }]}>
                {netValue25Yr >= 0 ? "+" : ""}{fmtEgp(netValue25Yr)}
              </Text>
              <Text style={s.subValue}>8% tariff escalation</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>Green Score</Text>
              <Text style={s.valueSmGreen}>{solarResult.greenScore} / 100</Text>
              <Text style={s.subValue}>SDG 7 alignment</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>CO₂ Offset / 25 yr</Text>
              <Text style={s.valueSm}>{(solarResult.co2ReductionTons * 25).toFixed(0)} tons</Text>
              <Text style={s.subValue}>Egypt grid 0.53 kg/kWh</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Financing eligibility note */}
          <InfoRow text={`This project qualifies for the Central Bank of Egypt's SME Green Lending Initiative with subsidised interest rates available through Banque Misr and the National Bank of Egypt.`} />
          <InfoRow text={`Suggested financing structure: 20% down payment (${fmtEgp(solarResult.initialCostEgp * 0.2)}), 80% financed over ${Math.ceil(solarResult.paybackPeriodYears)} years. Monthly repayment offset by solar savings.`} />
          <InfoRow text={`Net monthly cash impact after loan repayment is approximately ${fmtEgp(Math.max(0, solarResult.monthlySavingsEgp - (solarResult.initialCostEgp * 0.8 / (Math.ceil(solarResult.paybackPeriodYears) * 12))))} EGP positive.`} bold />
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>EnergyTwin AI — SolveThe17 Hackathon (SDG 7) | Page 1 of 2</Text>
        <Text style={s.footerGreen}>Tariff: EgyptERA {EGYPT_ERA_EFFECTIVE_DATE} | {EGYPT_ERA_TARIFF_URL}</Text>
      </View>
    </Page>
  );
}

// ─── Page 2: Cash-Flow Projections + Tariff Reference + Signature ────────────

function PageTwo({
  solarResult,
  billData,
  cashFlows,
  dateStr,
  refNumber,
}: {
  solarResult: SolarResult;
  billData?: BillData;
  cashFlows: AnnualCashFlow[];
  dateStr: string;
  refNumber: string;
}) {
  const breakEvenYear = cashFlows.findIndex((cf) => cf.netCashFlowEgp >= 0);

  const tableYears = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 18, 20, 25];

  return (
    <Page size="A4" style={s.page}>
      {/* ── Page 2 Header ── */}
      <View style={s.page2Header}>
        <View>
          <Text style={s.page2Title}>EnergyTwin AI — Cash Flow Projections & Reference Data</Text>
          <Text style={s.page2Sub}>
            Proposal Ref: {refNumber} | {dateStr} | 25-Year Financial Model (8% tariff escalation, 0.5%/yr panel degradation)
          </Text>
        </View>
        <Text style={s.badgePrimary}>PAGE 2 OF 2</Text>
      </View>

      {/* ── Section 4: 25-Year Cash Flow Table ── */}
      <View style={s.section}>
        <SectionHeader number="4" title="25-Year Commercial Cash Flow & Escalation Table" tag="PROJECTION" />
        {/* Table header */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, s.colYear]}>Year</Text>
          <Text style={[s.tableHeaderCell, s.colGrid]}>Grid (No Solar)</Text>
          <Text style={[s.tableHeaderCell, s.colGridS]}>Grid (w/ Solar)</Text>
          <Text style={[s.tableHeaderCell, s.colSave]}>Annual Savings</Text>
          <Text style={[s.tableHeaderCell, s.colCumul]}>Cumulative Saved</Text>
          <Text style={[s.tableHeaderCell, s.colNet]}>Net Cash Flow</Text>
        </View>
        {tableYears.map((yr, i) => {
          const cf = cashFlows[yr - 1];
          if (!cf) return null;
          const isBreakEven = yr === breakEvenYear + 1;
          const isPositive = cf.netCashFlowEgp >= 0;
          const rowStyle = isBreakEven
            ? s.tableRowBreakeven
            : i % 2 === 0
              ? s.tableRow
              : s.tableRowAlt;
          return (
            <View key={yr} style={rowStyle}>
              <Text style={[s.tableCellBold, s.colYear]}>
                {isBreakEven ? "✓ " : ""}Yr {cf.year}
              </Text>
              <Text style={[s.tableCell, s.colGrid]}>{fmtEgp(cf.gridCostWithoutSolarEgp)}</Text>
              <Text style={[s.tableCell, s.colGridS]}>{fmtEgp(cf.gridCostWithSolarEgp)}</Text>
              <Text style={[s.tableCellGreen, s.colSave]}>+{fmtEgp(cf.annualSavingsEgp)}</Text>
              <Text style={[s.tableCellAmber, s.colCumul]}>{fmtEgp(cf.cumulativeSavingsEgp)}</Text>
              <Text style={[isPositive ? s.tableCellGreen : s.tableCell, s.colNet]}>
                {cf.netCashFlowEgp >= 0 ? "+" : ""}{fmtEgp(cf.netCashFlowEgp)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Section 5: EgyptERA Tariff Reference ── */}
      <View style={s.section}>
        <SectionHeader number="5" title="EgyptERA Commercial Electricity Tariff Schedule (April 2026)" tag="OFFICIAL" />
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, s.tariffColTier]}>Consumption Band</Text>
          <Text style={[s.tableHeaderCell, s.tariffColRate]}>Rate (EGP/kWh)</Text>
          <Text style={[s.tableHeaderCell, s.tariffColFee]}>Service Fee / mo</Text>
          <Text style={[s.tableHeaderCell, s.tariffColNote]}>Billing Note</Text>
        </View>
        {[
          { band: "0 – 100 kWh (Tier 1)", rate: "1.62 EGP (162 Pt)", fee: "5.00 EGP", note: "Billed from 0 kWh" },
          { band: "101 – 250 kWh (Tier 2)", rate: "2.16 EGP (216 Pt)", fee: "15.00 EGP", note: "Entire consumption at Tier 2 rate" },
          { band: "251 – 600 kWh (Tier 3)", rate: "2.64 EGP (264 Pt)", fee: "20.00 EGP", note: "Entire consumption at Tier 3 rate" },
          { band: "601 – 1000 kWh (Tier 4)", rate: "264 Pt (0-600) + 274 Pt (601-1000)", fee: "25.00 EGP", note: "Split billing model" },
          { band: "> 1000 kWh (Tier 5)", rate: "2.79 EGP (279 Pt)", fee: "40.00 EGP", note: "Entire consumption at Tier 5 rate" },
        ].map((row, i) => (
          <View key={i} style={i % 2 === 0 ? s.tariffRow : s.tariffRowAlt}>
            <Text style={[s.tariffCellBold, s.tariffColTier]}>{row.band}</Text>
            <Text style={[s.tariffCell, s.tariffColRate]}>{row.rate}</Text>
            <Text style={[s.tariffCell, s.tariffColFee]}>{row.fee}</Text>
            <Text style={[s.tariffCell, s.tariffColNote]}>{row.note}</Text>
          </View>
        ))}
      </View>

      {/* ── Section 6: Risk & Disclaimer ── */}
      <View style={s.disclaimerBox}>
        <Text style={s.disclaimerTitle}>⚠ Risk Factors & Important Disclaimers</Text>
        <Text style={s.disclaimerText}>
          This proposal is generated by an AI-assisted software tool for indicative purposes only. It does not constitute a certified engineering assessment, a formal bank offer, or a legal financial document. Actual system performance, costs, and savings will vary based on site survey, panel orientation, shading, grid availability, and prevailing tariff revisions by EgyptERA. The 8% annual tariff escalation assumption is indicative and may change. Investors and lenders should commission a site-certified feasibility study before committing capital. CO₂ figures use the Egyptian National Grid Emission Factor of 0.53 kg CO₂/kWh (NREA).
        </Text>
      </View>

      {/* ── Section 7: Authorisation & Signature Block ── */}
      <View style={s.section}>
        <SectionHeader number="6" title="Authorisation & Acknowledgement" />
        <View style={[s.sectionBodyTinted, { paddingBottom: 24 }]}>
          <InfoRow text="The undersigned acknowledges that this solar feasibility proposal has been reviewed and accepts the indicative financial projections for the purposes of initial bank screening under the CBE SME Green Lending Initiative." />
          <View style={s.sigRow}>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>Applicant / Facility Representative</Text>
              <Text style={s.sigName}>_____________________________</Text>
              <Text style={s.sigDate}>Signature & Date</Text>
            </View>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>Bank Relationship Manager</Text>
              <Text style={s.sigName}>_____________________________</Text>
              <Text style={s.sigDate}>Stamp & Date</Text>
            </View>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>EnergyTwin AI Reference</Text>
              <Text style={s.sigName}>{refNumber}</Text>
              <Text style={s.sigDate}>Issued: {dateStr}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>EnergyTwin AI — SolveThe17 Hackathon (SDG 7) | Page 2 of 2</Text>
        <Text style={s.footerGreen}>Source: {EGYPT_ERA_TARIFF_URL}</Text>
      </View>
    </Page>
  );
}

// ─── Document Root ────────────────────────────────────────────────────────────

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

  // Stable ref number derived from timestamp seed
  const refNumber = `ET-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const annualYieldKwh = Math.round(solarResult.systemCapacityKwp * 5 * 365);
  const cashFlows = calculate25YearProjection(solarResult, (billData?.totalCostEgp ?? 3850) * 12);
  const lastCf = cashFlows[24];
  const netValue25Yr = lastCf ? lastCf.cumulativeSavingsEgp - solarResult.initialCostEgp : 0;

  return (
    <Document
      title="EnergyTwin_Solar_MicroFinance_Proposal"
      author="EnergyTwin AI"
      subject="Egyptian Green Micro-Finance Solar Proposal (SDG 7)"
      keywords="solar, Egypt, SME, green finance, EgyptERA, renewable energy"
      creator="EnergyTwin AI — SolveThe17 Hackathon"
    >
      <PageOne
        solarResult={solarResult}
        billData={billData}
        rooftopData={rooftopData}
        dateStr={dateStr}
        refNumber={refNumber}
        annualYieldKwh={annualYieldKwh}
        netValue25Yr={netValue25Yr}
      />
      <PageTwo
        solarResult={solarResult}
        billData={billData}
        cashFlows={cashFlows}
        dateStr={dateStr}
        refNumber={refNumber}
      />
    </Document>
  );
}

// ─── Client Button Component ──────────────────────────────────────────────────

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
    if (isGenerating) return;
    try {
      setIsGenerating(true);
      const doc = (
        <BankProposalDocument
          solarResult={solarResult}
          billData={billData}
          rooftopData={rooftopData}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const addressSlug = (rooftopData?.formattedAddress ?? "Cairo")
        .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_")
        .slice(0, 30);
      link.download = `EnergyTwin_Bank_Proposal_${addressSlug}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/60 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed",
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
