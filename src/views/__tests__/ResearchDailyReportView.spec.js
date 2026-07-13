import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResearchDailyReportView from '../ResearchDailyReportView.vue'
import {
  fetchLatestResearchDailyReport,
  fetchResearchDailyReports,
} from '../../services/researchDailyReport'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../../services/researchDailyReport', () => ({
  fetchLatestResearchDailyReport: vi.fn(),
  fetchResearchDailyReportDetail: vi.fn(),
  fetchResearchDailyReports: vi.fn(),
  rebuildResearchDailyReport: vi.fn(),
}))

function report(overrides = {}) {
  return {
    id: 1,
    tradeDate: '2026-07-10',
    reportVersion: 1,
    reportStatus: 'READY',
    title: '2026-07-10 猫狗智投投研日报',
    executiveSummary: '今日结论已基于不可变样本生成。',
    marketRegime: 'BALANCED',
    recommendationCount: 1,
    watchCount: 0,
    avoidCount: 0,
    holdingRiskCount: 0,
    freshnessStatus: 'REALTIME',
    generatedAt: '2026-07-10T16:10:00',
    current: true,
    pipelineRunId: 10,
    content: {
      freshness: { status: 'REALTIME', dataQualityScore: 88 },
      pipeline: { status: 'SUCCESS', steps: [] },
      strategyPerformance: null,
      recommendations: [{ stockCode: '600519', stockName: '贵州茅台', compositeScore: 80 }],
      watches: [],
      avoids: [],
      holdingRisks: [],
      keyFactors: [],
    },
    ...overrides,
  }
}

async function mountView(latest, history = latest ? [latest] : []) {
  fetchLatestResearchDailyReport.mockResolvedValue(latest)
  fetchResearchDailyReports.mockResolvedValue(history)
  const wrapper = mount(ResearchDailyReportView, {
    global: {
      stubs: {
        'el-alert': {
          props: ['title'],
          template: '<div class="test-alert">{{ title }}</div>',
        },
        'el-tag': { template: '<span><slot /></span>' },
      },
      directives: {
        loading: () => {},
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ResearchDailyReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a successful report with its recommendation', async () => {
    const wrapper = await mountView(report())

    expect(wrapper.text()).toContain('今日结论')
    expect(wrapper.text()).toContain('READY')
    expect(wrapper.text()).toContain('贵州茅台')
  })

  it('renders the true empty state when no report exists', async () => {
    const wrapper = await mountView(null, [])

    expect(wrapper.text()).toContain('暂无投研日报')
    expect(wrapper.find('.metric-grid').exists()).toBe(false)
  })

  it('explains a failed pipeline report instead of presenting it as ready', async () => {
    const failed = report({
      reportStatus: 'FAILED_PIPELINE',
      content: { ...report().content, pipeline: { status: 'FAILED', failedStep: 'GENERATE_REPORTS', steps: [] } },
    })
    const wrapper = await mountView(failed)

    expect(wrapper.find('.test-alert').text()).toContain('本日报来自失败流水线')
    expect(wrapper.text()).toContain('FAILED_PIPELINE')
  })

  it('shows stale freshness explicitly', async () => {
    const stale = report({ freshnessStatus: 'STALE' })
    const wrapper = await mountView(stale)

    expect(wrapper.text()).toContain('STALE')
    expect(wrapper.text()).not.toContain('UNAVAILABLE')
  })
})
