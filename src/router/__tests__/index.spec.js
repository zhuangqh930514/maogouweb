import { describe, expect, it, vi } from 'vitest'

vi.mock('../../services/auth', () => ({
  isAuthenticated: vi.fn(() => true),
}))

describe('unified AI research routes', () => {
  it('removes the retired daily insight route and exposes one research lab route', async () => {
    const { default: router } = await import('../index')
    const legacyRoute = router.getRoutes().find((route) => route.path === '/daily-insight')
    const labRoute = router.getRoutes().find((route) => route.path === '/research-lab')

    expect(legacyRoute).toBeUndefined()
    expect(labRoute?.meta.title).toBe('研究实验室')
  })

  it('redirects the historical daily report URL to the unified report route', async () => {
    const { default: router } = await import('../index')

    await router.push('/research-daily-report')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/research-daily-reports')
  })
})
