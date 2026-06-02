import { request } from './http'

export function fetchAiEvolutionDashboard() {
  return request('/api/ai/evolution/dashboard')
}

export function fetchAiEvolutionReviews() {
  return request('/api/ai/evolution/reviews')
}

export function verifyAiEvolutionReviews() {
  return request('/api/ai/evolution/reviews/verify', {
    method: 'POST',
  })
}

export function fetchAiEvolutionFactors() {
  return request('/api/ai/evolution/factors')
}

export function refreshAiEvolutionFactors() {
  return request('/api/ai/evolution/factors/refresh', {
    method: 'POST',
  })
}

export function fetchAiEvolutionStrategies() {
  return request('/api/ai/evolution/strategies')
}

export function evolveAiStrategy() {
  return request('/api/ai/evolution/strategies/evolve', {
    method: 'POST',
  })
}

export function activateAiStrategy(strategyId) {
  return request(`/api/ai/evolution/strategies/${strategyId}/activate`, {
    method: 'POST',
  })
}
