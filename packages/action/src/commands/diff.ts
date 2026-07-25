import { diffTraces } from '../lib/diff.js'
/** Prints a trace comparison and exits non-zero for a regression. */
export async function printDiff(baseline: string, replay: string): Promise<void> { const result = await diffTraces(baseline, replay); console.log(JSON.stringify(result, null, 2)); if (result.isRegression) process.exitCode = 1 }
