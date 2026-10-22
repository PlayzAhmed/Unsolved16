# ENERGYTWIN AI — DESIGN PRINCIPLES & DESIGN SYSTEM
### Principles, Tokens, Components (Tailwind-Ready)
---

## Part A — Design Principles (7 Rules Every Screen Must Pass)

### 1. 💰 Numbers Before Everything
Every screen answers: *"How much will I save?"* within the first 2 seconds. Money figures are the biggest, warmest element on screen. If a screen has no number, it better be one tap away from one.

### 2. 📱 One Thumb, One Job
Mobile-first, literally: every core action is reachable with one thumb on a 6-inch screen. One screen = one primary action. No menus deeper than 2 levels.

### 3. ⚡ 30-Second Promise
The whole flow — bill photo → results — must feel instant. Loading is designed (skeletons, progress steps), never dead. If OCR fails, manual entry takes <15 seconds and we apologize warmly.

### 4. 🌅 Warm, Never Sterile
Sand backgrounds, rounded corners (12–16px), soft shadows. This is a financial tool that smiles. But cheerfulness never sacrifices legibility — contrast ratios AA minimum.

### 5. 🗣️ Arabic Is Home
RTL is the default layout direction, not an afterthought. Type never below 16px. Sentences short. Reading level: a busy person skimming between customers.

### 6. 🔓 No Sign-Up Walls
Value first, account later (if ever). The 30-second audit is completely open. We earn trust with the free result, then offer the PDF/report.

### 7. 🏦 Trust Through Honesty
Show assumptions. Label estimates as estimates. Show payback as a range when uncertain. A slightly conservative honest number beats an inflated one — the bank report depends on it.

---

## Part B — Design Tokens (Tailwind Config Reference)

```js
// tailwind.config extension
theme: {
  colors: {
    sun:    '#FFC93C',   // primary brand / savings
    sunset: '#FF8A3D',   // secondary accent
    teal:   { DEFAULT: '#0E7C7B', deep: '#0A3A3A' },
    sand:   '#FAF3E7',
    leaf:   '#4CAF6E',
    ink:    '#1E2A2B',
    success:'#2E9E5B', warning: '#E8A33D', error: '#D64545', info: '#3E8FD8',
  },
  fontFamily: {
    arabic: ['"IBM Plex Sans Arabic"', 'Cairo', 'sans-serif'],
    latin:  ['Inter', 'sans-serif'],
  },
  fontSize: {
    display: ['clamp(2rem, 5vw, 3.5rem)', { lineHeight: '1.15', fontWeight: '700' }],
    h1: ['clamp(1.75rem, 4vw, 2.75rem)', { lineHeight: '1.2', fontWeight: '700' }],
    h2: ['clamp(1.375rem, 3vw, 2rem)',   { lineHeight: '1.25', fontWeight: '600' }],
    h3: ['clamp(1.125rem, 2vw, 1.5rem)', { lineHeight: '1.3', fontWeight: '600' }],
    body:['1rem', { lineHeight: '1.5' }],          // 16px mobile minimum
    'body-lg': ['1.125rem', { lineHeight: '1.5', fontWeight: '500' }],
    caption: ['0.8125rem', { lineHeight: '1.4' }],
  },
  borderRadius: { card: '1rem', chip: '0.75rem', btn: '0.875rem' },
  boxShadow: {
    soft: '0 2px 12px rgba(10,58,58,0.08)',
    lift: '0 8px 24px rgba(10,58,58,0.12)',
    glow: '0 0 0 4px rgba(255,201,60,0.35)',
  },
  spacing: { /* 4px base grid */ },
}
```

### Grid & Layout
- **Base unit:** 4px. Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64
- **Mobile container:** full-width, 16px side padding
- **Desktop container:** max 1120px centered
- **Touch targets:** minimum 44×44px (Apple HIG) — critical for older users
- **Breakpoints:** `sm:640  md:768  lg:1024  xl:1280` (design mobile at 375px first)

### Signature Gradient
`bg-gradient-to-br from-sun to-sunset` — CTA buttons, hero highlight, savings celebration band.

---

## Part C — Core Components

### C1. Buttons
| Variant | Style | Usage |
|---|---|---|
| **Primary** | `bg-teal text-white` | Main action: "اعمل تحليل دلوقتي" |
| **Sun CTA** | `bg-gradient-to-br from-sun to-sunset text-ink font-bold` | The money moment: "شوف هتوفر كام 🎉" |
| **Secondary** | `border-2 border-teal text-teal bg-white` | Alternative actions |
| **Ghost** | text only | Tertiary / destructive-adjacent |
| **FAB (mobile)** | 56px circle, sun gradient, thumb-zone bottom-right | Persistent "ابدأ" on long pages |

States: hover = lift shadow; pressed = scale 0.98; disabled = 40% opacity + reason tooltip.

### C2. Bill Uploader (Signature Component)
- Big dashed card, sand background, camera icon in sun circle
- Primary text: "📸 صوّر الفاتورة أو ارفعها من الموبايل"
- Secondary: "مش عايز تصوّر؟ اكتب القيمة بإيدك" → collapses into 2 inputs (kWh / EGP)
- OCR scanning state: animated scan line over the bill preview + steps ("بنقرأ الفاتورة… بنطلع الاستهلاك… بنحسب…")
- Manual fallback always visible — never a dead end

### C3. Address / Map Picker
- Single input with autocomplete: "اكتب عنوان المحل"
- Below: satellite preview card (Google Static Maps) with rooftop highlighted overlay
- Auto-estimated area shown as a friendly chip: "🏠 سقفك ≈ ١٨٠ م²"
- Edit option: "الرقم مش مظبوط؟ عدّله بإيدك" — trust through control

### C4. KPI Metric Cards (Dashboard)
```
┌─────────────────────────────┐
│ هتوفر سنويًا          ☀️  │
│  ٧٤,٢٠٠ ج.م                │   ← display size, sun color, counts up
│ عن فاتورتك الحالية          │
└─────────────────────────────┘
```
Card set: Annual Savings (hero, sun), System Cost (teal), Payback Period (leaf: "استرد فلوسك في ٤.٢ سنة"), Coverage % (sunset), Green Score (leaf badge).

### C5. Transition Slider (50% / 80% / 100%)
- Chunky, labeled slider with 3 snap points — never a raw percentage input
- Each snap re-animates the savings number live
- Labels in plain words: "نص الشغل بالشمس" / "أغلب الشغل بالشمس" / "كل شغلي بالشمس"
- Lock icon on 100% if roof area insufficient — with honest explanation

### C6. Steps Indicator
- 3-step progress bar: **الفاتورة ← العنوان ← النتيجة**
- Sun fills up as you advance; completed steps get ✓ + leaf

### C7. PDF Report Trigger
- Card: "📄 جاهز للبنك" — "تقرير تمويل أخضر جاهز للتحميل في ثانية"
- One tap → download. Success toast + subtle glow.

### C8. Empty / Error / Fallback States
Every component ships with: loading skeleton, error (friendly + retry), mock-data fallback (demo mode banner: "وضع العرض التجريبي — الأرقام للمثال"). Zero dead ends.

### C9. Language Toggle
Header, persistent: **عربي | EN**. Switching is instant, no reload, preserves all entered data.

---

## Part D — Accessibility (Non-Negotiable)

- WCAG 2.1 AA contrast (sun yellow on white FAILS — use sun only with ink text or on teal/deep backgrounds; verify every combo in the token table)
- Full RTL logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`)
- `aria-live="polite"` on savings results (screen readers announce the number)
- Tap targets ≥ 44px; form errors announced + linked
- Reduce motion variant: count-up and sun-rise animations disabled via `prefers-reduced-motion`
