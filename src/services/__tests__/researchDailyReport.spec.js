import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../http'
import { fetchResearchDailyReportHistory, fetchResearchDailyReportItems, rebuildResearchDailyReport } from '../researchDailyReport'

vi.mock('../http', () => ({
  request: vi.fn(),
}))

describe('researchDailyReport service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rebuilds the selected historical trade date', async () => {
    request.mockResolvedValue({ id: 2 })

    await rebuildResearchDailyReport('2026-07-13')

    expect(request).toHaveBeenCalledWith(
      '/api/ai/research-daily-reports/rebuild?tradeDate=2026-07-13',
      { method: 'POST' },
    )
  })

  it('loads a filtered decision page without downloading the entire watch pool', async () => {
    request.mockResolvedValue({ items: [], total: 0 })

    await fetchResearchDailyReportItems(12, {
      category: 'CAUTIOUS',
      action: 'WATCH',
      keyword: '宁德',
      sort: 'RISK_DESC',
      page: 2,
      pageSize: 8,
    })

    expect(request).toHaveBeenCalledWith(
      '/api/ai/research-daily-reports/12/items?category=CAUTIOUS&dataStatus=ALL&sort=RISK_DESC&page=2&pageSize=8&action=WATCH&keyword=%E5%AE%81%E5%BE%B7',
    )
  })

  it('pages historical reports on the server and applies an optional trade date', async () => {
    request.mockResolvedValue({ items: [], total: 0 })

    await fetchResearchDailyReportHistory({ page: 2, pageSize: 10, tradeDate: '2026-07-25' })

    expect(request).toHaveBeenCalledWith(
      '/api/ai/research-daily-reports/history?page=2&pageSize=10&tradeDate=2026-07-25',
    )
  })
})
