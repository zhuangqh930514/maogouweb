import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../http'
import { fetchWatchlistPage } from '../watchlist'

vi.mock('../http', () => ({ request: vi.fn() }))

describe('watchlist service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends view and server-side pagination parameters', async () => {
    await fetchWatchlistPage({ page: 3, pageSize: 20, view: 'AI重点' })

    expect(request).toHaveBeenCalledWith(
      '/api/watchlist/page?page=3&pageSize=20&view=AI%E9%87%8D%E7%82%B9',
    )
  })
})
