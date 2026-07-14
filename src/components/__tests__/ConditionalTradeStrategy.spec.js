import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConditionalTradeStrategy from '../ConditionalTradeStrategy.vue'

const SlotStub = defineComponent({ template: '<div><slot /></div>' })

function condition(code, satisfied) {
  return {
    code,
    label: `条件 ${code}`,
    metric: 'PERCENT',
    operator: '>=',
    threshold: '2%',
    actual: satisfied == null ? '数据缺失' : '3%',
    satisfied,
    dataSource: '日K',
  }
}

function strategy() {
  return {
    schemaVersion: 'CONDITIONAL_TRADE_STRATEGY_V1',
    lineage: {
      sampleId: 21,
      ruleConfigVersion: 'CONDITIONAL_RULE_V1.0',
      strategyReleaseVersion: 'S1',
      dataQualityScore: 88,
      strategyValidationScore: 67,
      configFingerprint: '1234567890abcdef',
    },
    position: { holding: true, quantity: 1000, averageCost: 100, currentPrice: 108, profitRate: 8 },
    market: { marketRegime: 'BULL', sectorName: '白酒' },
    riskScore: {
      total: 42,
      level: 'MEDIUM',
      advice: '控制仓位',
      components: [
        { code: 'MARKET', name: '市场风险', score: 30, weight: 0.3, evidence: 'BULL', dataStatus: 'AVAILABLE' },
      ],
    },
    tradingPlans: [
      {
        horizonDays: 1,
        currentState: '强势上涨',
        currentAction: 'HOLD',
        objective: '识别次日状态',
        rules: [
          {
            ruleCode: 'T1_STRONG',
            state: '强势上涨',
            ifThen: '如果放量突破，则执行 HOLD',
            triggerConditions: [condition('DAY_CHANGE', true), condition('SECTOR_STRONG', null)],
            matched: true,
            action: 'HOLD',
            position: '保持仓位',
            riskWarning: '不追高',
            signalStrength: 72,
            factorEvidence: [],
          },
        ],
      },
    ],
    buyModels: [
      { modelCode: 'BUY_BREAKOUT', type: '突破买入', ifThen: '如果放量突破，则执行买入', triggerConditions: [condition('BREAK_20D_HIGH', true)], triggered: true, action: 'BUY', referencePrice: '108.00', confidence: 75, position: '30%', riskWarning: '跌回压力位失效' },
    ],
    sellModels: [
      { modelCode: 'SELL_TECHNICAL_STOP', type: '技术止损', ifThen: '如果跌破MA20，则执行止损', triggerConditions: [condition('MA20_STOP', false)], triggered: false, action: 'STOP_LOSS', referencePrice: '96.00', confidence: 35, position: '退出', riskWarning: '严格执行' },
    ],
    dataLimitations: ['资金流向未接入可靠时点源'],
  }
}

describe('ConditionalTradeStrategy', () => {
  it('renders conditional plans, model states, risk and learning reviews', () => {
    const wrapper = mount(ConditionalTradeStrategy, {
      props: {
        strategy: strategy(),
        reviews: [{
          id: 1,
          horizonDays: 1,
          status: 'VERIFIED',
          triggeredState: '强势上涨',
          postTriggerReturn: 1.2,
          reviewScore: 72,
          feedbackSummary: '动作在下一交易日验证有效',
        }],
      },
      global: {
        stubs: {
          'el-progress': SlotStub,
          'el-tabs': SlotStub,
          'el-tab-pane': SlotStub,
          'el-tooltip': SlotStub,
          'el-alert': SlotStub,
          'el-tag': SlotStub,
        },
      },
    })

    expect(wrapper.text()).toContain('未来 3 日条件交易方案')
    expect(wrapper.text()).toContain('强势上涨')
    expect(wrapper.text()).toContain('如果放量突破，则执行 HOLD')
    expect(wrapper.text()).toContain('数据缺失')
    expect(wrapper.text()).toContain('突破买入')
    expect(wrapper.text()).toContain('条件 BREAK_20D_HIGH')
    expect(wrapper.text()).toContain('动作 买入')
    expect(wrapper.text()).toContain('技术止损')
    expect(wrapper.text()).toContain('动作在下一交易日验证有效')
    expect(wrapper.text()).toContain('资金流向未接入可靠时点源')
  })
})
