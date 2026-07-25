import { getTraceAggregates } from '../lib/signoz.js'
import { getPromptBlobHash, getPromptPath } from '../lib/git.js'
import { loadBaseline, saveBaseline } from '../lib/baseline.js'
/** Promotes an approved replay and retains the previous record in history. */
export async function promote(traceId: string): Promise<void> { const promptHash = getPromptBlobHash(getPromptPath()); const current = await loadBaseline(promptHash); const trace = await getTraceAggregates(traceId); const history = current ? [...(current.history ?? []), { traceId: current.traceId, promotedAt: current.promotedAt, supersededAt: Date.now() }] : []; await saveBaseline({ promptHash, traceId, spanCount: trace.spanCount, p99DurationNs: trace.p99DurationNs, promotedAt: Date.now(), history }); console.log(`Promoted ${traceId} as the baseline for ${promptHash}`) }
