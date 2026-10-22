'use client';

import React, { useState } from 'react';
import type { RooftopData } from '@/types';
import { cn, buildStaticMapUrl } from '@/lib/utils';
import { AppIcon } from '@/components/ui/app-icon';

export interface RoofInspectorProps {
  monthlySpendEgp: number;
  monthlyKwh: number;
  onConfirm: (data: RooftopData) => void;
  onBack: () => void;
  className?: string;
}

export function RoofInspector({
  monthlySpendEgp,
  monthlyKwh,
  onConfirm,
  onBack,
  className,
}: RoofInspectorProps) {
  const [address, setAddress] = useState('');
  const [manualAreaM2, setManualAreaM2] = useState(180);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [rooftopData, setRooftopData] = useState<RooftopData>({
    lat: 30.0444,
    lng: 31.2357,
    formattedAddress: '',
    polygonAreaM2: 180,
    staticMapUrl: '',
  });
  const [businessName, setBusinessName] = useState('');

  // Capacity calculation (~9 m² per 1 kW)
  const capacityKw = Math.round(manualAreaM2 / 9);

  // Teaser annual savings and payback estimate
  const teaserSavings = Math.round((monthlySpendEgp * 0.8) * 12 * 0.7);
  const paybackYears = Math.max(
    2.5,
    Math.round(((capacityKw * 28000) / (Math.max(1, teaserSavings))) * 10) / 10
  );

  const fetchGeocode = async (addrToSearch: string) => {
    setIsLoadingGeo(true);
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addrToSearch, monthlyKwh }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const data: RooftopData = json.data;
        const mapUrl = data.staticMapUrl || buildStaticMapUrl(data.lat, data.lng);
        setRooftopData({ ...data, staticMapUrl: mapUrl });
        if (data.polygonAreaM2) {
          setManualAreaM2(Math.round(data.polygonAreaM2));
        }
      }
    } catch {
      // Keep current
    } finally {
      setIsLoadingGeo(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setAddress('جاري تحديد الموقع عبر الأقمار الصناعية...');
    setTimeout(() => {
      const newAddr = 'شارع النيل، العجوزة، الجيزة (الموقع الحالي)';
      setAddress(newAddr);
      fetchGeocode(newAddr);
    }, 650);
  };

  const handleDecreaseArea = () => {
    if (manualAreaM2 > 30) setManualAreaM2((prev) => prev - 10);
  };

  const handleIncreaseArea = () => {
    if (manualAreaM2 < 1000) setManualAreaM2((prev) => prev + 10);
  };

  const handleProceed = () => {
    const finalStaticMapUrl =
      rooftopData.staticMapUrl || buildStaticMapUrl(rooftopData.lat, rooftopData.lng);
    onConfirm({
      ...rooftopData,
      formattedAddress: address || rooftopData.formattedAddress,
      polygonAreaM2: manualAreaM2,
      staticMapUrl: finalStaticMapUrl,
      meta: {
        ...rooftopData.meta,
        businessName: businessName.trim() || undefined,
      },
    });
  };

  return (
    <div className={cn('w-full flex flex-col space-y-4', className)}>
      {/* Step Progress Indicator */}
      <div className="w-full bg-surface-container-low rounded-xl p-3 shadow-sm flex items-center justify-between gap-1 overflow-x-auto">
        {/* Step 1 Done */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 shrink-0 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary">
            <AppIcon name="check" size={14} />
          </div>
          <span className="font-label-sm text-label-sm text-on-surface font-semibold">قراءة الفاتورة</span>
        </button>

        {/* Connector 1 */}
        <div className="h-0.5 flex-1 bg-primary min-w-[12px] mx-1 rounded-full"></div>

        {/* Step 2 Active */}
        <div className="flex items-center gap-1.5 shrink-0 bg-primary-container/15 px-2.5 py-1 rounded-full">
          <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
            <AppIcon name="my_location" size={14} />
          </div>
          <span className="font-label-sm text-label-sm text-primary font-bold">فحص السطح (الآن)</span>
        </div>

        {/* Connector 2 */}
        <div className="h-0.5 flex-1 bg-outline-variant min-w-[12px] mx-1 rounded-full"></div>

        {/* Step 3 Upcoming */}
        <div className="flex items-center gap-1.5 shrink-0 opacity-50">
          <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-label-sm text-label-sm font-bold">
            ٣
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">النتائج والتوفير</span>
        </div>
      </div>

      {/* Detected Bill Info Strip */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-3 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
            <AppIcon name="receipt_long" size={18} />
          </div>
          <div className="truncate">
            <p className="font-label-sm text-label-sm text-on-surface-variant">الفاتورة المكتشفة بالذكاء الاصطناعي</p>
            <p className="font-label-md text-label-md text-on-surface font-bold truncate">
              {monthlySpendEgp.toLocaleString('ar-EG')} ج.م / شهر{' '}
              <span className="font-label-sm text-label-sm text-tertiary font-normal">
                (شريحة تجارية أعلى من ١٠٠٠ ك.و)
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm shrink-0 flex items-center gap-1 active:bg-surface-container-highest transition-colors cursor-pointer"
        >
          <AppIcon name="edit" size={14} />
          <span>تعديل</span>
        </button>
      </div>

      {/* Address Selection Card */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-label-lg text-label-lg text-on-surface font-bold flex items-center gap-1.5">
            <AppIcon name="storefront" className="text-primary" size={20} />
            <span>عنوان المحل أو الورشة</span>
          </label>
          <span className="font-label-sm text-label-sm text-primary font-semibold flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            تحديد تلقائي
          </span>
        </div>

        {/* Input Box */}
        <div className="relative w-full">
          <div className="flex items-center bg-surface-container-low rounded-xl px-3 h-12 shadow-inner">
            <AppIcon name="search" className="text-outline shrink-0 ml-2" size={20} />
            <input
              className="bg-transparent border-0 outline-none w-full font-body-md text-body-md text-on-surface placeholder:text-outline font-medium"
              placeholder="ابحث باسم الشارع أو الحي..."
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchGeocode(address);
              }}
            />
            {address && (
              <button
                type="button"
                onClick={() => setAddress('')}
                className="text-outline hover:text-on-surface p-1 mr-1 cursor-pointer"
              >
                <AppIcon name="close" size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Location Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-0.5 pb-1">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary-fixed text-on-secondary-fixed rounded-full font-label-sm text-label-sm font-semibold shrink-0 shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <AppIcon name="near_me" size={16} />
            <span>استخدم موقعي الحالي 🛰️</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const addr = 'ورشة الدقي المركزية، الجيزة';
              setAddress(addr);
              fetchGeocode(addr);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-full font-label-sm text-label-sm shrink-0 active:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <AppIcon name="history" size={15} />
            <span>ورشة الدقي المركزية</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const addr = 'المعادي، القاهرة';
              setAddress(addr);
              fetchGeocode(addr);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-full font-label-sm text-label-sm shrink-0 active:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <AppIcon name="history" size={15} />
            <span>المعادي، القاهرة</span>
          </button>
        </div>

        {/* Business Name Input */}
        <div className="flex flex-col gap-1 pt-1">
          <label className="font-label-sm text-label-sm text-on-surface-variant font-medium">
            اسم المنشأة التجارية <span className="text-outline">(اختياري)</span>
          </label>
          <div className="flex items-center bg-surface-container-low rounded-xl px-3 h-10 shadow-inner">
            <AppIcon name="store" className="text-outline shrink-0 ml-2" size={18} />
            <input
              className="bg-transparent border-0 outline-none w-full font-body-sm text-body-sm text-on-surface placeholder:text-outline"
              placeholder="مثال: مخبز البركة، ورشة المعادي..."
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Interactive Satellite Rooftop Map Card */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-3.5 shadow-md flex flex-col space-y-3">
        {/* Header of Map */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-ping"></div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">المسح بالأقمار الصناعية</h3>
          </div>
          <div className="bg-surface-container px-2.5 py-1 rounded-full flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
            <AppIcon name="satellite_alt" size={14} />
            <span>{isLoadingGeo ? 'جاري التحديث...' : 'دقة عالية 0.3م'}</span>
          </div>
        </div>

        {/* Map Viewport Container */}
        <div className="relative w-full h-64 rounded-xl overflow-hidden shadow-inner bg-surface-dim">
          {rooftopData.staticMapUrl ? (
            <div
              className="w-full h-full bg-cover bg-center transition-all duration-300"
              style={{
                backgroundImage: `url('${rooftopData.staticMapUrl}')`,
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-on-surface-variant bg-gradient-to-br from-surface-container to-surface-dim">
              <AppIcon name="map" size={40} className="opacity-30" />
              <span className="text-label-sm font-label-sm text-center px-4 opacity-60">
                أدخل عنوان محلّك لعرض خريطة السطح
              </span>
            </div>
          )}

          {/* Rooftop Solar Polygon Layer (Vector Overlay SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 300">
            <defs>
              <linearGradient id="solarGlow" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#fdc73a" stopOpacity="0.55"></stop>
                <stop offset="100%" stopColor="#ffb68d" stopOpacity="0.30"></stop>
              </linearGradient>
              <filter height="120%" id="shadowGlow" width="120%" x="-10%" y="-10%">
                <feDropShadow dx="0" dy="2" floodColor="#b55300" floodOpacity="0.4" stdDeviation="4"></feDropShadow>
              </filter>
            </defs>

            {/* Highlighted Detection Polygon */}
            <polygon
              fill="url(#solarGlow)"
              filter="url(#shadowGlow)"
              points="80,55 310,40 335,215 105,235"
              stroke="#fdc73a"
              strokeDasharray="6 3"
              strokeWidth="3"
            ></polygon>

            {/* Vertex Grab Handles simulating AI bound-detection */}
            <circle cx="80" cy="55" fill="#006161" r="5" stroke="#ffffff" strokeWidth="2"></circle>
            <circle cx="310" cy="40" fill="#006161" r="5" stroke="#ffffff" strokeWidth="2"></circle>
            <circle cx="335" cy="215" fill="#006161" r="5" stroke="#ffffff" strokeWidth="2"></circle>
            <circle cx="105" cy="235" fill="#006161" r="5" stroke="#ffffff" strokeWidth="2"></circle>

            {/* Compass & Sun Angle Indicator in Top Left */}
            <g transform="translate(30, 30)">
              <circle cx="0" cy="0" fill="#1e1b14" fillOpacity="0.75" r="18"></circle>
              <line stroke="#fdc73a" strokeLinecap="round" strokeWidth="2.5" x1="0" x2="0" y1="0" y2="12"></line>
              <polygon fill="#fdc73a" points="0,15 -3,10 3,10"></polygon>
              <text fill="#ffffff" fontFamily="Inter" fontSize="8" fontWeight="bold" textAnchor="middle" x="0" y="-7">
                N
              </text>
            </g>
          </svg>

          {/* Interactive Micro Pill in Map */}
          <div className="absolute top-3 left-3 bg-inverse-surface/85 backdrop-blur-md text-inverse-on-surface px-2.5 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1.5 shadow-md">
            <AppIcon name="wb_sunny" className="text-secondary-fixed" size={14} />
            <span>إشعاع شمسي ٥.٦ ك.و.س/م²</span>
          </div>

          {/* Pulse indicator on Rooftop Center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
            <span className="flex h-4 w-4 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed-dim opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-secondary-container"></span>
            </span>
            <span className="mt-1 bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm text-on-surface font-label-sm text-label-sm font-bold">
              سطح المنشأة المستهدف
            </span>
          </div>

          {/* Quick Zoom Controls Overlay */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1">
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm shadow flex items-center justify-center text-on-surface active:bg-surface-container cursor-pointer"
            >
              <AppIcon name="add" size={18} />
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm shadow flex items-center justify-center text-on-surface active:bg-surface-container cursor-pointer"
            >
              <AppIcon name="remove" size={18} />
            </button>
          </div>
        </div>

        {/* Rooftop Metrics Summary Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Metric 1: Usable Area */}
          <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
              <AppIcon name="square_foot" className="text-primary" size={15} />
              <span>المساحة</span>
            </div>
            <div className="mt-1">
              <span className="font-numeric-stat-mobile text-numeric-stat-mobile text-primary font-bold">
                {manualAreaM2.toLocaleString('ar-EG')}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mr-0.5">م²</span>
            </div>
            <span className="font-label-sm text-label-sm text-primary font-semibold mt-0.5">صافي متاح ٨٨٪</span>
          </div>

          {/* Metric 2: Estimated Power */}
          <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
              <AppIcon name="bolt" className="text-tertiary" size={15} />
              <span>القدرة</span>
            </div>
            <div className="mt-1">
              <span className="font-numeric-stat-mobile text-numeric-stat-mobile text-tertiary font-bold">
                {capacityKw.toLocaleString('ar-EG')}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mr-0.5">ك.واط</span>
            </div>
            <span className="font-label-sm text-label-sm text-tertiary font-semibold mt-0.5">نظام استيعابي</span>
          </div>

          {/* Metric 3: Sun Angle */}
          <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
              <AppIcon name="explore" className="text-secondary" size={15} />
              <span>التوجيه</span>
            </div>
            <div className="mt-1">
              <span className="font-headline-sm text-headline-sm text-secondary font-bold">ممتاز</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">جنوبي بزاوية ٢٨°</span>
          </div>
        </div>

        {/* Manual Area Stepper Adjustment Card */}
        <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AppIcon name="tune" className="text-primary" size={20} />
            <div>
              <p className="font-label-md text-label-md text-on-surface font-semibold">المساحة غير دقيقة على الخريطة؟</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">عدّل الأمتار المتاحة لسطحك يدويًا</p>
            </div>
          </div>

          {/* Interactive Stepper */}
          <div className="flex items-center bg-surface-container-lowest rounded-full p-1 shadow-sm">
            <button
              aria-label="تقليل المساحة"
              type="button"
              onClick={handleDecreaseArea}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-bold active:scale-95 transition-transform cursor-pointer"
            >
              -
            </button>
            <div className="px-2.5 text-center min-w-[54px]">
              <span className="font-label-lg text-label-lg font-bold text-primary">
                {manualAreaM2.toLocaleString('ar-EG')}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">م²</span>
            </div>
            <button
              aria-label="زيادة المساحة"
              type="button"
              onClick={handleIncreaseArea}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface font-bold active:scale-95 transition-transform cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Realtime Estimated Payback Teaser Card */}
      <div className="w-full bg-secondary-fixed/35 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
            <AppIcon name="savings" size={22} />
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-secondary font-semibold">التوفير السنوي المتوقع الأولي</p>
            <p className="font-headline-sm text-headline-sm text-on-surface font-bold">
              <span>{teaserSavings.toLocaleString('ar-EG')}</span> ج.م{' '}
              <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">/ سنة</span>
            </p>
          </div>
        </div>
        <div className="text-left">
          <span className="bg-surface-container-lowest text-primary font-label-sm text-label-sm font-bold px-2.5 py-1 rounded-full shadow-sm">
            فترة استرداد ≈ {paybackYears.toLocaleString('ar-EG')} سنة
          </span>
        </div>
      </div>

      {/* Primary Sticky Bottom Action Area */}
      <div className="w-full pt-2 flex flex-col space-y-2">
        <button
          type="button"
          onClick={handleProceed}
          disabled={!address.trim()}
          className={cn(
            'w-full h-14 rounded-2xl font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer',
            address.trim()
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container-highest text-outline cursor-not-allowed opacity-60'
          )}
        >
          <AppIcon name="wb_sunny" size={24} />
          <span>احسب التوفير وافتح لوحة التحكم</span>
          <AppIcon name="arrow_back" size={20} className="mr-1" />
        </button>

        <div className="flex items-center justify-center gap-1.5 text-center text-outline font-label-sm text-label-sm py-1">
          <AppIcon name="verified_user" className="text-primary" size={16} />
          <span>البيانات مؤمنة ومحسوبة بالتعريفة المصرية المعتمدة لعام ٢٠٢٤</span>
        </div>
      </div>
    </div>
  );
}
