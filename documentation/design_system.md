# Tastyplates v2 — Design System Documentation

> **Scope:** Extracted from `myeung-bana/tastyplates-v2` (Next.js App Router, Tailwind CSS v3, shadcn/ui pattern, SCSS modules). This document is the canonical reference for visual language, interaction patterns, and design decisions embedded in the codebase.

---

## Table of Contents

1. [Tech Stack & Tooling Overview](#1-tech-stack--tooling-overview)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Component Styles](#5-component-styles)
6. [Iconography & Imagery](#6-iconography--imagery)
7. [Animation & Motion](#7-animation--motion)
8. [Accessibility (a11y)](#8-accessibility-a11y)
9. [Missing Pieces & Recommended Defaults](#9-missing-pieces--recommended-defaults)
10. [UI Personality Summary](#10-ui-personality-summary)

---

## 1. Tech Stack & Tooling Overview

| Layer | Technology |
|-------|-----------|
| Framework | Next.js App Router (React 19) |
| Styling — primary | Tailwind CSS v3 (utility-first) |
| Styling — secondary | SCSS modules (`src/styles/`) using BEM methodology |
| Component library | shadcn/ui pattern (copy-paste components via `components.json`) |
| Variant API | `class-variance-authority` (CVA) |
| Class merging | `clsx` / `cn()` from `@/lib/utils` |
| Tailwind plugins | `tailwindcss-animate`, `@tailwindcss/typography` |
| Custom font | **Neusans** (brand-owned WOFF, full weight stack) |
| Body font | **Inter** (WOFF variable font) |
| Icon library | `react-icons` — primarily `fi` (Feather Icons) and `pi` (Phosphor Icons) |
| Haptics | `web-haptics` (PWA/Capacitor progressive enhancement) |

**shadcn/ui config (`components.json`):**
```json
{
  "style": "default",
  "tailwind": {
    "baseColor": "slate",
    "cssVariables": true
  }
}
```
All Tailwind color tokens are driven by CSS custom properties (`hsl(var(--token))`), making them trivially swappable.

---

## 2. Color System

### 2.1 CSS Custom Properties (`:root`)

All semantic colors live as HSL channel triplets in `:root`, consumed via `hsl(var(--token))` in Tailwind and `hsl(var(--token))` in SCSS. This means **you never set raw hex values in Tailwind classes for semantic roles**.

```css
/* src/styles/global.scss — light mode defaults */
:root {
  --background:  #ffffff;   /* page canvas */
  --foreground:  #171717;   /* primary text */
  --pwa-banner-height: 0px;
  --safe-area-top:    env(safe-area-inset-top,    0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left:   env(safe-area-inset-left,   0px);
  --safe-area-right:  env(safe-area-inset-right,  0px);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

> **Note:** Dark mode support exists at the CSS level for `background`/`foreground` only. Tailwind's `darkMode: ["class"]` is configured, meaning a `dark` class on `<html>` can also toggle dark mode. However, **no dark mode component overrides were found in the codebase** — dark mode is present in config but not fully implemented in components. This is a gap.

### 2.2 Tailwind Color Tokens (via CSS Variables)

Defined in `tailwind.config.ts` — all `hsl(var(--...))` references:

| Token | Tailwind class | Semantic role |
|-------|---------------|---------------|
| `--background` | `bg-background` | Page background |
| `--foreground` | `text-foreground` | Primary text |
| `--card` | `bg-card` | Card surface |
| `--card-foreground` | `text-card-foreground` | Text on card |
| `--popover` | `bg-popover` | Dropdown / tooltip surface |
| `--popover-foreground` | `text-popover-foreground` | Text in popovers |
| `--primary` | `bg-primary` | Primary interactive (default button bg) |
| `--primary-foreground` | `text-primary-foreground` | Text on primary |
| `--secondary` | `bg-secondary` | Secondary surface |
| `--secondary-foreground` | `text-secondary-foreground` | Text on secondary |
| `--muted` | `bg-muted` | Subdued surface (disabled states, placeholders) |
| `--muted-foreground` | `text-muted-foreground` | Subdued text |
| `--accent` | `bg-accent` | Accent / hover surface |
| `--accent-foreground` | `text-accent-foreground` | Text on accent |
| `--destructive` | `bg-destructive` | Danger/error |
| `--destructive-foreground` | `text-destructive-foreground` | Text on destructive |
| `--border` | `border-border` | Default border color |
| `--input` | `border-input` | Input field border |
| `--ring` | `ring-ring` | Focus ring |

> **Important:** The actual HSL channel values for these tokens are **not set in `globals.css`** or the SCSS entrypoint in the repo. They would normally live in a shadcn-generated `globals.css` block. Their resolved values depend on the base color (`"baseColor": "slate"`), giving a **cool-blue-gray neutral palette** as the default. Developers initializing this project should run `npx shadcn-ui init` to regenerate the correct `:root {}` token block.

### 2.3 Brand Colors (Hard-coded — Primary Design Language)

These values appear directly in component files and SCSS, overriding the semantic token system for brand-specific moments:

```scss
// Brand Orange — the PRIMARY brand color
$color-brand-orange:       #ff7c0a;   // Primary CTA, active states, selected pills
$color-brand-orange-hover: #d55a00;   // Hover/pressed state
$color-brand-orange-light: #fef7f0;   // Tinted background on hover (orange tint)
$color-brand-orange-glow:  rgba(255, 124, 10, 0.1);  // Focus ring / shadow

// Note: hero.scss references #FF6B35 as an "All Cuisines" selected state — 
// this is a slight variant of the main orange. ⚠️ Inconsistency flag.

// Text Colors
$color-gray-800: #31343F;   // Primary text / headings
$color-body-text: #494D5D;  // Secondary / body text
$color-muted-text: #6b7280; // Muted / label text
$color-subtle-text: #9ca3af; // Placeholder / very subdued

// UI Colors
$color-white: #ffffff;
$color-off-white: #FCFCFC;  // Navbar button background
$color-surface-alt: #f8f9fa; // Alt surface (modal headers, palate selection bg)
$color-bg-light: #f9fafb;    // Reviews section background

// Border Colors
$color-border: #e5e7eb;      // Default borders
$color-border-medium: #CACACA; // Navbar bottom border, dropdown borders

// Legacy / Deprecated
$color-primary: #ff5a5f;    // ⚠️ SCSS variables file still contains old Airbnb red
                             //    Not used in any visible component. Remove or replace.
```

### 2.4 Semantic Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Brand / Primary CTA** | Orange | `#ff7c0a` | Buttons, active nav, selected states, search submit, tags |
| **Brand hover** | Dark orange | `#d55a00` | Hover state for all orange elements |
| **Primary text** | Dark charcoal | `#31343F` | Headings, primary labels |
| **Body text** | Mid charcoal | `#494D5D` | Body copy, nav items, secondary labels |
| **Muted text** | Cool gray | `#6b7280` | Labels, timestamps, placeholder-adjacent text |
| **Subtle text** | Light gray | `#9ca3af` | Placeholders, disabled hints |
| **Star/rating** | Amber | `#f59e0b` | Star icons (Tailwind `amber-400`) |
| **Destructive** | System red | via CSS var | Error states |
| **Background** | White | `#ffffff` | Page, cards, modals |
| **Alt surface** | Near-white | `#f8f9fa` / `#f9fafb` | Section backgrounds, modal sub-headers |
| **Border** | Light gray | `#e5e7eb` | All dividers, input borders |
| **Nav border** | Warm gray | `#CACACA` | Navbar bottom rule |

> ⚠️ **Inconsistency:** `#ff5a5f` (Airbnb red) remains in `src/styles/base/_variables.scss` as `$color-primary` but is never rendered anywhere in the current UI. The actual brand primary is `#ff7c0a`. The SCSS variable should be renamed or removed to avoid confusion.

> ⚠️ **Inconsistency:** `#FF6B35` appears in `_navbar.scss` for the "All Cuisines" selected button state — a slightly different orange to the main `#ff7c0a`. Consolidate to a single brand orange token.

### 2.5 Dark Mode Status

```
Configured: ✅  (darkMode: ["class"] in tailwind.config.ts)
CSS variables: ✅ (--background / --foreground switch at media query)
Component-level dark styles: ❌ (not implemented)
```
Dark mode is infrastructure-ready but visually unstyled beyond page background/foreground. All hardcoded hex values in SCSS would need dark-mode overrides to complete the implementation.

---

## 3. Typography

### 3.1 Font Families

Two font families are used throughout the product:

```scss
// src/styles/base/_typography.scss

// PRIMARY BRAND FONT — all headings, navigation, UI labels, buttons
$font-neusans: "Neusans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont;
// Weights available: 300, 400, 450 (Book), 500, 700, 900
// Styles: normal, italic for all weights

// BODY / PROSE FONT — body text, paragraphs, links, form fields
$font-inter: "Inter", sans-serif;
// Loaded as variable font (InterVF.woff)
```

**Tailwind aliases:**
```ts
fontFamily: {
  sans:    ["Neusans", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
  neusans: ["Neusans", ...],  // explicit alias
  inter:   ["Inter", "sans-serif"],
}
```

### 3.2 Typographic Role Assignment

| Role | Font | Class/Usage |
|------|------|-------------|
| All headings (`h1`–`h6`) | Neusans | `font-neusans`, `font-weight: 400 !important` (see note) |
| Navigation items | Neusans | `.navbar__nav-item`, `font-neusans` class |
| Buttons | Neusans | `font-neusans font-normal` in button CVA |
| Body paragraphs | Inter | Default `body` font-family |
| Links (`a`) | Inter | Default in `global.scss` |
| Review card text | Inter / Neusans mixed | Card text uses Inter sizing classes, username uses Neusans |
| Modal titles | Neusans | `.navbar__palate-modal-title` |
| Badges/tags | Neusans | Selected cuisine pills |

> **Note on font-weight override:** The global rule `h1–h6 { font-weight: 400 !important; }` forces all headings to regular weight. This is intentional — Neusans Regular at large sizes is the brand aesthetic. Individual components that need heavier weight (e.g., modal titles) must override with `font-weight: 600` or a specific class.

### 3.3 Type Scale

Sizes found across the codebase (no formal token scale is defined — these are observed values):

| Role | Size (desktop) | Size (mobile) | Class/Source |
|------|---------------|---------------|--------------|
| Hero title | `1.875rem` (30px) | `1.25rem` (20px) | `hero__title` |
| Hero description | `1.125rem` (18px) | `0.75rem` (12px) | `hero__description` |
| Section title | `1.5rem` (24px) | `1.25rem` (20px) | `reviews__title` |
| Section subtitle | `1rem` (16px) | `0.75rem` (12px) | `reviews__subtitle` |
| Navbar nav items | `13px` | hidden | `navbar__nav-item` |
| Modal title (large) | `24px` | `20px` | `navbar__palate-modal-title` |
| Location modal title | `1rem` (16px) | `20px` | `navbar__location-modal-title` |
| Button text | `0.8125rem` (13px) small; `0.875rem` (14px) default; `1rem` (16px) large | same | button CVA |
| Card username | `0.75rem` (12px) | `0.7rem` | `review-card__username` |
| Card body text | `12px`–`14px` | `12px` | `review-card__text` |
| Rating counter | `0.8rem` | `0.7rem` | `.rating-counter` |
| Input text | `sm` (14px) | same | `Input` component |
| Search input | `13px` navbar / `16px` hero | `13px` / `15px` | SCSS |
| Caption / metadata | `0.75rem` (12px) | `0.75rem` | `review-card__timestamp` |

> ⚠️ **No formal type scale token system exists.** Sizes are set ad hoc in SCSS and Tailwind classes. For the mobile app, consider establishing a formal scale: `xs` (12px), `sm` (14px), `base` (16px), `lg` (18px), `xl` (20px), `2xl` (24px), `3xl` (30px).

### 3.4 Line Heights

```css
/* Observed values */
line-height: 1.2;   /* hero title — tight */
line-height: 1.5;   /* review card body — comfortable */
line-height: 1.6;   /* hero description — prose */
line-height: 1.4;   /* mobile body — slightly tighter */
```

### 3.5 Text Styles for States

```scss
// Links
a { color: #31343F; text-decoration: none; font-family: Inter; }
a:hover { text-decoration: underline; }

// Placeholder text
::placeholder { color: #9ca3af; }

// Disabled inputs
.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

// Muted / secondary text
.text-muted-foreground { /* resolves to slate-400 equivalent via CSS var */ }
```

### 3.6 Letter Spacing

Only seen in one specific context:

```scss
// Badge/pill ALL-CAPS text
text-transform: uppercase;
letter-spacing: 0.5px;  // navbar__palate-modal-all-badge
```

No general letter-spacing scale is defined.

---

## 4. Spacing & Layout

### 4.1 SCSS Spacing Variables

```scss
// src/styles/base/_variables.scss
$spacing-base: 0.5rem;   // 8px
$spacing-2:    1rem;     // 16px
$spacing-4:    1.5rem;   // 24px
$spacing-8:    2.5rem;   // 40px
$spacing-12:   3.5rem;   // 56px
```

> **Note:** These SCSS variables are defined but rarely referenced in components — most spacing uses Tailwind utilities directly (`p-6`, `gap-2`, `px-4`, etc.). The variables are underutilized.

### 4.2 Breakpoints

```scss
// SCSS breakpoints
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;

// Tailwind defaults (also active via Tailwind config — not overridden)
// sm: 640px | md: 768px | lg: 1024px | xl: 1280px | 2xl: 1536px
```

The **primary mobile breakpoint is 768px** (`md`). Content below this is "mobile", above is "desktop". The bottom navigation bar renders only when `window.innerWidth < 768`.

### 4.3 Container / Max Widths

```scss
$container-max: 1200px;          // SCSS variable (rarely used directly)
max-width: 80rem;   /* 1280px */ // Navbar container, hero container, reviews container
max-width: 900px;                // Reviews grid container (tighter)
max-width: 500px;                // Navbar search bar
max-width: 650px;                // Hero search bar
max-width: 700px;                // Palette/location modal (desktop)
```

### 4.4 Layout Patterns

#### Navbar (`position: fixed`, `z-index: 1000`)
```
height: 60px (desktop) / 3.5rem (mobile)
padding: 0 0.5rem → 0 0.75rem (sm) → 0 (xl)
max-width: 80rem, centered
```

#### Bottom Navigation (`position: fixed`, `z-index: 50`)
```
Mobile only (< 768px)
height: auto + safe-area-inset-bottom
pb: max(10px, env(safe-area-inset-bottom) + 10px)
Hide/show on scroll (translate-y-full → translate-y-0)
```

#### Hero Section
```
padding: 8rem 0 6.5rem (desktop) / 5rem 0 3.5rem (mobile)
background-image: cover, 70% center (desktop) / left top (mobile)
max-width: 80rem
```

#### Reviews Grid
```
1 col (mobile) → 2 col (sm 640px) → 3 col (lg 1024px) → 4 col (xl 1280px)
gap: 1rem
container max-width: 900px
```

#### Modals (palate, location)
```
Full-screen overlay: rgba(0,0,0,0.5) + backdrop-filter: blur(4px)
Mobile: bottom sheet, border-radius: 24px 24px 0 0, max-height: 90–95vh
Desktop: centered, max-width: 700px, border-radius: 24px
Animation: fade-in (opacity 0→1), 0.3s ease-in
```

### 4.5 Z-Index Layers

| Layer | Z-Index | Element |
|-------|---------|---------|
| Bottom nav | `50` | `BottomNav` fixed bar |
| Navbar | `1000` | `Navbar` fixed |
| Modals / overlays | `9999` | Palate, location, auth modals |

> ⚠️ **Gap:** No formal z-index token system. Values are magic numbers. Recommend defining a scale in `constants/zIndex.ts` or as CSS custom properties.

### 4.6 Common Padding/Gap Values

From Tailwind classes observed in components:

```
Content padding:  p-6 (24px), p-3.5 (14px), px-8 py-3 (button default)
Card padding:     p-6 header, p-6 pt-0 content, p-6 pt-0 footer
Gap between items: gap-2 (8px), gap-4 (16px), gap-12 (48px — large navbar auth gap)
Grid gaps:        gap-1 (4px rating), gap-0.75rem (card grid)
```

---

## 5. Component Styles

### 5.1 Button

**CVA base:**
```ts
"inline-flex items-center justify-center whitespace-nowrap rounded-[50px] 
 text-sm font-neusans font-normal transition-all duration-200 
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 
 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
```

**Variants:**

| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| `default` | `bg-primary` (CSS var) | `text-primary-foreground` | none | `bg-primary/90` |
| `primary` | `#ff7c0a` | white | `1px solid #ff7c0a` | bg `#d55a00`, border `#d55a00` |
| `secondary` | white | `#494D5D` | `1px solid #494D5D` | bg `#F1F1F1` |
| `destructive` | `bg-destructive` | `text-destructive-foreground` | none | `bg-destructive/90` |
| `outline` | `bg-background` | `text-accent-foreground` on hover | `border-input` | `bg-accent` |
| `ghost` | transparent | inherit | none | `bg-accent text-accent-foreground` |
| `link` | transparent | `text-primary` | none | underline |

**Sizes:**

| Size | Padding | Text |
|------|---------|------|
| `default` | `px-8 py-3` (32px/12px) | `text-sm` (14px) |
| `sm` | `px-6 py-2` (24px/8px) | `text-xs` (12px) |
| `lg` | `px-10 py-4` (40px/16px) | `text-base` (16px) |
| `icon` | — | `h-10 w-10` (40×40px) |

**Haptic integration:** Every button variant maps to a haptic preset automatically (`primary→success`, `destructive→warning`, `ghost/link→selection`, etc.).

**Border radius:** `rounded-[50px]` — fully pill-shaped on all sizes.

**Transition:** `transition-all duration-200`.

**SCSS button (navbar variant — separate implementation):**
```scss
.navbar__button {
  padding: 0.3125rem 0.625rem;
  border-radius: 3.125rem; /* pill */
  font-size: 0.8125rem;
  font-weight: 400;
  transition: all 0.2s ease;
}
```
> ⚠️ **Inconsistency:** Two button implementations coexist — the `Button` component (CVA) and the SCSS `.navbar__button`. They share the pill radius but differ in padding, font-size, and hover behavior. These should be unified.

---

### 5.2 Input

```tsx
// Default classes
"flex h-10 w-full rounded-md border border-input bg-background 
 px-3 py-2 text-sm ring-offset-background 
 file:border-0 file:bg-transparent file:text-sm file:font-medium 
 placeholder:text-muted-foreground 
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 
 focus-visible:ring-offset-2 
 disabled:cursor-not-allowed disabled:opacity-50"
```

| Property | Value |
|----------|-------|
| Height | `h-10` (40px) |
| Border radius | `rounded-md` (`calc(var(--radius) - 2px)`) |
| Border | `border-input` (CSS var) |
| Background | `bg-background` |
| Text | `text-sm` (14px) |
| Focus ring | `ring-2 ring-ring ring-offset-2` |
| Placeholder | `text-muted-foreground` |
| Disabled | `opacity-50 cursor-not-allowed` |

**Autofill override (SCSS):**
```scss
.auth__input:-webkit-autofill {
  box-shadow: 0 0 0px 1000px white inset !important;
  -webkit-text-fill-color: #000 !important;
  transition: background-color 5000s ease-in-out 0s;
}
```

**Search bar input (SCSS, bespoke):**
```scss
/* Navbar search */
border: 1px solid #e5e7eb;
border-radius: 20px;
padding: 6px 12px;
:focus-within { border-color: #ff7c0a; box-shadow: 0 0 0 3px rgba(255,124,10,0.1); }

/* Hero search */
border: 2px solid #e5e7eb;
border-radius: 32px;
padding: 12px 20px;
:focus-within { border-color: #ff7c0a; box-shadow: 0 0 0 4px rgba(255,124,10,0.1); }
```

---

### 5.3 Card

**Base (CVA):**
```ts
"rounded-lg border bg-card text-card-foreground shadow-sm"
```

**Variants:**

| Variant | Extra class |
|---------|-------------|
| `default` | `border-border` |
| `outlined` | `border-2` |
| `elevated` | `shadow-md` |

**Subcomponents:**
```
CardHeader  → p-6, flex col, space-y-1.5
CardTitle   → text-2xl font-semibold leading-none tracking-tight
CardDescription → text-sm text-muted-foreground
CardContent → p-6 pt-0
CardFooter  → flex items-center p-6 pt-0
```

**Review card (`.review-card`, SCSS):**
```scss
background: white;
border-radius: 0.5rem (desktop) / 0.75rem (mobile);
overflow: hidden;
/* No box-shadow — commented out */

.__image: rounded-2xl, aspect via min/max-height constraints
  min-h: 233px / max-h: 236px (mobile)
  min-h: 228px / max-h: 405px (desktop)

.__user-image: 32×32px circle (28×28 mobile)
```

---

### 5.4 Navigation — Bottom Nav

```
Fixed bottom, z-50
bg-white, border-t border-gray-200
Safe area padding: pb-[max(10px,calc(env(safe-area-inset-bottom)+10px))]
font-neusans

Active item color:  #ff7c0a
Inactive item:      text-gray-600 / gray-600
Active indicator:   absolute top-0, w-8, h-0.5, bg-[#ff7c0a], rounded-full
Icon size:          w-6 h-6 (24×24px)
Scroll behavior:    hide on scroll-down (translate-y-full), show on scroll-up (translate-y-0)
Transition:         duration-300 ease-in-out
```

---

### 5.5 Navigation — Navbar (Desktop)

```scss
.navbar {
  position: fixed;
  top: 0;
  height: 60px; /* desktop */
  height: 3.5rem; /* mobile */
  font-family: "Neusans";
  background: white (default) / transparent (landing page, before scroll)
  border-bottom: 1px solid #CACACA (when not transparent)
  z-index: 1000;
  transition: opacity 0.3s ease-out, visibility 0.3s ease-out;
}
```

**Nav items:**
```
font-size: 13px
color: #31343F
padding: 6px 10px
border-radius: 6px
hover: color #ff7c0a
active: color #ff7c0a
```

**Dropdown menus (popover):**
```
bg-white, rounded-2xl, min-w-200px
border: 1px solid #CACACA (non-transparent context)
Items: pl-3.5 pr-12 py-3.5, hover:bg-[#ff7c0a]/10, transition-colors
```

---

### 5.6 Pills / Tags (Cuisine & Location Selectors)

```scss
/* Default state */
border: 2px solid #e5e7eb;
border-radius: 24px;
padding: 12px 16px;
background: white;
font-size: 14px;
color: #31343F;

/* Hover */
border-color: #ff7c0a;
background: #fef7f0;  /* warm orange tint */

/* Selected */
border-color: #ff7c0a;
background: #ff7c0a;
color: white;

/* Selected hover */
background: #d55a00;
border-color: #d55a00;

transition: all 0.2s ease;
```

---

### 5.7 Border Radius Scale

Defined in `tailwind.config.ts` via CSS variable `--radius`:

```ts
borderRadius: {
  lg: "var(--radius)",                  // default: ~8px (shadcn slate base)
  md: "calc(var(--radius) - 2px)",      // ~6px
  sm: "calc(var(--radius) - 4px)",      // ~4px
}
```

**Hard-coded radii observed in code:**

| Radius | Usage |
|--------|-------|
| `rounded-[50px]` | All buttons (pill) |
| `rounded-2xl` (16px) | Review card images, dropdown menus, navbar modals |
| `rounded-full` | Avatar images (circles), search button, active indicator dots |
| `24px` | Pill selectors, modal borders on desktop |
| `32px` | Hero search bar |
| `20px` | Navbar search bar |
| `16px` | Location modal on desktop |
| `12px` | Country/city cards in location modal |
| `8px` | Input, some utility buttons |
| `6px` | Navbar nav items, mode toggle button |
| `50%` | Close buttons in modals |

> ⚠️ **No shadow scale is defined.** Only `shadow-sm` (from `card` CVA base) and occasional `shadow-md` are used. A scale is suggested in §9.

---

### 5.8 Modals / Overlays

```
Overlay:   rgba(0,0,0,0.5) + backdrop-filter: blur(4px)
Z-index:   9999

Bottom-sheet (mobile):
  border-radius: 24px 24px 0 0
  max-height: 90–95vh
  animation: fade-in 0.3s ease-in (opacity 0→1)
  Sticky header + sticky footer actions

Centered modal (desktop):
  border-radius: 24px
  max-width: 700px
  max-height: 85vh
  animation: slide-in 0.3s ease-out (opacity + translateY(-20px) + scale(0.95) → 1 + 0 + 1)
```

---

## 6. Iconography & Imagery

### 6.1 Icon Library

Primary: **React Icons** (`react-icons`)

| Subset | Prefix | Used for |
|--------|--------|---------|
| Feather Icons | `fi` | Bottom nav (Home, Compass, User, PlusSquare), general UI |
| Phosphor Icons | `pi` | Caret-down in navbar dropdown |
| Material Design | `md` | Back arrow (`MdArrowBackIos`) |

**Sizing:**
```
Bottom nav icons:   w-6 h-6 (24×24px)
Inline UI icons:    w-4 h-4 (16×16px) — caret, close
Modal close icons:  w-20px h-20px
Search icon:        18×18px (hero), 16×16px (navbar)
Star icon:          16×16px (desktop), 12×12px (mobile)
```

**Color rules:**
- Inactive icons: `text-gray-600`
- Active icons: `text-[#ff7c0a]`
- UI icons: `color: #6b7280` (muted gray)
- Search button icon: `color: white` (on orange bg)

### 6.2 Image Handling

```tsx
// All images use Next.js <Image> component or custom <FallbackImage>
// FallbackImage wraps Image with a fallback src for broken URLs

// Avatar images
width: 32, height: 32 (28px mobile)
className: "rounded-full object-cover"

// Review card images
className: "rounded-2xl object-cover"
min-h: 233px / max-h: 236px (mobile portrait)
min-h: 228px / max-h: 405px (desktop)

// Hero background
background-image: url('/images/hero-bg.png')
background-size: cover
background-position: 70% center

// Country/region flags
width: 20px / height: 15px
object-fit: cover
border-radius: 2px
```

**Optimization:**
- Image format: Next.js automatic (AVIF → WebP)
- Server-side Sharp processing for uploads (AVIF-first with WebP fallback)
- `font-display: swap` on all custom fonts

---

## 7. Animation & Motion

### 7.1 Transition Defaults

The codebase has a consistent, restrained motion vocabulary:

| Duration | Easing | Used for |
|----------|--------|---------|
| `0.2s ease` | CSS ease | Most hover interactions (buttons, pills, cards, icons, nav items) |
| `0.3s ease` | CSS ease | Navbar scroll background, search bar focus expand |
| `0.3s ease-in` | CSS ease-in | Modal fade-in (opacity only) |
| `0.3s ease-out` | CSS ease-out | Navbar hide (opacity + visibility), BottomNav show/hide (transform) |
| `300ms ease-in-out` | CSS ease-in-out | BottomNav translate-y (Tailwind `duration-300`) |
| `200ms` | — | Button `transition-all` (Tailwind `duration-200`) |

**Tailwind plugin:** `tailwindcss-animate` is installed, enabling `animate-*` utility classes for entrance/exit animations. No specific `animate-*` usages were found in inspected files — the plugin is available but underutilized.

### 7.2 Keyframe Animations

```scss
/* Bottom-sheet modal entrance (palate, location) */
@keyframes navbar__palate-modal-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
animation: 0.3s ease-in;

/* Desktop modal entrance (location) */
@keyframes navbar__location-modal-slide-in {
  from { opacity: 0; transform: translateY(-20px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
animation: 0.3s ease-out;
```

### 7.3 Scroll-Triggered Behaviors

```
Navbar:
  Scroll > 64px → navBg=true → bg-white + border (landing page mode)
  Implemented via: window.addEventListener("scroll", ...) in useEffect

BottomNav:
  Scroll down > 100px → translate-y-full (hidden)
  Scroll up         → translate-y-0 (shown)
  Near footer (100px from bottom) → always hide
  Transition: duration-300 ease-in-out
  Uses passive event listener for performance.

Review/Studio navbar:
  body.review-screen-open → navbar opacity:0, visibility:hidden (0.3s)
  Hides both navbar and bottom nav when full-screen review viewer opens
```

### 7.4 Micro-interactions

```
Search bar focus:
  border-color → #ff7c0a
  box-shadow → 0 0 0 3px/4px rgba(255,124,10,0.1)
  Navbar variant also applies: transform: scale(1.02) + max-width expansion

Search button hover:
  background → #d55a00
  transform: scale(1.05)

Pill/tag hover:
  border-color → #ff7c0a
  background → #fef7f0

Card hover (country/city cards):
  transform: translateY(-1px)
  box-shadow: 0 4px 12px rgba(255,124,10,0.1)

Search mode toggle active:
  transform: scale(0.95)
```

### 7.5 Haptic Feedback

A full haptic system is implemented via `web-haptics` with Vibration API fallback:

```ts
// Presets and patterns
light:     8ms
medium:    15ms
success:   [10, 30, 10]    // double pulse
warning:   [15, 20, 15]    // stronger double
error:     [20, 10, 20, 10, 20]  // triple
selection: 5ms             // subtle

// Variant → haptic mapping (Button component)
primary:     "success"
destructive: "warning"
outline:     "selection"
ghost:       "selection"
link:        "selection"
default:     "light"
```

### 7.6 Loading States

- **Skeleton screens:** A `skeleton.tsx` component exists in `src/components/ui/` but could not be fetched. Standard shadcn skeleton (pulse animation) is assumed.
- **Upload progress:** Single global progress bar via `UploadContext` (not stacked toasts) — enforced by code convention.
- **Spinners:** Not found in inspected files. Likely uses Tailwind's `animate-spin` on an SVG icon where needed.

> ⚠️ **No formal loading state system** was found across inspected components. Recommend documenting skeleton patterns centrally.

### 7.7 PWA / Native Feel

```scss
/* Prevent iOS bounce scroll */
html { overscroll-behavior-y: contain; }  /* PWA standalone */
body  { overscroll-behavior: none; }       /* always */

/* Disable tap highlight */
body { -webkit-tap-highlight-color: transparent; }

/* Touch action */
body { touch-action: manipulation; }

/* Hide scrollbar (utility class) */
.hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
```

---

## 8. Accessibility (a11y)

### 8.1 Focus States

```ts
// Button component
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Input component  
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

Focus rings use the CSS-var `--ring` token (resolves to a blue/slate tone from shadcn's slate base). The brand orange is not used for focus rings — this is consistent with best practice (the ring contrasts with the page, not the element).

### 8.2 ARIA Patterns

```tsx
// Navigation
<nav aria-label="..."> (bottom nav — no explicit label found; improvement opportunity)

// Modal
<button aria-label="Toggle navigation">
  <svg aria-hidden="true" ...>  // decorative icon pattern

// Image alt text
alt={data.author?.node?.name || "User"}    // contextual
alt="Review"                               // ⚠️ generic — should describe content
alt="TastyPlates Logo"
```

### 8.3 Semantic HTML

- Navbar uses `<nav>` element ✅
- Heading hierarchy uses `h1`–`h3` in observed components ✅
- Buttons are `<button>` elements (not `<div>` with onClick) ✅
- Links are `<Link>` (Next.js `<a>`) elements ✅

### 8.4 Color Contrast Concerns

> ⚠️ **Potential contrast issues to verify:**
> - `#9ca3af` (placeholder/subtle text) on white: ~2.8:1 — **fails WCAG AA** for small text (needs ≥4.5:1)
> - `#6b7280` (muted text) on white: ~4.6:1 — **passes AA** for normal text
> - `#494D5D` on white: ~6.4:1 — **passes AA** ✅
> - `#31343F` on white: ~12:1 — **passes AAA** ✅
> - White text on `#ff7c0a`: ~3.0:1 — **fails AA** for small text (14px button text)

The placeholder color (`#9ca3af`) and white-on-brand-orange fail WCAG 2.1 AA for small text. These should be reviewed for accessibility compliance.

### 8.5 Reduced Motion

No `@media (prefers-reduced-motion)` overrides were found in the codebase.

> ⚠️ **All animations and transitions should be wrapped in a reduced-motion check.** Recommend:
> ```css
> @media (prefers-reduced-motion: reduce) {
>   *, *::before, *::after {
>     animation-duration: 0.01ms !important;
>     transition-duration: 0.01ms !important;
>   }
> }
> ```

### 8.6 Skip Links

No skip link (`<a href="#main">Skip to content</a>`) was found in `layout.tsx`.

> ⚠️ **Missing:** Add a visually-hidden skip link as the first element in `<body>` for keyboard users.

---

## 9. Missing Pieces & Recommended Defaults

| Gap | Recommendation |
|-----|---------------|
| **Shadow scale** | Not defined. Suggest: `shadow-sm` (0 1px 2px rgba(0,0,0,0.05)), `shadow-md` (0 4px 6px rgba(0,0,0,0.07)), `shadow-lg` (0 10px 15px rgba(0,0,0,0.1)), `shadow-brand` (0 4px 12px rgba(255,124,10,0.15)) |
| **Type scale tokens** | Ad hoc px values throughout. Define a token scale in Tailwind config: `xs-12px, sm-14px, base-16px, lg-18px, xl-20px, 2xl-24px, 3xl-30px` |
| **Z-index tokens** | Magic numbers in code. Define: `z-nav:50, z-navbar:1000, z-modal:9999` in `constants/zIndex.ts` or CSS vars |
| **Dark mode** | Infrastructure exists but no component dark styles. Either complete it or remove `darkMode: ["class"]` to avoid false expectations |
| **Reduced motion** | No `prefers-reduced-motion` support anywhere. Add a global reset |
| **Skip link** | Missing accessibility affordance for keyboard/screen reader users |
| **Skeleton pattern** | Skeleton component exists but no documented usage pattern |
| **Globals.css token block** | The shadcn HSL token values (`:root { --primary: ...; }`) are not in the repo — must be regenerated with `npx shadcn-ui init` |
| **SCSS variable cleanup** | `$color-primary: #ff5a5f` is stale and misleading. Remove or rename |
| **Orange variant consolidation** | `#ff7c0a` vs `#FF6B35` — merge to a single brand token |
| **Generic image alt text** | `alt="Review"` is not descriptive. Use restaurant name or reviewer name |

---

## 10. UI Personality Summary

> **"Warm, social, and mobile-native — an Instagram-meets-Airbnb food discovery experience with a premium feel achieved through restraint rather than decoration."**

**Character traits extracted from code:**

- **Orange-forward.** `#ff7c0a` is the soul of the product — it appears on every CTA, every selected state, every active icon. It's warm, appetizing, and unmistakably branded.

- **Pill-obsessed.** Every button, every tag, every pill selector uses `border-radius: 50px` or `24px`. The product has deliberately rejected rectangular UI — every interactive element feels soft and tap-friendly.

- **Typography-as-brand.** The custom **Neusans** typeface at `font-weight: 400` (regular) for headings is an unusual, confident choice. Most products use bold headings — Tastyplates uses elegant regular-weight display type, giving it a refined editorial quality.

- **Mobile-first, native-feeling.** Haptic feedback, safe-area insets, pull-to-refresh overrides, scroll-lock management, tap-highlight removal, and `touch-action: manipulation` — this is a web product that works hard to feel like a native app.

- **Quietly social.** The bottom navigation, following feed, review cards, and user avatar links echo the social media patterns users know from Instagram and TikTok — but deliberately stripped of vanity metrics. No follower counts in the nav, no algorithmic clutter.

- **Photo-forward.** Review cards are dominated by tall portrait images (`min-h: 233px`) with minimal text below. The visual experience is the product.

- **Confident restraint.** No gradients, no decorative illustrations, no complex shadows. The visual vocabulary is clean: white surfaces, a warm gray for text, `#ff7c0a` for everything that matters. This is not a minimal product — it's a focused one.

---

## 11. Mobile app patterns (React Native)

> **Runtime tokens:** [`constants/brand.ts`](../constants/brand.ts) — `BRAND_PRIMARY`, `TEXT_HEADING`, `TEXT_BODY`, `TEXT_MUTED`, `BORDER_SUBTLE`, `RATING_STAR`.  
> **Feature spec:** [`documentation/functions/palate-search-v1.md`](functions/palate-search-v1.md).

### 11.1 `PalateSearchBar`

| Property | Value |
|----------|--------|
| Container | `rounded-2xl`, border `#f3f4f6`, white bg, optional `shadow-sm` |
| Inner track | `rounded-xl`, `bg-gray-50`, min height **48px** |
| Search button | 40×40 circle, `#ff7c0a` (disabled `#d1d5db`) |
| Modes | **cuisine** (tappable palate field) / **keyword** (`TextInput`) |

### 11.2 `PalateFilterChip`

| Property | Value |
|----------|--------|
| Shape | `rounded-full` |
| Surface | `bg-orange-50/90`, border `border-orange-100` |
| Dismiss | `close-circle` icon, brand orange |

### 11.3 `RestaurantBrowseCard`

| Variant | Image | Meta block |
|---------|-------|------------|
| `list` | `h-44` cover, full width | Row A: title + overall `RatingDisplay` (`sm`) top-right. Row B: `street, city` (`formatRestaurantCardAddress`). Row C: horizontal palate chips. Row D (optional): Search score when `?palate=` |
| `carousel` | flex ratio 3:2 | Compact `text-xs` title + `RatingDisplay` `xs` right; 1-line address; max 2 palate chips + `+N` |

**Address:** `146 Front St W, Toronto` via [`formatRestaurantCardAddress`](../services/restaurantsV2Service.ts) — `listing_street` or `address.street_address` + `address.city`; skips duplicate city suffix.

**Palate chips:** [`restaurantPalateDisplayLabels`](../lib/restaurantPalates.ts) — neutral `#f2f2f2` pills; active filter chip uses `#fef7f0` + `2px` `BRAND_PRIMARY` border.

**Ratings:** Overall average top-right on list cards; palate-filtered Search score on its own line below chips (`Japanese ★ 4.3`, `RatingDisplay` with `label`).

### 11.4 `RestaurantRatingMetric` (detail row)

| Property | Value |
|----------|--------|
| Column min-width | **132px** |
| Score | `text-2xl font-bold` |
| Review count badge | 20px circle, `#ff7c0a` bg, white 10px text |
| Divider | 1px `#CACACA` |
| Locked state | `lock-closed-outline`, 24px, `#9ca3af` |

### 11.5 Palate context banner

When `?palate=` is active on restaurant detail:

- `rounded-xl`, `border-orange-100`, `bg-orange-50/90`
- Copy: “Showing scores for **{label}**” (`text-xs`)

### 11.6 `RatingDisplay` (canonical inline rating)

**Component:** [`components/ui/RatingDisplay.tsx`](../components/ui/RatingDisplay.tsx)  
**Helpers:** [`lib/ratingDisplayUtils.ts`](../lib/ratingDisplayUtils.ts) — `formatRatingValue`, `hasDisplayableRating`  
**Token:** `RATING_STAR_INK` (`#171717`) for the star character; score text uses `TEXT_HEADING`.

| Size | Star | Score | Use |
|------|------|-------|-----|
| `xs` | 11px | 12px medium | Home review grid, following feed, detail review previews |
| `sm` | 12px | 12px medium | Restaurant browse carousel + list |
| `md` | 14px | 16px semibold | Review detail viewer header |

**Restaurant cards:** `★ 4.2 (12)` via `<RatingDisplay size="sm" value={rating} reviewCount={12} />` — short count in parentheses, no “reviews” word.

**Search score line (palate filter):** `<RatingDisplay size="sm" value={searchScore} label="Japanese" />` → `Japanese ★ 4.3`.

**When to use:** Review cards, restaurant tiles, feed headers, review viewer.

**When not to use:** [`RestaurantRatingMetricsRow`](../components/restaurant/RestaurantRatingMetricsRow.tsx) (large aggregate metrics with orange count badges). Do not use amber `RATING_STAR` or orange filled pills for new inline ratings.

```tsx
import { RatingDisplay } from '@/components/ui/RatingDisplay'

<RatingDisplay size="xs" value={review.rating} className="ml-auto" />
<RatingDisplay size="sm" value={4.2} reviewCount={12} />
```

### 11.7 `ArticleCategoryTag` (canonical category pill)

**Component:** [`components/articles/ArticleCategoryTag.tsx`](../components/articles/ArticleCategoryTag.tsx)  
**Tokens:** `BRAND_PRIMARY` (label), `ARTICLE_CATEGORY_BG` (`#fef7f0`, inline variant only).

Shared typography: `10px`, semibold, uppercase, `tracking-wide`. Container: `rounded-full`, `px-2.5`, `py-1`.

| Variant | Background | Use |
|---------|------------|-----|
| `overlay` | `bg-white/95` | Category on article card hero (home Articles section) |
| `inline` | `ARTICLE_CATEGORY_BG` | Article detail header above title |

```tsx
import { ArticleCategoryTag } from '@/components/articles/ArticleCategoryTag'

<ArticleCategoryTag category={article.category} variant="overlay" className="absolute bottom-2 left-2" />
<ArticleCategoryTag category={article.category} className="mb-2 self-start" />
```