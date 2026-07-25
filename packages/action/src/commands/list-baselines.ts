import { listBaselines as readBaselines } from '../lib/baseline.js'
/** Prints all stored baselines. */
export async function listBaselines(): Promise<void> { const records = await readBaselines(); if (!records.length) { console.log('No baselines found. Run `meridian mark-baseline` first.'); return }; for (const record of records) console.log(`${record.promptHash}  ${record.traceId}  ${record.spanCount} spans  p99 ${Math.round(record.p99DurationNs / 1e6)}ms`) }
