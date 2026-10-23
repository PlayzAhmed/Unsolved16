import { Navbar } from '@/components/navbar';
import { LandingContent } from '@/components/landing-content';
import { BottomNav } from '@/components/bottom-nav';

export const metadata = {
  title: 'EnergyTwin AI | فحص فاتورة الكهرباء والتحول للطاقة الشمسية',
  description:
    'صوّر فاتورة الكهربا لمحلّك أو ورشتك، واعرف في ٣٠ ثانية بالظبط هتوفر كام مع الطاقة الشمسية النظيفة.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col relative selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      <Navbar subtitle="الرئيسية" />
      <LandingContent />
      <BottomNav />
    </div>
  );
}
