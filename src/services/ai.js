import { request } from './http'

export function fetchAiReports(code) {
  const query = code ? `?code=${encodeURIComponent(code)}` : ''
  return request(`/api/ai/reports${query}`)
}

export function analyzeWatchlist(promptTemplateId) {
  return request('/api/ai/analyze-watchlist', {
    method: 'POST',
    body: promptTemplateId ? { promptTemplateId } : {},
  })
}

export function deleteAiReports(ids) {
  return request('/api/ai/reports/batch-delete', {
    method: 'POST',
    body: { ids },
  })
}

export function analyzeStock(code, forceRefresh = true, promptTemplateId, targetReportId) {
  return request('/api/ai/analyze', {
    method: 'POST',
    body: { code, forceRefresh, promptTemplateId, targetReportId },
  })
}
