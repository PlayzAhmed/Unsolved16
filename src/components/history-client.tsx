'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/app-icon';
import { useFirebaseAuth } from '@/components/firebase-auth-provider';
import { useAuthDialog } from '@/components/auth-dialog-provider';
import { authenticatedFetch } from '@/lib/firebase/api-client';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface SavedCalculationInput {
  address?: string;
  monthlySpendEgp?: number;
  monthlyKwh?: number;
  transitionRatio?: number;
  meterNumber?: string;
  roofAreaM2?: number;
  usableAreaM2?: number;
  latitude?: number;
  longitude?: number;
}

interface SavedCalculationResult {
  systemCapacityKwp?: number;
  initialCostEgp?: number;
  annualSavingsEgp?: number;
  paybackPeriodYears?: number;
  greenScore?: number;
  co2ReductionTons?: number;
}

interface SavedCalculation {
  id: string;
  input?: SavedCalculationInput;
  result?: SavedCalculationResult;
  createdAt?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readCalculations(value: unknown): SavedCalculation[] {
  const data = asRecord(value);
  const calculations = data?.calculations;
  if (!Array.isArray(calculations)) return [];
  return calculations.filter((item): item is SavedCalculation => {
    const record = asRecord(item);
    return Boolean(record && typeof record.id === 'string');
  });
}

function toDate(value: unknown): Date | null {
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const record = asRecord(value);
  if (!record) return null;
  const seconds =
    typeof record.seconds === 'number'
      ? record.seconds
      : typeof record._seconds === 'number'
        ? record._seconds
        : null;
  if (seconds !== null) return new Date(seconds * 1000);
  const milliseconds = typeof record.milliseconds === 'number' ? record.milliseconds : null;
  return milliseconds !== null ? new Date(milliseconds) : null;
}

function formatDate(
  value: unknown,
  formatDateValue: (date: Date, options?: Intl.DateTimeFormatOptions) => string,
  fallback: string
): string {
  const date = toDate(value);
  if (!date) return fallback;
  return formatDateValue(date, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatEgp(
  value: number | undefined,
  formatNumber: (value: number) => string,
  currency: string
): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatNumber(Math.round(value))} ${currency}`
    : '—';
}

function formatYears(
  value: number | undefined,
  formatNumber: (value: number) => string,
  unit: string
): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatNumber(Number(value.toFixed(1)))} ${unit}`
    : '—';
}

function formatCapacity(
  value: number | undefined,
  formatNumber: (value: number) => string,
  unit: string
): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatNumber(Number(value.toFixed(1)))} ${unit}`
    : '—';
}

function formatScore(
  value: number | undefined,
  formatNumber: (value: number) => string,
  maxScore: string
): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${formatNumber(Math.round(value))}/${maxScore}`
    : '—';
}

function buildReportHref(item: SavedCalculation): string {
  const input = item.input;
  if (!input) return '/report';

  const params = new URLSearchParams();
  if (typeof input.monthlySpendEgp === 'number') params.set('spend', String(input.monthlySpendEgp));
  if (typeof input.monthlyKwh === 'number') params.set('kwh', String(Math.round(input.monthlyKwh)));
  if (typeof input.transitionRatio === 'number') params.set('ratio', String(input.transitionRatio));
  if (input.address) params.set('address', encodeURIComponent(input.address));
  if (input.meterNumber) params.set('meter', input.meterNumber);
  if (typeof input.usableAreaM2 === 'number') params.set('area', String(input.usableAreaM2));
  if (typeof input.roofAreaM2 === 'number') params.set('gross', String(input.roofAreaM2));
  params.set('source', 'manual');
  if (typeof input.latitude === 'number') params.set('lat', String(input.latitude));
  if (typeof input.longitude === 'number') params.set('lng', String(input.longitude));
  return `/report?${params.toString()}`;
}

function HistoryHeading({ count }: { count?: number }) {
  const { t, formatNumber } = useI18n();
  return (
    <div className="mb-4">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed/50 px-2.5 py-1 text-[11px] font-bold text-on-secondary-fixed">
        <AppIcon name="history" size={14} />
        <span>{t('سجل حسابك')}</span>
      </div>
      <h1 className="mt-2 text-[26px] font-black leading-tight text-on-surface">
        {t('تحليلاتك المحفوظة')}
      </h1>
      <p className="mt-1 text-body-sm text-body-sm leading-relaxed text-on-surface-variant">
        {t('كل حسبة حفظتها في حسابك، افتح أي تحليل لمراجعة تقرير التمويل الأخضر.')}
      </p>
      {typeof count === 'number' && (
        <div className="mt-3 flex items-center gap-2 text-label-sm text-label-sm text-on-surface-variant">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>{t('{count} تحليل محفوظ', { count: formatNumber(count) })}</span>
        </div>
      )}
    </div>
  );
}

function AuthPrompt({ isGuest }: { isGuest: boolean }) {
  const { t } = useI18n();
  const { openAuthDialog } = useAuthDialog();

  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-surface-dim/50 p-5 shadow-sm">
      <div className="w-12 h-12 rounded-full bg-primary-fixed/60 flex items-center justify-center text-primary">
        <AppIcon name="history" size={24} />
      </div>
      <h2 className="mt-3 font-headline-sm text-headline-sm font-bold text-on-surface">
        {isGuest ? t('وضع الزائر لا يحفظ التحليلات') : t('سجّل دخولك لعرض سجلك')}
      </h2>
      <p className="mt-1 text-body-sm text-body-sm leading-relaxed text-on-surface-variant">
        {isGuest
          ? t('التحليلات في وضع الزائر بتفضل على الجهاز بس. اعمل حساب مجاني عشان تلاقي كل حساباتك هنا في أي وقت.')
          : t('سجل التحليلات بيظهر للحسابات المحفوظة على Firebase. سجّل دخولك أو اعمل حساب جديد في ثواني.')}
      </p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => openAuthDialog('signup')}
          className="h-11 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <AppIcon name="person_add" size={18} />
          <span>{t('إنشاء حساب مجاني')}</span>
        </button>
        <button
          type="button"
          onClick={() => openAuthDialog('signin')}
          className="h-11 rounded-xl bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <AppIcon name="login" size={18} />
          <span>{t('تسجيل الدخول')}</span>
        </button>
      </div>
    </div>
  );
}

export function HistoryClient() {
  const { t, formatNumber, formatDate: formatDateValue, isRtl } = useI18n();
  const { user, loading: authLoading, isGuest } = useFirebaseAuth();
  const [items, setItems] = useState<SavedCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFailed(false);
    try {
      const response = await authenticatedFetch('/api/history');
      if (!response.ok) throw new Error(`History request failed: ${response.status}`);
      const data: unknown = await response.json();
      setItems(readCalculations(data).slice(0, 50));
    } catch (error) {
      console.error('Unable to load calculation history:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const initialLoad = window.setTimeout(() => {
      void load();
    }, 0);
    const handleSaved = () => {
      void load();
    };

    window.addEventListener('energytwin:history-saved', handleSaved);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener('energytwin:history-saved', handleSaved);
    };
  }, [load, user]);

  if (authLoading) {
    return (
      <div>
        <HistoryHeading />
        <div className="flex flex-col gap-3" aria-label={t('جاري تحميل السجل')}>
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <HistoryHeading />
        <AuthPrompt isGuest={isGuest} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <HistoryHeading count={!loading && !failed ? items.length : undefined} />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label={t('تحديث سجل التحليلات')}
          className="mt-1 h-9 px-3 rounded-full bg-surface-container-high text-on-surface-variant text-label-sm font-label-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-60 cursor-pointer"
        >
          <AppIcon name="refresh" className={cn(loading && 'animate-spin')} size={16} />
          <span>{t('تحديث')}</span>
        </button>
      </div>

      {loading && (
        <div className="flex flex-col gap-3" aria-label={t('جاري تحميل التحليلات')}>
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      )}

      {!loading && failed && (
        <div className="rounded-2xl bg-surface-container-lowest border border-surface-dim/50 p-5 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-error-container/60 flex items-center justify-center text-error">
            <AppIcon name="warning" size={24} />
          </div>
          <h2 className="mt-3 font-headline-sm text-headline-sm font-bold text-on-surface">
            {t('تعذر تحميل السجل')}
          </h2>
          <p className="mt-1 text-body-sm text-body-sm text-on-surface-variant">
            {t('حصلت مشكلة في الاتصال. جرّب تحديث الصفحة أو حاول تاني.')}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 h-10 px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold active:scale-[0.98] transition-transform cursor-pointer"
          >
            {t('حاول تاني')}
          </button>
        </div>
      )}

      {!loading && !failed && items.length === 0 && (
        <div className="rounded-2xl bg-surface-container-lowest border border-surface-dim/50 p-6 text-center shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary-fixed/60 flex items-center justify-center text-primary">
            <AppIcon name="history" size={26} />
          </div>
          <h2 className="mt-3 font-headline-sm text-headline-sm font-bold text-on-surface">
            {t('لسه مفيش تحليلات محفوظة')}
          </h2>
          <p className="mt-1 text-body-sm text-body-sm leading-relaxed text-on-surface-variant">
            {t('أي حسبة جديدة بتتعمل في لوحة التوفير هتتحفظ هنا تلقائياً.')}
          </p>
          <Link
            href="/"
            className="mt-4 h-11 px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <AppIcon name="receipt_long" size={18} />
            <span>{t('ابدأ تحليل فاتورة')}</span>
          </Link>
        </div>
      )}

      {!loading && !failed && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const input = item.input;
            const result = item.result;
            return (
              <Link
                key={item.id}
                href={buildReportHref(item)}
                className="block rounded-2xl bg-surface-container-lowest border border-surface-dim/50 p-4 shadow-sm hover:bg-surface-container-low active:scale-[0.99] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
                    <AppIcon name="storefront" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-on-surface truncate">
                        {input?.address || t('منشأة تجارية')}
                      </p>
                      <AppIcon name={isRtl ? 'chevron_left' : 'chevron_right'} className="text-on-surface-variant shrink-0" size={18} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">
                      {formatDate(item.createdAt, formatDateValue, t('تاريخ غير متاح'))}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-surface-container-low px-2 py-2">
                    <p className="text-[10px] text-on-surface-variant">{t('التوفير السنوي')}</p>
                    <p className="mt-0.5 text-[11px] font-black text-primary truncate">
                      {formatEgp(result?.annualSavingsEgp, formatNumber, t('ج.م'))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-container-low px-2 py-2">
                    <p className="text-[10px] text-on-surface-variant">{t('فترة الاسترداد')}</p>
                    <p className="mt-0.5 text-[11px] font-black text-on-surface truncate">
                      {formatYears(result?.paybackPeriodYears, formatNumber, t('سنة'))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-container-low px-2 py-2">
                    <p className="text-[10px] text-on-surface-variant">{t('حجم المحطة')}</p>
                    <p className="mt-0.5 text-[11px] font-black text-tertiary truncate">
                      {formatCapacity(result?.systemCapacityKwp, formatNumber, t('ك.و.ب'))}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-surface-dim/40 pt-2">
                  <span className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                    <AppIcon name="eco" className="text-leaf" size={14} />
                    <span>{t('درجة الخضرة {score}', { score: formatScore(result?.greenScore, formatNumber, formatNumber(100)) })}</span>
                  </span>
                  <span className="text-[11px] font-bold text-primary">{t('عرض التقرير')}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
