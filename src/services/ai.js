import { request } from './http'

export function fetchAiReports(code) {
  const query = code ? `?code=${encodeURIComponent(code)}` : ''
  return request(`/api/ai/reports${query}`)
}

export function analyzeWatchlist() {
  return request('/api/ai/analyze-watchlist', {
    method: 'POST',
  })
}

export function analyzeStock(code, forceRefresh = true) {
  return request('/api/ai/analyze', {
    method: 'POST',
    body: { code, forceRefresh },
  })
}
