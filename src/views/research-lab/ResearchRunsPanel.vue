<template>
  <div class="research-panel-stack">
    <section class="surface research-operation-panel personal-projection-panel">
      <div class="research-operation-header">
        <div>
          <h3>我的日报投影</h3>
          <p>基于最近已完成的全局研究批次，重新生成当前账号的自选股和持仓投研结果。</p>
        </div>
        <div class="research-operation-actions">
          <el-date-picker v-model="projectionDate" type="date" value-format="YYYY-MM-DD" aria-label="日报投影交易日" />
          <el-button type="primary" :loading="personalRunning" @click="runPersonalProjection">重新生成我的日报</el-button>
        </div>
      </div>
      <div v-if="personalRun" class="operation-result-line">
        <span>流水线 #{{ personalRun.id }}</span>
        <el-tag :type="statusTagType(personalRun.status)" effect="plain">{{ statusLabel(personalRun.status) }}</el-tag>
      </div>
    </section>

    <section v-if="canOperate" class="surface research-operation-panel">
      <div class="research-operation-header">
        <div>
          <h3>全局研究高级操作</h3>
          <p>仅用于数据补录、异常恢复和受控研究。日常收盘任务由自动化调度执行。</p>
        </div>
        <el-tag type="warning" effect="plain">运维权限</el-tag>
      </div>
      <div class="operation-date-controls">
        <el-date-picker v-model="operationDate" type="date" value-format="YYYY-MM-DD" aria-label="全局任务交易日" />
        <label class="operation-parameter">
          <span>历史训练截止日</span>
          <el-date-picker
            v-model="bootstrapEndDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择已收盘交易日"
            aria-label="历史训练截止日"
          />
        </label>
        <label class="operation-parameter">
          <span>训练交易日</span>
          <el-input-number
            v-model="historyTradingDays"
            :min="120"
            :max="300"
            :step="20"
            controls-position="right"
            aria-label="历史训练交易日数"
          />
        </label>
        <label class="operation-parameter">
          <span>训练股票数</span>
          <el-input-number
            v-model="historyStockCount"
            :min="200"
            :max="300"
            :step="50"
            controls-position="right"
            aria-label="历史训练股票数"
          />
        </label>
      </div>
      <p class="operation-estimate">
        预计回放 {{ historyTradingDays + 5 }} 个交易日，生成约
        {{ ((historyTradingDays + 5) * historyStockCount).toLocaleString('zh-CN') }} 条历史样本。
      </p>
      <div class="research-operation-list">
        <article v-for="item in operations" :key="item.key" class="research-operation-row">
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.impact }}</p>
            <span>前置条件：{{ item.prerequisite }}</span>
          </div>
          <div class="operation-control">
            <el-tag v-if="operationRuns[item.key]" :type="statusTagType(operationRuns[item.key].status)" effect="plain">
              {{ statusLabel(operationRuns[item.key].status) }}
            </el-tag>
            <el-button
              :type="item.key === 'daily' ? 'primary' : 'default'"
              :loading="runningOperation === item.key"
              :disabled="operationDisabled(item.key)"
              @click="runGlobalOperation(item)"
            >{{ item.buttonLabel }}</el-button>
          </div>
        </article>
      </div>
    </section>

    <ResearchEvidenceTable
      ref="runsTable"
      title="全局流水线记录"
      subtitle="展开详情可查看每一步的输入、输出、检查点、重试和错误。"
      :loader="fetchPipelineRuns"
      :detail-loader="fetchPipelineRun"
      :columns="runColumns"
      :status-options="runStatusOptions"
    />
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchPipelineRun,
  fetchPipelineRuns,
  pollPipelineRun,
  runResearchAction,
  runUserProjection,
} from '../../services/researchLab'
import { statusLabel } from '../../utils/statusLabels'
import ResearchEvidenceTable from './ResearchEvidenceTable.vue'
import { statusTagType } from './researchPresentation'

defineProps({ canOperate: Boolean })

const today = new Date().toISOString().slice(0, 10)
const projectionDate = ref(today)
const operationDate = ref(today)
const bootstrapEndDate = ref(today)
const historyTradingDays = ref(300)
const historyStockCount = ref(300)
const personalRunning = ref(false)
const personalRun = ref(null)
const runningOperation = ref('')
const operationRuns = reactive({})
const runsTable = ref(null)

const operations = Object.freeze([
  {
    key: 'daily', title: '全局日度研究', buttonLabel: '运行全局日度研究',
    impact: '固化股票池和数据批次，计算样本、因子与 T+1/T+2/T+3/T+5 预测。',
    prerequisite: '目标交易日收盘行情、基准和行业数据已完整到达。',
  },
  {
    key: 'bootstrap', title: '历史训练初始化', buttonLabel: '导入历史数据并初始化',
    impact: '导入截止日前 120 个以上真实交易日，额外回放 5 个交易日生成 T+5 成熟标签，再更新因子研究并训练候选模型；不会自动晋级正式策略。',
    prerequisite: '正式交易日历及至少一个真实历史行情源可用。首版使用当前上市股票历史队列，存在幸存者偏差，研究结论必须继续滚动验证。',
  },
  {
    key: 'labels', title: '成熟标签验证', buttonLabel: '验证成熟标签',
    impact: '补齐已到期预测周期的真实收益、成交限制和成本证据。',
    prerequisite: '对应退出交易日行情与交易日历已确认。',
  },
  {
    key: 'weekly', title: '周度策略研究', buttonLabel: '运行周度研究',
    impact: '更新因子表现、漂移、滚动窗口验证、组合回测和影子评估。',
    prerequisite: '成熟标签达到窗口要求，日度研究无未处理失败。',
  },
  {
    key: 'training', title: '月度模型训练', buttonLabel: '运行模型训练',
    impact: '冻结训练数据集，训练并注册候选模型，不会自动替换正式策略。',
    prerequisite: '交易日、股票数、各周期标签与市场环境覆盖通过训练准入门。',
  },
])

const runStatusOptions = Object.freeze([
  { label: '待处理', value: 'PENDING' },
  { label: '执行中', value: 'RUNNING' },
  { label: '等待数据源', value: 'WAITING_SOURCE' },
  { label: '成功', value: 'SUCCESS' },
  { label: '部分成功', value: 'PARTIAL_SUCCESS' },
  { label: '执行失败', value: 'FAILED' },
])
const runColumns = Object.freeze([
  { key: 'id', label: '运行 ID', width: 86, mono: true, fixed: 'left' },
  { key: 'tradeDate', label: '交易日', width: 112, mono: true },
  { key: 'pipelineType', label: '流水线类型', minWidth: 164, kind: 'status' },
  { key: 'status', label: '状态', width: 112, kind: 'status' },
  { key: 'currentStep', label: '当前步骤', minWidth: 150, kind: 'status' },
  { key: 'processedCount', label: '处理数', width: 82 },
  { key: 'successCount', label: '成功数', width: 82 },
  { key: 'failedCount', label: '失败数', width: 82 },
  { key: 'retryCount', label: '重试', width: 72 },
  { key: 'startedAt', label: '开始时间', minWidth: 164 },
  { key: 'finishedAt', label: '结束时间', minWidth: 164 },
])

async function runPersonalProjection() {
  personalRunning.value = true
  try {
    const accepted = await runUserProjection({ tradeDate: projectionDate.value })
    personalRun.value = { id: accepted.pipelineRunId, status: accepted.status }
    await pollPipelineRun(accepted.pipelineRunId, {
      onUpdate: (detail) => {
        personalRun.value = { id: accepted.pipelineRunId, status: detail?.record?.fields?.status }
      },
    })
    ElMessage.success('我的投研日报已重新生成')
  } catch (error) {
    ElMessage.error(error.message || '用户日报投影执行失败')
  } finally {
    personalRunning.value = false
  }
}

async function runGlobalOperation(item) {
  const validation = operationValidation(item.key)
  if (validation) {
    ElMessage.warning(validation)
    return
  }
  try {
    await ElMessageBox.confirm(
      `${item.impact}\n\n前置条件：${item.prerequisite}`,
      `确认${item.title}`,
      { confirmButtonText: item.buttonLabel, cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  runningOperation.value = item.key
  try {
    const accepted = await runResearchAction(item.key, operationPayload(item.key))
    operationRuns[item.key] = { id: accepted.pipelineRunId, status: accepted.status }
    if (item.key === 'bootstrap') {
      ElMessage.success('历史训练已提交，可在全局流水线记录中查看进度')
      runsTable.value?.load()
      void trackHistoricalBootstrap(accepted.pipelineRunId)
      return
    }
    const detail = await pollPipelineRun(accepted.pipelineRunId, {
      onUpdate: (detail) => {
        operationRuns[item.key] = { id: accepted.pipelineRunId, status: detail?.record?.fields?.status }
      },
    })
    notifyOperationCompletion(detail, item.title)
    runsTable.value?.load()
  } catch (error) {
    ElMessage.error(error.message || `${item.title}执行失败`)
  } finally {
    runningOperation.value = ''
  }
}

function operationValidation(key) {
  if (key === 'bootstrap' && !bootstrapEndDate.value) return '请选择历史训练截止日'
  if (key === 'bootstrap' && (historyTradingDays.value < 120 || historyTradingDays.value > 300)) return '训练交易日必须在 120 到 300 之间'
  if (key === 'bootstrap' && (historyStockCount.value < 200 || historyStockCount.value > 300)) return '训练股票数必须在 200 到 300 之间'
  if (['daily', 'labels'].includes(key) && !operationDate.value) return '请选择目标交易日'
  return ''
}

function operationPayload(key) {
  const idempotencyKey = `WEB:${key.toUpperCase()}:${Date.now()}`
  if (key === 'bootstrap') return {
    endDate: bootstrapEndDate.value,
    historyTradingDays: historyTradingDays.value,
    historyStockCount: historyStockCount.value,
    idempotencyKey,
  }
  if (['daily', 'labels'].includes(key)) return { tradeDate: operationDate.value, idempotencyKey }
  return { idempotencyKey }
}

function operationDisabled(key) {
  const status = String(operationRuns[key]?.status || '').toUpperCase()
  return (Boolean(runningOperation.value) && runningOperation.value !== key)
    || ['PENDING', 'RUNNING'].includes(status)
}

async function trackHistoricalBootstrap(pipelineRunId) {
  try {
    const detail = await pollPipelineRun(pipelineRunId, {
      interval: 5000,
      maxAttempts: 4320,
      onUpdate: (current) => {
        operationRuns.bootstrap = { id: pipelineRunId, status: current?.record?.fields?.status }
      },
    })
    notifyOperationCompletion(detail, '历史训练初始化')
    runsTable.value?.load()
  } catch (error) {
    ElMessage.error(error.message || '历史训练初始化执行失败')
  }
}

function notifyOperationCompletion(detail, title) {
  const fields = detail?.record?.fields || {}
  const status = String(fields.status || '').toUpperCase()
  if (status === 'FAILED') {
    throw new Error(fields.errorMessage || `${title}执行失败`)
  }
  if (status === 'PARTIAL_SUCCESS') {
    ElMessage.warning(fields.errorMessage || `${title}已完成数据初始化，但后续研究或训练仍有未满足条件`)
    return
  }
  ElMessage.success(`${title}已完成`)
}
</script>
