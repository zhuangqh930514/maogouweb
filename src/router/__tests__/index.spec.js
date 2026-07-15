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
})
