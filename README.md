# ☀️ EnergyTwin AI
> **Instant Solar & Energy Transition Platform for Egyptian SMEs**  
> Built for **SolveThe17 Hackathon** | **SDG 7: Affordable & Clean Energy**

---

## 📌 Overview
**EnergyTwin AI** is a 100% software-based energy audit and solar transition engine tailored specifically for Egyptian small and medium enterprises (SMEs) such as workshops, bakeries, retail stores, and supermarkets.

Instead of paying high upfront consultation fees or waiting weeks for engineering site visits, business owners can determine their solar potential, calculate financial savings based on Egyptian commercial electricity tariffs, and generate a bank-ready green finance report in under **30 seconds using just a phone camera and location address**.

---

## 🎯 Alignment with SDG 7
- **Target 7.2 (Renewable Energy):** Accelerates solar adoption among Egyptian SMEs by removing financial and technical estimation barriers.
- **Target 7.3 (Energy Efficiency):** Protects small businesses from rising commercial electricity tariff tiers through data-driven load insights and accurate ROI modeling.

---

## ✨ Key Features
- **📸 AI Bill Scanner (OCR):** Upload a photo of an Egyptian electricity bill to instantly extract monthly usage ($kWh$) and current bill cost ($EGP$).
- **🗺️ Satellite Rooftop Estimator:** Integrates **Google Static Maps API** to view rooftop imagery and **Overpass API (OpenStreetMap)** to auto-calculate available roof surface area ($m^2$).
- **⚖️ Egyptian Tariff Matcher & Financial Engine:** Built-in logic matching Egyptian commercial electricity tiers to compute needed system capacity ($kWp$), initial cost, monthly/annual savings, and payback period (ROI).
- **🎛️ Interactive Dashboard & Sliders:** Dynamic UI allowing business owners to test 50%, 80%, or 100% solar transition ratios and see real-time financial impacts.
- **📄 Bank-Ready PDF Report:** Generates a formatted Green Micro-Finance application report for submission to local Egyptian banks with one click.
- **⚡ Hardened Fallback System:** Built-in manual fallbacks and mock data states to guarantee a smooth, zero-downtime Live Demo.

---

## 🛠 Tech Stack
- **Framework:** [Next.js 14+ (App Router)](https://nextjs.org/) (Full-stack TypeScript)
- **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/)
- **Geocoding & Maps:** Google Static Maps API, Overpass API (OpenStreetMap)
- **OCR / Document Vision:** Vision API / Tesseract Integration
- **PDF Generation:** `@react-pdf/renderer`

---

## 📁 Folder Structure
```text
energytwin-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze-bill/route.ts   # OCR processing endpoint
│   │   │   └── geocode/route.ts        # Maps & Overpass area calculation endpoint
│   │   ├── dashboard/page.tsx          # Interactive results dashboard
│   │   ├── page.tsx                    # Landing page & input (Address + Bill Upload)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── bill-uploader.tsx           # Bill upload & manual fallback slider
│   │   ├── map-preview.tsx             # Satellite map view component
│   │   ├── metrics-cards.tsx           # KPI & Green Score cards
│   │   └── pdf-report.tsx              # Green Finance PDF template
│   ├── lib/
│   │   ├── egypt-tariffs.ts            # Egyptian commercial electricity rates & tiers
│   │   ├── solar-calculator.ts         # Financial & solar sizing equations
│   │   └── utils.ts
│   └── types/
│       └── index.ts                    # TypeScript data definitions
├── public/
│   └── mock/                           # Sample Egyptian bills & fallback data for demo
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js `18.x` or higher
- `npm` / `yarn` / `pnpm`

### Environment Variables
Create a `.env.local` file in the root folder:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
VISION_API_KEY=your_vision_ocr_key
```

### Installation
```bash
# Clone the repository
git clone https://github.com/your-team/energytwin-ai.git

# Navigate to project directory
cd energytwin-ai

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📊 Core Calculation Formula
```text
Monthly kWh = Extracted from Bill (or calculated via Tier Reverse Search)
Required kWp = (Monthly kWh / 30 days / 5 Peak Sun Hours) * 1.2 Losses
Roof Area (m²) = Required kWp * 6 m²/kWp
Estimated System Cost = Required kWp * Average Solar Cost per kWp in Egypt
Payback Period (Years) = System Cost / Annual Savings
```

---

## 👥 Team
Designed and developed with ❤️ for **SolveThe17 Hackathon**.