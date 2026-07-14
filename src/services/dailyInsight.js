import { request } from './http'

export function fetchDailyInsightToday() {
  return request('/api/ai/daily-insight/today')
}
