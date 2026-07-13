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

export function rebuildResearchDailyReport() {
  return request('/api/ai/research-daily-reports/rebuild', {
    method: 'POST',
  })
}
