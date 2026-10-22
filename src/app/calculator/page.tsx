import React from "react";
import { Navbar } from "@/components/navbar";
import { SolarCalculator } from "@/components/solar-calculator";
import { EGYPT_COMMERCIAL_TARIFFS, EGYPT_ERA_TARIFF_URL, EGYPT_ERA_EFFECTIVE_DATE } from "@/lib/egypt-tariffs";
import { Calculator, Info, ShieldCheck, Zap, ExternalLink } from "lucide-react";

export const metadata = {
  title: "حاسبة الطاقة الشمسية | EnergyTwin AI",
  description: "حاسبة منفصلة لحساب السعة والوفر وفترة استرداد التكلفة وفقاً لتعريفات الكهرباء التجارية في مصر",
};

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-sand text-ink flex flex-col font-arabic">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Page Header */}
        <div className="border-b border-teal/15 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/10 border border-teal/20 text-teal text-xs font-bold mb-2">
            <Calculator className="w-3.5 h-3.5 text-sunset" />
            <span>محرك الحساب الرياضي الفوري</span>
          </div>
          <h1 className="text-3xl font-black text-teal-deep tracking-tight">
            حاسبة الطاقة الشمسية للقطاع التجاري المصري
          </h1>
          <p className="text-sm text-teal-deep/75 mt-1 max-w-2xl font-medium">
            حاسبة فورية لحساب حجم المحطة، الوفر الشهري والسنوي، وفترة استرداد رأس المال وفقاً لأحدث شرائح الكهرباء بدون الحاجة لرفع صور.
          </p>
        </div>

        {/* The Isolated Solar Calculator */}
        <SolarCalculator
          initialSpendEgp={3850}
          initialRatio={0.8}
          showDashboardLink={true}
        />

        {/* Egyptian Commercial Electricity Tariffs Reference Guide */}
        <div className="bg-white border border-teal/15 rounded-2xl p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-teal" />
              <h3 className="text-sm font-bold text-teal-deep">
                تعريفات الكهرباء التجارية الرسمية المعلنة ({EGYPT_ERA_EFFECTIVE_DATE})
              </h3>
            </div>
            <a
              href={EGYPT_ERA_TARIFF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline transition-colors"
            >
              <span>التحقق عبر بوابة مرفق الكهرباء وحماية المستهلك (EgyptERA)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-xs text-teal-deep/70 mb-4">
            التعريفات المعتمدة لقطاع المحلات والأنشطة التجارية على الجهد المنخفض:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {EGYPT_COMMERCIAL_TARIFFS.map((tier, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-sand/60 border border-teal/15 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-teal-deep/70">
                    الشريحة {idx + 1}
                  </div>
                  <div className="text-sm font-black text-teal-deep mt-0.5">
                    {tier.maxKwh === Infinity
                      ? `أكثر من ${tier.minKwh} ك.و.س`
                      : `${tier.minKwh} - ${tier.maxKwh} ك.و.س`}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-teal/15">
                  <div className="text-xs font-black text-teal">
                    <span dir="ltr">{tier.ratePerKwhEgp.toFixed(2)}</span> ج.م / ك.و.س
                  </div>
                  <div className="text-[10px] text-teal-deep/60 mt-0.5">
                    {tier.ratePerKwhPt.toFixed(1)} قرش • +{tier.customerServiceFeeEgp} ج.م خدمة
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-teal/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-teal-deep/70">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sunset" />
              <span>معدل الإشعاع الشمسي: ٥ ساعات ذروة يومياً</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-leaf" />
              <span>متوسط تكلفة المحطة: ٢٨,٠٠٠ ج.م / ك.و.ب</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal" />
              <span>معامل الفقد في النظام: ١.٢٠ (٢٠٪ موازنة)</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-teal-deep/30 bg-teal-deep text-sand py-6 text-center text-xs">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 EnergyTwin AI — SolveThe17 Hackathon (SDG 7)</p>
          <p className="text-sand/80">محرك الحساب الشمسي المستقل</p>
        </div>
      </footer>
    </div>
  );
}
