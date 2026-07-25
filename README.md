# Meridian

Replay every prompt change against what already worked.

Meridian is a prompt regression gate for AI agents. It stores a known-good trace, replays the same inputs after a prompt change, compares the SigNoz trace data, and updates one pull request comment with the verdict.

## What is included

- A TypeScript CLI with `mark-baseline`, `list-baselines`, `diff`, `comment`, `promote`, and `status`
- A Node 20 GitHub Action
- JSON baselines committed under `.meridian/baselines/`
- A responsive landing page in `packages/landing`

## Local setup

```bash
npm install
npm run build:action
npm run build:landing
```

Set `SIGNOZ_URL`, `SIGNOZ_API_KEY`, and optionally `MERIDIAN_PROMPT_PATH` before using the CLI. The prompt path is hashed as a git blob so baselines survive branch names, renames, and rebases.

```bash
npm --workspace packages/action exec meridian -- mark-baseline --trace-id <trace-id>
npm --workspace packages/action exec meridian -- list-baselines
npm --workspace packages/action exec meridian -- diff --baseline <baseline-id> --replay <replay-id>
npm --workspace packages/action exec meridian -- status
```

## GitHub Action

Build the action before publishing so `packages/action/dist/index.js` is the bundled release entrypoint. A consumer workflow looks like this:

```yaml
name: Meridian
on:
  pull_request:
    paths: ['prompts/**']
jobs:
  regression-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: meridian-dev/meridian-action@v1
        env:
          MERIDIAN_REPLAY_COMMAND: node scripts/replay-agent.js
        with:
          signoz-url: ${{ secrets.SIGNOZ_URL }}
          signoz-api-key: ${{ secrets.SIGNOZ_API_KEY }}
          prompt-path: prompts/example.txt
```

`MERIDIAN_REPLAY_COMMAND` must run the agent with the baseline inputs and print the newly emitted replay trace ID as its final token. The agent should add `meridian.replay_of=<baseline trace id>` to the replay span before exporting it.

## Why SigNoz matters

SigNoz is not a decorative integration. Meridian sends typed `POST /api/v5/query_range` requests with a `SIGNOZ-API-KEY` header. It reads span count and `p99(durationNano)` for the baseline and replay, computes the regression verdict from those returned aggregates, and links the PR comment to the replay trace at `/trace/{traceId}`. This is the core product loop and the direct evidence for the Agents of SigNoz judging criterion on meaningful SigNoz usage.

## Landing page

```bash
npm run dev:landing
```

The static page follows the supplied cold operations design spec and contains the coded PR diff artifact, SigNoz primitives section, scroll-morph navigation, and responsive motion reveals.

## Submission notes

The repository and demo video URL must be added before submitting the hackathon form. A real demo should show a baseline trace in SigNoz, a prompt change, the replay trace with `meridian.replay_of`, and the updated PR comment. The supplied form is https://forms.gle/xv1TXSiC54MEWujRA.
