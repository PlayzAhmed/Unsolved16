# ENERGYTWIN AI — Brand & UX Master Guide (Index)
### One folder. Five documents. Everything the team needs to design, write, and build consistently.
---

## 📁 Document Map

| # | Document | Contents | Use it when… |
|---|----------|----------|--------------|
| 1 | `01_Brand_Identity.md` | Mission, vision, values, positioning, personality, personas, taglines | Onboarding anyone; writing strategy decks; hackathon judging |
| 2 | `02_Brand_Design.md` | Logo concept, full color system, typography, iconography, motion | Designing any screen, deck, or social asset |
| 3 | `03_Brand_Language.md` | Voice, tone spectrum, jargon translations, Arabic/English copy rules, messaging | Writing any UI text, marketing, report content |
| 4 | `04_Design_Principles_System.md` | 7 design principles, Tailwind-ready tokens, component specs, accessibility rules | Building in Next.js/Tailwind; reviewing PRs |
| 5 | `05_UI_UX_Direction.md` | Sitemap, user flows, screen-by-screen mobile specs, desktop adaptation, microcopy | Planning sprints; designing landing + dashboard |

## 🎯 The 10-Second Brand Summary

- **Who:** Egyptian small shop owners (30–48) + startup founders (Gen Z)
- **What:** 30-second solar savings audit from a bill photo + address
- **Hook:** Money first. *"وفّر فلوسك. شغّل شمسك."*
- **Personality:** Warm, straight-talking, clever, honest — the smart friend, not the salesman
- **Look:** Sunbeam Yellow `#FFC93C` + Nile Teal `#0E7C7B` on Warm Sand `#FAF3E7`; Arabic-first (IBM Plex Sans Arabic), Inter for Latin/numbers
- **UX rule:** One thumb, one job, no sign-up walls, money figure within 2 seconds of any screen
- **Banned:** Jargon without translation, fear-based selling, sign-up gates, dead-end errors, stock-photo foreigners

## 🔗 Quick Decisions for the Build (Next.js 14 + Tailwind)

1. RTL default: set `dir="rtl"` on `<html>`, Arabic as default locale with instant EN toggle
2. Drop the token block from `04_Design_Principles_System.md` straight into `tailwind.config.ts`
3. Landing page = Step 1 + Step 2 inline (no routing until dashboard)
4. Every component ships with 3 states: loading skeleton / error+retry / demo fallback
5. KPI savings number = count-up animation + sun-rise glow (signature moment)
6. Sticky mobile bottom bar on dashboard: [📄 جاهز للبنك]
7. WhatsApp share on results — this is Egypt; WhatsApp IS the share button

## ⚠️ Scope Guardrails (from README goals)

- Retailer marketplace and BNPL = **future phases only**. Design hooks exist (PDF intent metric, report CTA) but no UI promises "buy now / pay later" anywhere.
- The bank-ready PDF is the current monetization-intent bridge — polish it hard.

---
*EnergyTwin AI · Built for SolveThe17 Hackathon · SDG 7: Affordable & Clean Energy*
