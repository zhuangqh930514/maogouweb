import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../http'
import { fetchPortfolioPositions } from '../portfolio'

vi.mock('../http', () => ({ request: vi.fn() }))

describe('portfolio service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests only the visible position page', async () => {
    await fetchPortfolioPositions({ page: 2, pageSize: 20 })

    expect(request).toHaveBeenCalledWith('/api/portfolio/positions?page=2&pageSize=20')
  })
})
