import { Octokit } from '@octokit/rest'
import { buildTraceDetailLink } from './signoz.js'
import type { RegressionDiff } from '../types/index.js'
const marker = '<!-- meridian-regression-report -->'
/** Formats a compact, updateable PR regression report. */
export function formatComment(diff: RegressionDiff, replayTraceId: string): string {
  const verdict = diff.isRegression ? 'REGRESSION DETECTED' : 'PASS'
  return `${marker}\n## Meridian: ${verdict}\n\n| Metric | Baseline | Replay | Delta |\n| --- | ---: | ---: | ---: |\n| Span count | ${diff.baseline.spanCount} | ${diff.replay.spanCount} | ${diff.toolCallDelta >= 0 ? '+' : ''}${diff.toolCallDelta} |\n| p99 latency | ${Math.round(diff.baseline.p99DurationNs / 1e6)}ms | ${Math.round(diff.replay.p99DurationNs / 1e6)}ms | ${diff.latencyDeltaMs >= 0 ? '+' : ''}${diff.latencyDeltaMs.toFixed(1)}ms |\n${diff.costDeltaUsd === undefined ? '' : `| Token cost | $${(diff.baseline.costUsd ?? 0).toFixed(4)} | $${(diff.replay.costUsd ?? 0).toFixed(4)} | ${diff.costDeltaUsd >= 0 ? '+' : ''}$${diff.costDeltaUsd.toFixed(4)} |\n`}\n[View the replay trace in SigNoz](${buildTraceDetailLink(replayTraceId)})`
}
/** Creates or edits the single Meridian comment on the current pull request. */
export async function postOrUpdateComment(diff: RegressionDiff, replayTraceId: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  const repository = process.env.GITHUB_REPOSITORY
  const pullNumber = Number(process.env.GITHUB_PR_NUMBER ?? process.env.PR_NUMBER)
  if (!token || !repository || !pullNumber) throw new Error('GitHub comment settings are missing. Set GITHUB_TOKEN, GITHUB_REPOSITORY and GITHUB_PR_NUMBER.')
  const [owner, repo] = repository.split('/')
  const octokit = new Octokit({ auth: token })
  const comments = await octokit.rest.issues.listComments({ owner, repo, issue_number: pullNumber, per_page: 100 })
  const body = formatComment(diff, replayTraceId).slice(0, 65000)
  const existing = comments.data.find((comment) => comment.body?.includes(marker))
  if (existing) await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body })
  else await octokit.rest.issues.createComment({ owner, repo, issue_number: pullNumber, body })
}
