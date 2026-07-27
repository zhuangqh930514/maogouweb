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

  it('sends keyword, sort and pin filters to the server', async () => {
    await fetchWatchlistPage({
      page: 1,
      pageSize: 50,
      keyword: '比亚迪',
      sort: 'AI_SCORE_DESC',
      pinnedOnly: true,
    })

    expect(request).toHaveBeenCalledWith(
      '/api/watchlist/page?page=1&pageSize=50&view=%E5%85%A8%E9%83%A8&sort=AI_SCORE_DESC&keyword=%E6%AF%94%E4%BA%9A%E8%BF%AA&pinnedOnly=true',
    )
  })
})
