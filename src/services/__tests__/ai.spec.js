import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../http'
import { fetchAiReportPage } from '../ai'

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
})
