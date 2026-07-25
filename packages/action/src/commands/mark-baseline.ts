import { getTraceAggregates } from '../lib/signoz.js'
import { getPromptBlobHash, getPromptPath } from '../lib/git.js'
import { saveBaseline } from '../lib/baseline.js'
/** Marks a trace as the baseline for the current prompt. */
export async function markBaseline(traceId: string): Promise<void> { const hash = getPromptBlobHash(getPromptPath()); const trace = await getTraceAggregates(traceId); await saveBaseline({ promptHash: hash, traceId, spanCount: trace.spanCount, p99DurationNs: trace.p99DurationNs, promotedAt: Date.now() }); console.log(`Baseline saved for ${hash}: ${trace.spanCount} spans, p99 ${Math.round(trace.p99DurationNs / 1e6)}ms`) }
