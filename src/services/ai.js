import { request } from './http'

export function fetchAiReports(code) {
  const query = code ? `?code=${encodeURIComponent(code)}` : ''
  return request(`/api/ai/reports${query}`)
}

export function fetchAiReportPage({ page = 1, pageSize = 10, date, filter = 'ALL', code } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (date) query.set('date', date)
  if (filter) query.set('filter', filter)
  if (code) query.set('code', code)
  return request(`/api/ai/reports/page?${query.toString()}`)
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
