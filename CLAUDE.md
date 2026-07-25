# Meridian — Agent Context

## What This Is

Meridian is a prompt regression gate for AI agents. It stores a known-good agent run as a baseline trace in SigNoz, replays the same inputs against every prompt change opened as a pull request, diffs the two runs for tool call count, latency and token cost, and posts the verdict straight to the PR as a comment linking back into SigNoz. No separate eval dataset to maintain, no manual spot-checking. The trace data the team already has is the whole mechanism.

Built for the Agents of SigNoz hackathon (WeMakeDevs, in partnership with SigNoz). Seven-day hackathon, July 20 to 26 2026. Submission deadline July 26 2026.

---

## One-Line Pitch

Replay every prompt change against what already worked.

---

## MVP Features

1. Golden trace capture — `meridian mark-baseline --trace-id <id>` reads a trace's span data from SigNoz and stores it as the baseline for that prompt's git blob hash
2. Replay on push — a GitHub Action re-invokes the agent with the baseline's original inputs whenever a pull request touches the configured prompt path, tagging the new trace with `meridian.replay_of` so SigNoz correlates the two runs itself
3. Diff computation — tool call count, p99 latency and token cost are compared between baseline and replay via two `query_range` calls, and a run is flagged a regression if tool calls change at all or latency and cost cross a configurable threshold
4. PR comment posting — the diff is posted as a single markdown comment with a verdict badge, a metric table and a link into SigNoz's Trace Explorer, and edited in place on subsequent pushes rather than duplicated
5. Baseline promotion — merging to the default branch promotes the approved replay into the new baseline for that prompt

Post-hackathon: multi-baseline comparison, automatic threshold tuning from historical variance, CI providers beyond GitHub Actions, a hosted control plane.

---

## Stack

| Layer | Technology |
|---|---|
| CLI / Action runtime | Node.js 18+ with TypeScript |
| SigNoz client | Direct HTTP via `fetch` to `/api/v5/query_range`, no first-party SDK exists for this endpoint |
| Baseline storage | JSON committed to `.meridian/baselines/`, keyed by prompt git blob hash |
| GitHub integration | `@octokit/rest` |
| CI packaging | GitHub Action, `action.yml` plus a compiled JS bundle |
| Landing page | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Animations | `motion/react` |
| Icons | Lucide React |
| Package distribution | GitHub Marketplace Action |

No backend server required beyond the user's own SigNoz instance. Meridian is a CLI plus a GitHub Action, not a hosted service. The landing page is a static site deployed to Vercel.

---

## Project Structure

```
meridian/
├── packages/
│   ├── action/                        (the Node.js CLI and GitHub Action)
│   │   ├── src/
│   │   │   ├── index.ts               (Action entry point, run())
│   │   │   ├── commands/
│   │   │   │   ├── mark-baseline.ts
│   │   │   │   ├── list-baselines.ts
│   │   │   │   ├── diff.ts
│   │   │   │   ├── comment.ts
│   │   │   │   ├── promote.ts
│   │   │   │   └── status.ts
│   │   │   ├── lib/
│   │   │   │   ├── signoz.ts          (queryRange client, getTraceAggregates)
│   │   │   │   ├── diff.ts            (diffTraces)
│   │   │   │   ├── github.ts          (comment post/update via octokit)
│   │   │   │   ├── baseline.ts        (read/write .meridian/baselines/)
│   │   │   │   └── git.ts             (prompt blob hash helper)
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── action.yml
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── landing/                       (the marketing landing page)
│       ├── public/
│       │   ├── logo.svg               (logo — user provides, comment slot until then)
│       │   └── favicon.ico            (favicon — user provides, comment slot until then)
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   │   ├── GridBackground.tsx
│       │   │   │   └── PrCommentCard.tsx
│       │   │   ├── layout/
│       │   │   │   └── Nav.tsx
│       │   │   └── sections/
│       │   │       ├── Hero.tsx
│       │   │       ├── Mechanism.tsx
│       │   │       ├── SignozDepth.tsx
│       │   │       ├── Statement.tsx
│       │   │       └── FinalCta.tsx
│       │   ├── styles/
│       │   │   └── globals.css
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── tsconfig.json
└── README.md
```

---

## Design System

All design decisions are confirmed across seven gates in FRONTEND_SPEC.md. Do not deviate from any value below.

**Aesthetic:** Bento grid operational

**Fonts:**
- Display and body: Geist (weights 300 to 700)
- Mono: Geist Mono (weights 400 to 600)

Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

**Colour palette — cold ops:**
```css
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
```

`--diff-pass`, `--diff-regression` and `--diff-caution` are data colour. They only ever appear inside the trace diff artifact, never as UI chrome or decoration.

**Nav:** A2 scroll-morph pill. Full-width transparent bar at the top of the hero, collapses into a centred floating glass pill past 80px of scroll. Wordmark left, single "Install Meridian" CTA right. No centre links.

**Background:** Static but atmospheric. A fixed technical grid at 48px cells, `0.06` opacity, layered under a fixed micro-noise grain overlay at `0.035` opacity. No video, no photography, no parallax. Mounted once at the App root, never per-section.

**Section transitions:** Staggered viewport reveal. Blur-in on every section, `viewport: { once: false }`, replays on scroll back up.

---

## Landing Page Sections (in order)

1. **Hero** — split-screen. Left: headline, subheading, one CTA row. Right: a fully coded GitHub PR comment card showing a live trace diff with a verdict badge and a link into SigNoz. No eyebrow
2. **Mechanism** — architecture-layers recipe, three numbered layers: golden traces stored, replay on push, diff posted to the PR
3. **SigNoz depth** — asymmetric bento grid, four cells, each naming one SigNoz primitive Meridian calls directly: traces API, Query Builder, metrics API, dashboards. The page's only eyebrow lives here
4. **Full-width statement** — one line, centred, breathing section before the close: "A prompt that passed once is not a prompt that always will."
5. **Final CTA and footer** — bespoke two-column close, same CTA copy as the hero, footer with wordmark and repo attribution

Full class-level detail for every section lives in FRONTEND_SPEC.md. This file is the summary, that file is the source of truth.

---

## Logo and Favicon

No logo or favicon exists yet. Leave both as plain text comment slots:

```tsx
{/* Logo slot: replace with public/logo.svg once provided */}
```

```html
<!-- Favicon slot: replace with public/favicon.ico once provided -->
```

Never substitute a hardcoded placeholder, an AI-generated icon symbol or an emoji in either slot.

---

## SigNoz Integration

Meridian talks to the user's own SigNoz instance over `POST /api/v5/query_range`, authenticated with a service account key in the `SIGNOZ-API-KEY` header. There is no first-party SDK for this endpoint, so `lib/signoz.ts` is a thin typed `fetch` wrapper, not a dependency. Full request and response shapes are defined in APP_BLUEPRINT.md, this section is the summary.

```typescript
/**
 * Thin typed client for the SigNoz v5 query_range endpoint.
 * @param body - the query_range request payload
 * @returns the parsed JSON response from SigNoz
 */
export async function queryRange(body: QueryRangeRequest): Promise<QueryRangeResponse> {
  const res = await fetch(`${process.env.SIGNOZ_URL}/api/v5/query_range`, {
    method: 'POST',
    headers: {
      'SIGNOZ-API-KEY': process.env.SIGNOZ_API_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`SigNoz query_range failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}
```

**Correlation attribute:** every replay trace carries a `meridian.replay_of` span attribute set to the baseline trace ID, so SigNoz itself keeps the two runs linked. Meridian never maintains a separate mapping table for this.

**Baseline key:** baselines are keyed by the git blob hash of the prompt file, not the branch name, so a rename or rebase never orphans a baseline.

---

## GitHub Action Logic

`action.yml`:
```yaml
name: 'Meridian Prompt Regression Gate'
description: 'Replays golden traces against prompt changes and posts a SigNoz-backed regression diff to the pull request.'
inputs:
  signoz-url:
    description: 'Base URL of the SigNoz instance'
    required: true
  signoz-api-key:
    description: 'SigNoz service account API key'
    required: true
  prompt-path:
    description: 'Path to watch for prompt changes'
    required: false
    default: 'prompts/'
runs:
  using: 'node20'
  main: 'dist/index.js'
```

Consumer workflow, the file a user adds to their own repository:
```yaml
name: Meridian
on:
  pull_request:
    paths:
      - 'prompts/**'
jobs:
  regression-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: meridian-dev/meridian-action@v1
        with:
          signoz-url: ${{ secrets.SIGNOZ_URL }}
          signoz-api-key: ${{ secrets.SIGNOZ_API_KEY }}
```

Action entry point:
```typescript
/**
 * Entry point for the Meridian GitHub Action.
 * Resolves the baseline for the changed prompt, replays it, diffs the
 * result against the baseline, and posts the verdict to the pull request.
 */
export async function run(): Promise<void> {
  const promptHash = await getChangedPromptHash()
  const baseline = await loadBaseline(promptHash)
  if (!baseline) {
    core.info('No baseline found for this prompt. Run `meridian mark-baseline` first.')
    return
  }
  const replayTraceId = await replayAgent(baseline)
  const diff = await diffTraces(baseline.traceId, replayTraceId)
  await postOrUpdateComment(diff, replayTraceId)
  if (diff.isRegression) {
    core.setFailed('Meridian detected a regression. See the PR comment for details.')
  }
}
```

`postOrUpdateComment` searches the PR's existing comments for one authored by the Meridian bot before deciding whether to create or edit, so a branch pushed five times produces one comment, not five.

---

## Code Rules (follow without exception)

**TypeScript / Node.js:**
- camelCase for all variables and functions
- JSDoc comments on every function
- No inline styles in React unless a CSS variable, a dynamic motion value, or a diff delta colour requires it
- CSS variables from the design system used directly in components, never hardcoded hex values
- No hardcoded placeholder logos, favicons or icon symbols. Logo and favicon slots are comments only
- No AI-generated icon symbols or emoji used as visual accents anywhere in the landing page

**Writing rules (apply to all copy, labels, CLI output, PR comment text, code comments, JSDoc, README):**
- British English throughout
- No em dashes anywhere
- Periods only when necessary
- Commas only when necessary
- Short direct sentences
- No filler phrases: no "seamlessly", "powerful", "robust", "leverage", "cutting-edge", "unlock"
- CTA text is always exactly "Install Meridian", never a variant
- Error messages are plain and helpful: "SigNoz is not reachable. Check SIGNOZ_URL and SIGNOZ_API_KEY."
- Empty states are honest: "No baseline found for this prompt. Run `meridian mark-baseline` first."

**Component rules:**
- CSS class-based hover states only. No inline JS `onMouseEnter` or `onMouseLeave` handlers
- `motion/react` for every entrance animation, never the legacy `framer-motion` package
- Blur-in entrance: `initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}` with `whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}`
- `viewport: { once: false, amount: 0.1 }` on every section, animations replay on scroll back up
- Stagger sequences via `staggerChildren` on the parent container
- Diff delta colours (`--diff-pass`, `--diff-regression`, `--diff-caution`) are the only sanctioned use of inline `style`, and only inside the diff table

---

## Never Do These

- Never post more than one Meridian comment per pull request, edit the existing one
- Never fabricate diff numbers outside the illustrative hero mockup, live output always comes from a real `query_range` response
- Never store more than the span aggregates needed for the diff, no raw payload logging beyond what SigNoz already retains
- Never hardcode a SigNoz instance URL, always read `SIGNOZ_URL` from the environment
- Never add any branding, logos or icons that the user has not provided
- Never use `localStorage` or `sessionStorage` in the landing page
- Never use JetBrains Mono anywhere in this project

---

## Hackathon Checklist

- Project name: Meridian
- Hackathon: Agents of SigNoz (WeMakeDevs, in partnership with SigNoz)
- Submission window: July 20 to 26 2026
- Track: 01, AI & Agent Observability, with SigNoz depth also weighed under judging criterion 04
- Submission form: https://forms.gle/xv1TXSiC54MEWujRA
- Public GitHub repo required
- Demo video required
- SigNoz must be meaningfully used, not decorative, judging criterion 04 weighs this directly
- README must state clearly how SigNoz is used for judging criterion 04
