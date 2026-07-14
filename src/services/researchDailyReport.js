import { request } from './http'

export function fetchLatestResearchDailyReport() {
  return request('/api/ai/research-daily-reports/latest')
}

export function fetchResearchDailyReports(limit = 20) {
  return request(`/api/ai/research-daily-reports?limit=${limit}`)
}

export function fetchResearchDailyReportDetail(reportId) {
  return request(`/api/ai/research-daily-reports/${reportId}`)
}

export function rebuildResearchDailyReport(tradeDate) {
  const query = tradeDate ? `?tradeDate=${encodeURIComponent(tradeDate)}` : ''
  return request(`/api/ai/research-daily-reports/rebuild${query}`, {
    method: 'POST',
  })
}
