'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  calculateSolarSavings,
  calculate25YearProjection,
  calculateUsableRoofArea,
} from '@/lib/solar-calculator';
import { calculateKwhFromEgp } from '@/lib/egypt-tariffs';
import type { RooftopData, BillData, RoofAreaSource } from '@/types';
import { SolarSlider } from '@/components/solar-slider';
import { AppIcon } from '@/components/ui/app-icon';
import { cn, buildStaticMapUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

const AREA_SOURCES: RoofAreaSource[] = [
  'google_solar',
  'overpass_polygon',
  'preset_polygon',
  'fallback_formula',
  'manual',
];

function normalizeAreaSource(value: string | null): RoofAreaSource {
  return AREA_SOURCES.includes(value as RoofAreaSource)
    ? (value as RoofAreaSource)
    : 'manual';
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const spendParam = searchParams.get('spend');
  const kwhParam = searchParams.get('kwh');
  const ratioParam = searchParams.get('ratio');
  const addressParam = searchParams.get('address');
  const meterParam = searchParams.get('meter');
  const areaParam = searchParams.get('area');
  const grossParam = searchParams.get('gross');
  const sourceParam = searchParams.get('source');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const nameParam = searchParams.get('name');
  const mapUrlParam = searchParams.get('mapUrl');

  const [monthlySpendEgp, setMonthlySpendEgp] = useState<number>(
    spendParam ? Number(spendParam) : 4120
  );
  const [monthlyKwh, setMonthlyKwh] = useState<number>(
    kwhParam ? Number(kwhParam) : calculateKwhFromEgp(spendParam ? Number(spendParam) : 4120)
  );
  const [transitionRatio, setTransitionRatio] = useState<number>(
    ratioParam ? Number(ratioParam) : 0.8
  );
  const [address] = useState<string>(
    addressParam ? decodeURIComponent(addressParam) : 'عنوان المنشأة'
  );
  const [customerName] = useState<string>(nameParam ? decodeURIComponent(nameParam) : '');
  const [meterNumber] = useState<string>(meterParam || 'EGY-ME-90214');
  const [grossAreaM2] = useState<number>(() => {
    const paramArea = grossParam
      ? Number(grossParam)
      : areaParam
        ? Number(areaParam)
        : 0;
    return paramArea > 0 ? paramArea : 180;
  });
  const [usableAreaM2] = useState<number>(() =>
    areaParam ? Number(areaParam) : calculateUsableRoofArea(grossAreaM2)
  );
  const [areaSource] = useState<RoofAreaSource>(() =>
    normalizeAreaSource(sourceParam)
  );

  const [tariffAccordionOpen, setTariffAccordionOpen] = useState(false);
  const [showProjections, setShowProjections] = useState(false);

  const lat = latParam ? Number(latParam) : 30.0444;
  const lng = lngParam ? Number(lngParam) : 31.2357;
  const [rooftopData] = useState<RooftopData>({
    lat,
    lng,
    formattedAddress: addressParam ? decodeURIComponent(addressParam) : 'عنوان المنشأة',
    polygonAreaM2: areaParam ? Number(areaParam) : 180,
    staticMapUrl: mapUrlParam
      ? decodeURIComponent(mapUrlParam)
      : (latParam && lngParam ? buildStaticMapUrl(lat, lng) : ''),
    lat: latParam ? Number(latParam) : 30.0384,
    lng: lngParam ? Number(lngParam) : 31.2118,
    formattedAddress: address,
    roofAreaM2: grossAreaM2,
    usableAreaM2,
    areaUtilizationFactor:
      grossAreaM2 > 0
        ? Math.round((usableAreaM2 / grossAreaM2) * 1000) / 1000
        : undefined,
    polygonAreaM2: grossAreaM2,
    staticMapUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0PS5hO6t4R7MFK8i9is3eD4S8x-EAePtZtAwbXetoXbZgvHCudt3bK0IR51KwcX0Hhv074KKO_zJ7Z4iBvMdKjrDMXI0OX9G8BpKGk_QQ_l1baAOGS3pcfEGR6SUMECudMsjs-pGRhq6I-JtF5uOK-vDb4aQcY8CoR3dwgQDnEWRpyTJi5TYmFoZqHTcgMrIWmEFvz9UB1sqRUETa7uQt5jB-zEbBhfxwcAEKSf07bbJl0dUOeCDn',
    meta: {
      areaSource,
      usableAreaSource:
        areaSource === 'google_solar' ? 'google_solar' : 'utilization_factor',
    },
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
      customerName: customerName || undefined,
    };
  }, [monthlySpendEgp, monthlyKwh, meterNumber, customerName]);

  // Animated Count-Up for Annual Savings
  const [displaySavings, setDisplaySavings] = useState(solarResult.annualSavingsEgp);

  useEffect(() => {
    const start = displaySavings;
    const target = solarResult.annualSavingsEgp;
    const duration = 500;
    const startTime = performance.now();

    let animationFrameId: number;
    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplaySavings(Math.round(start + (target - start) * progress));
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(update);
      }
    };
    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [solarResult.annualSavingsEgp]);

  const reductionPercentage = Math.round(transitionRatio * 100);

  const reportUrl = useMemo(() => {
    const params = new URLSearchParams({
      spend: String(monthlySpendEgp),
      kwh: String(Math.round(monthlyKwh)),
      ratio: String(transitionRatio),
      address: encodeURIComponent(address),
      meter: meterNumber,
      area: String(usableAreaM2),
      gross: String(grossAreaM2),
      source: areaSource,
      lat: String(rooftopData.lat),
      lng: String(rooftopData.lng),
    });
    if (customerName) params.set('name', encodeURIComponent(customerName));
    if (rooftopData.staticMapUrl) params.set('mapUrl', encodeURIComponent(rooftopData.staticMapUrl));
    return `/report?${params.toString()}`;
<<<<<<< Yours (main)
  }, [
    monthlySpendEgp,
    monthlyKwh,
    transitionRatio,
    address,
    meterNumber,
    usableAreaM2,
    grossAreaM2,
    areaSource,
    rooftopData,
  ]);
||||||| Base
  }, [monthlySpendEgp, monthlyKwh, transitionRatio, address, meterNumber, areaM2, rooftopData]);
=======
  }, [monthlySpendEgp, monthlyKwh, transitionRatio, address, meterNumber, areaM2, rooftopData, customerName]);
>>>>>>> Theirs (main (from origin))

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `يا فنان شفت حسبة الطاقة الشمسية لـ ${address} على EnergyTwin AI؟ هنوفر ${solarResult.annualSavingsEgp.toLocaleString('ar-EG')} ج.م سنوياً والسيستم يسد تمنه في ${solarResult.paybackPeriodYears.toFixed(1)} سنين بس! ☀️`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="flex flex-col w-full pb-8">
      {/* Celebration Top Banner */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed-variant self-start mb-1">
            <AppIcon name="verified_user" className="text-tertiary-container" size={16} />
            <span className="font-label-sm text-label-sm font-semibold">تحليل معتمد بالتعريفة المصرية ٢٠٢٤</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold tracking-tight">
            🎉 مبروك يا فنان! سقف محلك منجم ذهب
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
            <AppIcon name="storefront" className="text-primary" size={16} />
            <span className="truncate max-w-[180px]">{customerName || address}</span>
            <span className="text-outline-variant">•</span>
            <span>استهلاك شهري {Math.round(monthlyKwh).toLocaleString('ar-EG')} ك.و.س</span>
          </p>
        </div>
      </div>

      {/* Hero KPI Card: The Money Moment */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-secondary-container via-secondary-fixed to-tertiary-fixed p-4 sm:p-5 mb-4 text-on-secondary-container">
        <div className="absolute -left-6 -bottom-6 w-36 h-36 rounded-full bg-secondary-fixed-dim/40 blur-2xl pointer-events-none"></div>
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-surface-container-lowest/30 blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="font-label-md text-label-md font-bold px-2.5 py-1 rounded-full bg-surface-container-lowest/70 text-on-secondary-fixed-variant backdrop-blur-sm flex items-center gap-1">
              <AppIcon name="wb_sunny" className="text-tertiary-container" size={16} />
              <span>توفير سنوي صافي في جيبك</span>
            </span>
            <span className="font-label-sm text-label-sm text-on-secondary-fixed-variant font-medium bg-surface-container-lowest/50 px-2 py-0.5 rounded-full">
              صافي الربح التراكمي
            </span>
          </div>

          {/* Live Dynamic Metric */}
          <div className="flex items-baseline gap-2 my-1">
            <span className="font-display-hero-mobile text-display-hero-mobile font-bold tracking-tight text-on-secondary-fixed">
              {displaySavings.toLocaleString('ar-EG')}
            </span>
            <span className="font-headline-md text-headline-md font-semibold text-on-secondary-fixed">
              ج.م
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 pt-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <AppIcon name="trending_down" className="text-primary" size={18} />
            </div>
            <p className="font-body-sm text-body-sm text-on-secondary-fixed-variant font-medium">
              يعادل خفض <span className="font-bold text-primary font-numeric-stat-mobile">{reductionPercentage}٪</span> من فاتورة الكهرباء الحالية
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Solar Transition Slider */}
      <SolarSlider
        value={transitionRatio}
        onChange={(r) => setTransitionRatio(r)}
        className="mb-4"
      />

      {/* Secondary Financial KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-2.5 mb-4">
        {/* Card 1: Estimated System Cost */}
        <div className="rounded-xl bg-surface-container-lowest shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
              <AppIcon name="solar_power" className="text-primary" size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">تكلفة النظام التقديرية</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-headline-md text-headline-md font-bold text-on-surface">
                  {solarResult.initialCostEgp.toLocaleString('ar-EG')}
                </span>
                <span className="font-body-sm text-body-sm font-semibold text-on-surface-variant">ج.م</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                نظام {solarResult.systemCapacityKwp.toFixed(1)} ك.و · شامل التركيب
              </span>
            </div>
          </div>
          <AppIcon name="chevron_left" className="text-outline-variant" size={20} />
        </div>

        {/* Card 2: Payback Period */}
        <div className="rounded-xl bg-surface-container-lowest shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-fixed/50 flex items-center justify-center text-secondary shrink-0">
              <AppIcon name="hourglass_top" className="text-secondary" size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">استرداد رأس المال (Payback)</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-headline-md text-headline-md font-bold text-secondary">
                  {solarResult.paybackPeriodYears.toFixed(1)}
                </span>
                <span className="font-headline-sm text-headline-sm font-semibold text-secondary">سنة</span>
              </div>
              <span className="font-label-sm text-label-sm text-primary font-semibold">وبعدها الكهربا ببلاش لمدة ٢٠ سنة!</span>
            </div>
          </div>
          <div className="px-2 py-1 rounded bg-secondary-fixed/30 text-secondary text-label-sm font-bold">
            عائد مميز
          </div>
        </div>

        {/* Card 3: Solar Coverage with SVG Progress Ring */}
        <div className="rounded-xl bg-surface-container-lowest shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-fixed/40 flex items-center justify-center text-primary shrink-0">
              <AppIcon name="energy_savings_leaf" className="text-primary" size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">تغطية الطاقة الشمسية</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-headline-md text-headline-md font-bold text-primary">
                  {solarResult.greenScore}٪
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">من استهلاك المحل الإجمالي</span>
            </div>
          </div>

          {/* Mini Visual Progress Ring */}
          <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                className="text-surface-container-highest"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-primary transition-all duration-500 ease-out"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${solarResult.greenScore}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
              />
            </svg>
            <AppIcon name="bolt" className="text-primary absolute" size={16} />
          </div>
        </div>
      </div>

      {/* Egyptian Business Context Photo Vignette */}
      <div className="rounded-xl overflow-hidden bg-surface-container shadow-sm mb-4 relative">
        <div
          className="bg-cover bg-center w-full h-36"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDKvjEISWJGpkjOC0lMpei5WJ5LboZN0CRTKXrLiYB1Cg2juhr3ei6lm6z_kqHuRHqTVXB0CL6KJdw6jYd4EzdHU8VS79qJuPXb1FRXnCkrYw4UhUhKa40y0rwSaHt15TjKVOPJjCL7EsUnnuTQ3tT6KHD-q9kOxfUuA5O7cqQPsZA-quRc_Ut6BOa9SXinPLbgpvi825LFkfP8pihaoqLcNHYrq_45ybHRqUuTAHSwe3aDQ_u2CCR3')`,
          }}
        ></div>
        <div className="p-3 bg-surface-container-lowest flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
            <span className="font-label-md text-label-md text-on-surface font-medium truncate max-w-[200px]">
              {address}
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-numeric-stat-mobile">
            السطح: {grossAreaM2} م² · صافي {usableAreaM2} م²
          </span>
        </div>
      </div>

      {/* Egyptian Tariff Tier Comparison (Expandable) */}
      <div className="rounded-xl bg-surface-container-lowest shadow-sm mb-4 overflow-hidden">
        <button
          className="w-full p-4 flex items-center justify-between text-right active:bg-surface-container-low transition-colors cursor-pointer"
          onClick={() => setTariffAccordionOpen(!tariffAccordionOpen)}
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-tertiary-fixed/60 flex items-center justify-center text-tertiary shrink-0">
              <AppIcon name="account_balance_wallet" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                مقارنة شرائح الكهرباء التجارية
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                وفر فوري بتجنب الشريحة الرابعة
              </span>
            </div>
          </div>
          <AppIcon
            name="expand_more"
            className={cn('text-on-surface-variant transition-transform duration-200', tariffAccordionOpen && 'rotate-180')}
            size={20}
          />
        </button>

        {tariffAccordionOpen && (
          <div className="px-4 pb-4 flex flex-col gap-2.5">
            {/* Current State Card */}
            <div className="rounded-lg bg-error-container/40 p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold text-on-error-container flex items-center gap-1">
                  <AppIcon name="warning" className="text-error" size={16} />
                  وضعك الحالي (بدون طاقة شمسية)
                </span>
                <span className="font-label-sm text-label-sm text-error font-bold">٢.٧٩ ج/ك.و.س</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                الشريحة التجارية الخامسة (أكتر من ١٠٠٠ ك.و.س شهريًا). الفاتورة بتتحاسب بالكامل على السعر الأعلى بأثر رجعي.
              </p>
            </div>

            {/* After Solar Card */}
            <div className="rounded-lg bg-primary-fixed/30 p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold text-primary flex items-center gap-1">
                  <AppIcon name="check_circle" className="text-primary" size={16} />
                  بعد تركيب الطاقة الشمسية
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold">نظام المقاصة (Net Metering)</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                النزول للشريحة الأولى الأقل تكلفة، وفائض الإنتاج النهاري يتم احتسابه كرصيد دائن مع شركة الكهرباء ينزل في فاتورة الشتاء.
              </p>
            </div>

            {/* SDG / Carbon Badge Inside Context */}
            <div className="rounded-lg bg-surface-container p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                <AppIcon name="eco" size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">بصمتك البيئية الخضراء</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  وفرت <strong className="text-primary font-bold">{solarResult.co2ReductionTons.toFixed(1)} طن</strong> كربون سنويًا — يعادل زراعة{' '}
                  <strong className="text-primary font-bold">{Math.round(solarResult.co2ReductionTons * 45)} شجرة</strong> بالحي! 🌳
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Equipment Guarantee Card */}
      <div className="rounded-xl bg-surface-container-high p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-tertiary shrink-0 shadow-sm">
          <AppIcon name="handshake" size={22} />
        </div>
        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">ضمان أداء ٢٥ سنة</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            الألواح الشمسية معتمدة من هيئة الطاقة الجديدة والمتجددة (NREA) ومطابقة للمواصفات القياسية المصرية.
          </span>
        </div>
      </div>

      {/* 25-Year Projection Accordion */}
      <div className="rounded-xl bg-surface-container-lowest shadow-sm p-4 mb-4">
        <button
          type="button"
          onClick={() => setShowProjections(!showProjections)}
          className="w-full flex items-center justify-between text-right cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <AppIcon name="table_chart" className="text-primary" size={22} />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                جدول التدفقات النقدية (٢٥ سنة)
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                معدل زيادة التعريفة ٨٪ سنوياً
              </span>
            </div>
          </div>
          <AppIcon
            name="expand_more"
            className={cn('text-on-surface-variant transition-transform duration-200', showProjections && 'rotate-180')}
            size={20}
          />
        </button>

        {showProjections && (
          <div className="mt-3 pt-3 border-t border-surface-container-high overflow-x-auto">
            <table className="w-full text-xs text-right text-on-surface">
              <thead className="bg-surface-container text-on-surface font-bold">
                <tr>
                  <th className="p-2">السنة</th>
                  <th className="p-2">بدون طاقة</th>
                  <th className="p-2">بالطاقة</th>
                  <th className="p-2 text-primary">الوفر</th>
                  <th className="p-2 text-tertiary">التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {[1, 2, 3, 5, 10, 15, 20, 25].map((yr) => {
                  const cf = cashFlows[yr - 1];
                  if (!cf) return null;
                  return (
                    <tr key={yr} className="hover:bg-surface-container-low">
                      <td className="p-2 font-bold">{cf.year}</td>
                      <td className="p-2">{cf.gridCostWithoutSolarEgp.toLocaleString('ar-EG')}</td>
                      <td className="p-2">{cf.gridCostWithSolarEgp.toLocaleString('ar-EG')}</td>
                      <td className="p-2 text-primary font-bold">+{cf.annualSavingsEgp.toLocaleString('ar-EG')}</td>
                      <td className="p-2 text-tertiary font-bold">{cf.cumulativeSavingsEgp.toLocaleString('ar-EG')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Stack */}
      <div className="flex flex-col gap-2.5">
        {/* Primary CTA: Bank Report PDF */}
        <Link
          href={reportUrl}
          className="w-full h-12 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform font-bold"
        >
          <AppIcon name="picture_as_pdf" size={20} />
          <span>حمّل التقرير المعتمد للبنك (PDF)</span>
        </Link>

        {/* Secondary CTA: WhatsApp Share */}
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="w-full h-12 rounded-xl bg-secondary-container text-on-secondary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform font-bold cursor-pointer"
        >
          <AppIcon name="share" size={20} />
          <span>شارك النتيجة مع الشركاء على واتساب</span>
        </button>

        {/* Ghost Recalculate CTA */}
        <button
          type="button"
          onClick={() => router.push('/')}
          className="w-full py-2.5 rounded-lg text-primary font-label-md text-label-md flex items-center justify-center gap-1 active:bg-surface-container-low transition-colors cursor-pointer"
        >
          <AppIcon name="replay" size={18} />
          <span>تجربة فاتورة تانية أو تعديل أرقام الاستهلاك</span>
        </button>
      </div>
    </div>
  );
}
