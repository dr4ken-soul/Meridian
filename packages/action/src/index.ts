import * as core from '@actions/core'
import { diffTraces } from './lib/diff.js'
import { postOrUpdateComment } from './lib/github.js'
import { getPromptBlobHash, getPromptPath } from './lib/git.js'
import { loadBaseline } from './lib/baseline.js'
/** Runs the Meridian pull request action. Replay is delegated to MERIDIAN_REPLAY_COMMAND. */
export async function run(): Promise<void> {
  process.env.SIGNOZ_URL ??= core.getInput('signoz-url')
  process.env.SIGNOZ_API_KEY ??= core.getInput('signoz-api-key')
  process.env.MERIDIAN_PROMPT_PATH ??= core.getInput('prompt-path') || 'prompts/'
  const promptHash = getPromptBlobHash(getPromptPath()); const baseline = await loadBaseline(promptHash)
  if (!baseline) { core.info('No baseline found for this prompt. Run `meridian mark-baseline` first.'); return }
  const replayCommand = process.env.MERIDIAN_REPLAY_COMMAND
  if (!replayCommand) throw new Error('Set MERIDIAN_REPLAY_COMMAND to the command that runs your agent and prints the replay trace ID.')
  const { execFileSync } = await import('node:child_process')
  const output = execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', replayCommand], { encoding: 'utf8' }).trim()
  const replayTraceId = output.split(/\s+/).pop()
  if (!replayTraceId) throw new Error('MERIDIAN_REPLAY_COMMAND did not return a replay trace ID.')
  const diff = await diffTraces(baseline.traceId, replayTraceId); await postOrUpdateComment(diff, replayTraceId)
  if (diff.isRegression) core.setFailed('Meridian detected a regression. See the PR comment for details.')
}
if (process.env.GITHUB_ACTIONS === 'true') run().catch((error: unknown) => core.setFailed(error instanceof Error ? error.message : String(error)))
