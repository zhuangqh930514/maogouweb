import { request } from './http'

export function fetchLearningDashboard() {
  return request('/api/ai/learning/dashboard')
}

export function fetchLearningSamples(params = {}) {
  const query = new URLSearchParams()
  if (params.stockCode) query.set('stockCode', params.stockCode)
  if (params.limit) query.set('limit', params.limit)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/api/ai/learning/samples${suffix}`)
}

export function fetchLearningSampleDetail(sampleId) {
  return request(`/api/ai/learning/samples/${sampleId}`)
}

export function buildWatchlistSamples(payload = {}) {
  return request('/api/ai/learning/samples/build-watchlist', {
    method: 'POST',
    body: payload,
  })
}

export function recomputeSampleFactors(sampleId) {
  return request(`/api/ai/learning/samples/${sampleId}/recompute-factors`, {
    method: 'POST',
  })
}

export function fetchFactorFactory() {
  return request('/api/ai/learning/factor-factory')
}

export function fetchLearningPredictions(limit = 200) {
  return request(`/api/ai/learning/predictions?limit=${limit}`)
}

export function rankLearningUniverse(payload = {}) {
  return request('/api/ai/learning/predictions/rank-universe', {
    method: 'POST',
    body: payload,
  })
}

export function fetchLearningLabels(limit = 200) {
  return request(`/api/ai/learning/labels?limit=${limit}`)
}

export function verifyLearningLabels() {
  return request('/api/ai/learning/labels/verify', {
    method: 'POST',
  })
}

export function fetchLearningExperiments() {
  return request('/api/ai/learning/experiments')
}

export function runLearningExperiment(payload = {}) {
  return request('/api/ai/learning/experiments/run', {
    method: 'POST',
    body: payload,
  })
}

export function fetchLearningBacktests() {
  return request('/api/ai/learning/backtests')
}

export function fetchLearningBacktestDetail(runId) {
  return request(`/api/ai/learning/backtests/${runId}`)
}

export function runLearningBacktest(payload = {}) {
  return request('/api/ai/learning/backtests/run', {
    method: 'POST',
    body: payload,
  })
}

export function fetchLearningModelEvals() {
  return request('/api/ai/learning/model-evals')
}

export function runLearningModelEval(payload = {}) {
  return request('/api/ai/learning/model-evals/run', {
    method: 'POST',
    body: payload,
  })
}
