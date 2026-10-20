# 🤖 AGENTS.md - Developer & AI Agent Context Guidelines

This document defines context, system architecture constraints, tech stack standards, and domain rules for AI coding assistants (e.g., Cursor, Claude, GitHub Copilot) and human developers working on **EnergyTwin AI**.

---

## 🎯 Project Overview & Core Goal
Building a **Zero-Hardware, Pure-Software MVP** for the **SolveThe17 Hackathon (SDG 7)** in under 24 hours. The application evaluates solar energy transition potential and financial savings for Egyptian SMEs based on user address and electricity bill photo.

---

## 🛠 Comprehensive Tech Stack & Ecosystem

| Layer | Technology / Library | Usage & Purpose |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14+ (App Router)** | Full-stack React framework with Server & Client components. |
| **Language** | **TypeScript (Strict Mode)** | Strict typing throughout the codebase. No raw JavaScript or `any` types. |
| **Styling** | **Tailwind CSS + Shadcn UI** | Utility-first CSS, Radix primitives, Lucide React icons. |
| **State & Flow** | **React Hooks & URL State** | Clean, declarative component state (`useState`, `useContext`, `useReducer`). |
| **APIs / Backend** | **Next.js Route Handlers** | Pure Node.js runtime API endpoints in `src/app/api/`. |
| **Maps & Vision** | **Google Maps & Overpass API** | Satellite imagery and roof polygon area calculation. |
| **PDF Engine** | **`@react-pdf/renderer`** | Direct PDF document generation for bank proposals. |

---

## 📐 Mandatory Best Practices & Code Standards

### 1. App Router & Server/Client Components
* **Default to Server Components:** Keep pages and components server-rendered by default for speed and optimal bundle size.
* **Explicit `'use client'` Directive:** Only add `'use client'` at the top of components that require interactivity, state (`useState`), browser APIs, or event listeners (e.g., file uploaders, interactive sliders).
* **Colocate API Handlers:** All backend logic MUST live inside `src/app/api/[endpoint]/route.ts` using native `NextRequest` and `NextResponse`.

### 2. Component-Based Architecture (Modular & DRY)
* **Single Responsibility Principle:** Every component in `src/components/` must do ONE thing well (e.g., `MetricsCard`, `BillUploader`, `RooftopMap`).
* **Clean Prop Contracts:** Export explicit TypeScript interfaces for component props (e.g., `interface MetricsCardProps { ... }`).
* **Composition Pattern:** Prefer component composition over giant, monolithic page files. Keep `src/app/page.tsx` and `src/app/dashboard/page.tsx` clean and readable.

### 3. Tailwind CSS & UI Standards
* **Utility-First Styling:** Use inline Tailwind classes exclusively. Do not write raw CSS files or inline `style` objects except for dynamic map dimensions or PDF renderer layouts.
* **Semantic Solar Color Palette:** Use emerald/green (`emerald-600`), amber/yellow (`amber-500`), and dark slate (`slate-900`) to emphasize clean energy.
* **Dynamic Class Merging:** Always use the `cn()` utility (`clsx` + `tailwind-merge`) when conditionally merging class names.

### 4. Zero-Downtime Fallback Architecture (Demo Safety)
* **Hardened API Routes:** External API calls (Google Maps, Overpass, Vision API) MUST be wrapped in `try/catch` blocks.
* **Graceful Mock Fallbacks:** If an API fails, times out, or receives bad input, NEVER throw an unhandled server error. Return realistic mock fallback data immediately so the Live Demo continues seamlessly.

---

## 📁 Project Structure & File Conventions

```text
energytwin-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze-bill/route.ts    # OCR processing Route Handler
│   │   │   └── geocode/route.ts         # Maps & Overpass area calculation Route Handler
│   │   ├── dashboard/page.tsx           # Interactive results & slider dashboard
│   │   ├── page.tsx                     # Landing page with search & bill upload
│   │   └── layout.tsx                   # Main app layout with providers & nav
│   ├── components/
│   │   ├── ui/                          # Reusable primitive UI buttons, cards, dialogs
│   │   ├── bill-uploader.tsx            # File uploader with manual slider fallback
│   │   ├── map-preview.tsx              # Satellite map preview component
│   │   ├── metrics-cards.tsx            # KPI & Green Score cards
│   │   └── pdf-report.tsx               # React-PDF Bank proposal layout
│   ├── lib/
│   │   ├── egypt-tariffs.ts             # Egyptian commercial electricity rates & tiers
│   │   ├── solar-calculator.ts          # Pure financial & solar capacity equations
│   │   └── utils.ts                     # Helper utility functions (cn, formatters)
│   └── types/
│       └── index.ts                     # Global TypeScript interfaces
└── public/                              # Static fallback images & demo assets
```

---

## 🧮 Domain Logic & Calculation Rules

### 1. Egyptian Commercial Electricity Tariffs (`lib/egypt-tariffs.ts`)
* Always perform calculations in **EGP (Egyptian Pound)**.
* Support commercial tiering lookup (sliding scale rates for $kWh$).
* Use standard Egyptian market solar installation costs (~$25,000 - $32,000 EGP per kWp$).

### 2. Rooftop Analysis (`api/geocode/route.ts`)
* **Primary:** Google Static Maps API for satellite imagery + Overpass API (OpenStreetMap) for building polygon area ($m^2$).
* **Fallback:** If Overpass returns no building polygon, estimate roof capacity using: `Estimated Area (m²) = Monthly kWh / 15`.

### 3. OCR Bill Scanner (`api/analyze-bill/route.ts`)
* Extract: `total_cost_egp`, `kwh_consumption`, and `meter_number`.
* If OCR confidence is low, return fallback estimates and activate the manual slider UI.

---

## 🧩 Specialized Sub-Agent Instructions

### 🧮 Agent Role: `CalculatorEngine` (`lib/solar-calculator.ts`)
* Write pure, deterministic TypeScript functions without side effects.
* Input: `monthlySpendEgp` or `monthlyKwh` + `transitionRatio` (0.5 to 1.0).
* Output Interface:
  ```typescript
  export interface SolarResult {
    systemCapacityKwp: number;
    roofAreaRequiredM2: number;
    initialCostEgp: number;
    monthlySavingsEgp: number;
    annualSavingsEgp: number;
    paybackPeriodYears: number;
    greenScore: number;
    co2ReductionTons: number;
  }
  ```

### 🎨 Agent Role: `UIAgent` (`src/components/`, `src/app/`)
* Build responsive, high-impact component interfaces with Tailwind CSS.
* Provide smooth UI transitions, skeleton loader states, tooltips, and interactive slider feedback.
* Ensure clear contrast and accessible typography for hackathon judges.

### 📄 Agent Role: `PDFAgent` (`src/components/pdf-report.tsx`)
* Build formal PDF document layouts using `@react-pdf/renderer` primitive tags (`<Document>`, `<Page>`, `<View>`, `<Text>`).
* Style cleanly to mimic a formal Egyptian Bank Green Micro-Finance Proposal.

---

## 🧪 Live Demo Test Checklist
1. **Input:** Address `"المعادي، القاهرة"` + Sample Bill Photo.
2. **API Execution:** Returns satellite map preview + parsed EGP expenditure.
3. **Interactive UI:** Slider adjusts transition ratio (50% → 100%) and instantly updates payback period & ROI cards.
4. **Export:** "Download PDF" button generates a formatted Green Proposal.