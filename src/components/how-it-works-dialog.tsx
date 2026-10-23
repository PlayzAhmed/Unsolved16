'use client';

import { useEffect, useRef } from 'react';
import { AppIcon } from '@/components/ui/app-icon';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface HowItWorksDialogProps {
  onClose: () => void;
}

interface HowItWorksStep {
  title: string;
  badge: string;
  description: string;
  icon: string;
  iconClassName: string;
  badgeClassName: string;
}

const STEPS: HowItWorksStep[] = [
  {
    title: '١. صوّر أي إيصال أو فاتورة',
    badge: 'OCR فوري',
    description: 'الذكاء الاصطناعي بيتعرف على نمط استهلاك المحل وأعلى أوقات الحمل في اليوم.',
    icon: 'document_scanner',
    iconClassName: 'bg-primary-fixed text-on-primary-fixed',
    badgeClassName: 'bg-surface-container text-on-surface-variant',
  },
  {
    title: '٢. القمر الصناعي يقيس السطح',
    badge: 'دقة ٩٨٪',
    description: 'بنحدد مساحة السطح المتاح وزوايا الشمس والظلال لتحديد عدد الألواح المثالي.',
    icon: 'satellite_alt',
    iconClassName: 'bg-secondary-fixed text-on-secondary-fixed',
    badgeClassName: 'bg-surface-container text-on-surface-variant',
  },
  {
    title: '٣. استلم خطة التمويل والربح',
    badge: 'معتمد بنكياً',
    description: 'ملف كامل جاهز للبنوك لطلب تمويل الطاقة الخضراء بفائدة ميسرة ٥٪.',
    icon: 'savings',
    iconClassName: 'bg-primary-container text-on-primary-container',
    badgeClassName: 'bg-primary-fixed text-on-primary-fixed',
  },
];

export function HowItWorksDialog({ onClose }: HowItWorksDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={t('إغلاق نافذة شرح الخدمة')}
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-it-works-title"
        aria-describedby="how-it-works-description"
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-dim/60 p-5 pb-safe"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary-fixed/50 px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-secondary-fixed-variant">
              <AppIcon name="tips_and_updates" size={14} />
              <span>{t('دليل الخدمة')}</span>
            </span>
            <h2 id="how-it-works-title" className="mt-2.5 font-headline-sm text-headline-sm font-bold text-on-surface leading-tight">
              {t('إزاي بتشتغل الخدمة في ٣ خطوات؟')}
            </h2>
            <p id="how-it-works-description" className="mt-1 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              {t('كل اللي محتاجه كاميرا موبايلك فقط بدون زيارة فنية أولية')}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('إغلاق')}
            className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <AppIcon name="close" size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="w-full bg-surface-container-low rounded-xl p-3.5 shadow-sm flex items-start gap-3"
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                  step.iconClassName
                )}
              >
                <AppIcon name={step.icon} size={26} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-label-md text-label-md font-bold text-on-surface">{t(step.title)}</span>
                  <span
                    className={cn(
                      'text-[11px] px-1.5 py-0.5 rounded',
                      step.badgeClassName
                    )}
                  >
                    {t(step.badge)}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                  {t(step.description)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full h-11 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <AppIcon name="check_circle" size={18} />
          <span>{t('تمام، فهمت')}</span>
        </button>
      </div>
    </div>
  );
}
