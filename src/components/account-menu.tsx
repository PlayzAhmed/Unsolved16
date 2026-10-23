'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/app-icon';
import { useFirebaseAuth } from '@/components/firebase-auth-provider';
import { useAuthDialog } from '@/components/auth-dialog-provider';
import { useI18n } from '@/lib/i18n';

export function AccountMenu() {
  const { user, loading, isGuest, signOutAccount, leaveGuestMode } = useFirebaseAuth();
  const { openAuthDialog } = useAuthDialog();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (loading) {
    return (
      <div
        className="w-9 h-9 rounded-full bg-surface-container-high animate-pulse"
        aria-label={t('جاري التحقق من حالة الحساب')}
      />
    );
  }

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutAccount();
      setOpen(false);
    } finally {
      setSigningOut(false);
    }
  };

  if (!user && !isGuest) {
    return (
      <button
        type="button"
        onClick={() => openAuthDialog('signin')}
        className="h-9 px-3 rounded-full bg-primary text-on-primary text-[13px] font-bold flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
      >
        <AppIcon name="login" size={17} />
        <span>{t('دخول')}</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      {user ? (
        <button
          type="button"
          aria-label={t('قائمة الحساب')}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="relative w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[14px] active:scale-95 transition-transform cursor-pointer"
        >
          {(user.displayName || user.email || t('مستخدم')).slice(0, 1).toUpperCase()}
          <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-leaf border-2 border-surface" />
        </button>
      ) : (
        <button
          type="button"
          aria-label={t('قائمة الزائر')}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="h-9 px-3 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[13px] font-bold flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
        >
          <AppIcon name="person" size={17} />
          <span>{t('زائر')}</span>
        </button>
      )}

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full mt-2 w-64 rounded-xl bg-surface-container-lowest border border-surface-dim/60 shadow-xl p-2"
        >
          {user ? (
            <>
              <div className="flex items-center gap-2.5 px-2 py-2">
                <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold shrink-0">
                  {(user.displayName || user.email || t('مستخدم')).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-label-md text-label-md font-bold text-on-surface truncate">
                    {user.displayName || t('حساب EnergyTwin')}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant truncate" dir="ltr">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="mx-2 my-1 rounded-lg bg-primary-fixed/30 px-2.5 py-2 flex items-center gap-1.5">
                <AppIcon name="cloud_done" className="text-primary" size={16} />
                <span className="font-label-sm text-label-sm text-primary font-semibold">
                  {t('تحليلاتك وتقاريرك محفوظة في حسابك')}
                </span>
              </div>

              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 font-label-md text-label-md text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
              >
                <AppIcon name="trending_up" className="text-primary" size={18} />
                <span>{t('لوحة التوفير')}</span>
              </Link>

              <Link
                href="/history"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 font-label-md text-label-md text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
              >
                <AppIcon name="history" className="text-primary" size={18} />
                <span>{t('سجل التحليلات')}</span>
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2.5 font-label-md text-label-md text-error hover:bg-error-container/40 active:bg-error-container/60 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <AppIcon name="logout" size={18} />
                <span>{signingOut ? t('جاري الخروج...') : t('تسجيل الخروج')}</span>
              </button>
            </>
          ) : (
            <>
              <div className="px-2.5 py-2">
                <p className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1.5">
                  <AppIcon name="person" className="text-secondary" size={18} />
                  {t('وضع الزائر')}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed mt-1">
                  {t('تقدر تستخدم كل الأدوات، لكن تحليلاتك مش هتتحفظ. سجّل حسابك للاحتفاظ بها.')}
                </p>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  openAuthDialog('signup');
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2.5 font-label-md text-label-md font-bold text-primary hover:bg-primary-fixed/25 active:bg-primary-fixed/40 transition-colors cursor-pointer"
              >
                <AppIcon name="person_add" size={18} />
                <span>{t('إنشاء حساب مجاني')}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  openAuthDialog('signin');
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2.5 font-label-md text-label-md text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors cursor-pointer"
              >
                <AppIcon name="login" size={18} />
                <span>{t('تسجيل الدخول')}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  leaveGuestMode();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2.5 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container active:bg-surface-container-high transition-colors cursor-pointer"
              >
                <AppIcon name="logout" size={18} />
                <span>{t('إنهاء وضع الزائر')}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
