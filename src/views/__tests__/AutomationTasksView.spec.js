import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AutomationTasksView from '../AutomationTasksView.vue'
import { fetchModelConfig, fetchSchedulerJobLogs, fetchSchedulerStatus } from '../../services/settings'
import { fetchLearningDashboard } from '../../services/aiLearning'
import { fetchDailyInsightToday } from '../../services/dailyInsight'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../../services/ai', () => ({ analyzeWatchlist: vi.fn() }))
vi.mock('../../services/aiEvolution', () => ({
  evolveAiStrategy: vi.fn(),
  refreshAiEvolutionFactors: vi.fn(),
  verifyAiEvolutionReviews: vi.fn(),
}))
vi.mock('../../services/aiLearning', () => ({
  buildWatchlistSamples: vi.fn(),
  fetchLearningDashboard: vi.fn(),
  rankLearningUniverse: vi.fn(),
  runLearningBacktest: vi.fn(),
  runLearningExperiment: vi.fn(),
  runLearningModelEval: vi.fn(),
  verifyLearningLabels: vi.fn(),
}))
vi.mock('../../services/dailyInsight', () => ({ fetchDailyInsightToday: vi.fn() }))
vi.mock('../../services/settings', () => ({
  fetchModelConfig: vi.fn(),
  fetchSchedulerJobLogs: vi.fn(),
  fetchSchedulerStatus: vi.fn(),
  runAutoClosePipelineNow: vi.fn(),
  saveModelConfig: vi.fn(),
  toggleAutoClosePipeline: vi.fn(),
}))

describe('AutomationTasksView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchModelConfig.mockResolvedValue({
      apiBaseUrl: 'http://localhost:11434/v1',
      modelName: 'qwen3.6',
      timeout: 60000,
      temperature: 0.2,
      maxTokens: 2048,
      intradayInterval: 30,
      closeTime: '15:30',
      analysisScope: '全部自选股',
      promptTemplate: 'prompt',
    })
    fetchSchedulerStatus.mockResolvedValue({
      enabled: true,
      autoClosePipelineEnabled: true,
      nextAutoClosePipelineTime: '2026-07-14 16:00:00',
      nextWeeklyEvolutionTime: '2026-07-17 18:00:00',
      nextMonthlyTrainingTime: '2026-08-01 19:00:00',
    })
    fetchLearningDashboard.mockResolvedValue({ metrics: [] })
    fetchDailyInsightToday.mockResolvedValue(null)
    fetchSchedulerJobLogs.mockResolvedValue([])
  })

  it('shows daily, weekly, and monthly automation without exposing heavy manual buttons by default', async () => {
    const wrapper = shallowMount(AutomationTasksView, {
      global: { directives: { loading: () => {} } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('每日自动流水线')
    expect(wrapper.text()).toContain('周度策略验证')
    expect(wrapper.text()).toContain('2026-07-17 18:00:00')
    expect(wrapper.text()).toContain('月度模型训练')
    expect(wrapper.text()).toContain('2026-08-01 19:00:00')
    expect(wrapper.text()).not.toContain('任务编排')
    expect(wrapper.text()).not.toContain('旧版研究参数')
  })
})
