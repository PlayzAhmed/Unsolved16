'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AppIcon } from '@/components/ui/app-icon';
import { useFirebaseAuth } from '@/components/firebase-auth-provider';
import { createAccount, signIn } from '@/lib/firebase/client';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type AuthMode = 'signin' | 'signup';

interface AuthDialogProps {
  initialMode?: AuthMode;
  onClose: () => void;
}

const fieldClassName =
  'w-full h-11 rounded-xl border border-outline-variant/70 bg-surface px-3 text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-60';

function getAuthErrorMessage(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'البريد الإلكتروني مستخدم بالفعل. جرّب تسجيل الدخول بدلاً من إنشاء حساب جديد.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/weak-password':
      return 'كلمة المرور قصيرة — استخدم ٦ أحرف على الأقل.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة في وقت قصير. انتظر قليلاً ثم حاول مرة أخرى.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالبريد الإلكتروني غير مفعّل في إعدادات Firebase.';
    case 'auth/unauthorized-domain':
      return 'هذا النطاق غير مصرح به في إعدادات Firebase Authentication.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AuthDialog({ initialMode = 'signin', onClose }: AuthDialogProps) {
  const {
    user,
    loading,
    configured,
    isGuest,
    continueAsGuest,
    leaveGuestMode,
    signOutAccount,
  } = useFirebaseAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const disabled = busy || loading || !configured;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;

    setError(null);
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError(t('اكتب بريداً إلكترونياً صحيحاً للمتابعة.'));
      return;
    }
    if (password.length < 6) {
      setError(t('كلمة المرور يجب ألا تقل عن ٦ أحرف.'));
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        await createAccount(cleanEmail, password, displayName);
      } else {
        await signIn(cleanEmail, password);
      }
      setPassword('');
      onClose();
    } catch (submitError) {
      setError(t(getAuthErrorMessage(submitError)));
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setBusy(true);
    try {
      await continueAsGuest();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOutAccount();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={t('إغلاق نافذة الحساب')}
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-dim/60 p-5 pb-safe"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shrink-0">
              <AppIcon name="wb_sunny" className="text-secondary-container" size={22} />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 id="auth-dialog-title" className="font-headline-sm text-headline-sm font-bold text-on-surface leading-tight">
                {t('حسابك في EnergyTwin AI')}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                {t('احفظ تحليلاتك وتقاريرك وارجع لها في أي وقت.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('إغلاق')}
            className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <AppIcon name="close" size={18} />
          </button>
        </div>

        {!configured && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <p className="font-label-sm text-label-sm font-bold flex items-center gap-1.5">
              <AppIcon name="warning" className="text-amber-600" size={16} />
              {t('خدمة الحسابات غير مفعّلة في هذه النسخة')}
            </p>
            <p className="font-label-sm text-label-sm leading-relaxed mt-1">
              {t('أضف مفاتيح Firebase إلى ملف .env.local حسب دليل الإعداد، أو تابع كزائر الآن.')}
            </p>
          </div>
        )}

        {user ? (
          <div className="mt-5 flex flex-col gap-3">
            <div className="rounded-xl bg-surface-container p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold shrink-0">
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
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t('تحليلاتك وتقاريرك محفوظة في حسابك. يمكنك تسجيل الخروج من هنا أو من قائمة الحساب بالأعلى.')}
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              className="w-full h-11 rounded-xl bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 cursor-pointer"
            >
              <AppIcon name="logout" size={18} />
              <span>{t('تسجيل الخروج')}</span>
            </button>
          </div>
        ) : (
          <>
            {isGuest && (
              <div className="mt-4 rounded-xl bg-secondary-fixed/40 p-3 flex items-center justify-between gap-2">
                <p className="font-label-sm text-label-sm font-semibold text-on-secondary-fixed-variant">
                  {t('أنت الآن في وضع الزائر — بياناتك مش هتتحفظ.')}
                </p>
                <button
                  type="button"
                  onClick={leaveGuestMode}
                  className="text-label-sm font-label-sm font-bold text-primary shrink-0 underline underline-offset-2 cursor-pointer"
                >
                  {t('إنهاء الوضع')}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1 mt-4 p-1 rounded-xl bg-surface-container">
              {(
                [
                  { value: 'signin', label: 'تسجيل الدخول' },
                  { value: 'signup', label: 'إنشاء حساب' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setMode(tab.value);
                    setError(null);
                  }}
                  className={cn(
                    'h-9 rounded-lg font-label-md text-label-md transition-colors cursor-pointer',
                    mode === tab.value
                      ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                      : 'text-on-surface-variant'
                  )}
                >
                  {t(tab.label)}
                </button>
              ))}
            </div>

            <form className="mt-3 flex flex-col gap-3" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{t('اسم المنشأة أو المسؤول')}</span>
                  <input
                    className={fieldClassName}
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder={t('مثال: مخبز الأمانة')}
                    autoComplete="name"
                    maxLength={120}
                    disabled={disabled}
                  />
                </label>
              )}

              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{t('البريد الإلكتروني')}</span>
                <input
                  className={fieldClassName}
                  type="email"
                  inputMode="email"
                  dir="ltr"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  disabled={disabled}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{t('كلمة المرور')}</span>
                <input
                  className={fieldClassName}
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('٦ أحرف على الأقل')}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={6}
                  required
                  disabled={disabled}
                />
              </label>

              {error && (
                <p role="alert" className="font-label-sm text-label-sm font-semibold text-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={disabled}
                className="w-full h-12 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform disabled:opacity-60 cursor-pointer"
              >
                {busy ? (
                  <>
                    <AppIcon name="refresh" className="animate-spin" size={19} />
                    <span>{t('جاري المعالجة...')}</span>
                  </>
                ) : (
                  <>
                    <AppIcon name={mode === 'signup' ? 'person_add' : 'person'} size={19} />
                    <span>{mode === 'signup' ? t('إنشاء الحساب') : t('تسجيل الدخول')}</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-2 my-4">
              <span className="h-px flex-1 bg-surface-dim" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">{t('أو')}</span>
              <span className="h-px flex-1 bg-surface-dim" />
            </div>

            <button
              type="button"
              onClick={handleGuest}
              disabled={busy}
              className="w-full h-11 rounded-xl bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 cursor-pointer"
            >
              <AppIcon name="lock_open" className="text-primary" size={18} />
              <span>{t('المتابعة كزائر بدون حساب')}</span>
            </button>
            <p className="font-label-sm text-label-sm text-on-surface-variant text-center leading-relaxed mt-2">
              {t('وضع الزائر يتيح لك استخدام الحاسبة والتقارير، لكنه لا يحفظ بياناتك في حسابك.')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
