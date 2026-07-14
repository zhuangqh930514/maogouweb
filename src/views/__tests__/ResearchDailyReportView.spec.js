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
      insightSummary: {
        snapshotId: 41,
        generatedAt: '2026-07-10T16:20:00',
        overallHitRate: 61.8,
        itemCount: 3,
        lowSampleCount: 1,
      },
      pipeline: { status: 'SUCCESS', steps: [] },
      strategyPerformance: null,
      recommendations: [{
        stockCode: '600519',
        stockName: '贵州茅台',
        compositeScore: 80,
        systemScore: 74.5,
        aiDecision: 'BUY',
        aiConfidence: 82.5,
        riskScore: 35,
        dataQualityScore: 92,
        freshnessScore: 95,
        freshnessStatus: 'REALTIME',
        freshnessMessage: '行情与样本均为当日数据',
        historicalHitRate: 61.8,
        historicalSampleCount: 26,
        triggerFactors: [{
          factorCode: 'MOMENTUM_20D',
          factorName: '20日动量',
          direction: 'SUPPORT',
          contribution: 12.5,
          evidence: '价格保持在趋势线上方',
        }],
      }],
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
    expect(wrapper.text()).toContain('就绪')
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
    expect(wrapper.text()).toContain('流水线失败')
  })

  it('shows stale freshness explicitly', async () => {
    const stale = report({ freshnessStatus: 'STALE' })
    const wrapper = await mountView(stale)

    expect(wrapper.text()).toContain('非实时')
    expect(wrapper.text()).not.toContain('数据不可用')
  })

  it('merges daily insight quality, decision evidence and factors into the report', async () => {
    const wrapper = await mountView(report())

    expect(wrapper.text()).toContain('平均命中率')
    expect(wrapper.text()).toContain('61.8%')
    expect(wrapper.text()).toContain('数据质量')
    expect(wrapper.text()).toContain('系统分 74.5')
    expect(wrapper.text()).toContain('AI 买入 · 82.5%')
    expect(wrapper.text()).toContain('20日动量')
    expect(wrapper.text()).toContain('行情与样本均为当日数据')
  })

  it('localizes all user-facing report enums without changing their API values', async () => {
    const localized = report({
      title: '猫狗智投投研日报 · BALANCED',
      executiveSummary: '数据状态 FRESH，市场状态 BALANCED。',
      content: {
        ...report().content,
        pipeline: {
          status: 'PARTIAL_SUCCESS',
          steps: [{ stepKey: 'GENERATE_REPORTS', status: 'SKIPPED' }],
        },
        recommendations: [{
          ...report().content.recommendations[0],
          aiDecision: 'WATCH',
          riskLevel: 'HIGH',
          freshnessStatus: 'FRESH',
          reasonSummary: '历史命中率 56.25%；数据状态 FRESH。',
        }],
      },
    })
    const wrapper = await mountView(localized)
    const text = wrapper.text()

    expect(text).toContain('均衡震荡')
    expect(text).toContain('数据新鲜')
    expect(text).toContain('AI 观察')
    expect(text).toContain('高风险')
    expect(text).toContain('部分成功')
    expect(text).toContain('已跳过')
    expect(text).not.toMatch(/\b(?:READY|FRESH|BALANCED|WATCH|HIGH|PARTIAL_SUCCESS|SKIPPED)\b/)
  })

  it('keeps stock-card descendants inside a component style scope', async () => {
    const wrapper = await mountView(report())
    const stockCard = wrapper.find('.stock-card')

    expect(stockCard.exists()).toBe(true)
    expect(Object.keys(stockCard.attributes()).some((name) => name.startsWith('data-v-'))).toBe(true)
  })

  it('keeps historical report versions readable when merged evidence fields are absent', async () => {
    const legacy = report({
      content: {
        freshness: { status: 'STALE', dataQualityScore: 70 },
        pipeline: { status: 'SUCCESS', steps: [] },
        strategyPerformance: null,
        recommendations: [{
          stockCode: '600519',
          stockName: '贵州茅台',
          compositeScore: 70,
          riskScore: 40,
          historicalHitRate: 55,
          historicalSampleCount: 8,
        }],
        watches: [],
        avoids: [],
        holdingRisks: [],
        keyFactors: [],
      },
    })

    const wrapper = await mountView(legacy)

    expect(wrapper.text()).toContain('贵州茅台')
    expect(wrapper.text()).toContain('AI 未结构化')
    expect(wrapper.text()).toContain('暂无数据新鲜度说明')
  })
})
