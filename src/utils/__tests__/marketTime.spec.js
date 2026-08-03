import { describe, expect, it } from 'vitest'
import { ashareMarketStatus, isAshareMarketOpen, marketSourceStatus, marketSourceStatusText } from '../marketTime'

describe('market data status', () => {
  it('does not label a successful close snapshot as realtime outside trading hours', () => {
    const saturday = new Date('2026-08-01T10:00:00+08:00')

    expect(isAshareMarketOpen(saturday)).toBe(false)
    expect(marketSourceStatus('REALTIME', saturday)).toBe('RECENT_CLOSE')
    expect(marketSourceStatusText('REALTIME', saturday)).toBe('最近收盘')
    expect(ashareMarketStatus(saturday)).toBe('A股休市')
  })

  it('keeps unavailable and stale evidence explicit', () => {
    const tradingTime = new Date('2026-08-03T10:00:00+08:00')

    expect(marketSourceStatus('UNAVAILABLE', tradingTime)).toBe('UNAVAILABLE')
    expect(marketSourceStatus('STALE', tradingTime)).toBe('STALE')
    expect(marketSourceStatusText('UNAVAILABLE', tradingTime)).toBe('数据源异常')
  })
})
