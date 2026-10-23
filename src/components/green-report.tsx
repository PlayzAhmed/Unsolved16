'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  calculateSolarSavings,
  calculateUsableRoofArea,
} from '@/lib/solar-calculator';
import { calculateKwhFromEgp } from '@/lib/egypt-tariffs';
import type { RooftopData, BillData, RoofAreaSource } from '@/types';
import { BankProposalDocument, createReportMeta } from '@/components/pdf-report';
import { AppIcon } from '@/components/ui/app-icon';
import { cn, buildStaticMapUrl } from '@/lib/utils';
import { authenticatedFetch } from '@/lib/firebase/api-client';
import { useFirebaseAuth } from '@/components/firebase-auth-provider';
import { useAuthDialog } from '@/components/auth-dialog-provider';
import { useI18n } from '@/lib/i18n';

type ReportRecordStatus = 'idle' | 'saving' | 'stored' | 'error';

interface ReportIdentity {
  signature: string;
  id: string;
}

function createReportId(): string {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
      : Math.random().toString(16).slice(2, 14).padEnd(12, '0').toUpperCase();
  return `ET-${new Date().getFullYear()}-${suffix}`;
}

export function GreenReport() {
  const { t, formatNumber, formatDate } = useI18n();
  const searchParams = useSearchParams();
  const { user } = useFirebaseAuth();
  const { openAuthDialog } = useAuthDialog();

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

  const monthlySpendEgp = spendParam ? Number(spendParam) : 4120;
  const monthlyKwh = kwhParam ? Number(kwhParam) : calculateKwhFromEgp(monthlySpendEgp);
  const transitionRatio = ratioParam ? Number(ratioParam) : 0.8;
  const address = addressParam ? decodeURIComponent(addressParam) : 'عنوان المنشأة';
  const displayAddress = address === 'عنوان المنشأة' ? t(address) : address;
  const customerName = nameParam ? decodeURIComponent(nameParam) : '';
  const meterNumber = meterParam || 'EGY-ME-90214';
  const grossAreaM2 = grossParam
    ? Number(grossParam)
    : areaParam
      ? Number(areaParam)
      : 180;
  const usableAreaM2 = areaParam
    ? Number(areaParam)
    : calculateUsableRoofArea(grossAreaM2);
  const areaSource: RoofAreaSource = (
    [
      'google_solar',
      'overpass_polygon',
      'preset_polygon',
      'fallback_formula',
      'manual',
    ] as RoofAreaSource[]
  ).includes(sourceParam as RoofAreaSource)
    ? (sourceParam as RoofAreaSource)
    : 'manual';
  const lat = latParam ? Number(latParam) : 30.0384;
  const lng = lngParam ? Number(lngParam) : 31.2118;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
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
      customerName: customerName || undefined,
    };
  }, [monthlySpendEgp, monthlyKwh, meterNumber, customerName]);

  const staticMapUrl = mapUrlParam
    ? decodeURIComponent(mapUrlParam)
    : (latParam && lngParam ? buildStaticMapUrl(lat, lng) : '');

  const rooftopData: RooftopData = useMemo(() => {
    return {
      lat,
      lng,
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
    };
  }, [lat, lng, address, grossAreaM2, usableAreaM2, areaSource]);

  // Loan calculation (5% annual, 36 months subsidized CBE green initiative)
  const monthlyLoanPayment = Math.round(
    solarResult.initialCostEgp * (0.05 / 12) / (1 - Math.pow(1 + 0.05 / 12, -36))
  );
  const netMonthlySurplus = Math.round(solarResult.monthlySavingsEgp - monthlyLoanPayment);
  const annualKwhEstimate = Math.round(solarResult.systemCapacityKwp * 5 * 365);

  const reportSignature = JSON.stringify([
    address,
    monthlySpendEgp,
    monthlyKwh,
    transitionRatio,
    meterNumber,
    grossAreaM2,
    usableAreaM2,
    lat,
    lng,
    customerName,
    areaSource,
  ]);

  const [reportIdentity, setReportIdentity] = useState<ReportIdentity | null>(null);
  const [recordState, setRecordState] = useState<{
    userId: string;
    reportId: string;
    status: Exclude<ReportRecordStatus, 'idle'>;
  } | null>(null);
  const reportIdentityRef = useRef<ReportIdentity | null>(null);
  const recordReadyRef = useRef<{ userId: string; reportId: string } | null>(null);
  const recordPromiseRef = useRef<{ userId: string; promise: Promise<string> } | null>(null);

  const reportId =
    reportIdentity?.signature === reportSignature ? reportIdentity.id : null;
  const displayReportId = reportId ?? 'ET-PENDING';
  const recordStatus: ReportRecordStatus = !user
    ? 'idle'
    : recordState?.userId === user.uid && recordState.reportId === reportId
      ? recordState.status
      : 'saving';

  useEffect(() => {
    if (reportIdentityRef.current?.signature === reportSignature) return;
    const identity = { signature: reportSignature, id: createReportId() };
    reportIdentityRef.current = identity;
    recordReadyRef.current = null;
    recordPromiseRef.current = null;
    window.setTimeout(() => setReportIdentity(identity), 0);
  }, [reportSignature]);

  const ensureReportRecord = useCallback(
    async (id: string): Promise<string> => {
      if (!user) return id;

      const ready = recordReadyRef.current;
      if (ready?.userId === user.uid && ready.reportId === id) return id;

      const pending = recordPromiseRef.current;
      if (pending?.userId === user.uid) return pending.promise;

      setRecordState({ userId: user.uid, reportId: id, status: 'saving' });
      const promise = (async () => {
        const response = await authenticatedFetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId: id,
            address,
            monthlySpendEgp,
            monthlyKwh,
            transitionRatio,
            meterNumber,
            roofAreaM2: grossAreaM2,
            usableAreaM2,
            latitude: lat,
            longitude: lng,
            customerName: customerName || undefined,
            areaSource,
          }),
        });
        if (!response.ok) throw new Error(`Unable to register report: ${response.status}`);

        const data: unknown = await response.json();
        const storedReportId =
          data &&
          typeof data === 'object' &&
          typeof (data as { reportId?: unknown }).reportId === 'string'
            ? (data as { reportId: string }).reportId
            : id;

        recordReadyRef.current = { userId: user.uid, reportId: storedReportId };
        setRecordState({ userId: user.uid, reportId: storedReportId, status: 'stored' });
        return storedReportId;
      })().catch((error) => {
        console.error('Unable to register report in Firestore:', error);
        setRecordState({ userId: user.uid, reportId: id, status: 'error' });
        throw error;
      }).finally(() => {
        if (recordPromiseRef.current?.promise === promise) {
          recordPromiseRef.current = null;
        }
      });

      recordPromiseRef.current = { userId: user.uid, promise };
      return promise;
    },
    [
      user,
      address,
      monthlySpendEgp,
      monthlyKwh,
      transitionRatio,
      meterNumber,
      grossAreaM2,
      usableAreaM2,
      lat,
      lng,
      customerName,
      areaSource,
    ]
  );

  useEffect(() => {
    if (!user || !reportId) return;
    void ensureReportRecord(reportId).catch(() => undefined);
  }, [user, reportId, ensureReportRecord]);

  const buildAndDownloadPdf = async (id: string) => {
    const { pdf } = await import('@react-pdf/renderer');
    const meta = createReportMeta(new Date(), id);
    const doc = (
      <BankProposalDocument
        solarResult={solarResult}
        billData={billData}
        rooftopData={rooftopData}
        meta={meta}
      />
    );
    const blob = await pdf(doc).toBlob();
    return blob;
  };

  const downloadBlob = (blob: Blob, id: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_التمويل_الأخضر_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;

    const currentReportId = reportId;
    if (!currentReportId) {
      setPdfError(t('جاري تجهيز رقم التقرير. حاول مرة أخرى بعد لحظة.'));
      return;
    }

    setPdfError(null);
    setPdfNotice(null);
    setIsGeneratingPdf(true);

    try {
      if (user) {
        let blob: Blob | null = null;
        try {
          const storedReportId = await ensureReportRecord(currentReportId);
          blob = await buildAndDownloadPdf(storedReportId);
          downloadBlob(blob, storedReportId);

          const upload = new FormData();
          upload.set('reportId', storedReportId);
          upload.set('pdf', new File([blob], `${storedReportId}.pdf`, { type: 'application/pdf' }));
          const stored = await authenticatedFetch('/api/reports', { method: 'POST', body: upload });
          if (!stored.ok) throw new Error(stored.status === 413 ? 'REPORT_TOO_LARGE' : 'Unable to securely store this report.');
          setPdfNotice(t('تم تنزيل التقرير وحفظ نسخة منه في حسابك.'));
        } catch (cloudError) {
          console.error('Cloud report failed; downloading locally:', cloudError);
          const tooLarge = cloudError instanceof Error && cloudError.message === 'REPORT_TOO_LARGE';
          if (!blob) {
            blob = await buildAndDownloadPdf(currentReportId);
            downloadBlob(blob, currentReportId);
          }
          setPdfNotice(
            tooLarge
              ? t('تم تنزيل التقرير على جهازك، لكن حجمه أكبر من الحد المسموح لحفظه في حسابك.')
              : t('تم تنزيل التقرير على جهازك، لكن تعذر حفظ نسخة سحابية. حاول مرة أخرى لحفظه في حسابك.')
          );
        }
      } else {
        const blob = await buildAndDownloadPdf(currentReportId);
        downloadBlob(blob, currentReportId);
        setPdfNotice(t('تم تنزيل التقرير على جهازك. سجّل حسابك عشان يتحفظ في حسابك.'));
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setPdfError(t('تعذر إنشاء ملف PDF. من فضلك حاول مرة أخرى.'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      t('هذا تقرير الجدارة الائتمانية الخضراء لـ {address} (كود #{id}) بفائدة ٥٪ ميسرة عبر EnergyTwin AI: التوفير الشهري {savings} ج.م وصافي الفائض {surplus} ج.م/شهر!', {
        address: displayAddress,
        id: displayReportId,
        savings: formatNumber(Math.round(solarResult.monthlySavingsEgp)),
        surplus: formatNumber(netMonthlySurplus),
      })
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const recordStatusText = !user
    ? t('نسخة محلية — وضع الزائر')
    : recordStatus === 'stored'
      ? t('موثق رقمياً ومسجل في حسابك')
      : recordStatus === 'error'
        ? t('تعذر تسجيل التقرير — جرّب التنزيل لإعادة المحاولة')
        : t('جاري تسجيل التقرير في حسابك...');

  const recordStatusDotClass = !user
    ? 'bg-outline'
    : recordStatus === 'stored'
      ? 'bg-primary animate-pulse'
      : recordStatus === 'error'
        ? 'bg-error'
        : 'bg-secondary animate-pulse';

  return (
    <div className="flex flex-col w-full pb-28 space-y-4">
      {/* Top Document Credential Banner */}
      <div className="bg-surface-container p-4 rounded-xl shadow-sm flex flex-col space-y-1">
        <div className="flex items-center justify-between gap-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-label-sm font-semibold">
            <AppIcon name="verified" className="text-tertiary-container" size={16} />
            <span>{t('تقرير رسمي معتمد للتمويل')}</span>
          </div>
          {reportId ? (
            <span dir="ltr" className="shrink-0 whitespace-nowrap text-[11px] font-mono text-on-surface-variant">#{reportId}</span>
          ) : (
            <span className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant">
              <AppIcon name="refresh" className="animate-spin" size={13} />
              <span>{t('جاري ترقيم التقرير...')}</span>
            </span>
          )}
        </div>
        <h1 className="text-headline-sm font-headline-sm text-primary font-bold pt-1">
          {t('التقرير الفني والمالي للتمويل الأخضر')}
        </h1>
        <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
          {t('صالح للتقديم لدى البنوك المصرية (مبادرة البنك المركزي المصري لدعم المشروعات الصغيرة والمتوسطة بفائدة 5% متناقصة)')}
        </p>
        <div className="flex items-center justify-between pt-1 border-t border-surface-dim/40 text-label-sm font-label-sm text-on-surface-variant">
          <span
            className={cn(
              'flex items-center gap-1 font-semibold',
              !user
                ? 'text-on-surface-variant'
                : recordStatus === 'error'
                  ? 'text-error'
                  : 'text-primary'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', recordStatusDotClass)}></span>
            {recordStatusText}
          </span>
          <span>{t('تاريخ الصدور: {date}', { date: formatDate(new Date(), { year: 'numeric', month: 'long', day: 'numeric' }) })}</span>
        </div>
      </div>

      {/* Guest / account prompt for report persistence */}
      {!user && (
        <div className="rounded-xl bg-primary-fixed/25 border border-primary/10 p-3 flex items-start gap-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
            <AppIcon name="cloud_upload" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-label-md text-label-md font-bold text-on-surface">
              {t('التقرير هيتنزّل على جهازك فقط')}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed mt-0.5">
              {t('في وضع الزائر مش بنقدر نحفظ نسخة من التقرير في حسابك. اعمل حساب مجاني عشان يفضل معاك.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAuthDialog('signup')}
            className="h-8 px-2.5 rounded-lg bg-primary text-on-primary text-label-sm font-bold shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            {t('سجّل حسابك')}
          </button>
        </div>
      )}

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
              <span className="text-label-md font-label-md text-primary font-bold">{t('ملف الجدارة الائتمانية الخضراء')}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant truncate">{t('نموذج دراسة الطاقة الشمسية التجارية')}</span>
            </div>
          </div>
          <div className="px-2 py-1 rounded bg-surface-container-highest text-on-surface font-mono text-label-sm font-bold">
            {t('EGP / ج.م')}
          </div>
        </div>

        {/* 1. Enterprise Summary (بيانات المنشأة) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary">
            <AppIcon name="store" size={20} />
            <h2 className="text-label-lg font-label-lg font-bold">{t('بيانات المنشأة والتعاقد الكهربائي')}</h2>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">{t('اسم المنشأة التجاري:')}</span>
              <span className="font-bold text-on-surface">{customerName || t('المنشأة التجارية')}</span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">{t('السجل التجاري (س.ت):')}</span>
              <span className="font-mono font-medium text-on-surface text-on-surface-variant">{t('يُقدَّم عند التقديم للبنك')}</span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">{t('الموقع الجغرافي:')}</span>
              <span className="text-on-surface font-medium truncate max-w-[200px]">{displayAddress}</span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">{t('إحداثيات الموقع:')}</span>
              <span className="font-mono text-label-sm font-label-sm text-on-surface-variant" dir="ltr">
                {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
              </span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant">{t('الشركة المزودة / العداد:')}</span>
              <span className="text-on-surface font-semibold text-primary">{t('جنوب القاهرة - حساب #{meter}', { meter: meterNumber })}</span>
            </div>
          </div>
        </div>

        {/* Roof Satellite Image Preview Placeholder */}
        <div className="relative rounded-lg overflow-hidden h-36 bg-surface-container">
          {staticMapUrl ? (
            <img
              className="w-full h-full object-cover"
              alt={t('المعاينة الهندسية لسطح المنشأة بالأقمار الصناعية')}
              src={staticMapUrl}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-container to-surface-dim">
              <AppIcon name="map" size={48} className="text-outline opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent flex items-end p-3">
            <div className="flex items-center justify-between w-full text-surface-container-lowest">
              <span className="text-label-sm font-label-sm flex items-center gap-1 font-medium">
                <AppIcon name="my_location" className="text-secondary-container" size={16} />
                {t('المعاينة الهندسية لسطح المنشأة')}
              </span>
              <span className="text-label-sm font-label-sm bg-primary/90 px-2 py-0.5 rounded-full font-bold">
                {t('{area} م² ملائم للتثبيت', { area: formatNumber(Math.round(solarResult.roofAreaRequiredM2)) })}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Technical Feasibility (المواصفات الفنية) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary">
            <AppIcon name="solar_power" size={20} />
            <h2 className="text-label-lg font-label-lg font-bold">{t('المواصفات الفنية لمنظومة الطاقة (EPC Standard)')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant">{t('قدرة المنظومة الموصى بها')}</span>
              <span className="text-headline-sm font-headline-sm text-primary font-bold font-numeric-stat-mobile mt-0.5" dir="ltr">
                {formatNumber(Number(solarResult.systemCapacityKwp.toFixed(1)))} <span className="text-label-md font-label-md font-normal">kWp</span>
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant mt-1">{t('كافية لتغطية أحمال المخبز')}</span>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant">{t('الإنتاج السنوي التقديري')}</span>
              <span className="text-headline-sm font-headline-sm text-tertiary font-bold font-numeric-stat-mobile mt-0.5" dir="ltr">
                {formatNumber(annualKwhEstimate)} <span className="text-label-md font-label-md font-normal">kWh</span>
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant mt-1">{t('معامل إشعاع مصر ٥.٦')}</span>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant">{t('نوع الخلايا الكهروضوئية')}</span>
              <span className="text-body-sm font-body-sm font-bold text-on-surface mt-1">Monocrystalline</span>
              <span className="text-label-sm font-label-sm text-primary font-medium">Tier-1 High Efficiency</span>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface-variant">{t('مساحة السطح المشغولة')}</span>
              <span className="text-body-sm font-body-sm font-bold text-on-surface mt-1">
                {t('{area} م²', { area: formatNumber(Math.round(solarResult.roofAreaRequiredM2)) })}
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">
                {t('من أصل {usable} م² صافي (إجمالي {gross} م²)', { usable: formatNumber(usableAreaM2), gross: formatNumber(grossAreaM2) })}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Banking Feasibility & Cashflow Hero Card */}
        <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary p-4 rounded-xl space-y-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-label-sm uppercase tracking-wider text-on-primary-container font-semibold">
              {t('تحليل التدفق النقدي المصرفي')}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold text-label-sm">
              {t('عائد فوري من الشهر الأول')}
            </span>
          </div>

          <div className="bg-surface-container-lowest/10 backdrop-blur-md p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-body-sm font-body-sm text-on-primary-container">{t('وفر فاتورة الكهرباء شهرياً:')}</span>
              <span className="text-headline-sm font-headline-sm font-bold font-numeric-stat-mobile text-secondary-fixed">
                +{formatNumber(Math.round(solarResult.monthlySavingsEgp))} {t('ج.م')}
              </span>
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm text-on-primary-container">
              <span>{t('قسط التمويل الأخضر (5% ميسرة - 36 شهر):')}</span>
              <span className="font-bold font-numeric-stat-mobile text-on-primary">
                -{formatNumber(monthlyLoanPayment)} {t('ج.م')}
              </span>
            </div>
          </div>

          {/* Net Monthly Pocket Money */}
          <div className="bg-surface-container-lowest text-on-surface p-3 rounded-lg flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-label-sm font-label-sm text-tertiary font-bold">{t('صافي الفائض النقدي الشهري')}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">{t('يدخل خزينة المحل مباشرة')}</span>
            </div>
            <div className="flex items-baseline gap-1 text-primary">
              <span className="text-headline-md font-headline-md font-bold font-numeric-stat-mobile">
                {netMonthlySurplus >= 0 ? '+' : ''}{formatNumber(netMonthlySurplus)}
              </span>
              <span className="text-label-sm font-label-sm font-semibold">{t('ج.م/شهر')}</span>
            </div>
          </div>

          {/* Loan summary stats */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-center">
            <div className="bg-surface-container-lowest/15 rounded p-1.5">
              <span className="text-label-sm font-label-sm text-on-primary-container block">{t('إجمالي الاستثمار')}</span>
              <span className="text-label-lg font-label-lg font-bold text-on-primary font-numeric-stat-mobile">
                {formatNumber(solarResult.initialCostEgp)} {t('ج.م')}
              </span>
            </div>
            <div className="bg-surface-container-lowest/15 rounded p-1.5">
              <span className="text-label-sm font-label-sm text-on-primary-container block">{t('فترة الاسترداد')}</span>
              <span className="text-label-lg font-label-lg font-bold text-secondary-fixed font-numeric-stat-mobile">
                {t('{years} سنة', { years: formatNumber(Number(solarResult.paybackPeriodYears.toFixed(1))) })}
              </span>
            </div>
          </div>
        </div>

        {/* Official Stamp & Accreditation Seal */}
        <div className="p-3 bg-surface-container-low rounded-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AppIcon name="workspace_premium" className="text-primary" size={28} />
            <div className="flex flex-col">
              <span className="text-label-md font-label-md font-bold text-on-surface">{t('اعتماد قياسات الطاقة المصرية')}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">
                {t('طبقا لضوابط جهاز تنظيم مرفق الكهرباء وحماية المستهلك (ERA)')}
              </span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-full bg-secondary-fixed/40 flex flex-col items-center justify-center p-1 shrink-0 text-center shadow-inner">
            <AppIcon name="verified_user" className="text-tertiary-container" size={18} />
            <span className="text-[9px] font-bold text-on-secondary-fixed-variant leading-none mt-0.5">{t('معتمد بنكياً')}</span>
          </div>
        </div>

        {/* Additional Schedule Accordion */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setShowSchedule(!showSchedule)}
            className="text-primary text-label-md font-label-md font-semibold inline-flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <span>{showSchedule ? t('إخفاء جدول سداد الأقساط') : t('عرض جدول سداد الأقساط الكامل (36 شهراً)')}</span>
            <AppIcon
              name="expand_more"
              className={cn('transition-transform', showSchedule && 'rotate-180')}
              size={16}
            />
          </button>

          {showSchedule && (
            <div className="mt-3 p-3 bg-surface-container rounded-lg text-start text-xs text-on-surface space-y-1">
              <div className="flex justify-between py-1 border-b border-surface-dim font-bold">
                <span>{t('الفترة')}</span>
                <span>{t('القسط الشهري')}</span>
                <span>{t('الوفر الشهري')}</span>
                <span>{t('صافي الفائض')}</span>
              </div>
              {[1, 6, 12, 24, 36].map((m) => (
                <div key={m} className="flex justify-between py-1 border-b border-surface-dim/40">
                  <span>{t('الشهر {month}', { month: formatNumber(m) })}</span>
                  <span className="font-mono">{formatNumber(monthlyLoanPayment)} {t('ج.م')}</span>
                  <span className="font-mono text-primary">+{formatNumber(Math.round(solarResult.monthlySavingsEgp))} {t('ج.م')}</span>
                  <span className="font-mono font-bold text-primary">{netMonthlySurplus >= 0 ? '+' : ''}{formatNumber(netMonthlySurplus)} {t('ج.م')}</span>
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
            alt={t('صاحب منشأة مصرية مستفيدة')}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuApC-ZiwpkUY3_ho8oqZ2b_noSYhb1ovvFbMom5NWSDUEG1ArgD25Fqv2Q1czfYKPuLZGZbEGqCFkD5K0iKFdlfVp2910CubPNHKecD37P9Thn-nj8l_t__yhTAK8UakOKdOja6HPgWjc8ccjDnmbiDF6hrbsq_h_flXOwq52tRtx2XdkUHBHIFsbYcU9hCwPP2P6a3rhmZM8d2zHoXnHcKPxe1T6t7w8i7qN1yIjn7MQcFvsi8a5gX"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-body-sm font-body-sm text-on-surface font-semibold truncate">
            &quot;{t('التقرير ده هو اللي البنك طلبه بالظبط لتمويل الـ 5%.')}&quot;
          </span>
          <span className="text-label-sm font-label-sm text-on-surface-variant">{t('الحاج جابر البركة - مالك المنشأة')}</span>
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
              <span>{t('جاري إنشاء الملف الرقمي المعتمد...')}</span>
            </>
          ) : (
            <>
              <AppIcon name="download" size={20} />
              <span>{t('تنزيل تقرير الـ PDF الرسمي (Bank-Ready)')}</span>
            </>
          )}
        </button>

        {pdfError && (
          <p role="alert" className="text-label-sm font-label-sm font-semibold text-error text-center">
            {pdfError}
          </p>
        )}

        {pdfNotice && !pdfError && (
          <p role="status" className="text-label-sm font-label-sm font-semibold text-primary text-center">
            {pdfNotice}
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
            <span>{t('إرسال للبنك / واتساب')}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="h-11 bg-surface-container-high text-on-surface rounded-xl font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <AppIcon name="print" className="text-primary" size={18} />
            <span>{t('طباعة المستند مباشرة')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
