import { request } from './http'

const QUERY_KEYS = [
  'page',
  'pageSize',
  'dateFrom',
  'dateTo',
  'stockCode',
  'status',
  'strategyReleaseId',
  'modelVersionId',
  'qualityStatus',
]

const ACTION_PATHS = Object.freeze({
  daily: 'run-daily',
  bootstrap: 'run-historical-bootstrap',
  labels: 'verify-labels',
  weekly: 'run-weekly',
  training: 'run-training',
})

export function fetchResearchOverview() {
  return request('/api/ai/research-lab/overview')
}

export const fetchResearchUniverse = (params) => fetchPage('universe', params)
export const fetchResearchDataBatches = (params) => fetchPage('data-batches', params)
export const fetchResearchSourceHealth = (params) => fetchPage('source-health', params)
export const fetchResearchSamples = (params) => fetchPage('samples', params)
export const fetchResearchPredictions = (params) => fetchPage('predictions', params)
export const fetchResearchLabels = (params) => fetchPage('labels', params)
export const fetchPredictionEvaluations = (params) => fetchPage('prediction-evaluations', params)
export const fetchResearchFactors = (params) => fetchPage('factors', params)
export const fetchFactorPerformance = (params) => fetchPage('factor-performance', params)
export const fetchTrainingDatasets = (params) => fetchPage('datasets', params)
export const fetchModelVersions = (params) => fetchPage('models', params)
export const fetchWalkForwardRuns = (params) => fetchPage('walk-forward', params)
export const fetchBacktestRuns = (params) => fetchPage('backtests', params)
export const fetchStrategyReleases = (params) => fetchPage('strategies', params)
export const fetchShadowEvaluations = (params) => fetchPage('shadow-evaluations', params)
export const fetchGovernanceEvents = (params) => fetchPage('governance-events', params)
export const fetchPipelineRuns = (params) => fetchPage('pipeline-runs', params)

export const fetchResearchSample = (id) => fetchDetail('samples', id)
export const fetchTrainingDataset = (id) => fetchDetail('datasets', id)
export const fetchModelVersion = (id) => fetchDetail('models', id)
export const fetchWalkForwardRun = (id) => fetchDetail('walk-forward', id)
export const fetchBacktestRun = (id) => fetchDetail('backtests', id)
export const fetchStrategyRelease = (id) => fetchDetail('strategies', id)
export const fetchPipelineRun = (id) => fetchDetail('pipeline-runs', id)

export function runResearchAction(action, payload = {}) {
  const path = ACTION_PATHS[action]
  if (!path) {
    throw new Error(`不支持的研究操作：${action}`)
  }
  return post(`/api/ai/research-lab/actions/${path}`, payload)
}

export function runUserProjection(payload = {}) {
  const { userId: ignoredUserId, ...safePayload } = payload
  return post('/api/ai/research-lab/actions/run-user-projection', safePayload)
}

export function promoteStrategy(strategyId, payload) {
  return governance(strategyId, 'promote', payload)
}

export function rejectStrategy(strategyId, payload) {
  return governance(strategyId, 'reject', payload)
}

export function rollbackStrategy(strategyId, payload) {
  return governance(strategyId, 'rollback', payload)
}

export async function pollPipelineRun(
  pipelineRunId,
  { interval = 1200, maxAttempts = 75, onUpdate } = {},
) {
  let latest = null
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    latest = await fetchPipelineRun(pipelineRunId)
    onUpdate?.(latest)
    const status = String(latest?.record?.fields?.status || '').toUpperCase()
    if (['SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'INSUFFICIENT_DATA', 'SKIPPED', 'CANCELLED'].includes(status)) {
      return latest
    }
    if (attempt < maxAttempts - 1) {
      await delay(interval)
    }
  }
  throw new Error('研究任务仍在运行，请稍后到运行记录查看')
}

function fetchPage(resource, params = {}) {
  const query = new URLSearchParams()
  for (const key of QUERY_KEYS) {
    const value = params?.[key]
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, value)
    }
  }
  const suffix = query.size ? `?${query.toString()}` : ''
  return request(`/api/ai/research-lab/${resource}${suffix}`)
}

function fetchDetail(resource, id) {
  if (id === null || id === undefined || id === '') {
    return Promise.reject(new Error('缺少研究记录 ID'))
  }
  return request(`/api/ai/research-lab/${resource}/${encodeURIComponent(id)}`)
}

function governance(strategyId, operation, payload = {}) {
  if (!strategyId) {
    return Promise.reject(new Error('缺少策略版本 ID'))
  }
  return post(`/api/ai/research-lab/strategies/${encodeURIComponent(strategyId)}/${operation}`, payload)
}

function post(path, body) {
  return request(path, { method: 'POST', body: compact(body) })
}

function compact(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  )
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}
