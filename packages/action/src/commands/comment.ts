import { diffTraces } from '../lib/diff.js'
import { postOrUpdateComment } from '../lib/github.js'
/** Posts or updates the current pull request report. */
export async function comment(baseline: string, replay: string): Promise<void> { const result = await diffTraces(baseline, replay); await postOrUpdateComment(result, replay); if (result.isRegression) process.exitCode = 1 }
