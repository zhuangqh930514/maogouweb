import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AutomationTasksView from '../AutomationTasksView.vue'
import { fetchSchedulerJobLogs, fetchSchedulerStatus } from '../../services/settings'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../../services/settings', () => ({
  fetchSchedulerJobLogs: vi.fn(),
  fetchSchedulerStatus: vi.fn(),
  toggleAutoClosePipeline: vi.fn(),
}))

describe('AutomationTasksView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchSchedulerStatus.mockResolvedValue({
      autoClosePipelineEnabled: true,
      nextAutoClosePipelineTime: '2026-07-15 16:00:00',
      nextWeeklyEvolutionTime: '2026-07-18 18:00:00',
      nextMonthlyTrainingTime: '2026-08-01 19:00:00',
      autoClosePipelineLastStatus: 'SUCCESS',
    })
    fetchSchedulerJobLogs.mockResolvedValue([])
  })

  it('shows automation health without exposing research execution controls', async () => {
    const wrapper = mount(AutomationTasksView, {
      global: { directives: { loading: () => {} } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('每日自动投研')
    expect(wrapper.text()).toContain('2026-07-15 16:00:00')
    expect(wrapper.text()).toContain('周度策略验证')
    expect(wrapper.text()).toContain('月度模型训练')
    expect(wrapper.text()).not.toContain('运行全局日度研究')
    expect(wrapper.text()).not.toContain('运行历史冷启动')
    expect(wrapper.text()).not.toContain('手动训练模型')
  })
})
