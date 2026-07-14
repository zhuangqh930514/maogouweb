import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../http'
import { rebuildResearchDailyReport } from '../researchDailyReport'

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
})
