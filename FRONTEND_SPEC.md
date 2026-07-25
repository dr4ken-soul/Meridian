# Meridian — Frontend Spec

## Overview

This document is the authoritative frontend specification for the Meridian landing page, built for the Agents of SigNoz hackathon. It stands alone for now. CLAUDE.md, APP_BLUEPRINT.md and BUILD_GUIDE.md have not been written yet and will follow once this spec is approved. When they exist, read all four together before writing any component.

Meridian's product surface is a single marketing landing page. There is no dashboard or interior app screen in scope here. The deep-dive view a user reaches from a PR comment is SigNoz's own dashboard, linked out to, not rendered by Meridian. The actual product, a CLI or GitHub Action that stores golden traces, replays them on a prompt push, diffs the result and posts a PR comment, is defined separately in BUILD_GUIDE.md.

Fingerprint locked: bento grid operational aesthetic, A2 scroll-morph pill nav, static-but-atmospheric background with staggered viewport reveal, Geist and Geist Mono, cold ops palette with diff-semantic data colour kept separate from brand chrome.

Stack: React 18, Vite, TypeScript, Tailwind CSS, `motion/react` (not the legacy `framer-motion` package), lucide-react.

---

## Global Rules

### Font import

```
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');
```

Tailwind config maps `font-display` and `font-sans` both to `'Geist', sans-serif`. The split is semantic, not a family switch. Weight carries hierarchy. `font-mono` maps to `'Geist Mono', monospace`. Never use JetBrains Mono anywhere in this build.

### Typography scale

| Token | Classes | Use |
|---|---|---|
| display-xl | `font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[0.95] tracking-[-1.5px]` | Hero headline |
| display-lg | `font-display text-3xl md:text-4xl font-semibold leading-[1.05] tracking-tight` | Section titles |
| display-statement | `font-display text-[clamp(2rem,6vw,4.5rem)] leading-[0.95] tracking-tight` | Full-width statement |
| heading | `font-display text-xl font-medium leading-[1.2]` | Card and layer titles |
| body-lg | `font-sans text-lg leading-relaxed font-normal` | Hero subheading |
| body | `font-sans text-sm leading-relaxed font-normal` | Body copy, card descriptions |
| mono | `font-mono text-sm leading-normal` | Diff values, data rows |
| mono-sm | `font-mono text-xs leading-normal` | Verdict badges, footer meta |
| label | `font-mono text-[11px] uppercase tracking-[0.15em] font-medium` | Eyebrows, cell labels |

### Colour system

```css
:root {
  --font-display: 'Geist', sans-serif;
  --font-mono: 'Geist Mono', monospace;

  --bg-primary:     #0a0e13;
  --bg-secondary:   #0f1519;
  --bg-surface:     #141b21;
  --bg-elevated:    #1b242c;

  --accent:         #3fc7c2;
  --accent-hover:   #5dd6d1;
  --accent-glow:    rgba(63, 199, 194, 0.12);
  --accent-dim:     #1f6663;

  --text-primary:   #eef2f4;
  --text-secondary: #8b98a3;
  --text-muted:     #4d5860;

  --border-subtle:  rgba(255, 255, 255, 0.04);
  --border-default: rgba(255, 255, 255, 0.09);

  --diff-pass:       #34d399;
  --diff-regression: #f87171;
  --diff-caution:    #fbbf24;

  --radius-sm: 6px;  --radius-md: 10px; --radius-lg: 16px;
  --radius-pill: 9999px;
  --duration-fast: 120ms; --duration-normal: 250ms; --duration-slow: 500ms;
}
```

`--diff-pass`, `--diff-regression` and `--diff-caution` only ever colour data inside the trace diff artifact. They never appear as UI chrome, buttons or decoration. That separation is what keeps the palette reading as engineered rather than decorative.

### Z-index scale

```css
:root {
  --z-base: 0;
  --z-grid-bg: 1;
  --z-noise: 2;
  --z-content: 10;
  --z-nav: 50;
}
```

### Motion standard

Import path: `import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react'`

Entrance animation, mandatory on every section:

```
initial:    { opacity: 0, filter: 'blur(8px)', y: 20 }
whileInView:{ opacity: 1, filter: 'blur(0px)', y: 0 }
viewport:   { once: false, amount: 0.1 }
transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
```

`once` is always `false`. Every section replays its entrance on scroll back up. Stagger containers use `staggerChildren: 0.08` to `0.15` depending on child count, children inherit the entrance standard above as their variant.

### Hard rules

- No inline styles except dynamic motion values and the diff delta colour on individual metric rows, since that colour is data-driven, not decorative.
- No `onMouseEnter` / `onMouseLeave` for styling. CSS class transitions only.
- No JetBrains Mono. Geist Mono everywhere mono is needed.
- No hardcoded logo or favicon. Both stay as `{/* Logo slot: replace once provided */}` HTML comments until Paul supplies the asset file.
- No lorem ipsum, no placeholder copy, no fabricated adoption numbers. Meridian has no users yet at hackathon stage, the page does not claim otherwise.
- British English in every string, no em dashes anywhere in copy or code comments.
- `html { scrollbar-width: none }`, `::-webkit-scrollbar { display: none }`, smooth scroll preserved.

---

## Section 1 — Nav (A2 Scroll-morph pill)

Component: `src/components/layout/Nav.tsx`

Two states driven by scroll position, threshold at 80px, tracked with `useScroll` and a boolean flip via `useMotionValueEvent`.

**Expanded state** (`scrollY < 80`):

- `fixed top-0 inset-x-0 z-[var(--z-nav)] w-full flex items-center justify-between px-6 md:px-12 py-5 bg-transparent`
- Logo: `{/* Logo slot */}` + `font-display text-lg font-medium text-[var(--text-primary)] tracking-tight` fallback text "Meridian"
- CTA (`hidden md:inline-flex`): `border border-[color:var(--border-default)] text-[var(--text-primary)] text-sm font-medium px-4 py-2 rounded-[var(--radius-pill)] hover:border-[color:var(--accent)] hover:text-[var(--accent)] transition-colors duration-[var(--duration-fast)]`, label "Install Meridian"

**Collapsed state** (`scrollY >= 80`):

- `fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-nav)] w-[calc(100%-2rem)] md:w-auto max-w-[380px] flex items-center gap-4 pl-4 pr-1.5 py-1.5 rounded-[var(--radius-pill)] backdrop-blur-xl bg-[var(--bg-surface)]/80 border border-[color:var(--border-default)]`
- Logo: mark only, 28px, `{/* Logo slot */}`
- CTA: `bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium px-4 py-2 rounded-[var(--radius-pill)] hover:bg-[var(--accent-hover)] transition-colors duration-[var(--duration-fast)]`

Morph transition: animate the container's width, padding, position and background together using a shared `layout` prop on the motion element, `transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}`. Fluid layout animation, not a hard state swap.

**Mobile** (below `md`): expanded-state CTA hidden, hamburger icon (lucide `Menu`, size 20) toggles a full-screen `bg-[var(--bg-primary)]/98 backdrop-blur-xl` overlay with two stacked links, "Install Meridian" and "View on GitHub", plus a close icon (`X`, size 20) top right. Standard `AnimatePresence` fade and scale, `duration: 0.25`.

---

## Section 2 — Hero

Recipe: `split-screen-hero` (Composition Recipes, Section D), customised. The right column replaces the recipe's generic image slot with a fully coded GitHub PR comment artifact showing a live trace diff. Background swaps the recipe default for the page-wide technical grid treatment below.

### Page background (mount once at App root, not per-section)

```tsx
<div
  className="fixed inset-0 z-[var(--z-grid-bg)] pointer-events-none opacity-[0.06]"
  style={{
    backgroundImage:
      'linear-gradient(var(--border-default) 1px, transparent 1px), linear-gradient(90deg, var(--border-default) 1px, transparent 1px)',
    backgroundSize: '48px 48px',
  }}
/>
<div
  className="fixed inset-0 z-[var(--z-noise)] pointer-events-none opacity-[0.035]"
  style={{
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
    backgroundSize: '128px 128px',
  }}
/>
```

Both layers are `fixed`, so they never repaint on scroll. This is the only background treatment on the entire page, no other section adds its own.

### Section wrapper

`min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[0.85fr_1fr] bg-[var(--bg-primary)] relative overflow-hidden`

### Left column (content)

`flex flex-col justify-center px-6 md:px-12 lg:px-16 py-32 lg:py-20 relative z-[var(--z-content)]`

No eyebrow in the hero. The page's single eyebrow is spent in Section 4, where it does more work.

**Headline** (delay 0.1s):
Classes: `font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[0.95] tracking-[-1.5px] text-[var(--text-primary)] max-w-[14ch]`
Copy: "Replay every prompt change against what already worked."

**Subheading** (delay 0.25s):
Classes: `font-sans text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mt-6 max-w-[42ch]`
Copy: "Meridian stores golden traces from your live agent, replays them on every prompt push, and posts the verdict straight to the pull request."

**CTA row** (delay 0.4s):
Classes: `mt-8 flex items-center gap-4`

Primary: `group bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium pl-5 pr-1.5 py-1.5 rounded-[var(--radius-pill)] flex items-center gap-3 hover:bg-[var(--accent-hover)] transition-colors duration-[var(--duration-fast)]`, label "Install Meridian", trailing icon wrapper `w-7 h-7 rounded-full bg-black/10 flex items-center justify-center` containing `ArrowUpRight` size 14, `group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200`

Secondary: `text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors duration-[var(--duration-fast)]`, label "View on GitHub", no icon

Every CTA on this page uses the exact label "Install Meridian". No variant wording anywhere else on the page.

Entrance animation for all three blocks: base standard from Global Rules, `delay` staggered at 0.1s, 0.25s, 0.4s respectively.

### Right column (PR comment artifact)

`relative flex items-center justify-center px-6 md:px-12 py-20 lg:py-0 bg-[var(--bg-secondary)] border-l border-[color:var(--border-subtle)] z-[var(--z-content)]`

Panel entrance: `initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.97 }}`, `animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}`, `transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}`

This card is fully coded. No external image or video asset is required to build it.

```
Wrapper
  w-full max-w-[440px] rounded-[var(--radius-lg)] border border-[color:var(--border-default)]
  bg-[var(--bg-surface)] overflow-hidden

Header row
  flex items-center gap-3 px-5 py-4 border-b border-[color:var(--border-subtle)]

  Avatar
    w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[color:var(--border-default)]
    flex items-center justify-center
    → lucide Bot icon, size 16, className text-[var(--accent)]

  Identity block, flex flex-col
    Username: font-mono text-sm text-[var(--text-primary)] → "meridian-bot"
    Meta: font-sans text-xs text-[var(--text-muted)] → "commented 2 minutes ago"

Body
  px-5 py-5

  Verdict badge
    inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] mb-4
    bg-[color:var(--diff-regression)]/10 border border-[color:var(--diff-regression)]/25
    Label: font-mono text-[11px] uppercase tracking-[0.1em]
      style={{ color: 'var(--diff-regression)' }} → "regression detected"

  Diff table, divide-y divide-[color:var(--border-subtle)]
    Row: flex items-center justify-between py-2.5
      Metric label: font-sans text-sm text-[var(--text-secondary)]
      Values: font-mono text-sm text-[var(--text-primary)] flex items-center gap-2
        baseline value → ArrowRight icon (size 12, text-[var(--text-muted)]) → current value → delta pill

      Delta pill: font-mono text-xs px-2 py-0.5 rounded-[var(--radius-sm)]
      Colour assigned per row below, not computed, this is illustrative demo data
      for the mockup, not a live claim.

    Row 1  "tool calls"    3 → 5           delta "+2"      style color: var(--diff-regression)
    Row 2  "p99 latency"   420ms → 610ms   delta "+190ms"  style color: var(--diff-regression)
    Row 3  "token cost"    $0.014 → $0.011 delta "−$0.003" style color: var(--diff-pass)

  Footer link
    mt-5 pt-4 border-t border-[color:var(--border-subtle)]
    flex items-center justify-between
    Text: font-sans text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]
      transition-colors duration-[var(--duration-fast)]
      → "View full trace comparison in SigNoz"
    Icon: ArrowUpRight, size 14, text-[var(--accent)]
```

---

## Section 3 — Mechanism

Recipe: `architecture-layers` (Composition Recipes, Section B), copy and palette mapped to Meridian, no structural customisation.

Section wrapper: `py-24 md:py-32 bg-[var(--bg-primary)]`
Container: `max-w-4xl mx-auto px-6 md:px-8`

No eyebrow here. Budget reserved for Section 4.

Title: `font-display text-3xl md:text-4xl font-semibold text-[var(--text-primary)] tracking-tight`
Copy: "How Meridian catches a regression"

Layer stack: `mt-16 flex flex-col gap-4`

Layer card: `border border-[color:var(--border-default)] rounded-[var(--radius-lg)] p-6 flex items-start gap-4 hover:border-[color:var(--accent-dim)] transition-colors duration-[var(--duration-normal)]`

- Number: `font-mono text-sm text-[var(--text-muted)] min-w-[2rem]`
- Title: `font-display text-base font-medium text-[var(--text-primary)]`
- Description: `font-sans text-sm text-[var(--text-secondary)] mt-1 leading-relaxed`

| # | Title | Description |
|---|---|---|
| 01 | Golden traces stored | Every confirmed-good run of your agent is captured as a trace in SigNoz and marked as a baseline. |
| 02 | Replay on push | When a prompt changes, Meridian re-runs the same inputs against the new version and records a fresh trace. |
| 03 | Diff posted to the PR | Tool call counts, latency and token cost are compared against the baseline, and the verdict lands as a comment before anyone merges. |

Animation: each card, `initial={{ opacity: 0, y: 20 }}`, `whileInView={{ opacity: 1, y: 0 }}`, `viewport={{ once: false, amount: 0.1 }}`, `transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.15 }}`

---

## Section 4 — SigNoz depth

Recipe: `asymmetric-bento-grid` (Composition Recipes, Section D), customised to four cells, each naming one SigNoz primitive Meridian calls directly. This section is the direct answer to judging criterion 04, Best Use of SigNoz.

Section wrapper: `py-24 md:py-32 bg-[var(--bg-secondary)]`
Container: `max-w-6xl mx-auto px-6 md:px-8`

Eyebrow (the page's only one): `font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--accent)] mb-4` → "built on signoz primitives"
Title: `font-display text-3xl md:text-4xl font-semibold text-[var(--text-primary)] tracking-tight max-w-[20ch]` → "Meridian doesn't wrap SigNoz. It runs on it."

Grid: `mt-12 grid grid-cols-1 lg:grid-cols-12 gap-4`, single-pixel borders, zero shadow per bento grid operational rules.

Cell base classes: `border border-[color:var(--border-default)] rounded-[var(--radius-lg)] p-8 bg-[var(--bg-surface)] hover:border-[color:var(--accent)] hover:-translate-y-0.5 transition-all duration-[var(--duration-normal)]`

| Cell | Span | Label | Title | Body |
|---|---|---|---|---|
| A | `lg:col-span-7` | signoz traces api | Baseline storage | Golden traces are written and read through SigNoz's own traces API, not a separate database Meridian maintains. |
| B | `lg:col-span-5` | signoz query builder | Replay comparison | Tool call sequences and span counts for the baseline and the replay are pulled with the same Query Builder v5 requests you would write by hand. |
| C | `lg:col-span-5` | signoz metrics api | Cost and latency diffing | p99 latency and token cost deltas come straight from SigNoz metric queries, aggregated the same way your dashboards already are. |
| D | `lg:col-span-7` | signoz dashboards | One click to the full picture | Every PR comment links to a SigNoz dashboard scoped to that exact replay, so reviewing a regression never means leaving the trace. |

Cell label classes: `font-mono text-xs text-[var(--accent)] mb-3`
Cell title classes: `font-display text-xl font-medium text-[var(--text-primary)]`
Cell body classes: `font-sans text-sm text-[var(--text-secondary)] mt-2 leading-relaxed max-w-[46ch]`

Animation: staggered viewport reveal, base standard, `delay: index * 0.1`.

---

## Section 5 — Full-width statement

Recipe: `full-width-statement` (Composition Recipes, Section D), no customisation. Breathing section, no cards, no CTA, no images.

Section wrapper: `py-24 md:py-32 flex items-center bg-[var(--bg-primary)]`
Container: `w-full px-6 md:px-8`

Statement: `font-display text-[clamp(2rem,6vw,4.5rem)] leading-[0.95] tracking-tight text-[var(--text-primary)] text-center max-w-4xl mx-auto`
Copy: "A prompt that passed once is not a prompt that always will."

Animation: word-by-word fade, `staggerChildren: 0.05` on the container, each word `initial={{ opacity: 0, filter: 'blur(6px)' }}`, `whileInView={{ opacity: 1, filter: 'blur(0px)' }}`, `viewport={{ once: false, amount: 0.3 }}`.

---

## Section 6 — Final CTA and footer

Bespoke, no recipe match, no video.

Section wrapper: `py-24 md:py-32 bg-[var(--bg-secondary)] border-t border-[color:var(--border-subtle)]`
Container: `max-w-3xl mx-auto px-6 md:px-8 text-center`

Title: `font-display text-3xl md:text-4xl font-semibold text-[var(--text-primary)] tracking-tight` → "Install Meridian before your next prompt ships."

Button row: `mt-8 flex items-center justify-center gap-4`, same primary and secondary CTA classes as the hero, labels "Install Meridian" and "View on GitHub".

Footer row: `mt-20 pt-8 border-t border-[color:var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-4`

- Left: `{/* Logo slot */}` + `font-display text-sm text-[var(--text-secondary)]` → "Meridian"
- Right: `font-mono text-xs text-[var(--text-muted)] tracking-[0.05em]` → "built for agents of signoz"

Animation: base entrance standard, `once: false`.

---

## Layout family audit

Six sections, five distinct layout families, no repeated family, no zigzag, one breathing section before the close, eyebrow used exactly once.

1. Nav — chrome
2. Hero — full-viewport, split-screen-hero
3. Mechanism — stacked layers, architecture-layers
4. SigNoz depth — content grid, asymmetric-bento-grid
5. Full-width statement — typography statement
6. Final CTA and footer — bespoke close

---

## Banned patterns, checked

- No purple or blue AI gradient glow
- No three equal generic feature cards
- No gradient text on any headline
- No fabricated adoption numbers or fake testimonials
- No Inter or Space Grotesk as display font
- No JetBrains Mono anywhere
- No hardcoded logo or favicon
- No em dashes in any copy or comment
- No inline `onMouseEnter` / `onMouseLeave`

---

## Asset checklist

- `public/logo.svg`, Paul to provide, comment slot until then
- `public/favicon.ico`, Paul to provide
- No hero image or video required, the hero visual is fully coded
- GitHub repository URL, wire into nav CTA and footer once the repo exists
- No other image or video assets needed anywhere on this page
