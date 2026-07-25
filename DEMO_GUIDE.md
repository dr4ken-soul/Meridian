# Meridian demo guide

This guide is for a clean screen recording. Do not use voiceover, subtitles, captions, title cards, or overlay text. Record the working screens and let the product UI and terminal output explain the flow.

## Order

1. Install dependencies
2. Build the Action and landing page
3. Run the tests
4. Push the built Action to GitHub
5. Configure SigNoz
6. Capture a real baseline trace
7. Replay the same input after a prompt change
8. Show the SigNoz comparison
9. Show the GitHub pull request comment
10. Record the final video

Do not record the final demo until the build and test commands pass.

## 1. Install, build, and test

Open PowerShell in the repository:

```powershell
cd "C:\Users\Paul\Documents\Coding Area\Hackathon\Meridian"

npm install
npm run build:action
npm run build:landing
npm test
```

Expected results:

- the install completes
- `packages/action/dist/index.js` exists
- the landing page production build completes
- the test command reports one passing test

The npm audit warning does not prevent the build. Do not run `npm audit fix --force` during demo preparation because it can introduce breaking changes.

## 2. Push the repository

The configured remote is:

```text
https://github.com/dr4ken-soul/Meridian.git
```

After the Action build:

```powershell
git add packages/action/dist
git commit -m "Add bundled GitHub Action"
git push -u origin main
```

If the bundled files were already committed, run:

```powershell
git push -u origin main
```

Then check:

```powershell
git status
```

## 3. Preview the landing page

Run:

```powershell
npm run dev:landing
```

Open the Vite URL, normally `http://localhost:5173`.

Check the hero, PR comment card, mechanism section, SigNoz section, final call to action, and mobile layout.

## 4. Configure SigNoz

Set these values in the same PowerShell window:

```powershell
$env:SIGNOZ_URL="https://your-signoz-instance"
$env:SIGNOZ_API_KEY="your-service-account-key"
$env:MERIDIAN_PROMPT_PATH="prompts/example.txt"
```

Never record the API key.

Check the connection:

```powershell
npm --workspace packages/action exec meridian -- status
```

Expected output:

```text
SigNoz is reachable.
```

## 5. Capture a baseline

Run the instrumented agent once with the known-good prompt. Find the trace in SigNoz and copy its trace ID.

Store it:

```powershell
npm --workspace packages/action exec meridian -- mark-baseline --trace-id YOUR_BASELINE_TRACE_ID
```

Confirm it:

```powershell
npm --workspace packages/action exec meridian -- list-baselines
```

The output should show the prompt hash, trace ID, span count, and p99 duration.

## 6. Create a real replay

Change:

```text
prompts/example.txt
```

Make the behaviour change obvious. For example, change an instruction that says to use tools only when necessary into one that causes additional tool use.

The replay runner must:

1. Load the changed prompt
2. Run the same input as the baseline
3. Export a new OpenTelemetry trace to SigNoz
4. Add `meridian.replay_of=<baseline-trace-id>`
5. Print the new replay trace ID as its final output

The Action receives the runner through:

```yaml
env:
  MERIDIAN_REPLAY_COMMAND: node scripts/replay-agent.js
```

## 7. Verify the comparison

Before involving GitHub, compare two real traces:

```powershell
npm --workspace packages/action exec meridian -- diff `
  --baseline YOUR_BASELINE_TRACE_ID `
  --replay YOUR_REPLAY_TRACE_ID
```

Confirm that the output contains the baseline, replay, deltas, and regression verdict.

## 8. Record the clean demo

Use OBS Studio, Windows Game Bar, Loom, or another screen recorder. Record the browser and terminal. Do not show secrets.

Aim for two to three minutes.

### Recording sequence

1. Start on the Meridian landing page and slowly scroll through the hero, PR comment card, mechanism section, and SigNoz section.
2. Switch to SigNoz and open the known-good baseline trace. Let the trace ID and spans remain visible briefly.
3. Switch to the terminal and run `list-baselines`. Keep the result visible long enough to read.
4. Open the prompt file and make the change.
5. Show the branch and pull request creation if the full GitHub flow is ready.
6. Show the replay command or GitHub Actions run completing.
7. Open the new replay trace in SigNoz and show the changed spans and `meridian.replay_of` attribute.
8. Open the pull request and show the Meridian comment with the verdict, metric table, and SigNoz link.
9. Click the SigNoz link from the pull request comment and return to the replay trace.

Do not add text to the video. Pause naturally on each screen so the reviewer can read the existing UI.

## 9. GitHub demo branch

If you are demonstrating the pull request flow:

```powershell
git checkout -b demo/prompt-regression
git add prompts/example.txt
git commit -m "Change agent prompt"
git push -u origin demo/prompt-regression
```

Open a pull request from that branch.

The strongest flow is:

```text
Prompt change -> replay trace -> SigNoz diff -> GitHub pull request comment
```

## 10. If the full Action flow is not ready

Use this shorter real-data recording:

1. Landing page
2. SigNoz baseline trace
3. `mark-baseline`
4. `list-baselines`
5. `diff` against a second real trace
6. Replay trace in SigNoz
7. Pull request comment if available

Do not fabricate trace IDs or diff values.
