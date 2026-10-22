'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BillUploader } from '@/components/bill-uploader';
import { RoofInspector } from '@/components/roof-inspector';
import { calculateKwhFromEgp } from '@/lib/egypt-tariffs';
import type { BillData, RooftopData } from '@/types';

export function LandingForm() {
  const router = useRouter();
  const [step, setStep] = useState<'bill' | 'roof'>('bill');
  const [spendEgp, setSpendEgp] = useState(4120);
  const [monthlyKwh, setMonthlyKwh] = useState(1450);
  const [meterNumber, setMeterNumber] = useState('EGY-ME-90214');

  const handleBillParsed = (data: BillData) => {
    if (data.totalCostEgp) setSpendEgp(data.totalCostEgp);
    if (data.kwhConsumption) setMonthlyKwh(data.kwhConsumption);
    if (data.meterNumber) setMeterNumber(data.meterNumber);
  };

  const handleRoofConfirmed = (rooftopData: RooftopData) => {
    const params = new URLSearchParams({
      address: rooftopData.formattedAddress,
      spend: String(spendEgp),
      kwh: String(Math.round(monthlyKwh)),
      meter: meterNumber,
      ratio: '0.8',
      area: String(rooftopData.polygonAreaM2 || 180),
      lat: String(rooftopData.lat),
      lng: String(rooftopData.lng),
    });
    router.push(`/dashboard?${params.toString()}`);
  };

  if (step === 'roof') {
    return (
      <RoofInspector
        monthlySpendEgp={spendEgp}
        monthlyKwh={monthlyKwh}
        onConfirm={handleRoofConfirmed}
        onBack={() => setStep('bill')}
      />
    );
  }

  return (
    <BillUploader
      monthlySpendEgp={spendEgp}
      monthlyKwh={monthlyKwh}
      onSpendChange={(s) => {
        setSpendEgp(s);
        setMonthlyKwh(calculateKwhFromEgp(s));
      }}
      onKwhChange={(k) => setMonthlyKwh(k)}
      onBillParsed={handleBillParsed}
      onContinue={() => setStep('roof')}
    />
  );
}
