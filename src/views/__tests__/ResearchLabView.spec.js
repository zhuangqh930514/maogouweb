import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResearchLabView from '../research-lab/ResearchLabView.vue'
import { fetchResearchOverview } from '../../services/researchLab'
import { fetchCurrentUser, getStoredUser } from '../../services/auth'

const route = { query: {} }
const replace = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace }),
}))
vi.mock('../../services/auth', () => ({ fetchCurrentUser: vi.fn(), getStoredUser: vi.fn() }))
vi.mock('../../services/researchLab', () => ({
  fetchResearchOverview: vi.fn(),
  fetchPipelineRun: vi.fn(),
  fetchPipelineRuns: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
}))

describe('ResearchLabView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    getStoredUser.mockReturnValue({ id: 5, username: 'tester', systemRole: 'USER' })
    fetchCurrentUser.mockResolvedValue({ id: 5, username: 'tester', systemRole: 'USER' })
    fetchResearchOverview.mockResolvedValue({
      counts: { samples: 0, matureLabels: 0, predictions: 0, datasets: 0, shadowChallengers: 0 },
      activeStrategy: {},
      latestPipeline: {},
      trainingReadiness: {
        'TRADING_DAYS:ALL': 0,
        'STOCKS:ALL': 0,
        'HORIZON:1': 0,
        'HORIZON:2': 0,
        'HORIZON:3': 0,
        'HORIZON:5': 0,
      },
    })
  })

  it('renders the seven fixed research modules and defaults to overview', async () => {
    const wrapper = mount(ResearchLabView, {
      global: { directives: { loading: () => {} } },
    })
    await flushPromises()

    for (const label of ['总览', '样本与标签', '因子研究', '实验与回测', '模型训练', '策略治理', '运行记录']) {
      expect(wrapper.text()).toContain(label)
    }
    expect(wrapper.text()).toContain('仍缺 120 个交易日')
    expect(wrapper.text()).not.toContain('0% 胜率')
  })

  it('does not expose global operation controls to a USER', async () => {
    route.query = { tab: 'runs' }
    const wrapper = mount(ResearchLabView, {
      global: { directives: { loading: () => {} } },
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain('运行全局日度研究')
    expect(wrapper.text()).not.toContain('运行历史冷启动')
  })

  it('updates operation visibility from the authenticated user response', async () => {
    route.query = { tab: 'runs' }
    fetchCurrentUser.mockResolvedValue({ id: 8, username: 'operator', systemRole: 'OPERATOR' })
    const wrapper = mount(ResearchLabView, {
      global: { directives: { loading: () => {} } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('运行全局日度研究')
    expect(wrapper.text()).toContain('运行历史冷启动')
  })
})
