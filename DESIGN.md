---
name: CRATE
description: A quiet, terminal-native light UI for a polyglot e-commerce storefront and admin.
colors:
  bg: "#f1f1f6"
  surface: "#fbfbfe"
  elevated: "#e8e8f0"
  border: "#dcdce6"
  border-strong: "#c4c4d8"
  accent: "#d97706"
  accent-dim: "#b45309"
  text: "#1c1c27"
  text-muted: "#6b6b80"
  text-faint: "#9999ad"
  text-placeholder: "#b6b6c8"
  status-pending: "#b45309"
  status-confirmed: "#1d4ed8"
  status-shipped: "#6d28d9"
  status-delivered: "#15803d"
  status-cancelled: "#b91c1c"
typography:
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.2em"
  data:
    fontFamily: "ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#000000"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-dim}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.elevated}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  badge:
    backgroundColor: "{colors.border}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: CRATE

## 1. Overview

**Creative North Star: "The Quiet Console"**

CRATE reads like a well-built internal tool that happens to sell things: a paper-white surface, cool slate-violet neutrals, and a single warm amber signal reserved for the moments that matter (price, primary action, "you are here"). Inter carries every word; monospace is held back for the things that are actually data, prices, order IDs, the `CRATE` wordmark, so the UI never confuses decoration with information.

This system explicitly rejects the generic admin-template look (sidebar-plus-cards with no point of view), the bright SaaS gradient aesthetic (gradient text, glassmorphism-as-default, hero-metric blocks), and identical icon-heading-text card grids repeated endlessly. Storefront and admin share the same components at two densities rather than splitting into separate visual languages.

**Key Characteristics:**
- Paper-white, violet-tinted light surface with three tonal steps (bg / surface / elevated)
- One accent color (amber), used sparingly and consistently
- Inter for all UI text; monospace exclusively for prices, IDs, and the wordmark
- Flat by default, no shadows, depth via tonal layering and a single backdrop-blur header
- Full borders only, 1px, never colored side-stripes

## 2. Colors

A restrained palette: cool, violet-tinted paper neutrals carry almost everything, with one warm accent breaking through and a small set of muted semantic tones reserved for order-status badges.

### Primary
- **Warm Amber Signal** (`#d97706`): the single accent. Used for prices, primary button backgrounds, the active nav indicator's underlying state, focus rings (at low opacity), and the cart-count bubble. Text-on-accent is pure black for maximum contrast.
- **Warm Amber Signal, Dimmed** (`#b45309`): hover state for primary buttons and active/sign-out hover text. Never used as a resting color.

### Neutral — Cool Slate Violet
- **Paper** (`#f1f1f6`): page background. The dimmest surface; everything else sits on top of it.
- **Surface** (`#fbfbfe`): card and panel backgrounds, one step lighter than Paper.
- **Elevated** (`#e8e8f0`): inputs, active nav items, hover backgrounds for ghost buttons, the cart-count bubble's resting state — the "currently interactive" tone, one step darker than Surface.
- **Border** (`#dcdce6`): all 1px borders at rest (cards, header, dividers, input outlines).
- **Border, Strong** (`#c4c4d8`): hover-state border for cards and ghost buttons.
- **Text** (`#1c1c27`): primary text, headings, active nav labels.
- **Text, Muted** (`#6b6b80`): secondary text, inactive nav labels, metadata (dates, item counts, "in stock").
- **Text, Faint** (`#9999ad`): tertiary text, e.g. "Sign in to order".
- **Text, Placeholder** (`#b6b6c8`): input placeholders, order-ID prefixes.

### Status (semantic, badges only)
- **Pending** (`#b45309`): amber-tinted badge, 12% background, 25% border.
- **Confirmed** (`#1d4ed8`): blue-tinted badge, same treatment.
- **Shipped** (`#6d28d9`): purple-tinted badge, same treatment.
- **Delivered** (`#15803d`): green-tinted badge, same treatment.
- **Cancelled** (`#b91c1c`): red-tinted badge and the danger button (background red at ~15% opacity, border at ~40%).

### Named Rules
**The Single Accent Rule.** Warm Amber Signal appears in exactly four places: prices, the primary button, the active nav state, and focus rings. It never decorates headings, borders, or backgrounds elsewhere. Its rarity is what makes it register as "signal".

**The Status-Stays-In-Badges Rule.** The five semantic status colors (pending/confirmed/shipped/delivered/cancelled) exist only inside `Badge` and the danger `Button` variant. They never appear as page backgrounds, headings, or nav states.

## 3. Typography

**Body Font:** Inter (with system-ui, sans-serif fallback)
**Label/Mono Font:** ui-monospace (with generic monospace fallback)

**Character:** Inter at regular and semibold weights does the talking; monospace is a small, deliberate accent that marks "this is data" wherever it appears.

### Hierarchy
- **Headline** (600, 1.875rem/30px, line-height 1.2, tracking -0.01em): top-level page titles ("Products", "Orders").
- **Title** (600, 1.5rem/24px, line-height 1.3): single-purpose screen headers (e.g. "Sign in").
- **Body** (400, 0.875rem/14px, line-height 1.5, max ~70ch): default UI text, descriptions, metadata.
- **Label** (600, 0.625rem/10px, letter-spacing 0.2em, uppercase): input labels, badge text, the `CRATE` wordmark's tracking style.
- **Data / Mono** (600, 1rem/16px, ui-monospace): prices, order IDs (`#a1b2c3d4`), the `CRATE` wordmark.

### Named Rules
**The Mono-for-Data Rule.** If a value is a price, an ID, or the wordmark, it's monospace and semibold. If it's a label, a sentence, or a heading, it's Inter. No exceptions, no mixing within a single line of text.

## 4. Elevation

Flat by default, no box-shadows anywhere. Depth comes from three tonal steps (Paper → Surface → Elevated) plus 1px borders, and from a single backdrop-blur on the sticky header (`bg-bg` at 95% opacity + `backdrop-blur-sm`), which is the only place translucency is used.

### Named Rules
**The Flat-by-Default Rule.** Surfaces never cast shadows. Depth is conveyed by moving across the Paper → Surface → Elevated steps and by border-strong on hover, never by `box-shadow`.

## 5. Components

### Buttons
- **Shape:** 8px radius (`rounded-md`), `active:scale-[0.97]` on press, `disabled:opacity-40`.
- **Primary:** Warm Amber Signal background, pure-black text, font-medium, hover → Amber Dimmed, focus-visible ring at `accent/40`. Padding scales by size (sm 12px/6px, md 16px/8px, lg 20px/10px).
- **Ghost:** transparent background, Text color, 1px Border, hover → Elevated background + Border-Strong outline. Used for secondary actions (sign out, in-cart state).
- **Danger:** Cancelled-red background at ~15% opacity, Cancelled-red text, ~40%-opacity red border, hover → ~25% background. Used only for destructive actions (cancel order).

### Badges
- **Style:** pill (`rounded-full`), Label typography (10px, uppercase, semibold, wide tracking), 8px horizontal / 2px vertical padding.
- **State:** `default` is Border-color background + Text-Muted; the five order-status variants use their semantic color at 12% background with a 25%-opacity border in the same hue.

### Cards / Containers
- **Corner Style:** 12px radius (`rounded-lg`).
- **Background:** Surface (`#fbfbfe`).
- **Shadow Strategy:** none — see Elevation. Hover state lightens the border to Border-Strong only.
- **Border:** 1px, Border at rest, Border-Strong on hover, full perimeter only (never a single colored side).
- **Internal Padding:** 24px (`p-6`).

### Inputs / Fields
- **Style:** Elevated background, 1px Border, 8px radius, 16px/10px padding, Text color, Text-Placeholder for placeholder text.
- **Focus:** border shifts to Accent at 50% opacity plus a 1px ring at Accent/15% — a glow, not a color change.
- **Error:** border becomes red at 50% opacity; an error message renders below in Cancelled-red, Body size.
- **Label:** Label typography in Text-Muted, sits 6px above the field.

### Navigation
- Sticky header, Border bottom, Paper background at 95% + backdrop-blur. Wordmark (`CRATE`) is Label typography in Accent.
- Nav links: Body size, Text-Muted at rest, hover → Text on Elevated/60% background, active → Text on full Elevated background. All in 8px-radius pills.
- Cart icon carries a small Accent-background, black-text count bubble (rounded-full) when non-empty.
- Sign-in (signed out) is rendered as a compact primary button; signed-in state shows profile name (Text-Muted, truncated) and a ghost "Sign out" button.

## 6. Do's and Don'ts

### Do:
- **Do** keep Warm Amber Signal to prices, the primary button, active nav, and focus rings only (The Single Accent Rule).
- **Do** render prices, order IDs, and the `CRATE` wordmark in monospace, semibold (The Mono-for-Data Rule).
- **Do** build depth from Void → Surface → Elevated plus 1px borders; the sticky header's backdrop-blur is the only translucency.
- **Do** give admin views the same components as the storefront, just denser (more rows/columns, tighter spacing), per PRODUCT.md's "one system, two densities".
- **Do** make every hover/focus/active state explicit: border-lighten to `#3a3a50`, background shift to Elevated, or the amber focus ring — never a bare default browser outline.

### Don't:
- **Don't** build a "generic Bootstrap/Material admin dashboard" — no sidebar-plus-cards layout with no point of view (PRODUCT.md anti-reference).
- **Don't** use gradient text, glassmorphism-as-default, or a bright SaaS gradient hero/card look (PRODUCT.md anti-reference).
- **Don't** repeat identical icon+heading+text cards endlessly; vary layout and density by content (PRODUCT.md anti-reference).
- **Don't** use `border-left`/`border-right` greater than 1px as a colored accent stripe on cards, badges, or alerts. Use full borders, background tints, or leading icons instead.
- **Don't** add `box-shadow` anywhere — flat by default (The Flat-by-Default Rule).
- **Don't** spread the five status colors outside `Badge`/danger `Button` — they're semantic, not decorative (The Status-Stays-In-Badges Rule).
