# Meridian — Build Guide

## Before You Write a Single Line of Code

Read CLAUDE.md and APP_BLUEPRINT.md in full. Both files contain decisions that cannot be inferred from this guide alone. Every architectural choice, naming convention and code rule is in CLAUDE.md. Every data structure, SigNoz API call pattern and CLI command definition is in APP_BLUEPRINT.md. FRONTEND_SPEC.md carries every exact class, animation value and z-index for the landing page. This guide tells you the order to build things. The other three tell you what to build and how.

---

## Prerequisites

Confirm all of the following before starting:

```bash
node --version   # must be 18 or higher
npm --version    # must be 9 or higher
git --version    # any recent version
```

Confirm a SigNoz instance is reachable and a service account key exists:

```bash
curl -X GET https://<SIGNOZ_URL>/api/v1/service_accounts/me \
  -H "SIGNOZ-API-KEY: <YOUR_SERVICE_ACCOUNT_KEY>"
```

A `200` response confirms the key is valid. A `401` means the key is wrong, not that SigNoz is unreachable, check the key before anything else. If you don't yet have a service account, create one under **Settings → Service Accounts** in SigNoz first. Nothing in Phase 1 works without this.

---

## Repository Setup

```bash
mkdir meridian && cd meridian
git init
npm init -y
mkdir -p packages/action/src/{commands,lib,types}
mkdir -p packages/landing/src/{components/{ui,layout,sections},styles}
mkdir -p packages/landing/public
mkdir -p .meridian/baselines
```

Root `package.json` workspaces config:
```json
{
  "name": "meridian",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:landing": "npm run dev --workspace=packages/landing",
    "build:action": "npm run build --workspace=packages/action",
    "build:landing": "npm run build --workspace=packages/landing"
  }
}
```

---

## Phase 1 — Action Core

### Step 1.1: Action package setup

`packages/action/package.json`:
```json
{
  "name": "meridian",
  "version": "0.1.0",
  "description": "Replay every prompt change against what already worked.",
  "type": "module",
  "bin": {
    "meridian": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@octokit/rest": "^21.0.0",
    "@actions/core": "^1.10.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  }
}
```

`packages/action/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

Install dependencies:
```bash
cd packages/action && npm install
```

---

### Step 1.2: Types

Create `packages/action/src/types/index.ts` with every interface from APP_BLUEPRINT.md:
- `TraceAggregates`
- `RegressionDiff`
- `BaselineRecord`
- `QueryRangeRequest`

---

### Step 1.3: SigNoz client

Create `packages/action/src/lib/signoz.ts`.

Implement `queryRange()` and `getTraceAggregates()` exactly as specified in APP_BLUEPRINT.md. The client must:
- Read `SIGNOZ_URL` and `SIGNOZ_API_KEY` from the environment, never hardcode either
- Send the API key in the `SIGNOZ-API-KEY` header, not a bearer token
- Throw with the response status and body on a non-2xx response, never fail silently on a request error
- Use `signal: "traces"` and the `builder_query` shape from the payload model, not a hand-rolled query format

---

### Step 1.4: Git and baseline helpers

Create `packages/action/src/lib/git.ts`:

```typescript
import { execSync } from 'child_process'

/**
 * Returns the git blob hash of a file at its current committed state.
 * Used as the stable key for a baseline, since it survives renames and
 * rebases in a way a branch name or file path does not.
 * @param filePath - path to the prompt file relative to the repo root
 * @returns the blob hash string
 */
export function getPromptBlobHash(filePath: string): string {
  return execSync(`git hash-object ${filePath}`, {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
    .toString()
    .trim()
}
```

Create `packages/action/src/lib/baseline.ts`. Implement `loadBaseline(promptHash)` and `saveBaseline(record)`, reading and writing JSON files under `.meridian/baselines/{promptHash}.json` exactly matching the `BaselineRecord` shape from APP_BLUEPRINT.md. 

---

### Step 1.5: Diff computation

Create `packages/action/src/lib/diff.ts`.

Implement `diffTraces()` exactly as specified in APP_BLUEPRINT.md. Threshold is `200` milliseconds by default, overridable via `MERIDIAN_LATENCY_REGRESSION_THRESHOLD_MS`. A change in tool call count always flags a regression regardless of the latency threshold.

---

### Step 1.6: GitHub comment posting

Create `packages/action/src/lib/github.ts`.

Implement `postOrUpdateComment(diff, replayTraceId)` using `@octokit/rest`. This function:
1. Lists existing comments on the current pull request
2. Searches for one authored by the Meridian bot account
3. If found, edits that comment via `PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}`
4. If not found, creates one via `POST /repos/{owner}/{repo}/issues/{pull_number}/comments`
5. Formats the body as: a verdict badge line, a markdown table of the three metrics with deltas, and a link built by `buildTraceDetailLink()` from APP_BLUEPRINT.md

Comment body must never exceed GitHub's comment size limit. Truncate any metric name longer than expected rather than failing the post.

---

### Step 1.7: Action entry point and CLI commands

Create `packages/action/src/index.ts`. Implement `run()` exactly as specified in CLAUDE.md's GitHub Action Logic section.

Create `packages/action/src/cli.ts` as the standalone CLI entry point using Commander.js, separate from the Action entry point since `mark-baseline`, `list-baselines` and `promote` are run manually by a developer, not triggered by a pull request event:

```typescript
#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
  .name('meridian')
  .description('Replay every prompt change against what already worked.')
  .version('0.1.0')

// Register each command: mark-baseline, list-baselines, diff, comment, promote, status
// Each command maps to its implementation file in src/commands/

program.parse()
```

Each command file in `src/commands/` handles one subcommand. Keep them small. All logic lives in `src/lib/`.

---

### Step 1.8: action.yml

Create `packages/action/action.yml` exactly as specified in CLAUDE.md's GitHub Action Logic section. Build the action with `npm run build:action` before tagging a release, the Marketplace listing points at the compiled `dist/index.js`, not the TypeScript source.

---

### Step 1.9: Action core verification

Before moving to Phase 2, confirm end to end against a small test agent:

```bash
# 1. Mark a real trace as baseline
meridian mark-baseline --trace-id <a real trace ID from your SigNoz instance>

# 2. Confirm it stored correctly
meridian list-baselines

# 3. Manually diff against a second trace to sanity check the numbers
meridian diff --baseline <id> --replay <id>

# 4. Confirm SigNoz connectivity end to end
meridian status
```

Do not proceed to the landing page until `meridian diff` produces numbers that match a manual Query Builder query for the same two trace IDs.

---

## Phase 2 — Landing Page

### Step 2.1: Landing package setup

`packages/landing/package.json` dependencies: `react`, `react-dom`, `motion`, `lucide-react`, `tailwindcss`. Standard Vite React TypeScript scaffold.

`packages/landing/tailwind.config.ts`: map `font-display` and `font-sans` to `'Geist', sans-serif`, `font-mono` to `'Geist Mono', monospace`, exactly as specified in FRONTEND_SPEC.md Global Rules.

Install dependencies:
```bash
cd packages/landing && npm install
```

---

### Step 2.2: Global styles

Create `packages/landing/src/styles/globals.css`. Paste the full colour system, z-index scale and font import block from FRONTEND_SPEC.md Global Rules verbatim, as CSS custom properties on `:root`.

Add scrollbar hiding:
```css
html { scrollbar-width: none; }
::-webkit-scrollbar { display: none; }
```

---

### Step 2.3: Grid background

**`GridBackground.tsx`**

Implement exactly as specified in FRONTEND_SPEC.md Section 2, the two fixed layers: the technical grid at `0.06` opacity and the noise overlay at `0.035` opacity. Mount this once in `App.tsx`, never inside an individual section component.

---

### Step 2.4: Nav

**`Nav.tsx`**

Implement the A2 scroll-morph pill exactly as specified in FRONTEND_SPEC.md Section 1. Two states, expanded and collapsed, threshold at 80px of scroll, animated with a shared `layout` prop rather than a hard state swap. Mobile hamburger overlay with two links.

---

### Step 2.5: Hero and PR comment artifact

**`Hero.tsx`** and **`PrCommentCard.tsx`**

Implement the split-screen hero exactly as specified in FRONTEND_SPEC.md Section 2. `PrCommentCard.tsx` is the fully coded GitHub PR comment artifact, no external image. Build the diff table rows with the exact three metrics and colours specified: tool calls and p99 latency in `--diff-regression`, token cost in `--diff-pass`. This is illustrative demo data for the mockup, not a live claim, keep the note in a code comment above the row data.

---

### Step 2.6: Mechanism

**`Mechanism.tsx`**

Implement the architecture-layers recipe exactly as specified in FRONTEND_SPEC.md Section 3. Three layer cards, staggered entrance, no eyebrow.

---

### Step 2.7: SigNoz depth

**`SignozDepth.tsx`**

Implement the asymmetric bento grid exactly as specified in FRONTEND_SPEC.md Section 4. Four cells, each naming one real SigNoz primitive. This section is the direct visual answer to judging criterion 04, do not let the copy drift from the exact primitive names, traces API, Query Builder, metrics API, dashboards.

---

### Step 2.8: Statement and final CTA

**`Statement.tsx`**

Implement the full-width statement exactly as specified in FRONTEND_SPEC.md Section 5. Word-by-word fade, no cards, no CTA in this section.

**`FinalCta.tsx`**

Implement the bespoke close exactly as specified in FRONTEND_SPEC.md Section 6. Same CTA classes and label as the hero, "Install Meridian" only, footer with logo slot and repo attribution.

---

### Step 2.9: App assembly

**`App.tsx`**:
```tsx
import GridBackground from './components/ui/GridBackground'
import Nav from './components/layout/Nav'
import Hero from './components/sections/Hero'
import Mechanism from './components/sections/Mechanism'
import SignozDepth from './components/sections/SignozDepth'
import Statement from './components/sections/Statement'
import FinalCta from './components/sections/FinalCta'
import './styles/globals.css'

export default function App() {
  return (
    <main className="relative">
      <GridBackground />
      <Nav />
      <Hero />
      <Mechanism />
      <SignozDepth />
      <Statement />
      <FinalCta />
    </main>
  )
}
```

---

### Step 2.10: Landing build and preview

```bash
cd packages/landing
npm run dev       # preview locally on localhost:5173
npm run build     # production build
npm run preview   # preview production build
```

Deploy to Vercel:
```bash
npm install -g vercel
vercel --cwd packages/landing
```

---

## Phase 3 — Quality Audit

Run through this list before recording the demo video.

**Action audit:**
- `mark-baseline` against a real trace ID pulls the correct span count and p99 duration
- A replay trace carries the correct `meridian.replay_of` attribute and is visible in SigNoz
- `meridian diff` output matches a manual Query Builder query for the same two trace IDs
- Pushing to the same PR branch twice produces one comment, edited in place, not two
- `promote` correctly overwrites the baseline and the prior baseline remains visible in history
- `meridian status` reports correctly with both a valid and an invalid API key

**Landing page audit:**
- No placeholder text anywhere
- No lorem ipsum anywhere
- No hardcoded hex values in component files, CSS variables only
- No JetBrains Mono anywhere in the codebase
- Logo and favicon are comment slots, not emoji or placeholder icons
- Every interactive element has a visible focus state
- Nav morph transition between expanded and collapsed states is smooth with no layout jump
- All scroll-triggered animations replay correctly on scroll back up, `viewport: { once: false }` throughout, per FRONTEND_SPEC.md
- Diff delta colours appear only inside the PR comment artifact, never as UI chrome elsewhere on the page
- Mobile viewport: all sections are readable, no horizontal overflow

**Final checklist:**
- GitHub repo is public
- README explains what Meridian is, how to install the Action, and precisely how SigNoz is used, judging criterion 04 depends on this being explicit, not implied
- Demo video shows a real regression being caught, not just the landing page
- Google Form submitted: https://forms.gle/xv1TXSiC54MEWujRA
