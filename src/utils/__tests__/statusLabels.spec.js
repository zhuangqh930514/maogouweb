import { describe, expect, it } from 'vitest'
import { localizeStatusText, statusLabel } from '../statusLabels'

describe('statusLabels', () => {
  it('translates common report, action, risk and market enums', () => {
    expect(statusLabel('READY')).toBe('就绪')
    expect(statusLabel('WATCH')).toBe('观察')
    expect(statusLabel('HIGH')).toBe('高风险')
    expect(statusLabel('BALANCED')).toBe('均衡震荡')
    expect(statusLabel('WATCHLIST')).toBe('自选股')
  })

  it('translates status tokens embedded in historical summaries', () => {
    const text = localizeStatusText('数据状态 FRESH，市场状态 BALANCED，流水线 PARTIAL_SUCCESS。')

    expect(text).toBe('数据状态 数据新鲜，市场状态 均衡震荡，流水线 部分成功。')
  })

  it('keeps model names, factor codes and unknown identifiers unchanged', () => {
    expect(statusLabel('qwen3.6')).toBe('qwen3.6')
    expect(localizeStatusText('MOMENTUM_20D')).toBe('MOMENTUM_20D')
  })
})
