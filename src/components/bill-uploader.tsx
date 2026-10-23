'use client';

import React, { useState, useRef } from 'react';
import type { BillData } from '@/types';
import { cn } from '@/lib/utils';
import { calculateKwhFromEgp, calculateEgpFromKwh } from '@/lib/egypt-tariffs';
import { AppIcon } from '@/components/ui/app-icon';

export interface BillUploaderProps {
  monthlySpendEgp: number;
  monthlyKwh: number;
  onSpendChange: (spend: number) => void;
  onKwhChange: (kwh: number) => void;
  onBillParsed?: (data: BillData) => void;
  onContinue?: () => void;
  className?: string;
}

type OcrStatus = 'idle' | 'processing' | 'success' | 'failed';

const DEMO_BILLS = [
  {
    name: 'مخبز المعادي التجاري',
    spend: 4120,
    kwh: 1450,
    meter: 'EGY-ME-90214',
    desc: 'مخبز بلدي وحلواني',
  },
  {
    name: 'ورشة العاشر الصناعية',
    spend: 14200,
    kwh: 5075,
    meter: 'EGY-10TH-3490',
    desc: 'ورشة تشغيل معادن خفيفة',
  },
  {
    name: 'مركز طبي مدينة نصر',
    spend: 6500,
    kwh: 2315,
    meter: 'EGY-NC-5821',
    desc: 'عيادات تخصصية وتبريد',
  },
];

export function BillUploader({
  monthlySpendEgp,
  monthlyKwh,
  onSpendChange,
  onKwhChange,
  onBillParsed,
  onContinue,
  className,
}: BillUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedMeter, setParsedMeter] = useState<string | null>(null);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processBill = async (file?: File) => {
    if (!file) return;

    setOcrStatus('processing');
    setOcrWarning(null);
    setParsedMeter(null);
    setManualOpen(false);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('billFile', file);

      const res = await fetch('/api/analyze-bill', {
        method: 'POST',
        body: formData,
      });

      const json: { success?: boolean; data?: BillData; error?: string } = await res.json();
      const data = json.data;
      const hasReadableValues = Boolean(data?.totalCostEgp || data?.kwhConsumption);

      if (res.ok && json.success && data && hasReadableValues && !data.lowConfidence) {
        const { totalCostEgp, kwhConsumption, meterNumber } = data;
        if (totalCostEgp) onSpendChange(totalCostEgp);
        if (kwhConsumption) onKwhChange(kwhConsumption);
        if (meterNumber) setParsedMeter(meterNumber);
        setOcrStatus('success');
        if (onBillParsed) {
          onBillParsed(data);
        }
      } else {
        setOcrStatus('failed');
        setOcrWarning(data?.warning || json.error || 'لم نتمكن من قراءة بيانات الفاتورة بوضوح. أدخل القيم يدويًا أو أعد المسح.');
        setManualOpen(true);
      }
    } catch {
      setOcrStatus('failed');
      setOcrWarning('تعذر الاتصال بخدمة قراءة الفاتورة. أدخل القيم يدويًا أو أعد المسح.');
      setManualOpen(true);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processBill(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processBill(e.target.files[0]);
    }
  };

  const selectDemoProfile = (demo: (typeof DEMO_BILLS)[0]) => {
    setOcrStatus('success');
    setOcrWarning(null);
    setFileName(`فاتورة_${demo.name}.pdf`);
    setParsedMeter(demo.meter);
    onSpendChange(demo.spend);
    onKwhChange(demo.kwh);
    if (onBillParsed) {
      onBillParsed({
        totalCostEgp: demo.spend,
        kwhConsumption: demo.kwh,
        meterNumber: demo.meter,
        customerName: demo.name,
      });
    }
  };

  return (
    <div
      className={cn(
        'w-full bg-surface-container-lowest rounded-xl p-4 sm:p-6 shadow-md flex flex-col gap-4 relative overflow-hidden',
        className
      )}
    >
      {/* Glow Ambient Sun Accent */}
      <div className="absolute -top-16 -left-16 w-36 h-36 bg-secondary-fixed/40 rounded-full blur-2xl pointer-events-none"></div>

      {/* Upload Area Header */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="flex flex-col">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-1.5">
            <span>صوّر الفاتورة بموبايلك</span>
            <AppIcon name="photo_camera" className="text-tertiary" size={20} />
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            الذكاء الاصطناعي هيقرأ الكيلووات وقيمة الشريحة آلياً
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold shrink-0">
          ذكاء اصطناعي فوري
        </span>
      </div>

      {/* Drop/Capture Interactive Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'w-full rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer active:scale-[0.99] transition-all relative overflow-hidden shadow-inner border-2 border-dashed',
          isDragging
            ? 'bg-primary-fixed/30 border-primary'
            : 'bg-surface-container border-outline-variant hover:border-primary/50'
        )}
      >
        <input
          ref={fileInputRef}
          accept="image/*,.pdf"
          aria-label="تحميل صورة الفاتورة"
          className="hidden"
          type="file"
          onChange={handleFileChange}
        />

        {ocrStatus === 'processing' ? (
          <div className="flex flex-col items-center justify-center py-4">
            <AppIcon name="refresh" className="text-primary animate-spin mb-2" size={36} />
            <p className="font-headline-sm text-headline-sm text-on-surface font-bold">
              بنقرأ الفاتورة… دقيقة واحدة بس ⏳
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              بنستخرج رقم العداد، شريحة الاستهلاك، وإجمالي المبلغ
            </p>
          </div>
        ) : (
          <>
            {/* Pulsing camera badge */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-secondary-container via-secondary-fixed to-secondary flex items-center justify-center shadow-md mb-2 relative">
              <div className="absolute inset-0 rounded-full bg-secondary animate-ping opacity-25"></div>
              <AppIcon name="document_scanner" className="text-on-secondary-container" size={30} />
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
              اضغط للتصوير أو اختيار صورة
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant max-w-[280px]">
              فاتورة ورقية أو إيصال سداد إلكتروني (فوري، خالص، كارت ذكي)
            </span>
            {/* Accepted formats hint */}
            <div className="mt-2 flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
              <AppIcon name="image" size={16} />
              <span>يدعم JPG, PNG, PDF حتي 10 ميجابايت</span>
            </div>
          </>
        )}
      </div>

      {ocrStatus === 'idle' && (
        <div className="w-full rounded-xl bg-surface p-3 shadow-sm flex items-center gap-2 text-on-surface-variant">
          <AppIcon name="document_scanner" className="text-primary" size={20} />
          <span className="font-label-md text-label-md">ارفع فاتورة لبدء القراءة التلقائية، أو أدخل القيم يدويًا.</span>
        </div>
      )}

      {ocrStatus === 'failed' && (
        <div className="w-full rounded-xl border border-error/30 bg-error-container/30 p-3 shadow-sm flex flex-col gap-2">
          <div className="flex items-start gap-2 text-on-error-container">
            <AppIcon name="error" className="shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-label-md text-label-md font-bold">لم تكتمل قراءة الفاتورة</p>
              <p className="font-body-sm text-body-sm mt-0.5">{ocrWarning}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="self-start rounded-lg bg-surface-container-lowest px-3 py-2 font-label-sm text-label-sm font-bold text-primary hover:bg-surface-container transition-colors"
          >
            أعد مسح الفاتورة
          </button>
        </div>
      )}

      {/* Bill Processing Mockup Card (Dynamic Result State) */}
      {ocrStatus === 'success' && (
      <div className="w-full rounded-xl bg-surface p-3 shadow-sm flex flex-col gap-2 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            <span className="font-label-md text-label-md font-bold text-on-surface">
              {fileName ? `الفاتورة المقروءة: ${fileName}` : 'معاينة الفحص المكتشف'}
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-tertiary font-bold bg-tertiary-fixed/60 px-2 py-0.5 rounded-full">
            تم التعرف بنجاح
          </span>
        </div>

        {/* Scanned Receipt Ticket Frame */}
        <div className="w-full bg-surface-container-lowest rounded-lg p-3 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          {/* Laser Scanner Visual Bar */}
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse rounded-full"></div>

          <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
            <div className="flex items-center gap-2">
              <AppIcon name="bolt" className="text-primary" size={20} />
              <span className="font-label-md text-label-md text-on-surface font-semibold">بيانات قراءة الفاتورة</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">تم استخراج القيم الأساسية</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex flex-col bg-surface-container-low rounded-lg p-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant">الاستهلاك الشهري</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-numeric-stat-mobile text-numeric-stat-mobile text-on-surface font-bold">
                  {Math.round(monthlyKwh).toLocaleString('ar-EG')}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">ك.و.س</span>
              </div>
            </div>

            <div className="flex flex-col bg-surface-container-low rounded-lg p-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant">القيمة الإجمالية</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-numeric-stat-mobile text-numeric-stat-mobile text-primary font-bold">
                  {Math.round(monthlySpendEgp).toLocaleString('ar-EG')}
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold">ج.م</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-on-surface-variant font-label-sm text-label-sm">
            <span>{parsedMeter ? `رقم العداد: ${parsedMeter}` : 'لم يتم العثور على رقم العداد'}</span>
            <span className="text-primary font-bold flex items-center gap-0.5">
              <AppIcon name="check_circle" size={16} />
              قراءة مكتملة
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Preset Demo Profiles */}
      <div className="flex flex-col gap-1.5">
        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
          أو جرّب مباشرة بنماذج فواتير سابقة:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DEMO_BILLS.map((demo) => (
            <button
              key={demo.meter}
              type="button"
              onClick={() => selectDemoProfile(demo)}
              className="text-right p-2.5 rounded-lg border border-primary/20 bg-surface-container-low hover:bg-surface-container border-s-4 border-s-primary transition-all text-on-surface cursor-pointer"
            >
              <div className="font-label-sm text-label-sm font-bold text-on-surface">{demo.name}</div>
              <div className="text-[12px] text-primary font-bold mt-0.5">
                {demo.spend.toLocaleString('ar-EG')} ج.م / شهر
              </div>
              <div className="text-[10px] text-on-surface-variant">{demo.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Fallback Trigger & Collapsible Drawer */}
      <div className="w-full pt-1 flex flex-col">
        <button
          className="flex items-center justify-between w-full py-2 px-1 text-on-surface font-label-md text-label-md hover:text-primary transition-colors cursor-pointer"
          onClick={() => setManualOpen(!manualOpen)}
          type="button"
        >
          <span className="flex items-center gap-1.5 font-bold">
            <AppIcon name="edit_note" className="text-tertiary" size={18} />
            مش عايز تصوّر؟ اكتب القيمة يدويًا ✍️
          </span>
          <AppIcon
            name="expand_more"
            className={cn('transition-transform duration-200', manualOpen && 'rotate-180')}
            size={18}
          />
        </button>

        {manualOpen && (
          <div className="flex flex-col gap-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  فاتورة الكهربا (ج.م)
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full h-11 bg-surface-container rounded-lg px-3 text-on-surface font-bold text-[15px] outline-none focus:bg-surface-container-lowest transition-colors pl-12 text-right"
                    placeholder="مثلاً 4000"
                    type="number"
                    value={monthlySpendEgp || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      onSpendChange(val);
                      onKwhChange(calculateKwhFromEgp(val));
                    }}
                  />
                  <span className="absolute left-3 text-on-surface-variant font-label-sm text-label-sm pointer-events-none">
                    ج.م
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  الاستهلاك (كيلووات)
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full h-11 bg-surface-container rounded-lg px-3 text-on-surface font-bold text-[15px] outline-none focus:bg-surface-container-lowest transition-colors pl-14 text-right"
                    placeholder="مثلاً 1450"
                    type="number"
                    value={Math.round(monthlyKwh) || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      onKwhChange(val);
                      onSpendChange(calculateEgpFromKwh(val));
                    }}
                  />
                  <span className="absolute left-3 text-on-surface-variant font-label-sm text-label-sm pointer-events-none">
                    ك.و.س
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary CTA Button */}
      <button
        type="button"
        onClick={() => onContinue && onContinue()}
        className="w-full h-14 rounded-full bg-gradient-to-r from-secondary-container via-secondary-fixed to-secondary-container text-on-secondary-container font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform mt-1 cursor-pointer"
      >
        <span>كمّل لفحص سقف المحل</span>
        <AppIcon name="arrow_back" size={24} />
      </button>

      <div className="text-center font-label-sm text-label-sm text-on-surface-variant -mt-1">
        ⚡ لن يتم خصم أو طلب أي بيانات بنكية إطلاقاً
      </div>
    </div>
  );
}
