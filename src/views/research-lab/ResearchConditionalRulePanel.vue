<template>
  <div class="research-panel-stack">
    <el-alert
      title="条件规则只在通过 Walk-forward、Shadow 并经人工确认后才会启用。样本不足或数据缺失时保持禁用，不会自动修改正式投研结论。"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="surface research-table-panel">
      <div class="research-table-header">
        <div>
          <h3>条件规则版本</h3>
          <p class="research-table-subtitle">候选规则从当前正式版本复制，变更只在候选域中验证。</p>
        </div>
        <div class="research-toolbar-actions">
          <el-button :icon="Refresh" :loading="loading.configs" @click="loadConfigs">刷新</el-button>
          <el-button v-if="canOperate" type="primary" :icon="Plus" :disabled="!activeConfig" @click="openCandidateDialog">
            创建候选规则
          </el-button>
        </div>
      </div>
      <el-table v-loading="loading.configs" :data="configs" stripe empty-text="暂无条件规则配置">
        <el-table-column label="名称" min-width="184" fixed="left">
          <template #default="scope">
            <div class="strategy-identity">
              <strong>{{ scope.row.fields.name || `规则 #${scope.row.fields.id}` }}</strong>
              <span class="mono">{{ scope.row.fields.versionNo || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="148">
          <template #default="scope"><el-tag :type="statusTagType(scope.row.fields.status)" effect="plain">{{ statusLabel(scope.row.fields.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="最近更新" min-width="170">
          <template #default="scope">{{ formatResearchValue('updatedAt', scope.row.fields.updatedAt) }}</template>
        </el-table-column>
        <el-table-column v-if="canOperate" label="操作" width="154" fixed="right">
          <template #default="scope">
            <el-button
              v-if="scope.row.fields.status === 'CANDIDATE'"
              text
              type="primary"
              :icon="VideoPlay"
              :loading="runningConfigId === scope.row.fields.id"
              @click="runWalkForward(scope.row)"
            >Walk-forward</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="surface research-table-panel">
      <div class="research-table-header">
        <div>
          <h3>时序实验</h3>
          <p class="research-table-subtitle">只使用历史不可变收盘样本与成熟标签。当前先评估可验证的入场信号，不合成历史持仓或缺失行情。</p>
        </div>
        <el-button :icon="Refresh" :loading="loading.experiments" @click="loadExperiments">刷新</el-button>
      </div>
      <el-table v-loading="loading.experiments" :data="experiments" stripe empty-text="暂无候选规则实验">
        <el-table-column prop="fields.id" label="实验 ID" width="92" fixed="left" />
        <el-table-column prop="fields.ruleConfigVersion" label="规则版本" min-width="172" />
        <el-table-column prop="fields.horizonDays" label="周期" width="82">
          <template #default="scope">T+{{ scope.row.fields.horizonDays || '-' }}</template>
        </el-table-column>
        <el-table-column prop="fields.eligibleSampleCount" label="有效样本" width="96" />
        <el-table-column prop="fields.triggeredSampleCount" label="触发样本" width="96" />
        <el-table-column label="状态" width="170">
          <template #default="scope"><el-tag :type="statusTagType(scope.row.fields.candidateStatus)" effect="plain">{{ statusLabel(scope.row.fields.candidateStatus) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="完成时间" min-width="170">
          <template #default="scope">{{ formatResearchValue('updatedAt', scope.row.fields.updatedAt) }}</template>
        </el-table-column>
        <el-table-column v-if="canOperate" label="操作" width="130" fixed="right">
          <template #default="scope">
            <el-button
              v-if="['WALK_FORWARD_PASSED', 'SHADOW_INSUFFICIENT_DATA'].includes(scope.row.fields.candidateStatus)"
              text
              type="primary"
              :icon="VideoPlay"
              :loading="runningExperimentId === scope.row.fields.id"
              @click="runShadow(scope.row)"
            >{{ scope.row.fields.candidateStatus === 'SHADOW_INSUFFICIENT_DATA' ? '补充 Shadow' : '进入 Shadow' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="surface research-table-panel">
      <div class="research-table-header">
        <div>
          <h3>Shadow 观察</h3>
          <p class="research-table-subtitle">与当前正式条件规则对照，达到门槛后仍须人工审核；不会自动上线。</p>
        </div>
        <el-button :icon="Refresh" :loading="loading.shadows" @click="loadShadows">刷新</el-button>
      </div>
      <el-table v-loading="loading.shadows" :data="shadows" stripe empty-text="暂无 Shadow 观察">
        <el-table-column prop="fields.id" label="观察 ID" width="92" fixed="left" />
        <el-table-column prop="fields.experimentId" label="实验 ID" width="92" />
        <el-table-column label="窗口" min-width="204">
          <template #default="scope">{{ scope.row.fields.windowStartDate || '-' }} 至 {{ scope.row.fields.windowEndDate || '-' }}</template>
        </el-table-column>
        <el-table-column prop="fields.eligibleSampleCount" label="有效样本" width="96" />
        <el-table-column prop="fields.candidateTriggeredCount" label="候选触发" width="96" />
        <el-table-column label="状态" width="156">
          <template #default="scope"><el-tag :type="statusTagType(scope.row.fields.status)" effect="plain">{{ statusLabel(scope.row.fields.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column v-if="canOperate" label="人工治理" width="154" fixed="right">
          <template #default="scope">
            <div v-if="scope.row.fields.status === 'READY_FOR_REVIEW'" class="governance-row-actions">
              <el-button text type="success" :icon="Check" :loading="decidingShadowId === scope.row.fields.id" @click="decideShadow('approve', scope.row)">批准</el-button>
              <el-button text type="danger" :icon="Close" :loading="decidingShadowId === scope.row.fields.id" @click="decideShadow('reject', scope.row)">拒绝</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <ResearchEvidenceTable
      title="条件规则治理审计"
      subtitle="保留候选创建、样本外验证、Shadow 结论与人工审批原因。"
      :loader="fetchConditionalRuleGovernanceEvents"
      :columns="eventColumns"
      :status-options="eventStatusOptions"
    />

    <el-dialog v-model="candidateDialogVisible" title="创建候选条件规则" width="min(640px, 94vw)" destroy-on-close>
      <el-alert title="覆盖配置只接受规则阈值、风险权重、仓位、最小条件数和因子映射。创建后保持候选状态，不能直接启用。" type="info" show-icon :closable="false" />
      <el-form class="governance-form" label-position="top" @submit.prevent>
        <el-form-item label="来源正式规则">
          <el-input :model-value="activeConfig?.fields?.name ? `${activeConfig.fields.name} (${activeConfig.fields.versionNo})` : '-'" disabled />
        </el-form-item>
        <div class="governance-field-grid">
          <el-form-item label="候选版本" required>
            <el-input v-model.trim="candidateForm.versionNo" placeholder="例如 CONDITIONAL_RULE/1.1.0" />
          </el-form-item>
          <el-form-item label="候选名称" required>
            <el-input v-model.trim="candidateForm.name" placeholder="例如 回踩买点阈值候选" />
          </el-form-item>
        </div>
        <el-form-item label="覆盖配置 JSON">
          <el-input v-model="candidateForm.overrideJson" type="textarea" :rows="7" placeholder='例如 {"thresholds":{"nearMovingAveragePct":1.2}}' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="creatingCandidate" @click="candidateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creatingCandidate" @click="createCandidate">创建候选</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close, Plus, Refresh, VideoPlay } from '@element-plus/icons-vue'
import {
  approveConditionalRuleShadow,
  createConditionalRuleCandidate,
  fetchConditionalRuleConfigs,
  fetchConditionalRuleExperiments,
  fetchConditionalRuleGovernanceEvents,
  fetchConditionalRuleShadowObservations,
  pollPipelineRun,
  rejectConditionalRuleShadow,
  runConditionalRuleShadow,
  runConditionalRuleWalkForward,
} from '../../services/researchLab'
import { statusLabel } from '../../utils/statusLabels'
import ResearchEvidenceTable from './ResearchEvidenceTable.vue'
import { formatResearchValue, statusTagType } from './researchPresentation'

const props = defineProps({ canOperate: Boolean })
const configs = ref([])
const experiments = ref([])
const shadows = ref([])
const loading = reactive({ configs: false, experiments: false, shadows: false })
const runningConfigId = ref(null)
const runningExperimentId = ref(null)
const decidingShadowId = ref(null)
const candidateDialogVisible = ref(false)
const creatingCandidate = ref(false)
const candidateForm = reactive({ versionNo: '', name: '', overrideJson: '{}' })
const activeConfig = computed(() => configs.value.find((item) => item.fields?.status === 'ACTIVE') || null)

const eventStatusOptions = Object.freeze([
  { label: '候选', value: 'CANDIDATE' },
  { label: '样本不足', value: 'INSUFFICIENT_DATA' },
  { label: '时序验证通过', value: 'WALK_FORWARD_PASSED' },
  { label: '时序验证未通过', value: 'WALK_FORWARD_REJECTED' },
  { label: '等待人工复核', value: 'READY_FOR_REVIEW' },
  { label: '已晋级', value: 'PROMOTED' },
  { label: '已拒绝', value: 'REJECTED' },
])
const eventColumns = Object.freeze([
  { key: 'id', label: '事件 ID', width: 86, mono: true, fixed: 'left' },
  { key: 'tradeRuleConfigId', label: '规则 ID', width: 90, mono: true },
  { key: 'eventType', label: '事件类型', minWidth: 180, kind: 'status' },
  { key: 'decisionStatus', label: '结论', width: 150, kind: 'status' },
  { key: 'actorType', label: '操作者', width: 92, kind: 'status' },
  { key: 'reason', label: '原因', minWidth: 260 },
  { key: 'occurredAt', label: '时间', minWidth: 164 },
])

onMounted(() => Promise.all([loadConfigs(), loadExperiments(), loadShadows()]))

async function loadConfigs() {
  loading.configs = true
  try {
    const result = await fetchConditionalRuleConfigs({ page: 1, pageSize: 50 })
    configs.value = result?.items || []
  } catch (error) {
    configs.value = []
    ElMessage.error(error.message || '条件规则配置加载失败')
  } finally {
    loading.configs = false
  }
}

async function loadExperiments() {
  loading.experiments = true
  try {
    const result = await fetchConditionalRuleExperiments({ page: 1, pageSize: 50 })
    experiments.value = result?.items || []
  } catch (error) {
    experiments.value = []
    ElMessage.error(error.message || '条件规则实验加载失败')
  } finally {
    loading.experiments = false
  }
}

async function loadShadows() {
  loading.shadows = true
  try {
    const result = await fetchConditionalRuleShadowObservations({ page: 1, pageSize: 50 })
    shadows.value = result?.items || []
  } catch (error) {
    shadows.value = []
    ElMessage.error(error.message || '条件规则 Shadow 加载失败')
  } finally {
    loading.shadows = false
  }
}

function openCandidateDialog() {
  if (!props.canOperate || !activeConfig.value) return
  candidateForm.versionNo = ''
  candidateForm.name = ''
  candidateForm.overrideJson = '{}'
  candidateDialogVisible.value = true
}

async function createCandidate() {
  if (!candidateForm.versionNo || !candidateForm.name) {
    ElMessage.warning('请填写候选版本和名称')
    return
  }
  try {
    JSON.parse(candidateForm.overrideJson || '{}')
  } catch {
    ElMessage.warning('覆盖配置必须是合法 JSON')
    return
  }
  creatingCandidate.value = true
  try {
    await createConditionalRuleCandidate({
      sourceTradeRuleConfigId: activeConfig.value.fields.id,
      versionNo: candidateForm.versionNo,
      name: candidateForm.name,
      overrideJson: candidateForm.overrideJson || '{}',
    })
    ElMessage.success('候选规则已创建，尚未启用')
    candidateDialogVisible.value = false
    await loadConfigs()
  } catch (error) {
    ElMessage.error(error.message || '创建候选规则失败')
  } finally {
    creatingCandidate.value = false
  }
}

async function runWalkForward(config) {
  const id = config?.fields?.id
  if (!id) return
  try {
    await ElMessageBox.confirm('将基于历史不可变样本和成熟标签运行时序验证。结果不会自动启用规则。', '运行 Walk-forward', {
      confirmButtonText: '开始运行', cancelButtonText: '取消', type: 'warning',
    })
  } catch {
    return
  }
  runningConfigId.value = id
  try {
    const accepted = await runConditionalRuleWalkForward({
      candidateTradeRuleConfigId: id,
      horizonDays: 3,
      initialTrainDays: 60,
      validationDays: 20,
      testDays: 20,
      stepDays: 20,
      foldCount: 3,
      purgeDays: 5,
      embargoDays: 5,
      idempotencyKey: `WEB:CONDITIONAL_RULE_WF:${id}:${Date.now()}`,
    })
    await pollPipelineRun(accepted.pipelineRunId)
    ElMessage.success('Walk-forward 已完成，请查看实验结论')
    await Promise.all([loadConfigs(), loadExperiments()])
  } catch (error) {
    ElMessage.error(error.message || 'Walk-forward 执行失败')
  } finally {
    runningConfigId.value = null
  }
}

async function runShadow(experiment) {
  const id = experiment?.fields?.id
  if (!id) return
  try {
    await ElMessageBox.confirm('将与当前正式规则进行 Shadow 对照。即使通过，也必须人工批准才会生效。', '进入 Shadow', {
      confirmButtonText: '开始观察', cancelButtonText: '取消', type: 'warning',
    })
  } catch {
    return
  }
  runningExperimentId.value = id
  try {
    const accepted = await runConditionalRuleShadow({
      experimentId: id,
      idempotencyKey: `WEB:CONDITIONAL_RULE_SHADOW:${id}:${Date.now()}`,
    })
    await pollPipelineRun(accepted.pipelineRunId)
    ElMessage.success('Shadow 已完成，请查看对照结论')
    await Promise.all([loadExperiments(), loadShadows()])
  } catch (error) {
    ElMessage.error(error.message || 'Shadow 执行失败')
  } finally {
    runningExperimentId.value = null
  }
}

async function decideShadow(action, item) {
  const id = item?.fields?.id
  if (!id) return
  const label = action === 'approve' ? '批准并启用候选规则' : '拒绝候选规则'
  let reason = ''
  try {
    const result = await ElMessageBox.prompt('请填写人工判断依据。该原因会写入不可变治理审计。', label, {
      inputPlaceholder: '说明依据、风险和影响范围',
      inputValidator: (value) => value?.trim() ? true : '必须填写治理原因',
      confirmButtonText: action === 'approve' ? '确认批准' : '确认拒绝',
      cancelButtonText: '取消', type: action === 'approve' ? 'warning' : 'error',
    })
    reason = result.value.trim()
  } catch {
    return
  }
  decidingShadowId.value = id
  try {
    const invoke = action === 'approve' ? approveConditionalRuleShadow : rejectConditionalRuleShadow
    await invoke(id, { reason, policyVersion: 'CONDITIONAL_RULE_GOVERNANCE/1.0.0' })
    ElMessage.success(action === 'approve' ? '候选规则已人工批准并启用' : '候选规则已拒绝，正式规则未变化')
    await Promise.all([loadConfigs(), loadExperiments(), loadShadows()])
  } catch (error) {
    ElMessage.error(error.message || '条件规则治理操作失败')
  } finally {
    decidingShadowId.value = null
  }
}
</script>
