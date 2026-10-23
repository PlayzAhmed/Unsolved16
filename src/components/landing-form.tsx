'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BillUploader } from '@/components/bill-uploader';
import { RoofInspector } from '@/components/roof-inspector';
import { calculateKwhFromEgp } from '@/lib/egypt-tariffs';
import { calculateUsableRoofArea } from '@/lib/solar-calculator';
import type { BillData, RooftopData } from '@/types';

export function LandingForm() {
  const router = useRouter();
  const [step, setStep] = useState<'bill' | 'roof'>('bill');
  const [spendEgp, setSpendEgp] = useState(4120);
  const [monthlyKwh, setMonthlyKwh] = useState(1450);
  const [meterNumber, setMeterNumber] = useState('EGY-ME-90214');
  const [customerName, setCustomerName] = useState('');

  const handleBillParsed = (data: BillData) => {
    if (data.totalCostEgp) setSpendEgp(data.totalCostEgp);
    if (data.kwhConsumption) setMonthlyKwh(data.kwhConsumption);
    if (data.meterNumber) setMeterNumber(data.meterNumber);
    if (data.customerName) setCustomerName(data.customerName);
  };

  const handleRoofConfirmed = (rooftopData: RooftopData) => {
    const roofAreaM2 =
      rooftopData.roofAreaM2 ?? rooftopData.polygonAreaM2 ?? 180;
    const usableAreaM2 =
      rooftopData.usableAreaM2 ?? calculateUsableRoofArea(roofAreaM2);
    const businessName = rooftopData.meta?.businessName || customerName;
    const params = new URLSearchParams({
      address: rooftopData.formattedAddress,
      spend: String(spendEgp),
      kwh: String(Math.round(monthlyKwh)),
      meter: meterNumber,
      ratio: '0.8',
      area: String(usableAreaM2),
      gross: String(roofAreaM2),
      source: rooftopData.meta?.areaSource ?? 'manual',
      lat: String(rooftopData.lat),
      lng: String(rooftopData.lng),
    });
    if (businessName) params.set('name', businessName);
    if (rooftopData.staticMapUrl) params.set('mapUrl', encodeURIComponent(rooftopData.staticMapUrl));
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
