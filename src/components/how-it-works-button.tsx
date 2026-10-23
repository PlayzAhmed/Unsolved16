'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from '@/components/ui/app-icon';
import { HowItWorksDialog } from '@/components/how-it-works-dialog';
import { useI18n } from '@/lib/i18n';

export function HowItWorksButton() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="h-9 px-3 rounded-full bg-surface-container-high text-on-surface text-[13px] flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
      >
        <AppIcon name="help_outline" className="text-primary" size={18} />
        <span className="text-[14px]">{t('كيف يعمل؟')}</span>
      </button>

      {open && createPortal(<HowItWorksDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
