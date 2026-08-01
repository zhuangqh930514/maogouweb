import { request } from './http'

export function fetchLatestResearchDailyReport() {
  return request('/api/ai/research-daily-reports/latest')
}

export function fetchResearchDailyReports(limit = 20) {
  return request(`/api/ai/research-daily-reports?limit=${limit}`)
}

export function fetchResearchDailyReportHistory(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
  })
  if (options.tradeDate) params.set('tradeDate', options.tradeDate)
  return request(`/api/ai/research-daily-reports/history?${params.toString()}`)
}

export function fetchResearchDailyReportOverview(historyLimit = 20) {
  return request(`/api/ai/research-daily-reports/overview?historyLimit=${historyLimit}`)
}

export function fetchResearchDailyReportDetail(reportId) {
  return request(`/api/ai/research-daily-reports/${reportId}`)
}

export function fetchResearchDailyReportItems(reportId, options = {}) {
  const params = new URLSearchParams()
  const values = {
    category: options.category || 'ALL',
    dataStatus: options.dataStatus || 'ALL',
    sort: options.sort || 'SYSTEM_SCORE_DESC',
    page: options.page || 1,
    pageSize: options.pageSize || 8,
  }
  if (options.action) values.action = options.action
  if (options.keyword?.trim()) values.keyword = options.keyword.trim()
  Object.entries(values).forEach(([key, value]) => params.set(key, value))
  return request(`/api/ai/research-daily-reports/${reportId}/items?${params.toString()}`)
}

export function fetchResearchDailyReportIssues(reportId, options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 20),
  })
  return request(`/api/ai/research-daily-reports/${reportId}/issues?${params.toString()}`)
}

export function fetchResearchDailyReportFeedback(reportId) {
  return request(`/api/ai/research-daily-reports/${reportId}/feedback`)
}

export function submitResearchDailyReportFeedback(reportId, payload) {
  return request(`/api/ai/research-daily-reports/${reportId}/feedback`, {
    method: 'POST',
    body: payload,
  })
}

export function rebuildResearchDailyReport(tradeDate) {
  const query = tradeDate ? `?tradeDate=${encodeURIComponent(tradeDate)}` : ''
  return request(`/api/ai/research-daily-reports/rebuild${query}`, {
    method: 'POST',
  })
}
