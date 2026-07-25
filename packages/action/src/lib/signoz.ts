import type { QueryRangeRequest, QueryRangeResponse, TraceAggregates } from '../types/index.js'

const getConfig = (): { url: string; key: string } => {
  const url = process.env.SIGNOZ_URL?.replace(/\/$/, '')
  const key = process.env.SIGNOZ_API_KEY
  if (!url || !key) throw new Error('SigNoz is not reachable. Check SIGNOZ_URL and SIGNOZ_API_KEY.')
  return { url, key }
}

/** Sends a typed query_range request to SigNoz. */
export async function queryRange(body: QueryRangeRequest): Promise<QueryRangeResponse> {
  const { url, key } = getConfig()
  let response: Response
  try {
    response = await fetch(`${url}/api/v5/query_range`, { method: 'POST', headers: { 'SIGNOZ-API-KEY': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch (error) {
    throw new Error(`SigNoz is not reachable. Check SIGNOZ_URL and SIGNOZ_API_KEY. ${String(error)}`)
  }
  if (!response.ok) throw new Error(`SigNoz query_range failed: ${response.status} ${await response.text()}`)
  return await response.json() as QueryRangeResponse
}

const numberFrom = (value: unknown): number | undefined => typeof value === 'number' ? value : typeof value === 'string' && Number.isFinite(Number(value)) ? Number(value) : undefined
const findNumbers = (value: unknown, names: string[]): number[] => {
  if (!value || typeof value !== 'object') return []
  const object = value as Record<string, unknown>
  const direct = names.flatMap((name) => { const number = numberFrom(object[name]); return number === undefined ? [] : [number] })
  return [...direct, ...Object.values(object).flatMap((child) => findNumbers(child, names))]
}

/** Fetches span count and p99 duration for one trace from SigNoz. */
export async function getTraceAggregates(traceId: string): Promise<TraceAggregates> {
  const now = Date.now()
  const response = await queryRange({ start: now - 86400000, end: now, requestType: 'table', compositeQuery: { queries: [{ type: 'builder_query', spec: { name: 'A', signal: 'traces', stepInterval: 60, aggregations: [{ expression: 'count()', alias: 'span_count' }, { expression: 'p99(durationNano)', alias: 'p99_duration_ns' }], filter: { expression: `traceID = '${traceId}'` }, disabled: false } }] } })
  const spans = findNumbers(response, ['span_count', 'spanCount', 'count'])
  const durations = findNumbers(response, ['p99_duration_ns', 'p99DurationNs', 'p99'])
  if (spans[0] === undefined || durations[0] === undefined) throw new Error(`SigNoz returned no aggregates for trace ${traceId}.`)
  return { traceId, spanCount: spans[0], p99DurationNs: durations[0] }
}

/** Builds the stable deep link used by CLI output and PR comments. */
export function buildTraceDetailLink(traceId: string): string {
  const { url } = getConfig()
  return `${url}/trace/${traceId}`
}

/** Checks SigNoz availability with a lightweight query request. */
export async function checkSignoz(): Promise<void> {
  await queryRange({ start: Date.now() - 60000, end: Date.now(), requestType: 'table', compositeQuery: { queries: [{ type: 'builder_query', spec: { name: 'A', signal: 'traces', stepInterval: 60, aggregations: [{ expression: 'count()', alias: 'span_count' }], filter: { expression: 'true' }, disabled: false } }] } })
}
