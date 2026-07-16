import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage, ElMessageBox } from 'element-plus'
import ResearchRunsPanel from '../research-lab/ResearchRunsPanel.vue'
import { pollPipelineRun, runResearchAction } from '../../services/researchLab'

vi.mock('../../services/researchLab', () => ({
  fetchPipelineRun: vi.fn(),
  fetchPipelineRuns: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  pollPipelineRun: vi.fn(),
  runResearchAction: vi.fn(),
  runUserProjection: vi.fn(),
}))

describe('ResearchRunsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runResearchAction.mockResolvedValue({ pipelineRunId: 901, status: 'PENDING' })
    pollPipelineRun.mockResolvedValue({ record: { fields: { id: 901, status: 'SUCCESS' } } })
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
    vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    vi.spyOn(ElMessage, 'warning').mockImplementation(() => {})
  })

  it('submits the default 120-day 200-stock historical training request', async () => {
    const wrapper = mount(ResearchRunsPanel, { props: { canOperate: true } })
    await flushPromises()
    wrapper.vm.bootstrapEndDate = '2026-07-16'

    await wrapper.vm.runGlobalOperation({
      key: 'bootstrap',
      title: '历史训练初始化',
      buttonLabel: '导入历史数据并初始化',
      impact: '导入真实历史数据',
      prerequisite: '正式交易日历可用',
    })

    expect(runResearchAction).toHaveBeenCalledWith('bootstrap', expect.objectContaining({
      endDate: '2026-07-16',
      historyTradingDays: 120,
      historyStockCount: 200,
    }))
    expect(ElMessage.success).toHaveBeenCalledWith('历史训练已提交，可在全局流水线记录中查看进度')
  })
})
