import { describe, expect, it } from 'vitest'
import { formatPercent, formatRatio, formatResearchValue } from '../researchPresentation'

describe('research presentation units', () => {
  it('renders percentage-point metrics without multiplying by 100 twice', () => {
    expect(formatPercent(60.3774)).toBe('60.38%')
    expect(formatResearchValue('successRate', 60.3774)).toBe('60.38%')
  })

  it('renders ratio metrics by converting 0..1 to percentage points', () => {
    expect(formatRatio(0.603774)).toBe('60.38%')
    expect(formatRatio(60.3774)).toBe('60.38%')
    expect(formatRatio(80)).toBe('80.00%')
    expect(formatResearchValue('probabilityUp', 0.603774)).toBe('60.38%')
  })
})
