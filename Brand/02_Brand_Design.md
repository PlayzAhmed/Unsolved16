# ENERGYTWIN AI — BRAND DESIGN (Visual Identity)
### Logo, Color, Typography, Imagery & Iconography
---

## 1. Design Rationale

Egypt = the sun. Our brand should feel like **sunlight on a good business day**: warm, optimistic, trustworthy, and energetic. We balance **warmth** (sun, savings, cheerfulness) with **credibility** (numbers, banks, reports). The result is a visual identity that feels like a fintech you can trust wearing a solar brand's smile.

---

## 2. Logo Concept

### Primary Mark — "The Twin Sun"
A circular sun formed by two overlapping energy waves/rings — symbolizing the **twin** (your business and its energy mirror). The sun's rays double as rising bar-chart bars, quietly encoding **savings growth**.

```
Concept (ASCII sketch):
        \  |  /
      --  (◎)  --      ◎ = twin rings (business ↔ energy twin)
        /  |  \        rays = rising savings bars
```

**Rules:**
- Never add gradients to the mark — it stays flat for small sizes (favicons, app icons, bill thumbnails)
- Minimum clear space = height of one "ray" on all sides
- Minimum size: 24px digital / 10mm print

### Wordmark
**EnergyTwin AI** — geometric sans-serif, "EnergyTwin" in Medium weight + "AI" in Bold inside a subtle sun-badge or differentiated color.

### Lockups
1. **Horizontal** (navbars, headers): [Mark] EnergyTwin **AI**
2. **Stacked** (splash, hero, app icon): Mark on top, wordmark below
3. **Mark only:** social avatars, favicons, loading states

### What the logo must NEVER do
- ❌ No plug icons (too generic, used by every utility)
- ❌ No green leaf as the main mark (too NGO-ish, not money/savings)
- ❌ No panels-of-solar-cells literalism (boring, dated)
- ❌ No black/grey corporate versions — sun is always warm

---

## 3. Color System

### Core Palette

| Token | Name | HEX | Usage |
|---|---|---|---|
| `sun` | **Sunbeam Yellow** | `#FFC93C` | Primary brand color. CTAs, highlights, savings figures, logo mark. The color of "money saved and sunshine." |
| `sunset` | **Cairo Sunset Orange** | `#FF8A3D` | Secondary accent. Progress, momentum, hover states. Gradients with Sunbeam. |
| `teal` | **Nile Teal** | `#0E7C7B` | Trust & action. Primary buttons (paired with white text), links, positive confirmations. |
| `deep` | **Deep Delta Teal** | `#0A3A3A` | Headings, footer, dark surfaces. Premium, trustworthy. |
| `sand` | **Warm Sand** | `#FAF3E7` | Primary background. Warm paper-like feel — never sterile white. |
| `leaf` | **Palm Leaf Green** | `#4CAF6E` | Sustainability accents, "green score", eco badges. Support role only — never dominant. |
| `ink` | **Ink Charcoal** | `#1E2A2B` | Body text. Softer than black, easier on eyes in sunlight (shops are bright!). |

### Functional Colors

| Token | HEX | Usage |
|---|---|---|
| `success` | `#2E9E5B` | Positive results, savings confirmed |
| `warning` | `#E8A33D` | Missing info, soft alerts |
| `error` | `#D64545` | Form errors, API failures (with friendly recovery message) |
| `info` | `#3E8FD8` | Tips, explanations |

### Gradient (Signature)
`sun → sunset` — used on: hero headline highlights, primary CTA background, savings celebration moments, report cover band.
```css
background: linear-gradient(135deg, #FFC93C 0%, #FF8A3D 100%);
```

### Color Ratio Rule (60 / 30 / 10)
- **60%** warm neutrals (sand backgrounds, white cards)
- **30%** deep teal & ink (text, structure)
- **10%** sun yellow/orange (accents, CTAs, celebration)
- Green appears only as *meaning* (eco data), not decoration.

### Dark Mode
Dark mode uses `deep` (#0A3A3A → darker #062726) backgrounds with sun yellow accents amplified. (Phase 2 — mobile users in shops prefer light mode by default.)

---

## 4. Typography

### Arabic-first, Latin-second
Our primary audience reads Arabic. Arabic is not a translation — it is the **primary interface language**.

**Arabic Typeface: IBM Plex Sans Arabic** (or **Cairo** as Google Fonts alternative)
- Weights: Regular (400), Medium (500), SemiBold (600), Bold (700)
- Why: modern, highly legible at small sizes, numerals are clear, friendly without being childish. Works for both the 40-year-old shop owner and the 24-year-old founder.

**Latin Typeface: Inter** (or **Plus Jakarta Sans** for more warmth)
- Weight range 400–800. Used for numbers (EGP figures), English UI, reports.

### Type Scale (mobile-first, 1.25 ratio)

| Token | Size (mobile → desktop) | Weight | Usage |
|---|---|---|---|
| `display` | 32px → 56px | Bold | Hero numbers ("وفر ٨٤,٠٠٠ ج"), landing headline |
| `h1` | 28px → 44px | Bold | Page titles |
| `h2` | 22px → 32px | SemiBold | Section headers |
| `h3` | 18px → 24px | SemiBold | Card titles |
| `body` | 16px → 17px | Regular | Default body (**never below 16px on mobile**) |
| `body-lg` | 18px → 19px | Medium | Important explanations |
| `caption` | 13px → 14px | Regular | Helper text, metadata |
| `num` | 20–28px | SemiBold | KPI figures — use tabular numbers for alignment |

### Numerals
- Use **Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩)** in Arabic UI for accessibility with older users; Western numerals (0-9) acceptable in financial reports for bank compatibility. **Always show EGP currency as "ج.م" or "جنيه" in Arabic UI.**

### Rules
- Max line length: 60–75 characters (Arabic: ~45–55)
- Line height: 1.4 Arabic / 1.5 Latin
- NEVER use: decorative fonts, condensed fonts, all-caps Arabic

---

## 5. Iconography & Illustration

### Icons
- **Library:** Lucide React (already in stack) — consistent 2px stroke, rounded corners
- **Style:** outline style for UI chrome, filled for status/confirmation
- **Key metaphor set:** ☀️ sun/savings · 📄 bill scan · 🏪 shop · 📊 rising chart · 🏦 bank · ✅ verified · 🤖 twin/sparkle (AI)

### Illustration Style
- **Flat, warm, geometric** with subtle grain texture
- Characters: friendly Egyptian small-business owners — bakery owner with flour-dusted apron, young founder with laptop, workshop owner. **Real, respectful, never cartoonish-caricature.**
- Scenes: rooftops with panels, sunny Egyptian streets, the Nile delta light
- Always show **diversity of business types** and **both genders**

### Photography (when used)
- Real Egyptian shops, real sunlight, real hands holding real bills
- Golden hour warmth; faces of owners smiling at their savings screen
- Avoid: stock-photo Americans in hard hats, generic solar farms with no people

---

## 6. Motion & Sound (Micro-interactions)

- **Success moment:** When results load → sun "rises" behind the savings number with a soft warm glow (300–400ms, ease-out). This is our signature moment.
- **Loading:** Skeleton screens in sand tones — never spinners alone (feels slow).
- **Counting:** Savings numbers count up from 0 to final figure (600ms) — feels like money arriving.
- **Haptics (mobile):** light tap confirmation on CTA press; success "pop" haptic on results.
- No confetti overload. Cheerful ≠ noisy. One celebration moment per flow.
