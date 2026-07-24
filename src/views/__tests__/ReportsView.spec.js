import { defineComponent } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReportsView from '../ReportsView.vue'
import {
  analyzeWatchlist,
  fetchAiReport,
  fetchAiReportPage,
  fetchCurrentWatchlistAnalysisJob,
} from '../../services/ai'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
}))

vi.mock('../../services/ai', () => ({
  analyzeStock: vi.fn(),
  analyzeWatchlist: vi.fn(),
  deleteAiReports: vi.fn(),
  fetchAiReport: vi.fn(),
  fetchAiReportPage: vi.fn(),
  fetchAiReports: vi.fn().mockResolvedValue([]),
  fetchCurrentWatchlistAnalysisJob: vi.fn().mockResolvedValue(null),
  fetchWatchlistAnalysisJob: vi.fn(),
}))

vi.mock('../../services/settings', () => ({
  fetchModelConfig: vi.fn().mockResolvedValue({ modelName: 'qwen3.6' }),
  fetchPromptTemplates: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../services/stocks', () => ({ searchStocks: vi.fn().mockResolvedValue([]) }))

const SegmentedStub = defineComponent({
  name: 'ElSegmented',
  props: {
    modelValue: String,
    options: Array,
  },
  emits: ['update:modelValue', 'change'],
  template: `
    <div class="segmented-stub">
      <button
        v-for="option in options"
        :key="option.value"
        :data-value="option.value"
        @click="$emit('update:modelValue', option.value); $emit('change', option.value)"
      >{{ option.label }}</button>
    </div>
  `,
})

const PaginationStub = defineComponent({
  name: 'ElPagination',
  emits: ['current-change'],
  template: '<button class="next-page" @click="$emit(\'current-change\', 2)">下一页</button>',
})

const DatePickerStub = defineComponent({
  name: 'ElDatePicker',
  emits: ['change'],
  template: '<button class="custom-date" @click="$emit(\'change\', \'2026-07-12\')">选择日期</button>',
})

const EmptyStub = defineComponent({ template: '<div />' })
const SlotStub = defineComponent({ template: '<span><slot /></span>' })
const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
})

function report(id = 1) {
  return {
    id,
    stock: '贵州茅台',
    code: '600519',
    score: 72,
    advice: '谨慎观察',
    generatedAt: '2026-07-13T16:30:00',
    sourceModel: 'qwen3.6',
  }
}

function page(overrides = {}) {
  return {
    items: [report()],
    total: 21,
    page: 1,
    pageSize: 10,
    totalPages: 3,
    selectedDate: '2026-07-13',
    latestAvailableDate: '2026-07-13',
    ...overrides,
  }
}

async function mountView() {
  const wrapper = shallowMount(ReportsView, {
    global: {
      directives: { loading: () => {} },
      stubs: {
        'el-segmented': SegmentedStub,
        'el-pagination': PaginationStub,
        'el-autocomplete': EmptyStub,
        'el-option': EmptyStub,
        'el-select': EmptyStub,
        'el-button': ButtonStub,
        'el-progress': EmptyStub,
        'el-date-picker': DatePickerStub,
        'el-checkbox': EmptyStub,
        'el-empty': EmptyStub,
        'el-alert': EmptyStub,
        'el-tag': SlotStub,
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ReportsView pagination and date filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCurrentWatchlistAnalysisJob.mockResolvedValue(null)
    fetchAiReportPage.mockResolvedValue(page())
    fetchAiReport.mockImplementation(async (id) => ({
      ...report(id),
      technicalAnalysis: '技术面详情',
      riskWarning: '风险详情',
      buySellPoints: '买卖点详情',
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens on the latest day that actually has report data', async () => {
    const wrapper = await mountView()

    expect(fetchAiReportPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      date: undefined,
      filter: 'ALL',
    })
    expect(wrapper.text()).toContain('2026-07-13')
    expect(wrapper.text()).toContain('最新有数据')
    expect(wrapper.text()).toContain('共 21 份报告')
    expect(fetchAiReport).toHaveBeenCalledWith(1)
  })

  it('uses quick date buttons and resets the report page', async () => {
    fetchAiReportPage
      .mockResolvedValueOnce(page({ page: 2 }))
      .mockResolvedValueOnce(page({ items: [], total: 0, page: 1, totalPages: 0, latestAvailableDate: null }))
    const wrapper = await mountView()
    const dateSegmented = wrapper.findAllComponents(SegmentedStub)[1]

    await dateSegmented.find('[data-value="TODAY"]').trigger('click')
    await flushPromises()

    const today = new Date()
    const date = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    expect(fetchAiReportPage).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      date,
      filter: 'ALL',
    })
  })

  it('keeps the selected date when moving to another page', async () => {
    const wrapper = await mountView()

    await wrapper.findComponent(PaginationStub).find('.next-page').trigger('click')
    await flushPromises()

    expect(fetchAiReportPage).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 10,
      date: '2026-07-13',
      filter: 'ALL',
    })
  })

  it('loads the exact day selected in the date picker', async () => {
    const wrapper = await mountView()

    await wrapper.findComponent(DatePickerStub).find('.custom-date').trigger('click')
    await flushPromises()

    expect(fetchAiReportPage).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      date: '2026-07-12',
      filter: 'ALL',
    })
  })

  it('submits watchlist analysis as a background job and renders persisted progress', async () => {
    vi.useFakeTimers()
    analyzeWatchlist.mockResolvedValue({
      id: 88,
      status: 'RUNNING',
      terminal: false,
      totalCount: 9,
      completedCount: 2,
      analyzedCount: 2,
      skippedCount: 0,
      failedCount: 0,
      currentStockName: '贵州茅台',
      currentStockCode: '600519',
      progressPercent: 22,
      message: '正在分析贵州茅台',
    })
    const wrapper = await mountView()

    const button = wrapper.findAll('button').find((item) => item.text().includes('立即分析自选股'))
    await button.trigger('click')
    await flushPromises()

    expect(analyzeWatchlist).toHaveBeenCalledWith(null)
    expect(wrapper.text()).toContain('正在后台分析自选股')
    expect(wrapper.text()).toContain('贵州茅台 600519')
    wrapper.unmount()
  })
})
