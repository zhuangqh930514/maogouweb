import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../http'
import { fetchHomeOverview } from '../home'

vi.mock('../http', () => ({ request: vi.fn() }))

describe('home service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the complete initial dashboard with one request', async () => {
    await fetchHomeOverview()

    expect(request).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledWith('/api/home/overview')
  })
})
