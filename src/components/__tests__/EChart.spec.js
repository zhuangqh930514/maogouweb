import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const chart = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  }
  return {
    chart,
    init: vi.fn(() => chart),
    use: vi.fn(),
  }
})

vi.mock('echarts/core', () => ({
  init: mocks.init,
  use: mocks.use,
}))

import EChart from '../EChart.vue'

describe('EChart', () => {
  let resizeCallback

  beforeEach(() => {
    mocks.init.mockClear()
    mocks.chart.setOption.mockClear()
    mocks.chart.resize.mockClear()
    mocks.chart.dispose.mockClear()
    resizeCallback = undefined

    vi.stubGlobal('ResizeObserver', class {
      constructor(callback) {
        resizeCallback = callback
      }

      observe() {}

      disconnect() {}
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('waits for a visible container before initializing ECharts', async () => {
    const wrapper = mount(EChart, {
      props: {
        option: { xAxis: {}, yAxis: {}, series: [] },
      },
    })
    const element = wrapper.element

    expect(mocks.init).not.toHaveBeenCalled()

    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 640 })
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: 320 })
    resizeCallback([{ target: element }])

    expect(mocks.init).toHaveBeenCalledOnce()
    expect(mocks.chart.setOption).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
