import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../http'
import {
  analyzeWatchlist,
  fetchAiReport,
  fetchAiReportPage,
  fetchCurrentWatchlistAnalysisJob,
  fetchLatestAiReport,
  fetchWatchlistAnalysisJob,
} from '../ai'

vi.mock('../http', () => ({ request: vi.fn() }))

describe('AI report service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    request.mockResolvedValue({ items: [] })
  })

  it('sends pagination, date, category, and stock filters', async () => {
    await fetchAiReportPage({
      page: 2,
      pageSize: 20,
      date: '2026-07-13',
      filter: 'HIGH_RISK',
      code: '600519',
    })

    expect(request).toHaveBeenCalledWith(
      '/api/ai/reports/page?page=2&pageSize=20&date=2026-07-13&filter=HIGH_RISK&code=600519',
    )
  })

  it('omits the date so the backend can select the latest available day', async () => {
    await fetchAiReportPage({ page: 1, pageSize: 10, filter: 'ALL' })

    expect(request).toHaveBeenCalledWith('/api/ai/reports/page?page=1&pageSize=10&filter=ALL')
  })

  it('loads full report content only from the detail endpoint', async () => {
    await fetchAiReport(42)
    await fetchLatestAiReport('600519')

    expect(request).toHaveBeenNthCalledWith(1, '/api/ai/reports/42')
    expect(request).toHaveBeenNthCalledWith(2, '/api/ai/reports/latest?code=600519')
  })

  it('submits and polls a persistent watchlist analysis job', async () => {
    await analyzeWatchlist(12)
    await fetchCurrentWatchlistAnalysisJob()
    await fetchWatchlistAnalysisJob(88)

    expect(request).toHaveBeenNthCalledWith(1, '/api/ai/analyze-watchlist', {
      method: 'POST',
      body: { promptTemplateId: 12 },
    })
    expect(request).toHaveBeenNthCalledWith(2, '/api/ai/analyze-watchlist/jobs/current')
    expect(request).toHaveBeenNthCalledWith(3, '/api/ai/analyze-watchlist/jobs/88')
  })
})
