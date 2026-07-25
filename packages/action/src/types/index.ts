export interface TraceAggregates {
  traceId: string
  spanCount: number
  p99DurationNs: number
  toolCallCount?: number
  costUsd?: number
}
export interface RegressionDiff {
  baseline: TraceAggregates
  replay: TraceAggregates
  toolCallDelta: number
  latencyDeltaMs: number
  costDeltaUsd?: number
  isRegression: boolean
}
export interface BaselineRecord {
  promptHash: string
  traceId: string
  spanCount: number
  p99DurationNs: number
  promotedAt: number
  history?: Array<{ traceId: string; promotedAt: number; supersededAt: number }>
  inputs?: string
}
export interface QueryRangeRequest {
  start: number
  end: number
  requestType: 'time_series' | 'scalar' | 'table' | 'trace' | 'raw'
  compositeQuery: { queries: Array<{ type: 'builder_query' | 'clickhouse_sql'; spec: Record<string, unknown> }> }
}
export interface QueryRangeResponse { [key: string]: unknown }
