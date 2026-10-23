'use client';

import { AppIcon } from '@/components/ui/app-icon';
import { useFirebaseAuth } from '@/components/firebase-auth-provider';
import { useAuthDialog } from '@/components/auth-dialog-provider';
import { useI18n } from '@/lib/i18n';

export function LandingAccount() {
  const { user, loading, isGuest, continueAsGuest } = useFirebaseAuth();
  const { openAuthDialog } = useAuthDialog();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="w-full h-20 rounded-xl bg-surface-container-low animate-pulse my-4" aria-hidden="true" />
    );
  }

  if (user) return null;

  return (
    <section className="w-full bg-surface-container-low rounded-xl p-3.5 shadow-sm my-4 flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0 text-on-secondary-fixed">
          <AppIcon name={isGuest ? 'person' : 'cloud_done'} size={21} />
        </div>
        <div className="min-w-0">
          <p className="font-label-md text-label-md font-bold text-on-surface">
            {isGuest ? t('أنت بتستخدم وضع الزائر') : t('احفظ تحليلك في حسابك')}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-0.5">
            {isGuest
              ? t('تقدر تكمل كل الخطوات وتنزّل التقرير، لكن البيانات مش هتتحفظ. اعمل حساب مجاني عشان ترجع لتحليلاتك في أي وقت.')
              : t('اعمل حساب مجاني عشان نحفظ تحليلاتك وتقاريرك، أو كمّل كزائر من غير تسجيل.')}
          </p>
        </div>
      </div>

      {isGuest ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openAuthDialog('signup')}
            className="h-10 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <AppIcon name="person_add" size={17} />
            <span>{t('سجّل حسابك')}</span>
          </button>
          <button
            type="button"
            onClick={() => openAuthDialog('signin')}
            className="h-10 rounded-xl bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <AppIcon name="login" size={17} />
            <span>{t('تسجيل الدخول')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openAuthDialog('signup')}
            className="col-span-2 h-10 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <AppIcon name="person_add" size={17} />
            <span>{t('إنشاء حساب مجاني')}</span>
          </button>
          <button
            type="button"
            onClick={() => openAuthDialog('signin')}
            className="h-10 rounded-xl bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <AppIcon name="login" size={17} />
            <span>{t('تسجيل الدخول')}</span>
          </button>
          <button
            type="button"
            onClick={() => void continueAsGuest()}
            className="h-10 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <AppIcon name="lock_open" size={17} />
            <span>{t('المتابعة كزائر')}</span>
          </button>
        </div>
      )}
    </section>
  );
}
