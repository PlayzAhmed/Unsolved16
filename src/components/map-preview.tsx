'use client';

import React, { useState } from 'react';
import type { RooftopData } from '@/types';
import { calculateUsableRoofArea } from '@/lib/roof-area';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/app-icon';

export interface MapPreviewProps {
  rooftopData?: RooftopData;
  requiredAreaM2: number;
  className?: string;
}

export function MapPreview({
  rooftopData,
  requiredAreaM2,
  className,
}: MapPreviewProps) {
  const address = rooftopData?.formattedAddress || 'شارع مصدق، الدقي، الجيزة';
  const grossAreaM2 =
    rooftopData?.roofAreaM2 ?? rooftopData?.polygonAreaM2 ?? 180;
  const availableAreaM2 =
    rooftopData?.usableAreaM2 ?? calculateUsableRoofArea(grossAreaM2);
  const staticMapUrl =
    rooftopData?.staticMapUrl ||
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD0PS5hO6t4R7MFK8i9is3eD4S8x-EAePtZtAwbXetoXbZgvHCudt3bK0IR51KwcX0Hhv074KKO_zJ7Z4iBvMdKjrDMXI0OX9G8BpKGk_QQ_l1baAOGS3pcfEGR6SUMECudMsjs-pGRhq6I-JtF5uOK-vDb4aQcY8CoR3dwgQDnEWRpyTJi5TYmFoZqHTcgMrIWmEFvz9UB1sqRUETa7uQt5jB-zEbBhfxwcAEKSf07bbJl0dUOeCDn';

  const [zoomLevel, setZoomLevel] = useState(18);

  const fits = requiredAreaM2 <= availableAreaM2;
  const coveragePercent = Math.min(100, Math.round((requiredAreaM2 / availableAreaM2) * 100));

  return (
    <div
      className={cn(
        'w-full bg-surface-container-lowest rounded-xl p-3.5 shadow-md flex flex-col space-y-3',
        className
      )}
    >
      {/* Header of Map */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-ping"></div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">المسح بالأقمار الصناعية</h3>
        </div>
        <div className="bg-surface-container px-2.5 py-1 rounded-full flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
          <AppIcon name="satellite_alt" size={14} />
          <span>دقة عالية 0.3م</span>
        </div>
      </div>

      {/* Map Viewport Container */}
      <div className="relative w-full h-64 rounded-xl overflow-hidden shadow-inner bg-surface-dim">
        <div
          className="w-full h-full bg-cover bg-center transition-transform duration-300"
          style={{ backgroundImage: `url('${staticMapUrl}')` }}
        ></div>

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

          {/* Compass & Sun Angle Indicator (bottom right, clear of the HUD pills) */}
          <g transform="translate(370, 270)">
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
            سطح المنشأة
          </span>
        </div>

        {/* Zoom Controls Overlay */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(20, z + 1))}
            className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm shadow flex items-center justify-center text-on-surface active:bg-surface-container cursor-pointer"
            title="تكبير"
          >
            <AppIcon name="add" size={18} />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(16, z - 1))}
            className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm shadow flex items-center justify-center text-on-surface active:bg-surface-container cursor-pointer"
            title="تصغير"
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
              {Math.round(availableAreaM2).toLocaleString('ar-EG')}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mr-0.5">م²</span>
          </div>
          <span className="font-label-sm text-label-sm text-primary font-semibold mt-0.5">
            🏠 صافي {Math.round(availableAreaM2)} من {Math.round(grossAreaM2)} م²
          </span>
        </div>

        {/* Metric 2: Estimated Power */}
        <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
            <AppIcon name="bolt" className="text-tertiary" size={15} />
            <span>المطلوب</span>
          </div>
          <div className="mt-1">
            <span className="font-numeric-stat-mobile text-numeric-stat-mobile text-tertiary font-bold">
              {Math.round(requiredAreaM2).toLocaleString('ar-EG')}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mr-0.5">م²</span>
          </div>
          <span className="font-label-sm text-label-sm text-tertiary font-semibold mt-0.5">
            {coveragePercent}% إشغال
          </span>
        </div>

        {/* Metric 3: Sun Angle */}
        <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
            <AppIcon name="explore" className="text-secondary" size={15} />
            <span>الملاءمة</span>
          </div>
          <div className="mt-1">
            <span className="font-headline-sm text-headline-sm text-secondary font-bold">
              {fits ? 'ممتاز' : 'محدود'}
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
            {fits ? 'مساحة كافية' : 'تحتاج تخفيض'}
          </span>
        </div>
      </div>
    </div>
  );
}
