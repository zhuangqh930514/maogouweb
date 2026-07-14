import { describe, expect, it, vi } from 'vitest'

vi.mock('../../services/auth', () => ({
  isAuthenticated: vi.fn(() => true),
}))

describe('legacy daily insight route', () => {
  it('redirects to the merged research daily report page', async () => {
    const { default: router } = await import('../index')
    const legacyRoute = router.getRoutes().find((route) => route.path === '/daily-insight')

    expect(legacyRoute?.redirect).toBe('/research-daily-reports')
  })
})
