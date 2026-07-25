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

## Progress checklist

- [x] 1. Install dependencies
- [x] 2. Build the Action
- [x] 3. Build the landing page
- [x] 4. Run the automated test
- [x] 5. Push the repository to GitHub
- [ ] 6. Create and validate the SigNoz service account key (blocked by SigNoz signup review)
- [ ] 7. Capture and store a real baseline trace
- [ ] 8. Create and compare a replay trace
- [ ] 9. Show the GitHub pull request comment
- [ ] 10. Record the final demo

### Local setup status

WSL 2 is enabled and Ubuntu 24.04.1 LTS is now installed as a WSL 2 distribution. Docker is not installed yet. Use the Ubuntu terminal for the remaining local SigNoz setup.

- [x] Ubuntu installed in WSL 2
- [ ] Docker Engine installed inside Ubuntu
- [ ] SigNoz started at `http://localhost:8080`

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

### Current signup issue

If SigNoz shows the message **We're getting a high volume of sign-ups from personal addresses** and asks for a company email, this is a SigNoz Cloud signup restriction. It is not a Meridian error.

Choose one of these routes:

1. If you have access to a work, school, startup, or organisation email, use that address and continue with SigNoz Cloud.
2. If you do not have one, click **Contact cloud support** on the signup page or email `cloud-support@signoz.io` and explain that you are joining the Agents of SigNoz hackathon and need a temporary evaluation workspace.
3. If you need to continue immediately without waiting for Cloud support, use the self-hosted route below.

Do not keep retrying the same personal email. The screenshot indicates that the signup is being held by their traffic policy.

### Self-hosted fallback for Windows

The official self-hosted guide says Windows users should run SigNoz inside WSL 2 with Docker Engine, not Docker Desktop, because ClickHouse Keeper can restart under Docker Desktop's virtualization layer:

https://signoz.io/docs/install/docker/

This route requires WSL 2, Docker Engine inside WSL, at least 4 GB allocated memory, and open ports 8080, 4317, and 4318. After installation, open:

```text
http://localhost:8080
```

Use `http://localhost:8080` as `SIGNOZ_URL` for local CLI testing. A local SigNoz instance cannot be reached by a GitHub-hosted Action unless you expose it securely through a public HTTPS endpoint, so Cloud support is the simpler route for the full GitHub demo.

### One-time Windows action required now

Because the distro download is interactive and needs Windows access, do this on the machine:

1. Open **Microsoft Store**.
2. Search for **Ubuntu**.
3. Install the current Ubuntu application.
4. Open **Ubuntu** from the Start menu.
5. Wait for it to finish initialising.
6. Create a Linux username and password when prompted.
7. Close Ubuntu.
8. Open PowerShell and run:

```powershell
wsl --set-default-version 2
wsl --list --verbose
```

The Ubuntu row should show version `2`. If it shows version `1`, run:

```powershell
wsl --set-version Ubuntu 2
```

Then open Ubuntu again. Once you reach the Linux prompt, tell Codex:

```text
Ubuntu is installed in WSL 2 and I can open its terminal.
```

At that point the remaining Docker Engine and SigNoz commands can be run from the Ubuntu terminal.

This section is the exact setup sequence. You need two things from SigNoz:

1. The URL of your SigNoz workspace, used by Meridian to query traces
2. A SigNoz service account API key, used by Meridian in the `SIGNOZ-API-KEY` header

Do not confuse this API key with a SigNoz ingestion key. The ingestion key is used by your agent or OpenTelemetry collector to send telemetry. Meridian's service account API key is used to read the telemetry back.

### 4.1 Open your SigNoz workspace

Open the URL for your SigNoz Cloud workspace or your self-hosted SigNoz instance and sign in.

The official service account instructions are here:

https://signoz.io/docs/manage/administrator-guide/iam/service-accounts/

If you are using SigNoz Cloud, your workspace URL normally looks like:

```text
https://YOUR_WORKSPACE.REGION.signoz.cloud
```

Use the URL you already use to open the SigNoz dashboard. Do not add `/api` or `/trace` to the value of `SIGNOZ_URL`.

### 4.2 Create a service account

In the SigNoz web application:

1. Click **Settings** in the left navigation or workspace menu.
2. Click **Service Accounts**.
3. Click **New Service Account**.
4. Enter a name using lowercase letters, numbers, and hyphens, for example `meridian-demo`.
5. Click **Create**.
6. Click the new `meridian-demo` service account.
7. Open the **Overview** tab.
8. Use the **Roles** dropdown to assign a role that can read traces. A read-only viewer role is preferred for a demo.
9. Click **Save**.

If **Service Accounts** or **Roles** is unavailable, your SigNoz user does not have the required admin permission. Ask the workspace administrator to create the account and key for you.

### 4.3 Generate and copy the API key

While viewing the service account:

1. Click the **Keys** tab.
2. Click **Add Key**.
3. Name it `meridian-demo-key`.
4. Leave the expiration enabled if you only need the key for the hackathon.
5. Click **Create**.
6. Copy the key immediately.

SigNoz shows the key value only once. Store it temporarily in a password manager or secure note. Never put it in the repository and never show it in the recording.

### 4.4 Validate the key before configuring Meridian

In PowerShell, replace both placeholders and run:

```powershell
$signozUrl = "https://YOUR_WORKSPACE.REGION.signoz.cloud"
$signozApiKey = "PASTE_THE_SERVICE_ACCOUNT_KEY_HERE"

Invoke-RestMethod `
  -Method Get `
  -Uri "$signozUrl/api/v1/service_accounts/me" `
  -Headers @{ "SIGNOZ-API-KEY" = $signozApiKey }
```

If the command returns service account information, the key works. If it returns `401`, create a new key or copy the existing key again. If it cannot connect, check the workspace URL.

### 4.5 Set Meridian's environment variables

In the same PowerShell window:

```powershell
$env:SIGNOZ_URL = $signozUrl
$env:SIGNOZ_API_KEY = $signozApiKey
$env:MERIDIAN_PROMPT_PATH = "prompts/example.txt"
```

Check Meridian's connection:

```powershell
npm --workspace packages/action exec meridian -- status
```

The expected output is:

```text
SigNoz is reachable.
```

These environment variables last only for the current PowerShell window. If you open a new window, set them again.

### 4.6 Find a trace in SigNoz

In the SigNoz web application:

1. Click **Traces** in the left navigation.
2. Set the time range to **Last 15 minutes** or **Last 1 hour**.
3. Use the service or operation filters if there are many traces.
4. Click a trace row to open its details.
5. Copy the **Trace ID** shown in the trace details panel.

The official Trace Explorer guide is here:

https://signoz.io/docs/userguide/traces/

The Trace Explorer can also search directly by a specific Trace ID. The official query guide is here:

https://signoz.io/docs/apm-and-distributed-tracing/querying-traces/

If no traces appear, first run the instrumented agent and wait for the normal OpenTelemetry ingestion delay. Confirm that the agent is sending telemetry to the correct SigNoz ingestion endpoint and that its service appears under **Services**.

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
