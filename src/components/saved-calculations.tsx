'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/app-icon';
import { useFirebaseAuth } from '@/components/firebase-auth-provider';
import { authenticatedFetch } from '@/lib/firebase/api-client';
import { useI18n } from '@/lib/i18n';

interface SavedCalculation {
  id: string;
  input?: {
    address?: string;
    monthlySpendEgp?: number;
  };
  result?: {
    annualSavingsEgp?: number;
    paybackPeriodYears?: number;
  };
}

export function SavedCalculations() {
  const { t, formatNumber, isRtl } = useI18n();
  const { user } = useFirebaseAuth();
  const [items, setItems] = useState<SavedCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFailed(false);
    try {
      const response = await authenticatedFetch('/api/history');
      if (!response.ok) throw new Error(`History request failed: ${response.status}`);
      const data: unknown = await response.json();
      const calculations =
        data && typeof data === 'object' && Array.isArray((data as { calculations?: unknown }).calculations)
          ? ((data as { calculations: SavedCalculation[] }).calculations)
          : [];
      setItems(calculations.slice(0, 3));
    } catch (error) {
      console.error('Unable to load saved calculations:', error);
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

  if (!user) return null;

  return (
    <div className="rounded-xl bg-surface-container-lowest shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary shrink-0">
            <AppIcon name="history" size={19} />
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              {t('آخر التحليلات المحفوظة')}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {t('محفوظة في حسابك على Firebase')}
            </span>
          </div>
        </div>
        <Link
          href="/history"
          className="flex items-center gap-0.5 text-label-sm font-label-sm font-bold text-primary active:opacity-70"
        >
          <span>{t('عرض الكل')}</span>
          <AppIcon name={isRtl ? 'chevron_left' : 'chevron_right'} size={15} />
        </Link>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {loading && (
          <div className="flex flex-col gap-2" aria-label={t('جاري تحميل التحليلات المحفوظة')}>
            <div className="h-12 rounded-lg bg-surface-container animate-pulse" />
            <div className="h-12 rounded-lg bg-surface-container animate-pulse" />
          </div>
        )}

        {!loading && failed && (
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {t('تعذر تحميل التحليلات المحفوظة حالياً. هتظهر تاني أول ما الاتصال يرجع.')}
          </p>
        )}

        {!loading && !failed && items.length === 0 && (
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {t('لسه مفيش تحليلات محفوظة. أي حسبة جديدة هتتحفظ هنا تلقائياً.')}
          </p>
        )}

        {!loading &&
          !failed &&
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg bg-surface-container-low px-3 py-2 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AppIcon name="storefront" className="text-primary shrink-0" size={17} />
                <span className="font-label-md text-label-md text-on-surface font-medium truncate">
                  {item.input?.address || t('منشأة تجارية')}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-label-sm text-label-sm text-primary font-bold font-numeric-stat-mobile">
                  {typeof item.result?.annualSavingsEgp === 'number'
                    ? t('{amount} ج.م/سنة', { amount: formatNumber(Math.round(item.result.annualSavingsEgp)) })
                    : '—'}
                </span>
                {typeof item.result?.paybackPeriodYears === 'number' && (
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('{years} سنة', { years: formatNumber(Number(item.result.paybackPeriodYears.toFixed(1))) })}
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
