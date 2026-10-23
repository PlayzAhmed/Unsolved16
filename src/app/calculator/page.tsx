import { Navbar } from '@/components/navbar';
import { CalculatorContent } from '@/components/calculator-content';

export const metadata = {
  title: 'حاسبة الطاقة الشمسية | EnergyTwin AI',
  description: 'حاسبة منفصلة لحساب السعة والوفر وفترة استرداد التكلفة وفقاً لتعريفات الكهرباء التجارية في مصر',
};

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-sand text-ink flex flex-col">
      <Navbar subtitle="حاسبة الطاقة الشمسية" />
      <CalculatorContent />
    </div>
  );
}
