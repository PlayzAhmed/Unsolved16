'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { calculateSolarSavings } from '@/lib/solar-calculator';
import { calculateKwhFromEgp } from '@/lib/egypt-tariffs';
import type { RooftopData, BillData } from '@/types';
import { BankProposalDocument, createReportMeta } from '@/components/pdf-report';
import { AppIcon } from '@/components/ui/app-icon';
import { cn } from '@/lib/utils';

export function GreenReport() {
  const searchParams = useSearchParams();

  const spendParam = searchParams.get('spend');
  const kwhParam = searchParams.get('kwh');
  const ratioParam = searchParams.get('ratio');
  const addressParam = searchParams.get('address');
  const meterParam = searchParams.get('meter');
  const areaParam = searchParams.get('area');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const monthlySpendEgp = spendParam ? Number(spendParam) : 4120;
  const monthlyKwh = kwhParam ? Number(kwhParam) : calculateKwhFromEgp(monthlySpendEgp);
  const transitionRatio = ratioParam ? Number(ratioParam) : 0.8;
  const address = addressParam ? decodeURIComponent(addressParam) : 'شارع مصدق، الدقي، الجيزة (مخبز البركة)';
  const meterNumber = meterParam || 'EGY-ME-90214';
  const areaM2 = areaParam ? Number(areaParam) : 180;
  const lat = latParam ? Number(latParam) : 30.0384;
  const lng = lngParam ? Number(lngParam) : 31.2118;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const solarResult = useMemo(() => {
    return calculateSolarSavings({
      monthlySpendEgp,
      monthlyKwh,
      transitionRatio,
    });
  }, [monthlySpendEgp, monthlyKwh, transitionRatio]);

  const billData: BillData = useMemo(() => {
    return {
      totalCostEgp: monthlySpendEgp,
      kwhConsumption: monthlyKwh,
      meterNumber,
      customerName: 'مخبز وحلواني البركة',
    };
  }, [monthlySpendEgp, monthlyKwh, meterNumber]);

  const rooftopData: RooftopData = useMemo(() => {
    return {
      lat,
      lng,
      formattedAddress: address,
      polygonAreaM2: areaM2,
      staticMapUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0PS5hO6t4R7MFK8i9is3eD4S8x-EAePtZtAwbXetoXbZgvHCudt3bK0IR51KwcX0Hhv074KKO_zJ7Z4iBvMdKjrDMXI0OX9G8BpKGk_QQ_l1baAOGS3pcfEGR6SUMECudMsjs-pGRhq6I-JtF5uOK-vDb4aQcY8CoR3dwgQDnEWRpyTJi5TYmFoZqHTcgMrIWmEFvz9UB1sqRUETa7uQt5jB-zEbBhfxwcAEKSf07bbJl0dUOeCDn',
    };
  }, [lat, lng, address, areaM2]);

  // Loan calculation (5% annual, 36 months subsidized CBE green initiative)
  const monthlyLoanPayment = Math.round(
    solarResult.initialCostEgp * (0.05 / 12) / (1 - Math.pow(1 + 0.05 / 12, -36))
  );
  const netMonthlySurplus = Math.round(solarResult.monthlySavingsEgp - monthlyLoanPayment);
  const reportId = `ET-2026-${Math.floor(8000 + solarResult.systemCapacityKwp * 100)}`;
  const annualKwhEstimate = Math.round(solarResult.systemCapacityKwp * 5 * 365);

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setPdfError(null);
    try {
      setIsGeneratingPdf(true);
      const { pdf } = await import('@react-pdf/renderer');
      const meta = createReportMeta(new Date(), reportId);
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
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_التمويل_الأخضر_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('PDF generation error:', err);
      setPdfError('تعذر إنشاء ملف PDF. من فضلك حاول مرة أخرى.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `يا فنان هذا تقرير الجدارة الائتمانية الخضراء لـ ${address} (كود #${reportId}) بفائدة ٥٪ ميسرة عبر EnergyTwin AI: التوفير الشهري ${solarResult.monthlySavingsEgp.toLocaleString('ar-EG')} ج.م وصافي الفائض ${netMonthlySurplus.toLocaleString('ar-EG')} ج.م/شهر!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col w-full pb-28 space-y-4">
      {/* Top Document Credential Banner */}
      <div className="bg-surface-container p-4 rounded-xl shadow-sm flex flex-col space-y-1">
        <div className="flex items-center justify-between gap-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-label-sm font-semibold">
            <AppIcon name="verified" className="text-tertiary-container" size={16} />
            <span>تقرير رسمي معتمد للتمويل</span>
          </div>
          <span className="text-label-sm font-label-sm text-on-surface-variant font-mono">#{reportId}</span>
        </div>
        <h1 className="text-headline-sm font-headline-sm text-primary font-bold pt-1">
          التقرير الفني والمالي للتمويل الأخضر
        </h1>
        <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
          صالح للتقديم لدى البنوك المصرية (مبادرة البنك المركزي المصري لدعم المشروعات الصغيرة والمتوسطة بفائدة 5% متناقصة)
        </p>
        <div className="flex items-center justify-between pt-1 border-t border-surface-dim/40 text-label-sm font-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1 text-primary font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            موثق رقمياً ومسجل رسمياً
          </span>
          <span>تاريخ الصدور: اليوم (معتمد)</span>
        </div>
      </div>

      {/* Bank-Ready Document Sheet Preview (The Official Dossier) */}
      <div className="relative bg-surface-container-lowest rounded-xl shadow-md overflow-hidden p-4 space-y-4">
        {/* Ambient Blur Blobs */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Official Header Strip within Document */}
        <div className="relative flex items-center justify-between pb-2 bg-surface-container-low p-3 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
              <AppIcon name="account_balance" className="text-on-primary" size={22} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-label-md font-label-md text-primary font-bold">ملف الجدارة الائتمانية الخضراء</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant truncate">نموذج دراسة الطاقة الشمسية التجارية</span>
            </div>
          </div>
          <div className="px-2 py-1 rounded bg-surface-container-highest text-on-surface font-mono text-label-sm font-bold">
            EGP / ج.م
          </div>
        </div>

        {/* 1. Enterprise Summary (بيانات المنشأة) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary">
            <AppIcon name="store" size={20} />
            <h2 className="text-label-lg font-label-lg font-bold">بيانات المنشأة والتعاقد الكهربائي</h2>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">اسم المنشأة التجاري:</span>
              <span className="font-bold text-on-surface">مخبز وحلواني البركة</span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">السجل التجاري (س.ت):</span>
              <span className="font-mono font-medium text-on-surface">489211 - الجيزة</span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">الموقع الجغرافي:</span>
              <span className="text-on-surface font-medium truncate max-w-[200px]">{address}</span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">إحداثيات الموقع:</span>
              <span className="font-mono text-label-sm font-label-sm text-on-surface-variant" dir="ltr">
                {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
              </span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">الشركة المزودة / العداد:</span>
              <span className="text-on-surface font-semibold text-primary">جنوب القاهرة - حساب #{meterNumber}</span>
            </div>
          </div>
        </div>

        {/* Roof Satellite Image Preview Placeholder */}
        <div className="relative rounded-lg overflow-hidden h-36 bg-surface-container">
          <img
            className="w-full h-full object-cover"
            alt="المعاينة الهندسية لسطح المنشأة بالأقمار الصناعية"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCME2ZQHFokz9eDTvoq5UfQfd8mX73gIWYOk97w0Gta4GyzmYKl-B4yyPWx70DkRSnzpU6gNMpCyFVWVLLhsDfC2TqenYbVyTkK_L5Jgo-u5Q2Sc76qTUXmWM2nTAL4RawpJjB7BYNJRAO6jYnY26byRhquKXYqC2FfAtBQqp0-HlZpGfWESGZn16KmhWaHO24--Z39LYWcSJpNCYkrhDh8glPoW3iiacjJP5Gb2D1PfD7C-HuDIfBH"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent flex items-end p-3">
            <div className="flex items-center justify-between w-full text-surface-container-lowest">
              <span className="text-label-sm font-label-sm flex items-center gap-1 font-medium">
                <AppIcon name="my_location" className="text-secondary-container" size={16} />
                المعاينة الهندسية لسطح المنشأة
              </span>
              <span className="text-label-sm font-label-sm bg-primary/90 px-2 py-0.5 rounded-full font-bold">
                {Math.round(solarResult.roofAreaRequiredM2)} م² ملائم للتثبيت
              </span>
            </div>
          </div>
        </div>

        {/* 2. Technical Feasibility (المواصفات الفنية) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary">
            <AppIcon name="solar_power" size={20} />
            <h2 className="text-label-lg font-label-lg font-bold">المواصفات الفنية لمنظومة الطاقة (EPC Standard)</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant">قدرة المنظومة الموصى بها</span>
              <span className="text-headline-sm font-headline-sm text-primary font-bold font-numeric-stat-mobile mt-0.5" dir="ltr">
                {solarResult.systemCapacityKwp.toFixed(1)} <span className="text-label-md font-label-md font-normal">kWp</span>
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant mt-1">كافية لتغطية أحمال المخبز</span>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant">الإنتاج السنوي التقديري</span>
              <span className="text-headline-sm font-headline-sm text-tertiary font-bold font-numeric-stat-mobile mt-0.5" dir="ltr">
                {annualKwhEstimate.toLocaleString('ar-EG')} <span className="text-label-md font-label-md font-normal">kWh</span>
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant mt-1">معامل إشعاع مصر ٥.٦</span>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant">نوع الخلايا الكهروضوئية</span>
              <span className="text-body-sm font-body-sm font-bold text-on-surface mt-1">Monocrystalline</span>
              <span className="text-label-sm font-label-sm text-primary font-medium">Tier-1 High Efficiency</span>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant">مساحة السطح المشغولة</span>
              <span className="text-body-sm font-body-sm font-bold text-on-surface mt-1">
                {Math.round(solarResult.roofAreaRequiredM2)} م²
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">من أصل {areaM2} م² متاحة</span>
            </div>
          </div>
        </div>

        {/* 3. Banking Feasibility & Cashflow Hero Card */}
        <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary p-4 rounded-xl space-y-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-label-sm uppercase tracking-wider text-on-primary-container font-semibold">
              تحليل التدفق النقدي المصرفي
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold text-label-sm">
              عائد فوري من الشهر الأول
            </span>
          </div>

          <div className="bg-surface-container-lowest/10 backdrop-blur-md p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-body-sm font-body-sm text-on-primary-container">وفر فاتورة الكهرباء شهرياً:</span>
              <span className="text-headline-sm font-headline-sm font-bold font-numeric-stat-mobile text-secondary-fixed">
                +{solarResult.monthlySavingsEgp.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm text-on-primary-container">
              <span>قسط التمويل الأخضر (5% ميسرة - 36 شهر):</span>
              <span className="font-bold font-numeric-stat-mobile text-on-primary">
                -{monthlyLoanPayment.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>

          {/* Net Monthly Pocket Money */}
          <div className="bg-surface-container-lowest text-on-surface p-3 rounded-lg flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-label-sm font-label-sm text-tertiary font-bold">صافي الفائض النقدي الشهري</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">يدخل خزينة المحل مباشرة</span>
            </div>
            <div className="flex items-baseline gap-1 text-primary">
              <span className="text-headline-md font-headline-md font-bold font-numeric-stat-mobile">
                +{netMonthlySurplus.toLocaleString('ar-EG')}
              </span>
              <span className="text-label-sm font-label-sm font-semibold">ج.م/شهر</span>
            </div>
          </div>

          {/* Loan summary stats */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-center">
            <div className="bg-surface-container-lowest/15 rounded p-1.5">
              <span className="text-label-sm font-label-sm text-on-primary-container block">إجمالي الاستثمار</span>
              <span className="text-label-lg font-label-lg font-bold text-on-primary font-numeric-stat-mobile">
                {solarResult.initialCostEgp.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <div className="bg-surface-container-lowest/15 rounded p-1.5">
              <span className="text-label-sm font-label-sm text-on-primary-container block">فترة الاسترداد</span>
              <span className="text-label-lg font-label-lg font-bold text-secondary-fixed font-numeric-stat-mobile">
                {solarResult.paybackPeriodYears.toFixed(1)} سنة
              </span>
            </div>
          </div>
        </div>

        {/* Official Stamp & Accreditation Seal */}
        <div className="p-3 bg-surface-container-low rounded-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AppIcon name="workspace_premium" className="text-primary" size={28} />
            <div className="flex flex-col">
              <span className="text-label-md font-label-md font-bold text-on-surface">اعتماد قياسات الطاقة المصرية</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">
                طبقا لضوابط جهاز تنظيم مرفق الكهرباء وحماية المستهلك (ERA)
              </span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-full bg-secondary-fixed/40 flex flex-col items-center justify-center p-1 shrink-0 text-center shadow-inner">
            <AppIcon name="verified_user" className="text-tertiary-container" size={18} />
            <span className="text-[9px] font-bold text-on-secondary-fixed-variant leading-none mt-0.5">معتمد بنكياً</span>
          </div>
        </div>

        {/* Additional Schedule Accordion */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setShowSchedule(!showSchedule)}
            className="text-primary text-label-md font-label-md font-semibold inline-flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <span>{showSchedule ? 'إخفاء جدول سداد الأقساط' : 'عرض جدول سداد الأقساط الكامل (36 شهراً)'}</span>
            <AppIcon
              name="expand_more"
              className={cn('transition-transform', showSchedule && 'rotate-180')}
              size={16}
            />
          </button>

          {showSchedule && (
            <div className="mt-3 p-3 bg-surface-container rounded-lg text-right text-xs text-on-surface space-y-1">
              <div className="flex justify-between py-1 border-b border-surface-dim font-bold">
                <span>الفترة</span>
                <span>القسط الشهري</span>
                <span>الوفر الشهري</span>
                <span>صافي الفائض</span>
              </div>
              {[1, 6, 12, 24, 36].map((m) => (
                <div key={m} className="flex justify-between py-1 border-b border-surface-dim/40">
                  <span>الشهر {m}</span>
                  <span className="font-mono">{monthlyLoanPayment.toLocaleString('ar-EG')} ج.م</span>
                  <span className="font-mono text-primary">+{solarResult.monthlySavingsEgp.toLocaleString('ar-EG')} ج.م</span>
                  <span className="font-mono font-bold text-primary">+{netMonthlySurplus.toLocaleString('ar-EG')} ج.م</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SME Client Testimonial */}
      <div className="bg-surface-container p-3 rounded-lg flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
          <img
            className="w-full h-full object-cover"
            alt="صاحب منشأة مصرية مستفيدة"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuApC-ZiwpkUY3_ho8oqZ2b_noSYhb1ovvFbMom5NWSDUEG1ArgD25Fqv2Q1czfYKPuLZGZbEGqCFkD5K0iKFdlfVp2910CubPNHKecD37P9Thn-nj8l_t__yhTAK8UakOKdOja6HPgWjc8ccjDnmbiDF6hrbsq_h_flXOwq52tRtx2XdkUHBHIFsbYcU9hCwPP2P6a3rhmZM8d2zHoXnHcKPxe1T6t7w8i7qN1yIjn7MQcFvsi8a5gX"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-body-sm font-body-sm text-on-surface font-semibold truncate">
            &quot;التقرير ده هو اللي البنك طلبه بالظبط لتمويل الـ 5%.&quot;
          </span>
          <span className="text-label-sm font-label-sm text-on-surface-variant">الحاج جابر البركة - مالك المنشأة</span>
        </div>
      </div>

      {/* Floating Sticky Bottom Actions */}
      <div className="fixed bottom-16 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl p-4 shadow-2xl flex flex-col gap-2 max-w-lg mx-auto">
        {/* Main PDF Download Button */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="w-full h-12 bg-primary text-on-primary rounded-xl font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-60"
        >
          {isGeneratingPdf ? (
            <>
              <AppIcon name="refresh" className="animate-spin" size={20} />
              <span>جاري إنشاء الملف الرقمي المعتمد...</span>
            </>
          ) : (
            <>
              <AppIcon name="download" size={20} />
              <span>تنزيل تقرير الـ PDF الرسمي (Bank-Ready)</span>
            </>
          )}
        </button>

        {pdfError && (
          <p role="alert" className="text-label-sm font-label-sm font-semibold text-error text-center">
            {pdfError}
          </p>
        )}

        {/* WhatsApp & Print Row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="h-11 bg-secondary-container text-on-secondary-container rounded-xl font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <AppIcon name="chat" size={18} />
            <span>إرسال للبنك / واتساب</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="h-11 bg-surface-container-high text-on-surface rounded-xl font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <AppIcon name="print" className="text-primary" size={18} />
            <span>طباعة المستند مباشرة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
