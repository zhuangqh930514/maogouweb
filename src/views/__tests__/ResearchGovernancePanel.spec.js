import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage, ElMessageBox } from 'element-plus'
import ResearchGovernancePanel from '../research-lab/ResearchGovernancePanel.vue'
import {
  fetchStrategyReleases,
  pollPipelineRun,
  promoteStrategy,
} from '../../services/researchLab'

vi.mock('../../services/researchLab', () => ({
  fetchGovernanceEvents: vi.fn(),
  fetchShadowEvaluations: vi.fn(),
  fetchStrategyReleases: vi.fn(),
  pollPipelineRun: vi.fn(),
  promoteStrategy: vi.fn(),
  rejectStrategy: vi.fn(),
  rollbackStrategy: vi.fn(),
}))

const challenger = {
  type: 'strategyRelease',
  fields: { id: 12, title: '候选策略', releaseRole: 'CHALLENGER', status: 'SHADOW' },
}

describe('ResearchGovernancePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchStrategyReleases.mockResolvedValue({ items: [challenger], total: 1, page: 1, pageSize: 20 })
    promoteStrategy.mockResolvedValue({ pipelineRunId: 88, status: 'PENDING' })
    pollPipelineRun.mockImplementation(async (id, options) => {
      const detail = { record: { fields: { id, status: 'SUCCESS' } }, related: { steps: [] } }
      options?.onUpdate?.(detail)
      return detail
    })
    vi.spyOn(ElMessage, 'warning').mockImplementation(() => {})
    vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
  })

  it('requires a governance reason before opening the second confirmation', async () => {
    const wrapper = mount(ResearchGovernancePanel, {
      props: { canOperate: true },
      global: { directives: { loading: () => {} } },
    })
    await flushPromises()

    wrapper.vm.openGovernance('promote', challenger)
    wrapper.vm.governanceForm.assessmentEventKey = 'ASSESS:12'
    await wrapper.vm.confirmGovernance()

    expect(ElMessage.warning).toHaveBeenCalledWith('请填写治理原因')
    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(promoteStrategy).not.toHaveBeenCalled()
  })

  it('confirms, submits and polls a strategy promotion run', async () => {
    const wrapper = mount(ResearchGovernancePanel, {
      props: { canOperate: true },
      global: { directives: { loading: () => {} } },
    })
    await flushPromises()

    wrapper.vm.openGovernance('promote', challenger)
    wrapper.vm.governanceForm.reason = '影子评估和样本外验证均已通过'
    wrapper.vm.governanceForm.assessmentEventKey = 'ASSESS:12'
    await wrapper.vm.confirmGovernance()

    expect(ElMessageBox.confirm).toHaveBeenCalledOnce()
    expect(promoteStrategy).toHaveBeenCalledWith(12, expect.objectContaining({
      reason: '影子评估和样本外验证均已通过',
      assessmentEventKey: 'ASSESS:12',
    }))
    expect(pollPipelineRun).toHaveBeenCalledWith(88, expect.objectContaining({ onUpdate: expect.any(Function) }))
    expect(ElMessage.success).toHaveBeenCalledWith('确认晋级已完成')
  })
})
