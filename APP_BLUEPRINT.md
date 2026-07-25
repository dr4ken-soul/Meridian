# Meridian — App Blueprint

## Product Summary

Meridian is a prompt regression gate for AI agents. It stores a known-good agent run as a baseline trace, replays the same inputs against every prompt change opened as a pull request, diffs the two runs for tool call count, latency and token cost, and posts the verdict straight to the PR as a comment linking back into SigNoz. A prompt that passed once is not a prompt that always will, and Meridian is the check that catches the difference before it merges.

Built for the Agents of SigNoz hackathon (WeMakeDevs, in partnership with SigNoz), July 20 to 26 2026. Track 01, AI & Agent Observability, with the depth of SigNoz usage also targeting judging criterion 04, Best Use of SigNoz. SigNoz is the entire backend, baseline storage, replay comparison, metric diffing and the link-out from the PR comment all run through it. Remove SigNoz and there is no product, only a script that runs an agent twice.

---

## Market Context

**Who this is for:**

1. AI engineering teams shipping agent prompts to production who currently have no gate between "the prompt looked fine when I tested it" and "the prompt is live"
2. Solo developers and small teams running LLM-powered products who rely on manually spot-checking a few examples after a prompt change and hoping nothing else broke
3. Platform and SRE teams responsible for agent reliability who need a record of what a prompt change actually cost in latency and spend, not just a diff of the text

**What they currently use:** manual regression testing by rerunning a handful of example prompts by hand, eyeballing the output before approving a merge, or nothing at all until a user reports something odd. Some teams use LLM eval frameworks that score output correctness against a labelled dataset, but few of those connect the check to the operational cost of the change: tool call counts, latency, spend, the signals that already live in an observability platform, not an eval harness.

**Why they switch:** an eval framework answers "did the output get worse". Meridian answers a different question: "did the agent's behaviour change in a way that costs more or breaks something downstream", using the trace data the team already has in SigNoz rather than a separate golden dataset that someone has to maintain by hand.

---

## MVP Feature Set

### Feature 1: Golden Trace Capture

**User story:** As a developer I want to mark a known-good agent run as a baseline so Meridian has something to replay against on the next prompt change.

**How it works:** `meridian mark-baseline --trace-id <id>` calls SigNoz's `POST /api/v5/query_range` with `requestType: "trace"` and a `builder_query` filtered by `traceID = '<id>'`, pulls the run's span count and duration directly from the response, and writes it as a baseline record keyed to the prompt file's git blob hash rather than the branch name, so it survives renames and rebases.

**Acceptance criteria:** after `meridian mark-baseline`, `meridian list-baselines` shows the new entry with its prompt hash, span count and p99 duration exactly as returned by SigNoz, not recomputed locally.

**Complexity:** Medium

---

### Feature 2: Replay on Push

**User story:** As a developer I want Meridian to automatically re-run my baseline inputs against a changed prompt when I open a pull request, so I do not have to remember to test manually.

**How it works:** A GitHub Action triggers on `pull_request` events touching the configured prompt path. It resolves the current baseline for that prompt's hash, re-invokes the agent's entrypoint with the baseline's original inputs, and lets the run emit its own OTel trace into SigNoz as normal, tagged with a `meridian.replay_of=<baseline_trace_id>` span attribute so the two runs stay correlated inside SigNoz itself rather than in a side table.

**Acceptance criteria:** opening a PR that touches the prompt path produces exactly one new trace tagged with the correct `meridian.replay_of` attribute, visible in SigNoz within the instance's normal ingestion latency.

**Complexity:** High

---

### Feature 3: Diff Computation

**User story:** As a developer I want to see exactly what changed in tool calls, latency and cost between the baseline and the replay, so I can judge whether the prompt change is safe to merge.

**How it works:** Meridian queries SigNoz twice through `POST /api/v5/query_range`, once for the baseline's span aggregates and once for the replay's, using `signal: "traces"` with `count()` and `p99(durationNano)` aggregations, plus a metrics query for token cost when the agent emits a `gen_ai.usage.cost` metric. The two results are diffed field by field. A run is flagged as a regression if tool call count changes at all, or if latency or cost increases beyond a configurable threshold.

**Acceptance criteria:** given two known trace IDs with different span counts, `meridian diff --baseline <id> --replay <id>` prints the same delta a manual SigNoz Query Builder query returns for the same two traces.

**Complexity:** High

---

### Feature 4: PR Comment Posting

**User story:** As a developer reviewing a pull request I want the regression verdict to appear directly in the PR, so I never have to leave GitHub to know whether a prompt change is safe to merge.

**How it works:** once the diff is computed, Meridian formats it as a markdown comment, a verdict badge, a metric table and a link into SigNoz's Trace Explorer filtered to the replay's trace ID, then posts it via `POST /repos/{owner}/{repo}/issues/{pull_number}/comments` using a GitHub App token scoped to that repository only. If a Meridian comment already exists on the PR, it edits that comment in place rather than posting a new one on every push.

**Acceptance criteria:** exactly one Meridian comment appears on the PR after the first push, and it updates in place on subsequent pushes to the same branch rather than duplicating.

**Complexity:** Medium

---

### Feature 5: Baseline Promotion

**User story:** As a developer I want a merged prompt change to become the new baseline, so the next comparison runs against what is actually live, not a stale reference.

**How it works:** on merge to the default branch, a second Action step calls `meridian promote --trace-id <replay_trace_id>`, which overwrites the baseline record for that prompt's hash with the replay trace that was just approved and merged. The previous baseline is retained in history but no longer used for future diffs.

**Acceptance criteria:** after a merge, `meridian list-baselines` shows the former replay trace as the new baseline, and the prior baseline remains visible in history with a superseded marker.

**Complexity:** Low

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| CLI / Action runtime | Node.js 18+ with TypeScript | Runs natively on GitHub Actions' node20 runner, no extra install step |
| SigNoz client | Direct HTTP via `fetch` to `/api/v5/query_range` | No official JS SDK covers this endpoint yet, a thin typed wrapper is more reliable than depending on a third-party client |
| Baseline storage | JSON committed to the repo under `.meridian/baselines/` | Keeps baselines versioned alongside the prompt they belong to, no external database to stand up for a hackathon build |
| GitHub integration | `@octokit/rest` | Official SDK, well typed, the standard choice for Actions |
| CI packaging | GitHub Action, `action.yml` plus a compiled JS bundle | Distributable through the Marketplace, the natural install path for the target audience |
| Landing page framework | React 18, Vite, TypeScript | Fast build, standard tooling |
| Styling | Tailwind CSS | Utility first, matches FRONTEND_SPEC.md exactly |
| Animations | `motion/react` | Correct import path for v11 and above |
| Icons | Lucide React | Clean, tree-shakeable |

---

## SigNoz Integration Detail

### Client and authentication

```typescript
/**
 * Thin typed client for the SigNoz v5 query_range endpoint.
 * Reads the instance URL and API key from environment variables set by
 * the GitHub Action, since no first-party SDK covers this endpoint yet.
 * @param body - the query_range request payload
 * @returns the parsed JSON response from SigNoz
 */
const SIGNOZ_URL = process.env.SIGNOZ_URL // e.g. https://example.signoz.io
const SIGNOZ_API_KEY = process.env.SIGNOZ_API_KEY

export async function queryRange(body: QueryRangeRequest): Promise<QueryRangeResponse> {
  const res = await fetch(`${SIGNOZ_URL}/api/v5/query_range`, {
    method: 'POST',
    headers: {
      'SIGNOZ-API-KEY': SIGNOZ_API_KEY ?? '',
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

### Fetching a trace's span aggregates

```typescript
/**
 * Fetches aggregate span metrics for a single trace: span count and p99
 * span duration. Used for both the baseline and the replay side of a diff.
 * @param traceId - the SigNoz trace ID to aggregate over
 * @returns span count and p99 duration for the given trace
 */
export async function getTraceAggregates(traceId: string): Promise<TraceAggregates> {
  const now = Date.now()
  const response = await queryRange({
    start: now - 24 * 60 * 60 * 1000,
    end: now,
    requestType: 'table',
    compositeQuery: {
      queries: [
        {
          type: 'builder_query',
          spec: {
            name: 'A',
            signal: 'traces',
            stepInterval: 60,
            aggregations: [
              { expression: 'count()', alias: 'span_count' },
              { expression: 'p99(durationNano)', alias: 'p99_duration_ns' },
            ],
            filter: { expression: `traceID = '${traceId}'` },
            disabled: false,
          },
        },
      ],
    },
  })
  return parseTraceAggregates(response, traceId)
}
```

### Diffing baseline against replay

```typescript
/**
 * Computes the regression diff between a baseline trace and its replay.
 * Tool call count and latency come from trace aggregates, token cost comes
 * from a metrics query when the agent emits gen_ai.usage.cost.
 * @param baselineTraceId - the trace marked as the known-good reference
 * @param replayTraceId - the trace produced by replaying the same inputs
 * @returns the computed diff and regression verdict
 */
export async function diffTraces(
  baselineTraceId: string,
  replayTraceId: string,
): Promise<RegressionDiff> {
  const [baseline, replay] = await Promise.all([
    getTraceAggregates(baselineTraceId),
    getTraceAggregates(replayTraceId),
  ])

  const toolCallDelta = replay.spanCount - baseline.spanCount
  const latencyDeltaMs = (replay.p99DurationNs - baseline.p99DurationNs) / 1_000_000

  return {
    toolCallDelta,
    latencyDeltaMs,
    isRegression:
      toolCallDelta !== 0 || latencyDeltaMs > MERIDIAN_LATENCY_REGRESSION_THRESHOLD_MS,
  }
}
```

### Linking back to SigNoz from the PR comment

```typescript
/**
 * Builds a direct link to the SigNoz Trace Details page for a single trace.
 * SigNoz retired its legacy trace view path (/trace-old, which redirected
 * to /trace) in a recent release, confirming /trace/{traceId} as the
 * current stable path for this view, not a filtered Trace Explorer query.
 * @param traceId - the trace to link directly to
 * @returns a URL into the SigNoz Trace Details page for the given trace
 */
export function buildTraceDetailLink(traceId: string): string {
  return `${SIGNOZ_URL}/trace/${traceId}`
}
```

---

## Data Structures

```typescript
interface TraceAggregates {
  traceId: string
  spanCount: number
  p99DurationNs: number
}

interface RegressionDiff {
  toolCallDelta: number
  latencyDeltaMs: number
  costDeltaUsd?: number
  isRegression: boolean
}

interface BaselineRecord {
  promptHash: string   // git blob hash of the prompt file
  traceId: string
  spanCount: number
  p99DurationNs: number
  promotedAt: number   // unix timestamp
}

interface QueryRangeRequest {
  start: number
  end: number
  requestType: 'time_series' | 'scalar' | 'table' | 'trace' | 'raw'
  compositeQuery: {
    queries: Array<{
      type: 'builder_query' | 'clickhouse_sql'
      spec: Record<string, unknown>
    }>
  }
}
```

---

## CLI Commands

| Command | Description |
|---|---|
| `meridian mark-baseline --trace-id <id>` | Marks a SigNoz trace as the baseline for the current prompt hash |
| `meridian list-baselines` | Lists all stored baselines with their prompt hash and key metrics |
| `meridian diff --baseline <id> --replay <id>` | Prints the regression diff between two trace IDs |
| `meridian comment --pr <number>` | Posts or updates the diff comment on a pull request |
| `meridian promote --trace-id <id>` | Overwrites the baseline for the current prompt hash after a merge |
| `meridian status` | Checks that SigNoz is reachable with the configured API key |

---

## Environment Variables

```
SIGNOZ_URL=https://example.signoz.io
SIGNOZ_API_KEY=
MERIDIAN_LATENCY_REGRESSION_THRESHOLD_MS=200
MERIDIAN_PROMPT_PATH=prompts/
GITHUB_TOKEN=
```

---

## Landing Page Routes

Single-page marketing site, no client-side routing. All sections live on the root `/` path, per FRONTEND_SPEC.md. Deployed to Vercel as a static build.

---

## What Is Not Being Built in MVP

- Multi-baseline support, comparing against more than one historical run at once
- Automatic threshold tuning based on historical variance
- Support for CI providers other than GitHub Actions
- A hosted SaaS control plane, this ships as a self-installed Action against the team's own SigNoz instance
- Token cost diffing for agents that don't emit `gen_ai.usage.cost` as an OTel metric
- Slack or email notification channels beyond the PR comment

These are deferred until after the hackathon.

---

## Hackathon Build Priority

Deadline: July 26, 2026. Submitting under Track 01, AI & Agent Observability, with the depth of SigNoz usage also weighed under judging criterion 04, Best Use of SigNoz.

Priority order:
1. SigNoz reachable via `query_range` with a working service account key
2. `mark-baseline` correctly pulling and storing span aggregates for a real trace
3. Replay working end to end against a small test agent, confirmed the new trace is tagged and visible in SigNoz
4. Diff computation matching a manual Query Builder query for the same two traces
5. PR comment posting and updating correctly via the GitHub API
6. Landing page live and deployed
7. `promote`, `list-baselines` and `status` working
8. README complete with install steps, a demo video link, and exactly how SigNoz is used for judging criterion 04
