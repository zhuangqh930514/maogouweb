import { request } from './http'

export function fetchDailyInsightToday() {
  return request('/api/ai/daily-insight/today')
}

export function rebuildDailyInsight() {
  return request('/api/ai/daily-insight/rebuild', {
    method: 'POST',
  })
}
