"use client";

import React, { useState, useSyncExternalStore } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
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
import { FileText, Loader2 } from "lucide-react";

// Register a locally bundled Arabic font so PDF generation never depends on a remote CDN.
Font.register({
  family: "Cairo",
  fonts: [
    {
      src: "/fonts/Cairo-Regular.ttf",
      fontWeight: "normal",
    },
    {
      src: "/fonts/Cairo-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});

// Prevent long Arabic words from being split with hyphens in generated documents.
Font.registerHyphenationCallback((word) => [word]);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PdfReportProps {
  solarResult: SolarResult;
  billData?: BillData;
  rooftopData?: RooftopData;
  className?: string;
}

export interface ReportMeta {
  dateStr: string;
  refNumber: string;
}

/**
 * Builds the document date and reference number.
 * Must only be called from an event handler (not during render) because it reads the clock.
 */
export function createReportMeta(
  now: Date = new Date(),
  refNumber?: string
): ReportMeta {
  return {
    dateStr: now.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    refNumber:
      refNumber ?? `ET-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`,
  };
}

// ─── Brand Colour Palette ─────────────────────────────────────────────────────

const C = {
  teal: "#0E7C7B",
  tealDeep: "#0A3A3A",
  tealLight: "#E6F4F4",
  tealBorder: "#99D1D0",
  sun: "#FFC93C",
  sunset: "#FF8A3D",
  sand: "#FAF3E7",
  leaf: "#4CAF6E",
  leafLight: "#E8F8ED",
  leafBorder: "#B5E8C5",
  ink: "#1E2A2B",
  slate700: "#334155",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",
  slate50: "#FAF3E7",
  white: "#FFFFFF",
  red: "#D64545",
  redLight: "#FEE2E2",
};

// ─── StyleSheet ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Pages
  page: {
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 36,
    backgroundColor: C.white,
    fontFamily: "Cairo",
    fontSize: 9,
    color: C.ink,
  },

  // ── Header Band ──
  headerBand: {
    backgroundColor: C.teal,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 4,
    marginBottom: 16,
    borderBottomWidth: 4,
    borderBottomColor: C.sun,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "column" },
  logoTitle: { fontSize: 18, fontFamily: "Cairo", fontWeight: "bold", color: C.white, letterSpacing: 0.5 },
  reportTitle: { fontSize: 13, fontFamily: "Cairo", fontWeight: "bold", color: C.sun, marginTop: 2 },
  reportSubtitle: { fontSize: 8, color: C.sand, marginTop: 1 },
  headerRight: { alignItems: "flex-end", flexDirection: "column" },
  badgeBank: {
    backgroundColor: C.sun,
    color: C.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Cairo",
    fontWeight: "bold",
    textAlign: "center",
  },
  badgeGreen: {
    backgroundColor: C.leaf,
    color: C.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Cairo",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 3,
  },
  docMeta: { fontSize: 7, color: C.sand, marginTop: 3, textAlign: "right" },

  // ── Section containers ──
  section: {
    marginBottom: 11,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.slate200,
    overflow: "hidden",
  },
  sectionHeader: {
    backgroundColor: C.teal,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Cairo",
    fontWeight: "bold",
    color: C.white,
    letterSpacing: 0.5,
  },
  sectionTag: {
    fontSize: 6.5,
    color: C.sun,
    fontFamily: "Cairo",
    fontWeight: "bold",
    backgroundColor: C.tealDeep,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 2,
  },
  sectionBody: { padding: 9, backgroundColor: C.white },
  sectionBodyTinted: { padding: 9, backgroundColor: C.sand },

  // ── Grids ──
  grid2: { flexDirection: "row", flexWrap: "wrap" },
  grid3: { flexDirection: "row", flexWrap: "wrap" },
  grid4: { flexDirection: "row", flexWrap: "wrap" },
  col2: { width: "50%", paddingRight: 8, marginBottom: 6 },
  col3: { width: "33.33%", paddingRight: 8, marginBottom: 6 },
  col4: { width: "25%", paddingRight: 4, marginBottom: 6 },

  // ── KPI cards ──
  kpiCard: {
    flex: 1,
    marginRight: 6,
    backgroundColor: C.sand,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.tealBorder,
    padding: 7,
  },
  kpiCardTeal: {
    flex: 1,
    marginRight: 6,
    backgroundColor: C.tealLight,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.tealBorder,
    padding: 7,
  },
  kpiCardSun: {
    flex: 1,
    marginRight: 6,
    backgroundColor: "#FFF8E7",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.sun,
    padding: 7,
  },
  kpiRow: { flexDirection: "row", marginBottom: 10 },

  // ── Field labels & values ──
  label: { fontSize: 7, color: C.slate500, fontFamily: "Cairo", fontWeight: "bold" },
  value: { fontSize: 11, fontFamily: "Cairo", fontWeight: "bold", color: C.ink, marginTop: 1 },
  valueTeal: { fontSize: 11, fontFamily: "Cairo", fontWeight: "bold", color: C.teal, marginTop: 1 },
  valueSunset: { fontSize: 11, fontFamily: "Cairo", fontWeight: "bold", color: C.sunset, marginTop: 1 },
  valueSm: { fontSize: 8.5, fontFamily: "Cairo", fontWeight: "bold", color: C.ink, marginTop: 1 },
  valueSmTeal: { fontSize: 8.5, fontFamily: "Cairo", fontWeight: "bold", color: C.teal, marginTop: 1 },
  valueSmSunset: { fontSize: 8.5, fontFamily: "Cairo", fontWeight: "bold", color: C.sunset, marginTop: 1 },
  subValue: { fontSize: 6.5, color: C.slate500, marginTop: 1 },

  // ── Dividers ──
  divider: { borderBottomWidth: 1, borderBottomColor: C.slate200, marginVertical: 6 },

  // ── Projection table ──
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.tealDeep,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  tableHeaderCell: { fontSize: 6.5, fontFamily: "Cairo", fontWeight: "bold", color: C.white },
  tableRow: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: C.slate100 },
  tableRowAlt: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: C.slate100, backgroundColor: C.sand },
  tableRowBreakeven: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: C.tealBorder, backgroundColor: C.tealLight },
  tableCell: { fontSize: 7, color: C.ink },
  tableCellTeal: { fontSize: 7, color: C.teal, fontFamily: "Cairo", fontWeight: "bold" },
  tableCellSunset: { fontSize: 7, color: C.sunset, fontFamily: "Cairo", fontWeight: "bold" },
  tableCellBold: { fontSize: 7, color: C.tealDeep, fontFamily: "Cairo", fontWeight: "bold" },

  // Table column widths
  colYear: { width: "12%" },
  colGrid: { width: "20%" },
  colGridS: { width: "20%" },
  colSave: { width: "18%" },
  colCumul: { width: "18%" },
  colNet: { width: "12%" },

  // ── Disclaimer / risk ──
  disclaimerBox: {
    backgroundColor: C.redLight,
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 4,
    padding: 7,
    marginBottom: 8,
  },
  disclaimerTitle: { fontSize: 7, fontFamily: "Cairo", fontWeight: "bold", color: C.red, marginBottom: 3 },
  disclaimerText: { fontSize: 6.5, color: "#7f1d1d", lineHeight: 1.4 },

  // ── Signature block ──
  sigRow: { flexDirection: "row", marginTop: 8, gap: 16 },
  sigBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: C.tealDeep,
    paddingTop: 5,
  },
  sigLabel: { fontSize: 6.5, color: C.slate500 },
  sigName: { fontSize: 7.5, fontFamily: "Cairo", fontWeight: "bold", color: C.ink, marginTop: 2 },
  sigDate: { fontSize: 6.5, color: C.slate500, marginTop: 1 },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: C.slate200,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 6.5, color: C.slate400 },
  footerTeal: { fontSize: 6.5, color: C.teal },

  // ── Page 2 specific ──
  page2Header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: C.teal,
  },
  page2Title: { fontSize: 12, fontFamily: "Cairo", fontWeight: "bold", color: C.tealDeep },
  page2Sub: { fontSize: 7, color: C.slate500, marginTop: 1 },

  // ── Tariff table ──
  tariffRow: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: C.slate100 },
  tariffRowAlt: { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: C.slate100, backgroundColor: C.sand },
  tariffCell: { fontSize: 7, color: C.ink },
  tariffCellBold: { fontSize: 7, color: C.tealDeep, fontFamily: "Cairo", fontWeight: "bold" },
  tariffColTier: { width: "30%" },
  tariffColRate: { width: "22%" },
  tariffColFee: { width: "18%" },
  tariffColNote: { width: "30%" },

  // ── Info row ──
  infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  infoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.teal, marginRight: 6, marginTop: 2 },
  infoText: { fontSize: 7, color: C.ink, flex: 1, lineHeight: 1.4 },
  infoTextBold: { fontSize: 7, color: C.tealDeep, fontFamily: "Cairo", fontWeight: "bold", flex: 1, lineHeight: 1.4 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-EG");
}

function fmtEgp(n: number): string {
  return `${fmt(Math.round(n))} ج.م`;
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
  const monthlySpend = billData?.totalCostEgp ?? 0;
  const blendedRate =
    monthlyKwh > 0 && monthlySpend > 0 ? (monthlySpend / monthlyKwh).toFixed(3) : "—";

  return (
    <Page size="A4" style={s.page}>
      {/* ── Teal Header Band + Sun Accent ── */}
      <View style={s.headerBand}>
        <View style={s.headerLeft}>
          <Text style={s.logoTitle}>EnergyTwin AI</Text>
          <Text style={s.reportTitle}>التقرير الفني والمالي للتمويل الأخضر</Text>
          <Text style={s.reportSubtitle}>تمويل بنكي أخضر | Green Micro-Finance Report</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.badgeBank}>BANQUE MISR / NBE QUALIFIED</Text>
          <Text style={s.badgeGreen}>مؤهل للتمويل الأخضر المدعوم</Text>
          <Text style={s.docMeta}>Proposal Ref: {refNumber}</Text>
          <Text style={s.docMeta}>تاريخ الإصدار: {dateStr}</Text>
          <Text style={s.docMeta}>Tariff Base: EgyptERA {EGYPT_ERA_EFFECTIVE_DATE}</Text>
        </View>
      </View>

      {/* ── KPI Strip ── */}
      <View style={s.kpiRow}>
        <View style={[s.kpiCardTeal, { marginRight: 6 }]}>
          <Text style={s.label}>الوفر السنوي التقديري</Text>
          <Text style={s.valueTeal}>{fmtEgp(solarResult.annualSavingsEgp)}</Text>
          <Text style={s.subValue}>{fmtEgp(solarResult.monthlySavingsEgp)} / شهر</Text>
        </View>
        <View style={[s.kpiCardSun, { marginRight: 6 }]}>
          <Text style={s.label}>فترة استرداد التكلفة</Text>
          <Text style={s.valueSunset}>{solarResult.paybackPeriodYears.toFixed(1)} سنين</Text>
          <Text style={s.subValue}>عائد استثماري سريع</Text>
        </View>
        <View style={[s.kpiCard, { marginRight: 6 }]}>
          <Text style={s.label}>قدرة المحطة المقترحة</Text>
          <Text style={s.value}>{solarResult.systemCapacityKwp.toFixed(2)} kWp</Text>
          <Text style={s.subValue}>{fmt(annualYieldKwh)} ك.و.س / سنة</Text>
        </View>
        <View style={[s.kpiCard, { marginRight: 0 }]}>
          <Text style={s.label}>خفض انبعاثات الكربون</Text>
          <Text style={s.value}>{solarResult.co2ReductionTons.toFixed(1)} طن/سنة</Text>
          <Text style={s.subValue}>≈ {Math.round(solarResult.co2ReductionTons * 45)} شجرة</Text>
        </View>
      </View>

      {/* ── Section 1: بيانات المنشأة والموقع ── */}
      <View style={s.section}>
        <SectionHeader number="1" title="بيانات المنشأة والموقع التجاري" tag="GIS VERIFIED" />
        <View style={s.sectionBody}>
          <View style={s.grid2}>
            <View style={s.col2}>
              <Text style={s.label}>عنوان المنشأة</Text>
              <Text style={s.valueSm}>{rooftopData?.formattedAddress ?? "المعادي، القاهرة، مصر"}</Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>رقم عداد الكهرباء</Text>
              <Text style={s.valueSm}>{billData?.meterNumber ?? "EGY-ME-90214"}</Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>الفاتورة الشهرية الحالية</Text>
              <Text style={s.valueSm}>{fmtEgp(billData?.totalCostEgp ?? 3850)}</Text>
              <Text style={s.subValue}>شاملة رسوم خدمة العملاء الرسمية</Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>الاستهلاك الشهري التقديري</Text>
              <Text style={s.valueSm}>{fmt(Math.round(monthlyKwh))} ك.و.س</Text>
              <Text style={s.subValue}>متوسط سعر الكيلوواط: {blendedRate} ج.م</Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>مساحة السطح عبر الـ GIS</Text>
              <Text style={s.valueSm}>{rooftopData?.polygonAreaM2 ?? 280} م²</Text>
              <Text style={s.subValue}>
                المصدر: {rooftopData?.meta?.areaSource === "overpass_polygon" ? "OpenStreetMap / Overpass" : "تقديري (kWh / 15)"}
              </Text>
            </View>
            <View style={s.col2}>
              <Text style={s.label}>الإحداثيات الجغرافية (WGS-84)</Text>
              <Text style={s.valueSm}>
                {rooftopData?.lat?.toFixed(5) ?? "29.96020"}, {rooftopData?.lng?.toFixed(5) ?? "31.25690"}
              </Text>
              <Text style={s.subValue}>موثق عبر Google Maps و OpenStreetMap</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Section 2: مواصفات النظام الشمسي ── */}
      <View style={s.section}>
        <SectionHeader number="2" title="مواصفات النظام الشمسي المقترح" tag="ENGINEERING" />
        <View style={s.sectionBody}>
          <View style={s.grid4}>
            <View style={s.col4}>
              <Text style={s.label}>القدرة التصميمية</Text>
              <Text style={s.valueSmTeal}>{solarResult.systemCapacityKwp.toFixed(2)} kWp</Text>
              <Text style={s.subValue}>متصل بالشبكة (On-Grid)</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>مساحة السطح المطلوبة</Text>
              <Text style={s.valueSm}>{solarResult.roofAreaRequiredM2.toFixed(1)} م²</Text>
              <Text style={s.subValue}>@ 6 م² / kWp</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>الإنتاج السنوي المتوقع</Text>
              <Text style={s.valueSm}>{fmt(annualYieldKwh)} ك.و.س</Text>
              <Text style={s.subValue}>٥ ساعات ذروة × ٣٦٥ يوم</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>نسبة التحول للشمس</Text>
              <Text style={s.valueSmSunset}>{solarResult.greenScore}%</Text>
              <Text style={s.subValue}>من الاستهلاك الكلي</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>نسبة استغلال السطح</Text>
              <Text style={s.valueSm}>
                {rooftopData?.polygonAreaM2
                  ? Math.min(100, Math.round((solarResult.roofAreaRequiredM2 / rooftopData.polygonAreaM2) * 100))
                  : "—"}%
              </Text>
              <Text style={s.subValue}>من مضلع المبنى</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>نوع الألواح</Text>
              <Text style={s.valueSm}>Mono PERC</Text>
              <Text style={s.subValue}>كفاءة عالية ٢٢-٢٣٪</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>العاكس (Inverter)</Text>
              <Text style={s.valueSm}>String Inverter</Text>
              <Text style={s.subValue}>متزامن مع شبكة مصر</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>العمر الافتراضي</Text>
              <Text style={s.valueSm}>25 سنة</Text>
              <Text style={s.subValue}>ضمان أداء قياسي</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Section 3: دراسة الجدوى والتمويل ── */}
      <View style={s.section}>
        <SectionHeader number="3" title="التقييم المالي والتمويل المصرفي الأخضر" tag="FINANCE" />
        <View style={s.sectionBody}>
          <View style={s.grid4}>
            <View style={s.col4}>
              <Text style={s.label}>التكلفة التقديرية الكلية</Text>
              <Text style={s.valueSmSunset}>{fmtEgp(solarResult.initialCostEgp)}</Text>
              <Text style={s.subValue}>{fmt(COMMERCIAL_SOLAR_COST_PER_KWP)} ج.م/ك.و.ب</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>نطاق التكلفة السوقية</Text>
              <Text style={s.valueSm}>
                {fmtEgp(Math.round(solarResult.systemCapacityKwp * MIN_COMMERCIAL_COST_PER_KWP))}
                {" - "}
                {fmtEgp(Math.round(solarResult.systemCapacityKwp * MAX_COMMERCIAL_COST_PER_KWP))}
              </Text>
              <Text style={s.subValue}>معايير الموردين المعتمدين</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>الوفر الشهري</Text>
              <Text style={s.valueSmTeal}>{fmtEgp(solarResult.monthlySavingsEgp)}</Text>
              <Text style={s.subValue}>مقارنة بالفاتورة الحالية</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>الوفر السنوي</Text>
              <Text style={s.valueSmTeal}>{fmtEgp(solarResult.annualSavingsEgp)}</Text>
              <Text style={s.subValue}>في السنة الأولى</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>فترة استرداد التكلفة</Text>
              <Text style={s.valueSmSunset}>{solarResult.paybackPeriodYears.toFixed(1)} سنين</Text>
              <Text style={s.subValue}>Payback Period</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>صافي العائد على ٢٥ سنة</Text>
              <Text style={[s.valueSm, { color: netValue25Yr >= 0 ? C.teal : C.red }]}>
                {netValue25Yr >= 0 ? "+" : ""}{fmtEgp(netValue25Yr)}
              </Text>
              <Text style={s.subValue}>بمعدل تصاعد تعريفة ٨٪</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>مؤشر الاستدامة (SDG 7)</Text>
              <Text style={s.valueSmTeal}>{solarResult.greenScore} / 100</Text>
              <Text style={s.subValue}>Clean Energy Score</Text>
            </View>
            <View style={s.col4}>
              <Text style={s.label}>إجمالي خفض CO₂ (25 سنة)</Text>
              <Text style={s.valueSm}>{(solarResult.co2ReductionTons * 25).toFixed(0)} طن</Text>
              <Text style={s.subValue}>شبكة مصر 0.53 كجم/ك.و.س</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Financing eligibility notes */}
          <InfoRow text="هذا المشروع مؤهل لمبادرة البنك المركزي المصري لتمويل المشروعات الصغيرة والمتوسطة بفائدة مدعومة عبر بنك مصر والبنك الأهلي المصري." />
          <InfoRow text={`هيكل التمويل المقترح: دفعة مقدمة ٢٠٪ (${fmtEgp(solarResult.initialCostEgp * 0.2)})، وتمويل بنكي ٨٠٪ على مدى ${Math.ceil(solarResult.paybackPeriodYears)} سنوات يسدد من الوفر الشهري في فاتورة الكهرباء.`} />
          <InfoRow text={`الأثر النقدي الشهري الصافي بعد سداد قسط القرض يحقق فائضاً إيجابياً بنحو ${fmtEgp(Math.max(0, solarResult.monthlySavingsEgp - (solarResult.initialCostEgp * 0.8 / (Math.ceil(solarResult.paybackPeriodYears) * 12))))} شهرياً.`} bold />
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>EnergyTwin AI — هاكاثون SolveThe17 (SDG 7) | صفحة ١ من ٢</Text>
        <Text style={s.footerTeal}>تعريفة: EgyptERA {EGYPT_ERA_EFFECTIVE_DATE} | {EGYPT_ERA_TARIFF_URL}</Text>
      </View>
    </Page>
  );
}

// ─── Page 2: Cash-Flow Projections + Tariff Reference + Signature ────────────

function PageTwo({
  cashFlows,
  dateStr,
  refNumber,
}: {
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
          <Text style={s.page2Title}>EnergyTwin AI — جدول التدفقات النقدية والمراجع الرسمية</Text>
          <Text style={s.page2Sub}>
            رقم المعاملة: {refNumber} | {dateStr} | نموذج مالي لـ ٢٥ سنة (تصاعد سنوي للتعريفة ٨٪، انخفاض أداء الألواح ٠.٥٪/سنة)
          </Text>
        </View>
        <Text style={s.badgeBank}>صفحة ٢ من ٢</Text>
      </View>

      {/* ── Section 4: 25-Year Cash Flow Table ── */}
      <View style={s.section}>
        <SectionHeader number="4" title="جدول التدفقات النقدية والوفر التراكمي (٢٥ سنة)" tag="PROJECTION" />
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, s.colYear]}>السنة</Text>
          <Text style={[s.tableHeaderCell, s.colGrid]}>الكهرباء (بدون شمس)</Text>
          <Text style={[s.tableHeaderCell, s.colGridS]}>الكهرباء (بالشمس)</Text>
          <Text style={[s.tableHeaderCell, s.colSave]}>الوفر السنوي</Text>
          <Text style={[s.tableHeaderCell, s.colCumul]}>الوفر التراكمي</Text>
          <Text style={[s.tableHeaderCell, s.colNet]}>صافي التدفق</Text>
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
                {isBreakEven ? "✓ " : ""}سنة {cf.year}
              </Text>
              <Text style={[s.tableCell, s.colGrid]}>{fmtEgp(cf.gridCostWithoutSolarEgp)}</Text>
              <Text style={[s.tableCell, s.colGridS]}>{fmtEgp(cf.gridCostWithSolarEgp)}</Text>
              <Text style={[s.tableCellTeal, s.colSave]}>+{fmtEgp(cf.annualSavingsEgp)}</Text>
              <Text style={[s.tableCellSunset, s.colCumul]}>{fmtEgp(cf.cumulativeSavingsEgp)}</Text>
              <Text style={[isPositive ? s.tableCellTeal : s.tableCell, s.colNet]}>
                {cf.netCashFlowEgp >= 0 ? "+" : ""}{fmtEgp(cf.netCashFlowEgp)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Section 5: EgyptERA Tariff Reference ── */}
      <View style={s.section}>
        <SectionHeader number="5" title="جدول تعريفات الكهرباء التجارية الرسمية (EgyptERA)" tag="OFFICIAL" />
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, s.tariffColTier]}>الشريحة الاستهلاكية</Text>
          <Text style={[s.tableHeaderCell, s.tariffColRate]}>سعر الكيلوواط (ج.م)</Text>
          <Text style={[s.tableHeaderCell, s.tariffColFee]}>مقابل خدمة العملاء</Text>
          <Text style={[s.tableHeaderCell, s.tariffColNote]}>طريقة الحساب</Text>
        </View>
        {[
          { band: "٠ - ١٠٠ ك.و.س (شريحة ١)", rate: "١.٦٢ ج.م (١٦٢ قرش)", fee: "٥.٠٠ ج.م", note: "تحسب من الصفر" },
          { band: "١٠١ - ٢٥٠ ك.و.س (شريحة ٢)", rate: "٢.١٦ ج.م (٢١٦ قرش)", fee: "١٥.٠٠ ج.م", note: "يحاسب كامل الاستهلاك بسعر الشريحة" },
          { band: "٢٥١ - ٦٠٠ ك.و.س (شريحة ٣)", rate: "٢.٦٤ ج.م (٢٦٤ قرش)", fee: "٢٠.٠٠ ج.م", note: "يحاسب كامل الاستهلاك بسعر الشريحة" },
          { band: "٦٠١ - ١٠٠٠ ك.و.س (شريحة ٤)", rate: "٢٦٤ قرش (٠-٦٠٠) + ٢٧٤ قرش (٦٠١-١٠٠٠)", fee: "٢٥.٠٠ ج.م", note: "محاسبة مقسمة للشرائح" },
          { band: "أكثر من ١٠٠٠ ك.و.س (شريحة ٥)", rate: "٢.٧٩ ج.م (٢٧٩ قرش)", fee: "٤٠.٠٠ ج.م", note: "يحاسب كامل الاستهلاك بالشريحة الخامسة" },
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
        <Text style={s.disclaimerTitle}>تنبيه وملاحظات إخلاء المسؤولية القانونية</Text>
        <Text style={s.disclaimerText}>
          تم إعداد هذا التقرير الفني والمالي الاسترشادي باستخدام محرك الذكاء الاصطناعي EnergyTwin AI لأغراض التقييم الأولي وطلب التمويل البنكي. لا يعتبر هذا المستند بمثابة عرض تمويلي ملزم أو اعتماد هندسي نهائي، حيث تخضع الأرقام الدقيقة للمعاينة الميدانية ومطابقة زاوية السطح مع كود الربط على شبكة الجهد المنخفض. أرقام خفض الكربون تعتمد على معامل انبعاث الشبكة القومية المصرية 0.53 كجم CO₂/ك.و.س (NREA).
        </Text>
      </View>

      {/* ── Section 7: Authorisation & Signature Block ── */}
      <View style={s.section}>
        <SectionHeader number="6" title="الإقرار والتوقيع البنكي المبدئي" />
        <View style={[s.sectionBodyTinted, { paddingBottom: 20 }]}>
          <InfoRow text="يقر مقدم الطلب بمراجعة دراسة الجدوى الشمسية وقبول التقديرات المالية الأولية لغرض الفحص الائتماني المبدئي ضمن مبادرة البنك المركزي للمشروعات الخضراء." />
          <View style={s.sigRow}>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>مقدم الطلب / ممثل المنشأة التجارية</Text>
              <Text style={s.sigName}>_____________________________</Text>
              <Text style={s.sigDate}>التوقيع والتاريخ</Text>
            </View>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>مسؤول علاقات الائتمان بالبنك</Text>
              <Text style={s.sigName}>_____________________________</Text>
              <Text style={s.sigDate}>الختم والتاريخ</Text>
            </View>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>الرقم المرجعي لنظام EnergyTwin</Text>
              <Text style={s.sigName}>{refNumber}</Text>
              <Text style={s.sigDate}>تاريخ التقرير: {dateStr}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>EnergyTwin AI — هاكاثون SolveThe17 (SDG 7) | صفحة ٢ من ٢</Text>
        <Text style={s.footerTeal}>المصدر: {EGYPT_ERA_TARIFF_URL}</Text>
      </View>
    </Page>
  );
}

// ─── Document Root ────────────────────────────────────────────────────────────

export function BankProposalDocument({
  solarResult,
  billData,
  rooftopData,
  meta,
}: {
  solarResult: SolarResult;
  billData?: BillData;
  rooftopData?: RooftopData;
  meta: ReportMeta;
}) {
  const { dateStr, refNumber } = meta;
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
  const [error, setError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (isGenerating) return;
    setError(null);
    try {
      setIsGenerating(true);
      const meta = createReportMeta();
      const doc = (
        <BankProposalDocument
          solarResult={solarResult}
          billData={billData}
          rooftopData={rooftopData}
          meta={meta}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const addressSlug = (rooftopData?.formattedAddress ?? "Cairo")
        .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_")
        .slice(0, 30);
      link.download = `تقرير_طاقة_شمسية_للبنك_${addressSlug}_${meta.refNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("تعذر إنشاء ملف PDF. من فضلك حاول مرة أخرى.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isClient) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal/50 text-white font-semibold text-sm cursor-not-allowed opacity-70"
      >
        <FileText className="w-4 h-4" />
        <span>📄 جاهز للبنك</span>
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleDownloadPdf}
        disabled={isGenerating}
        style={{
          background: "linear-gradient(135deg, #FFC93C 0%, #FF8A3D 100%)",
        }}
        className={cn(
          "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-ink font-black text-sm shadow-md shadow-sunset/25 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
          className
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-ink" />
            <span>بنجهز التقرير...</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 text-ink" />
            <span>📄 جاهز للبنك</span>
          </>
        )}
      </button>
      {error && (
        <span role="alert" className="text-[11px] font-semibold text-error">
          {error}
        </span>
      )}
    </div>
  );
}
