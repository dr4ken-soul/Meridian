import { getTraceAggregates } from './signoz.js'
import type { RegressionDiff } from '../types/index.js'
/** Compares two SigNoz traces and applies Meridian regression thresholds. */
export async function diffTraces(baselineTraceId: string, replayTraceId: string): Promise<RegressionDiff> {
  const [baseline, replay] = await Promise.all([getTraceAggregates(baselineTraceId), getTraceAggregates(replayTraceId)])
  const toolCallDelta = (replay.toolCallCount ?? replay.spanCount) - (baseline.toolCallCount ?? baseline.spanCount)
  const latencyDeltaMs = (replay.p99DurationNs - baseline.p99DurationNs) / 1_000_000
  const costDeltaUsd = replay.costUsd !== undefined && baseline.costUsd !== undefined ? replay.costUsd - baseline.costUsd : undefined
  const threshold = Number(process.env.MERIDIAN_LATENCY_REGRESSION_THRESHOLD_MS ?? 200)
  return { baseline, replay, toolCallDelta, latencyDeltaMs, costDeltaUsd, isRegression: toolCallDelta !== 0 || latencyDeltaMs > threshold || (costDeltaUsd ?? 0) > 0 }
}
