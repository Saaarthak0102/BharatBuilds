# Saans Design System

## 1. Core Principles
- **Audiences First:** Built for Punjab/Haryana farmers (mobile-first, low-literacy) and Delhi NCR citizens.
- **Visuals:** Dark, glossy, premium fintech feel (near-black base + colored glow bleeding from top).
- **Typography:** High-contrast italic serif for English headlines, clean geometric sans for UI. Noto Sans Devanagari and Gurmukhi for localized text.
- **Accessibility:** Minimum 16px text, WCAG AA contrast, generous touch targets (48px min).

## 2. Color Palette & Tokens
Located in `/apps/web/styles/tokens.css`.

- `--bg-0`: `#07090D` (Page background)
- `--bg-1`: `#0D1117` (Sections)
- `--bg-2`: `#141A23` (Cards)
- `--bg-3`: `#1B2330` (Raised elements)
- `--border`: `rgba(255,255,255,0.08)`
- `--border-strong`: `rgba(255,255,255,0.16)`
- `--text-hi`: `#F4F7FB` (Headlines, primary info)
- `--text-mid`: `#B4BECC` (Subtitles, secondary info)
- `--text-low`: `#7C8798` (Muted info only, not essential)

### Accent System
Set on `<html>` or wrapper via `data-accent="<color>"`.
- **Blue (`#3B82F6`):** Landing page, Auth (`/login`, `/signup`)
- **Emerald (`#10B981`):** Farmer Dashboard & Planner (`/farmer`)
- **Cyan (`#22D3EE`):** Citizen Dashboard & Today (`/citizen`)
- **Red (`#EF4444`):** Report burning (`/citizen/report`)
- **Violet (`#8B5CF6`):** Shared Map (`/map`)
- **Amber (`#F59E0B`):** Alerts & Warnings
- **Green (`#22C55E`):** Success states

## 3. Typography
Configured in `layout.tsx` using `next/font`.
- Display: `Instrument Serif Italic` (`--font-display`)
- Sans: `Plus Jakarta Sans` (`--font-body`)
- Hindi: `Noto Sans Devanagari` (`--font-hi`)
- Punjabi: `Noto Sans Gurmukhi` (`--font-pa`)

## 4. UI Components

### Primitive Components (`/components/ui`)
1. **AccentGlow:** Renders the massive top-aligned radial glow + faint grid texture. Respects `data-accent`.
2. **PillButton:** Main interactive button. 
   - Variants: `primary-silver`, `accent`, `glass`, `danger`
3. **GlassCard:** Standard container. `spotlight` prop enables subtle hover lift and accent glow.
4. **IconTile:** 4-column grid action tile with icon, 2-line label, hover lift, focus ring.
5. **StatTile:** Big number with caption.
6. **Chip:** Badges (`default`, `outline`, `accent`) + `SampleDataBadge` + `StatusDot`.
7. **TopBar:** Sticky glass nav for Desktop.
8. **BottomNavPill:** Floating bottom nav for mobile (`md:hidden`).
9. **SectionHeading:** Standardized title+subtitle format for sections.

## 5. Motion Rules (GSAP)
- Setup in `/lib/motion/gsap.ts` using `@gsap/react`.
- **Fade Up Reveal:** `y: 40`, `opacity: 0` -> `1`, `duration: 0.8`, `ease: "power3.out"` with ScrollTrigger.
- **Float Cards:** Infinite `yoyo` translation of `-10px` on Y-axis.
- **Prefers Reduced Motion:** Strict fallback applied in `gsap.ts`. All animations are bypassed automatically if OS prefers reduced motion.
