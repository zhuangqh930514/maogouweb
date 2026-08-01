import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AutomationTasksView from '../AutomationTasksView.vue'
import { fetchSchedulerJobLogs, fetchSchedulerStatus, toggleAutoClosePipeline } from '../../services/settings'

vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessageBox: { confirm: vi.fn().mockResolvedValue(true) },
    ElMessage: { success: vi.fn(), error: vi.fn() },
  }
})

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
      globalResearch: {
        tradeDate: '2026-07-15',
        status: 'PARTIAL_SUCCESS',
        currentStep: 'GENERATE_STOCK_REPORTS',
        progressPercent: 100,
        processedCount: 10,
        completedCount: 10,
        successCount: 8,
        failedCount: 2,
        primaryFailureReason: '行情源超时',
        nextRetryAt: '2026-07-16 09:00:00',
        durationMillis: 720000,
        message: '全局日度研究流水线部分完成',
      },
      userDailyReport: {
        tradeDate: '2026-07-15',
        status: 'SUCCESS',
        progressPercent: 100,
        processedCount: 3,
        completedCount: 3,
        successCount: 3,
        failedCount: 0,
        durationMillis: 60000,
      },
      recentTradingDayTrend: [
        {
          tradeDate: '2026-07-15',
          globalStatus: 'PARTIAL_SUCCESS',
          userDailyReportStatus: 'SUCCESS',
          globalFailedCount: 2,
          userDailyReportFailedCount: 0,
          globalDurationMillis: 720000,
          userDailyReportDurationMillis: 60000,
          primaryFailureReason: '行情源超时',
        },
      ],
    })
    fetchSchedulerJobLogs.mockResolvedValue([])
    toggleAutoClosePipeline.mockResolvedValue({ autoClosePipelineEnabled: false })
  })

  afterEach(() => {
    vi.useRealTimers()
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
    expect(wrapper.text()).toContain('全局研究')
    expect(wrapper.text()).toContain('我的投研日报')
    expect(wrapper.text()).toContain('最近 7 个交易日趋势')
    expect(wrapper.text()).toContain('行情源超时')
    expect(wrapper.text()).not.toContain('运行全局日度研究')
    expect(wrapper.text()).not.toContain('运行历史冷启动')
    expect(wrapper.text()).not.toContain('手动训练模型')
    wrapper.unmount()
  })

  it('silently refreshes persisted pipeline status every 30 seconds', async () => {
    vi.useFakeTimers()
    const wrapper = mount(AutomationTasksView, {
      global: { directives: { loading: () => {} } },
    })
    await flushPromises()
    expect(fetchSchedulerStatus).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(30_000)
    await flushPromises()

    expect(fetchSchedulerStatus).toHaveBeenCalledTimes(2)
    expect(fetchSchedulerJobLogs).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('sends only one request for one confirmed automation toggle', async () => {
    const wrapper = mount(AutomationTasksView, {
      global: { directives: { loading: () => {} } },
    })
    await flushPromises()

    const toggle = wrapper.findAll('button').find((button) => button.text().includes('关闭每日自动投研'))
    expect(toggle).toBeTruthy()
    await toggle.trigger('click')
    await flushPromises()

    expect(toggleAutoClosePipeline).toHaveBeenCalledTimes(1)
    expect(toggleAutoClosePipeline).toHaveBeenCalledWith(false)
    wrapper.unmount()
  })
})
