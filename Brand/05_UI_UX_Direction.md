# ENERGYTWIN AI — UI/UX DIRECTION
### Product Experience: Mobile-First → Desktop
---

## 1. Experience North Star

> **A shop owner standing in his store, between two customers, on mid-range Android with 3G, gets his savings number in under 30 seconds — and smiles.**
>
> A startup founder on her laptop gets the same number plus a PDF her bank and her investors both accept.

Every UX decision is tested against the shop-owner scenario first. If it works for him, it works for everyone.

---

## 2. Information Architecture / Sitemap

```
Landing (/)
│
├── Step 1: Upload Bill        (on landing — no separate page)
├── Step 2: Address / Roof     (inline expand, same page)
├── Step 3: Dashboard (results)  (/dashboard)
│     ├── KPI cards + transition slider
│     ├── Roof map preview
│     ├── Tariff breakdown (expandable)
│     └── 📄 PDF report download
│
├── Demo Mode banner (auto when APIs fail)
└── Header: [Logo]  [ع | EN]  [كيف يعمل؟]
```

**Key structural decision:** Steps 1–2 live **on the landing page inline** (no page navigation). The flow feels like one continuous sheet, not a multi-page wizard. Only the results dashboard is a separate route.

---

## 3. Core User Flow (Happy Path)

```
┌─────────────────────────────────────────────┐
│ 1. LANDING            2. BILL UPLOAD          │
│  Headline:           ┌───────────────────┐  │
│  "فاتورتك كل شهر      │ 📸 صوّر الفاتورة    │  │
│   رايحة فين؟"         │ أو ارفع الصورة      │  │
│  Sub: 30 ثانية        └───────────────────┘  │
│  [ابدأ دلوقتي ↓]      ← scrolls to uploader │
│                                               │
│ 3. OCR RUNNING         4. ADDRESS            │
│  ┌─────────────┐       ┌───────────────────┐  │
│  │ [bill img]  │       │ 📍 عنوان المحل:    │  │
│  │ ─ scan ─    │       │ [_______________] │  │
│  │ بنقرأ الفاتورة│       │ [satellite card]  │  │
│  └─────────────┘       └───────────────────┘  │
│  → auto-advance        [احسب التوفير ☀️]     │
│                                               │
│ 5. DASHBOARD (auto-redirect, ~30s total)      │
│  "🎉 مبروك يا بطل!"                           │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │ ٧٤,٢٠٠ ج   │ │ ١٨٠ ألف ج  │ │ ٤.٢ سنة   │ │
│  │ توفير سنوي│ │ تكلفة النظام│ │ استرداد   │ │
│  └───────────┘ └───────────┘ └───────────┘ │
│  [slider 50%──80%──100%]  [📄 جاهز للبنك]  │
└─────────────────────────────────────────────┘
```

### Fallback path (built-in, always available)
OCR fails → inline apology + 2 manual inputs (kWh / EGP) → same flow continues. Maps fail → manual roof area input. Everything still completes in <60 seconds.

---

## 4. Screen-by-Screen Direction

### S1 — Landing (Mobile)
**Goal:** communicate value in 3 seconds, get the first tap.

Structure (single column, top → bottom):
1. **Header:** logo | ع/EN toggle
2. **Hero:** 
   - H1 (display): "فاتورتك الكهربا **رايحة فين؟**" with "رايحة فين؟" in sun gradient
   - Sub (body-lg): "صوّر الفاتورة من موبايلك واعرف في ٣٠ ثانية: هتوفر كام بالطاقة الشمسية؟"
   - Sun CTA button: "اعرف هتوفر كام ☀️" → scrolls to uploader
3. **Trust strip (icons row):** "✓ مجاني 100% ✓ من غير تسجيل ✓ بيانات مصر الرسمية"
4. **How it works:** 3 mini-cards (📸 صوّر → 📍 حدد المكان → 🎉 شوف التوفير)
5. **Bill uploader** (live component, not a screenshot)
6. **Short social proof / stats band:** "X ألف محل في مصر بيدفع أكتر من اللازم" (hackathon/demo numbers)
7. **Footer:** SDG 7 badge, team, hackathon credit

### S2 — Address & Roof (inline)
- Pre-filled if geolocation permission granted (single tap "استخدم موقعي الحالي")
- Input with Egyptian city suggestions (القاهرة، الجيزة، الإسكندرية…)
- Satellite card preview loads *below* the input; rooftop overlay drawn in sun stroke
- Area chip appears with slight pop animation
- Primary teal CTA at bottom, sticky in thumb zone

### S3 — Dashboard / Results (the money screen)
- **Celebration header:** sun-rise animation behind "مبروك!" + your business type detected from bill
- **Hero KPI card** (full width, sun gradient border): annual savings, count-up animation
- **3 secondary KPI cards** in a row (scroll-snap): system cost / payback / coverage
- **Transition slider** section — the interactive playground
- **Roof preview card** with panel layout suggestion overlaid on satellite image
- **Tariff breakdown** (collapsible): current tier → after-solar tier, in plain language
- **Sticky bottom bar (mobile):** [📄 حمّل التقرير للبنك] — always visible
- **Secondary actions:** شارك النتيجة (WhatsApp share — huge in Egypt), جرّب فاتورة تانية

### S4 — PDF Report
- In-app preview modal (scrollable, 2 pages max)
- Download + WhatsApp-share buttons
- Watermark-free — it's their report, their numbers

---

## 5. Desktop Adaptation (lg: 1024px+)

The experience is **designed for mobile and scaled up, not squeezed down:**

| Element | Mobile (375px) | Desktop (1280px) |
|---|---|---|
| Landing | Single column, thumb-zone CTAs | Two-column hero: copy left, live uploader preview card right (tilted, floating) |
| Dashboard | Stacked cards, sticky bottom bar | 12-col grid: KPI hero spans 8, payback+coverage span 4; slider sits beside KPIs; sticky side panel with PDF CTA |
| Steps | Inline accordion feel | Visible 3-step progress rail on the left 1/4 of the page |
| Type | display 32–40px | display up to 56px |
| Hover states | N/A | Cards lift on hover; slider thumb grows |

**Desktop-only additions:** comparison table (50/80/100% side by side), keyboard-accessible slider, print stylesheet for the report.

---

## 6. Interaction & Motion Map

| Moment | Motion | Duration | Purpose |
|---|---|---|---|
| Tap CTA | scale 0.97 + soft glow | 120ms | Confirm touch |
| OCR processing | scan line + step text cycling | ongoing | Perceived speed |
| Results load | sun rises behind hero number | 400ms | Signature celebration |
| Savings figure | count-up 0 → final | 600ms | Money arriving feeling |
| Slider change | numbers re-count, live | 300ms | Playful interactivity |
| Report ready | card glows once + haptic | 300ms | Reward without noise |
| Language switch | instant text swap, no reload | 0ms | Frictionless RTL↔LTR |

Respect `prefers-reduced-motion` — all animations collapse to instant state changes.

---

## 7. UX Writing on Screens (Microcopy Specimens)

| State | Arabic | English |
|---|---|---|
| Uploader placeholder | صوّر الفاتورة أو ارفعها من الموبايل | Snap your bill or upload it |
| OCR scanning | بنقرأ الفاتورة… دقيقة واحدة بس ⏳ | Reading your bill… one sec |
| OCR fail | الصورة مش واضحة — جرّب تاني أو اكتب بإيدك | Blurry photo — retry or type it in |
| Address hint | مثال: شارع التحرير، الدقي، الجيزة | e.g. Tahrir St, Dokki, Giza |
| Results header | 🎉 مبروك! دي فلوسك اللي هترجعلك | 🎉 Here's your money back |
| Payback label | هتسترد فلوسك في | You break even in |
| Slider 100% locked | سقفك ميكفيش ١٠٠٪ — ٨٠٪ هي الأحسن | Your roof can't fit 100% — 80% is best |
| PDF ready | 📄 تقريرك جاهز للبنك | 📄 Your bank-ready report |

---

## 8. Success Metrics (Design-Driven)

- **30-second completion rate** — % of sessions reaching dashboard ≤ 30s
- **OCR success rate** (target: >80%, with manual fallback completing 100%)
- **Slider engagement** — % who interact after seeing results (curiosity = trust)
- **PDF downloads / dashboard views** (intent metric — leads for future retailer/BNPL partners, measured but not depended on)
- **Arabic vs English usage split** (informs content investment)

---

## 9. Anti-Patterns (Explicitly Banned)

1. ❌ Sign-up gate before any value
2. ❌ Engineering units without plain-language labels
3. ❌ Dark patterns (fake countdowns, pre-checked boxes, guilt CTAs)
4. ❌ Sun-yellow body text (illegible)
5. ❌ Stock photos of foreigners
6. ❌ Multi-field forms on mobile — always single input per screen
7. ❌ Dead-end error screens — every error offers a manual path
