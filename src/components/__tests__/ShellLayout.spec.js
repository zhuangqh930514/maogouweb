import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ShellLayout from '../ShellLayout.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/research-daily-reports', meta: { title: '投研日报' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../../services/auth', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue({ username: 'tester' }),
  getStoredUser: vi.fn(() => ({ username: 'tester' })),
  logout: vi.fn(),
}))

vi.mock('../../services/settings', () => ({
  fetchModelConfig: vi.fn().mockResolvedValue({ modelName: 'qwen3.6', apiBaseUrl: 'http://localhost:11434/v1' }),
}))

describe('ShellLayout AI menu', () => {
  it('exposes one research daily report entry without the retired daily insight entry', async () => {
    const wrapper = mount(ShellLayout, {
      global: {
        stubs: {
          'router-view': true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('投研日报')
    expect(wrapper.text()).not.toContain('每日投研')
  })
})
