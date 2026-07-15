<template>
  <div class="research-panel-stack">
    <el-alert
      v-if="!canOperate"
      title="当前账号可查看策略证据，但不能执行晋级、拒绝或回滚。"
      type="info"
      show-icon
      :closable="false"
    />

    <div class="research-subtabs" role="tablist" aria-label="策略治理证据类型">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="activeKey === tab.key"
        :class="{ active: activeKey === tab.key }"
        @click="activeKey = tab.key"
      >{{ tab.label }}</button>
    </div>

    <section v-if="activeKey === 'strategies'" class="surface research-table-panel">
      <div class="research-table-header">
        <div>
          <h3>策略版本</h3>
          <p class="research-table-subtitle">正式策略、候选策略和规则基线都保留不可变版本与治理证据。</p>
        </div>
        <el-button :icon="Refresh" :loading="loading" @click="loadStrategies">刷新</el-button>
      </div>
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
      <el-table v-loading="loading" :data="strategies" row-key="fields.id" stripe empty-text="暂无策略版本">
        <el-table-column label="策略" min-width="190" fixed="left">
          <template #default="scope">
            <div class="strategy-identity">
              <strong>{{ scope?.row?.fields?.title || `策略 #${scope?.row?.fields?.id || '-'}` }}</strong>
              <span class="mono">{{ scope?.row?.fields?.versionNo || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="104">
          <template #default="scope"><el-tag effect="plain" type="info">{{ statusLabel(scope?.row?.fields?.releaseRole) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="108">
          <template #default="scope"><el-tag effect="plain" :type="statusTagType(scope?.row?.fields?.status)">{{ statusLabel(scope?.row?.fields?.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="fields.modelVersionId" label="模型 ID" width="92" />
        <el-table-column label="影子开始" min-width="164">
          <template #default="scope">{{ formatResearchValue('shadowStartedAt', scope?.row?.fields?.shadowStartedAt) }}</template>
        </el-table-column>
        <el-table-column label="启用时间" min-width="164">
          <template #default="scope">{{ formatResearchValue('activatedAt', scope?.row?.fields?.activatedAt) }}</template>
        </el-table-column>
        <el-table-column v-if="canOperate" label="治理操作" width="212" fixed="right">
          <template #default="scope">
            <div class="governance-row-actions">
              <el-button
                v-if="isShadowChallenger(scope?.row)"
                text
                type="primary"
                :disabled="executing"
                @click="openGovernance('promote', scope?.row)"
              >晋级</el-button>
              <el-button
                v-if="isShadowChallenger(scope?.row)"
                text
                type="danger"
                :disabled="executing"
                @click="openGovernance('reject', scope?.row)"
              >拒绝</el-button>
              <el-button
                v-if="isActiveChampion(scope?.row)"
                text
                type="warning"
                :disabled="executing"
                @click="openGovernance('rollback', scope?.row)"
              >回滚</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="research-pagination">
        <span>共 {{ total }} 条</span>
        <el-pagination
          v-model:current-page="page"
          background
          layout="prev, pager, next"
          :page-size="20"
          :total="total"
          @current-change="loadStrategies"
        />
      </div>
    </section>

    <ResearchEvidenceTable
      v-else-if="activeKey === 'shadow'"
      title="影子策略评估"
      subtitle="同一批样本上对照正式策略与候选策略，页面不重新计算决策结论。"
      :loader="fetchShadowEvaluations"
      :columns="shadowColumns"
      :status-options="shadowStatusOptions"
    />
    <ResearchEvidenceTable
      v-else
      title="治理审计事件"
      subtitle="记录晋级、拒绝、回滚的规则版本、操作者原因与证据。"
      :loader="fetchGovernanceEvents"
      :columns="eventColumns"
      :status-options="eventStatusOptions"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="min(620px, 94vw)"
      destroy-on-close
      :close-on-click-modal="!executing"
      :close-on-press-escape="!executing"
    >
      <el-alert :title="dialogWarning" type="warning" show-icon :closable="false" />
      <el-form class="governance-form" label-position="top" @submit.prevent>
        <el-form-item label="治理原因" required>
          <el-input
            v-model.trim="governanceForm.reason"
            type="textarea"
            :rows="3"
            maxlength="300"
            show-word-limit
            placeholder="说明本次操作依据、影响范围和人工判断"
          />
        </el-form-item>
        <el-form-item v-if="operation === 'promote'" label="等待复核事件键" required>
          <el-input v-model.trim="governanceForm.assessmentEventKey" placeholder="输入等待复核记录对应的事件键" />
        </el-form-item>
        <template v-if="operation === 'rollback'">
          <div class="governance-field-grid">
            <el-form-item label="上一版正式策略 ID" required>
              <el-input-number v-model="governanceForm.previousChampionReleaseId" :min="1" controls-position="right" />
            </el-form-item>
            <el-form-item label="影子评估 ID" required>
              <el-input-number v-model="governanceForm.shadowEvaluationId" :min="1" controls-position="right" />
            </el-form-item>
            <el-form-item label="严重漂移数量" required>
              <el-input-number v-model="governanceForm.criticalDriftCount" :min="0" controls-position="right" />
            </el-form-item>
          </div>
          <el-form-item label="退化证据指纹" required>
            <el-input v-model.trim="governanceForm.degradationFingerprint" placeholder="输入后端研究证据中的退化指纹" />
          </el-form-item>
        </template>
        <el-form-item label="治理规则版本">
          <el-input v-model.trim="governanceForm.policyVersion" />
        </el-form-item>
      </el-form>
      <div v-if="activeRun" class="governance-run-state">
        <span>流水线 #{{ activeRun.id }}</span>
        <el-tag :type="statusTagType(activeRun.status)" effect="plain">{{ statusLabel(activeRun.status) }}</el-tag>
      </div>
      <template #footer>
        <el-button :disabled="executing" @click="dialogVisible = false">取消</el-button>
        <el-button :type="operation === 'reject' ? 'danger' : 'primary'" :loading="executing" @click="confirmGovernance">
          {{ operationLabel }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  fetchGovernanceEvents,
  fetchStrategyReleases,
  fetchShadowEvaluations,
  pollPipelineRun,
  promoteStrategy,
  rejectStrategy,
  rollbackStrategy,
} from '../../services/researchLab'
import { statusLabel } from '../../utils/statusLabels'
import ResearchEvidenceTable from './ResearchEvidenceTable.vue'
import { formatResearchValue, statusTagType } from './researchPresentation'

const props = defineProps({ canOperate: Boolean })
const tabs = Object.freeze([
  { key: 'strategies', label: '策略版本' },
  { key: 'shadow', label: '影子评估' },
  { key: 'events', label: '治理记录' },
])
const shadowStatusOptions = Object.freeze([
  { label: '等待人工复核', value: 'READY_FOR_REVIEW' },
  { label: '已晋级', value: 'PROMOTED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '数据积累不足', value: 'INSUFFICIENT_DATA' },
])
const eventStatusOptions = Object.freeze([
  { label: '等待人工复核', value: 'READY_FOR_REVIEW' },
  { label: '已晋级', value: 'PROMOTED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已回滚', value: 'ROLLED_BACK' },
])
const shadowColumns = Object.freeze([
  { key: 'id', label: '评估 ID', width: 86, mono: true, fixed: 'left' },
  { key: 'windowEndDate', label: '窗口结束日', width: 112, mono: true },
  { key: 'championReleaseId', label: '正式策略', width: 92, mono: true },
  { key: 'challengerReleaseId', label: '候选策略', width: 92, mono: true },
  { key: 'eligibleSampleCount', label: '有效样本', width: 92 },
  { key: 'coverageRate', label: '覆盖率', width: 88, kind: 'ratio' },
  { key: 'actionAgreementRate', label: '动作一致率', width: 104, kind: 'ratio' },
  { key: 'championExcessReturn', label: '正式策略超额', width: 116, kind: 'ratio' },
  { key: 'challengerExcessReturn', label: '候选策略超额', width: 116, kind: 'ratio' },
  { key: 'featureDriftScore', label: '漂移分', width: 82, kind: 'score' },
  { key: 'decisionStatus', label: '结论', width: 118, kind: 'status' },
  { key: 'evaluatedAt', label: '评估时间', minWidth: 164 },
])
const eventColumns = Object.freeze([
  { key: 'id', label: '事件 ID', width: 86, mono: true, fixed: 'left' },
  { key: 'strategyReleaseId', label: '策略 ID', width: 92, mono: true },
  { key: 'eventType', label: '事件类型', minWidth: 150, kind: 'status' },
  { key: 'decisionStatus', label: '治理结论', width: 118, kind: 'status' },
  { key: 'policyVersion', label: '规则版本', width: 146, mono: true },
  { key: 'actorType', label: '操作者类型', width: 110, kind: 'status' },
  { key: 'reason', label: '原因', minWidth: 240 },
  { key: 'occurredAt', label: '发生时间', minWidth: 164 },
])

const activeKey = ref('strategies')
const strategies = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const errorMessage = ref('')
const dialogVisible = ref(false)
const operation = ref('')
const selectedStrategy = ref(null)
const executing = ref(false)
const activeRun = ref(null)
const governanceForm = reactive({
  reason: '',
  assessmentEventKey: '',
  previousChampionReleaseId: null,
  shadowEvaluationId: null,
  criticalDriftCount: 0,
  degradationFingerprint: '',
  policyVersion: 'MANUAL_GOVERNANCE_V1',
})

const operationLabel = computed(() => ({ promote: '确认晋级', reject: '确认拒绝', rollback: '确认回滚' }[operation.value] || '确认'))
const dialogTitle = computed(() => `${operationLabel.value}：${selectedStrategy.value?.fields?.title || ''}`)
const dialogWarning = computed(() => ({
  promote: '晋级会替换当前正式策略。提交前必须确认样本外验证、组合回测和影子评估均已通过。',
  reject: '拒绝后候选策略将退役，操作会写入不可变治理记录。',
  rollback: '回滚会切换正式策略。必须提供上一版策略、影子评估和退化证据。',
}[operation.value] || ''))

onMounted(loadStrategies)

async function loadStrategies() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await fetchStrategyReleases({ page: page.value, pageSize: 20 })
    strategies.value = result?.items || []
    total.value = Number(result?.total || 0)
  } catch (error) {
    strategies.value = []
    total.value = 0
    errorMessage.value = error.message || '策略版本加载失败'
  } finally {
    loading.value = false
  }
}

function isShadowChallenger(item) {
  return item?.fields?.releaseRole === 'CHALLENGER' && item?.fields?.status === 'SHADOW'
}

function isActiveChampion(item) {
  return item?.fields?.releaseRole === 'CHAMPION' && item?.fields?.status === 'ACTIVE'
}

function openGovernance(nextOperation, strategy) {
  if (!props.canOperate) return
  operation.value = nextOperation
  selectedStrategy.value = strategy
  governanceForm.reason = ''
  governanceForm.assessmentEventKey = ''
  governanceForm.previousChampionReleaseId = null
  governanceForm.shadowEvaluationId = null
  governanceForm.criticalDriftCount = 0
  governanceForm.degradationFingerprint = ''
  governanceForm.policyVersion = 'MANUAL_GOVERNANCE_V1'
  activeRun.value = null
  dialogVisible.value = true
}

async function confirmGovernance() {
  const validationMessage = validateGovernance()
  if (validationMessage) {
    ElMessage.warning(validationMessage)
    return
  }
  try {
    await ElMessageBox.confirm(
      `${operationLabel.value}策略 #${selectedStrategy.value.fields.id}？该操作会写入正式治理记录。`,
      '再次确认策略治理',
      { confirmButtonText: operationLabel.value, cancelButtonText: '返回检查', type: 'warning' },
    )
  } catch {
    return
  }

  executing.value = true
  try {
    const payload = {
      reason: governanceForm.reason,
      assessmentEventKey: governanceForm.assessmentEventKey,
      previousChampionReleaseId: governanceForm.previousChampionReleaseId,
      shadowEvaluationId: governanceForm.shadowEvaluationId,
      criticalDriftCount: governanceForm.criticalDriftCount,
      degradationFingerprint: governanceForm.degradationFingerprint,
      policyVersion: governanceForm.policyVersion,
      idempotencyKey: `WEB:${operation.value.toUpperCase()}:${selectedStrategy.value.fields.id}:${Date.now()}`,
    }
    const action = { promote: promoteStrategy, reject: rejectStrategy, rollback: rollbackStrategy }[operation.value]
    const accepted = await action(selectedStrategy.value.fields.id, payload)
    activeRun.value = { id: accepted.pipelineRunId, status: accepted.status }
    await pollPipelineRun(accepted.pipelineRunId, {
      onUpdate: (detail) => {
        activeRun.value = { id: accepted.pipelineRunId, status: detail?.record?.fields?.status }
      },
    })
    ElMessage.success(`${operationLabel.value}已完成`)
    dialogVisible.value = false
    await loadStrategies()
  } catch (error) {
    ElMessage.error(error.message || '策略治理操作失败')
  } finally {
    executing.value = false
  }
}

function validateGovernance() {
  if (!governanceForm.reason) return '请填写治理原因'
  if (operation.value === 'promote' && !governanceForm.assessmentEventKey) return '请填写等待复核事件键'
  if (operation.value === 'rollback') {
    if (!governanceForm.previousChampionReleaseId || !governanceForm.shadowEvaluationId) return '请填写上一版正式策略和影子评估 ID'
    if (!governanceForm.degradationFingerprint) return '请填写退化证据指纹'
  }
  return ''
}

defineExpose({ confirmGovernance, governanceForm, openGovernance })
</script>
