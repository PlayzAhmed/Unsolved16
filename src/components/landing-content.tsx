'use client';

import { AppIcon } from '@/components/ui/app-icon';
import { LandingForm } from '@/components/landing-form';
import { LandingAccount } from '@/components/landing-account';
import { TeaserSlider } from '@/components/teaser-slider';
import { useI18n } from '@/lib/i18n';

export function LandingContent() {
  const { t, formatNumber, isRtl } = useI18n();
  const chevronIcon = isRtl ? 'chevron_left' : 'chevron_right';

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 px-4 max-w-lg mx-auto">
      <div className="flex flex-col w-full pb-8">
        <div className="flex items-center justify-between gap-1 mb-2 mt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed-variant shadow-sm">
            <AppIcon name="wb_sunny" className="text-tertiary" size={16} />
            <span className="font-label-sm text-label-sm font-semibold">
              {t('حسابات دقيقة بتسعيرة ٢٠٢٤ المعتمدة')}
            </span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>{t('متاح الآن فوراً')}</span>
          </div>
        </div>

        <section className="flex flex-col gap-1 mb-4">
          <h1 className="font-display-hero-mobile text-display-hero-mobile text-on-surface tracking-tight">
            {t('فاتورتك كل شهر')}
            <span className="bg-gradient-to-l from-tertiary-container via-secondary-container to-secondary text-transparent bg-clip-text font-black block mt-0.5">
              {t('رايحة فين؟')}
            </span>
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {t('صوّر فاتورة الكهربا لمحلّك أو ورشتك، واعرف في ٣٠ ثانية بالظبط هتوفر كام مع الطاقة الشمسية النظيفة بدون أي تعقيد هندسي.')}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm shadow-sm">
              <AppIcon name="verified_user" className="text-primary" size={15} />
              <span>{t('مجاني ١٠٠٪')}</span>
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm shadow-sm">
              <AppIcon name="lock_open" className="text-primary" size={15} />
              <span>{t('من غير تسجيل حساب')}</span>
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm shadow-sm">
              <AppIcon name="storefront" className="text-primary" size={15} />
              <span>{t('لكافة الأنشطة التجارية')}</span>
            </div>
          </div>
        </section>

        <div className="w-full bg-surface-container-high rounded-xl p-3 flex items-center justify-between gap-2 mb-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0 text-on-secondary-container shadow-sm">
              <AppIcon name="groups" className="text-on-secondary-container" size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-on-surface font-bold truncate">
                {t('أكتر من ١٢,٠٠٠ تاجر وورشة')}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('بيوفروا آلاف الجنيهات شهرياً في مصر')}
              </span>
            </div>
          </div>
          <AppIcon name="trending_down" className="text-primary" size={22} />
        </div>

        <div className="w-full bg-surface-container-low rounded-xl p-3 mb-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-primary">
            <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[12px]">
              {formatNumber(1)}
            </div>
            <span className="font-label-md text-label-md font-bold">{t('فحص الفاتورة')}</span>
          </div>
          <AppIcon name={chevronIcon} className="text-outline-variant" size={18} />
          <div className="flex items-center gap-1.5 text-on-surface-variant opacity-60">
            <div className="w-6 h-6 rounded-full bg-surface-dim text-on-surface flex items-center justify-center font-bold text-[12px]">
              {formatNumber(2)}
            </div>
            <span className="font-label-md text-label-md">{t('سقف المحل')}</span>
          </div>
          <AppIcon name={chevronIcon} className="text-outline-variant" size={18} />
          <div className="flex items-center gap-1.5 text-on-surface-variant opacity-60">
            <div className="w-6 h-6 rounded-full bg-surface-dim text-on-surface flex items-center justify-center font-bold text-[12px]">
              {formatNumber(3)}
            </div>
            <span className="font-label-md text-label-md">{t('تقرير التوفير')}</span>
          </div>
        </div>

        <LandingForm />
        <LandingAccount />

        <div className="w-full bg-surface-container-low rounded-xl p-4 my-6 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppIcon name="bakery_dining" className="text-tertiary" size={22} />
              <div>
                <span className="font-label-lg text-label-lg text-on-surface font-bold block">
                  {t('مخبز وحلواني الأمانة')}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('حدائق القبة، القاهرة')}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
              {t('وفر ٧٢٪ شهرياً')}
            </span>
          </div>

          <div className="relative w-full h-36 rounded-lg overflow-hidden shadow-sm my-1">
            <img
              className="w-full h-full object-cover"
              alt={t('مخبز بلدي بالقاهرة مع ألواح شمسية')}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKdHCFbuaCMFms0PGHJTLa17d0HFiMpcUa0lTpljiFgD8k13yygtdr0sh9MbB5bilccRPL18fUyHRdxH3G00OLrRZpr_qqMjt3Hfwn3G0qGqCrwgq1fr17xk4DPBq6ixX3uhGzH507MbpMFncOY-vmaX-qBihFXFvYTscQqCqcl6FZp3FJvVF6oofMWftV5I3yzjNsIpvNyQIYtGJhoAZt21Hz6Ixtm7kw8wAfx51nszzyPZcsyZpv"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-3">
              <span className="text-white font-body-sm text-body-sm leading-snug">
                {t('«فاتورتنا كانت بتعدي ٩,٥٠٠ ج.م شهرياً. بعد الخلايا الشمسية بنسدد أقل من ٢,٦٠٠ ج.م.»')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('التوفير السنوي التقديري')}
              </span>
              <span className="font-numeric-stat-mobile text-numeric-stat-mobile text-primary font-bold">
                {t('٨٢,٨٠٠ ج.م')}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('فترة استرداد التكلفة')}
              </span>
              <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                {t('٣.٢ سنة')}
              </span>
            </div>
          </div>
        </div>

        <TeaserSlider />

        <div className="w-full bg-surface-container-lowest rounded-xl p-3 shadow-sm flex flex-col gap-1.5 mb-6">
          <div className="flex items-center justify-between px-1">
            <span className="font-label-md text-label-md font-bold text-on-surface">
              {t('أسطح تجارية تم فحصها بالقمر الصناعي')}
            </span>
            <AppIcon name="verified" className="text-primary" size={18} />
          </div>
          <div className="relative w-full h-40 rounded-lg overflow-hidden shadow-sm">
            <img
              className="w-full h-full object-cover"
              alt={t('أسطح تجارية بالطاقة الشمسية بالإسكندرية')}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCedrhkubCxfiopjQ7QkUy10qMDop4mT-Y1T8U_iwJnM5aRW9KVnj--l2NIOpWh2mR3HZmZ_O2Gw6lmraxBIsVkPWraVEMTWqSwBCZghx-E_3I2Aakj4viP7B-ewhFNLZVHWT0Fy4wYDXnfGguU4pmq8QLrzxI-jWZ0d_nAQW9DKJbL8WmG-rlriRYjuIJA5aanC831_L7dpryC9ZK4AHkRw6WtC557VHiWR9GFnG1Mus_nB5vp38f"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-tint/60 via-transparent to-transparent flex items-end justify-between p-3 text-white">
              <div>
                <span className="font-label-md text-label-md font-bold block">
                  {t('منطقة برج العرب الصناعية')}
                </span>
                <span className="text-[12px] opacity-90">
                  {t('٣٤ ورشة ومصنع صغير متصل بالشبكة')}
                </span>
              </div>
              <AppIcon name="solar_power" className="text-white" size={24} />
            </div>
          </div>
        </div>

        <footer className="w-full bg-surface-container-high rounded-xl p-4 flex flex-col items-center text-center gap-1.5 shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-tertiary">
            <AppIcon name="energy_savings_leaf" className="text-tertiary" size={22} />
            <span className="font-label-md text-label-md font-bold text-on-surface">
              {t('مبادرة تسريع الطاقة النظيفة للشركات المصرية')}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-[320px] leading-relaxed">
            {t('مشروع مطور لدعم الهدف السابع من أهداف التنمية المستدامة (SDG 7) ضمن فعاليات SolveThe17 العالمية.')}
          </p>
          <div className="flex items-center gap-2 mt-1 pt-2 border-t border-surface-dim w-full justify-center">
            <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
              <AppIcon name="security" className="text-primary" size={16} />
              <span>{t('بيانات الفاتورة مشفرة ومحمية بالكامل')}</span>
            </div>
            <span className="text-outline-variant">•</span>
            <span className="font-label-sm text-label-sm text-primary font-bold">{t('٢٠٢٦ مصر')}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
