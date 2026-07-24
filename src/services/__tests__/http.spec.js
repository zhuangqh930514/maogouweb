import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../http'

describe('HTTP error normalization', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      removeItem: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not expose a raw nginx 504 HTML page to the user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      '<html><head><title>504 Gateway Time-out</title></head><body>nginx</body></html>',
      { status: 504, headers: { 'Content-Type': 'text/html' } },
    )))

    await expect(request('/api/ai/analyze-watchlist', { method: 'POST' }))
      .rejects
      .toMatchObject({
        status: 504,
        message: '请求处理超过网关等待时间；若刚提交的是分析任务，任务可能仍在后台运行，请查看任务进度',
      })
  })

  it('keeps concise plain-text errors for non-gateway failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      '上游行情接口连接超时',
      { status: 500, headers: { 'Content-Type': 'text/plain' } },
    )))

    await expect(request('/api/market/test'))
      .rejects
      .toMatchObject({
        status: 500,
        message: '上游行情接口连接超时',
      })
  })
})
