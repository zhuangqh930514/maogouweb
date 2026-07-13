import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  let resolveReady
  const ready = new Promise((resolve) => {
    resolveReady = resolve
  })
  const app = {
    component: vi.fn(),
    use: vi.fn(),
    mount: vi.fn(),
  }
  app.use.mockReturnValue(app)

  return {
    app,
    createApp: vi.fn(() => app),
    resolveReady,
    router: {
      isReady: vi.fn(() => ready),
    },
  }
})

vi.mock('vue', () => ({ createApp: mocks.createApp }))
vi.mock('element-plus', () => ({ default: {} }))
vi.mock('@element-plus/icons-vue', () => ({}))
vi.mock('../App.vue', () => ({ default: {} }))
vi.mock('../router', () => ({ default: mocks.router }))

describe('application bootstrap', () => {
  it('waits for the initial route before mounting the authenticated shell', async () => {
    await import('../main.js')

    expect(mocks.router.isReady).toHaveBeenCalledOnce()
    expect(mocks.app.mount).not.toHaveBeenCalled()

    mocks.resolveReady()
    await Promise.resolve()

    expect(mocks.app.mount).toHaveBeenCalledWith('#app')
  })
})
