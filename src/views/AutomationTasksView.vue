<template>
  <div class="page automation-page">
    <section class="surface command-surface">
      <div class="surface-header command-header">
        <div>
          <h2 class="surface-title">自动化任务</h2>
          <p class="surface-subtitle">把 AI 分析、样本、复盘、因子、选股、回测和模型评测串成可执行闭环</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadTaskConfig">刷新状态</el-button>
          <el-button
            :type="schedulerStatus?.autoClosePipelineEnabled ? 'danger' : 'success'"
            :icon="Timer"
            :loading="togglingAutoPipeline"
            @click="toggleAutoPipeline"
          >
            {{ schedulerStatus?.autoClosePipelineEnabled ? '关闭每日自动' : '开启每日自动' }}
          </el-button>
          <el-button :icon="VideoPlay" :loading="pipelineRunning === 'intraday'" @click="runPipeline('intraday')">
            盘中快速巡检
          </el-button>
          <el-button type="primary" :icon="Finished" :loading="pipelineRunning === 'close'" @click="runPipeline('close')">
            收盘学习流水线
          </el-button>
        </div>
      </div>

      <div v-loading="loading" class="surface-body command-body">
        <div class="status-grid">
          <div class="status-tile">
            <span>每日自动流水线</span>
            <strong :class="autoClosePipelineClass">{{ autoClosePipelineText }}</strong>
            <em>{{ autoClosePipelineHelper }}</em>
          </div>
          <div class="status-tile">
            <span>下次自动执行</span>
            <strong>{{ schedulerStatus?.nextAutoClosePipelineTime || '-' }}</strong>
            <em>每个开盘日 16:00 后端自动执行收盘学习顺序</em>
          </div>
          <div class="status-tile">
            <span>学习样本</span>
            <strong>{{ metricValue('样本数') }}</strong>
            <em>{{ metricHelper('样本数', '等待样本构建') }}</em>
          </div>
          <div class="status-tile">
            <span>样本外胜率</span>
            <strong>{{ metricValue('样本外胜率') }}</strong>
            <em>{{ metricHelper('样本外胜率', '等待复盘验证') }}</em>
          </div>
          <div class="status-tile">
            <span>每日投研结果</span>
            <strong :class="dailyInsightStatusClass">{{ dailyInsightStatusText }}</strong>
            <em>{{ dailyInsightHelper }}</em>
          </div>
        </div>

        <div class="pipeline-strip">
          <div>
            <span class="strip-label">建议执行顺序</span>
            <strong>{{ currentPipelineTitle }}</strong>
          </div>
          <ol>
            <li v-for="step in currentPipelineSteps" :key="step.key" :class="stepState(step.key)">
              <span>{{ step.order }}</span>
              <p>{{ step.title }}</p>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <div class="section-grid automation-layout">
      <section class="surface task-surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">任务编排</h2>
            <p class="surface-subtitle">每个任务都可以单独执行，也可以加入盘中或收盘流水线</p>
          </div>
        </div>
        <div class="surface-body task-board">
          <article v-for="task in taskCards" :key="task.key" class="task-row" :class="[task.tone, task.status]">
            <div class="task-icon">
              <el-icon><component :is="task.icon" /></el-icon>
            </div>
            <div class="task-copy">
              <div class="task-title-line">
                <strong>{{ task.title }}</strong>
                <el-tag size="small" effect="plain" :type="taskTagType(task.status)">
                  {{ taskStatusText(task.status) }}
                </el-tag>
              </div>
              <p>{{ task.description }}</p>
              <div class="task-meta">
                <span>{{ task.cadence }}</span>
                <span>{{ task.input }}</span>
                <span>{{ task.output }}</span>
              </div>
            </div>
            <el-button
              :type="task.primary ? 'primary' : 'default'"
              :icon="task.actionIcon"
              :loading="runningTaskKey === task.key"
              :disabled="Boolean(pipelineRunning) || (Boolean(runningTaskKey) && runningTaskKey !== task.key)"
              @click="runSingleTask(task)"
            >
              执行
            </el-button>
          </article>
        </div>
      </section>

      <section class="surface side-surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">运行策略</h2>
            <p class="surface-subtitle">盘中重实时，收盘重学习，开放前先看验证结果</p>
          </div>
        </div>
        <div class="surface-body strategy-panel">
          <div class="strategy-item">
            <span class="strategy-index">01</span>
            <div>
              <strong>盘中快速巡检</strong>
              <p>适合开盘后或盘中手动检查，自选股分析后立即生成 Top K 候选。</p>
              <el-button :icon="VideoPlay" :loading="pipelineRunning === 'intraday'" @click="runPipeline('intraday')">
                执行盘中巡检
              </el-button>
            </div>
          </div>
          <div class="strategy-item">
            <span class="strategy-index">02</span>
            <div>
              <strong>收盘学习流水线</strong>
              <p>构建样本、复盘打标、刷新因子、生成候选、跑回测并评测模型输出质量。</p>
              <el-button type="primary" :icon="Finished" :loading="pipelineRunning === 'close'" @click="runPipeline('close')">
                执行收盘学习
              </el-button>
            </div>
          </div>
          <div class="strategy-item">
            <span class="strategy-index">03</span>
            <div>
              <strong>复盘优先原则</strong>
              <p>如果胜率没有提升，先看标签、因子和回测，不要直接进化策略版本。</p>
              <el-button :icon="CircleCheck" :loading="runningTaskKey === 'verify'" @click="runTaskByKey('verify')">
                只做复盘打标
              </el-button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">调度配置</h2>
          <p class="surface-subtitle">每日自动收盘流水线由本页按钮启停；模型、范围和 Top K 参数会被手动与自动任务复用</p>
        </div>
      </div>
      <div class="surface-body">
        <el-form :model="form" label-position="top">
          <div class="form-grid four">
            <el-form-item label="盘中分析间隔">
              <el-input-number v-model="form.intradayInterval" :min="5" :step="5" controls-position="right" />
            </el-form-item>
            <el-form-item label="收盘后分析时间">
              <el-time-picker v-model="closeTime" format="HH:mm" value-format="HH:mm" />
            </el-form-item>
            <el-form-item label="分析范围">
              <el-select v-model="form.analysisScope">
                <el-option label="全部自选股" value="全部自选股" />
                <el-option label="仅已持仓" value="仅已持仓" />
                <el-option label="AI重点分组" value="AI重点分组" />
              </el-select>
            </el-form-item>
            <el-form-item label="回测周期">
              <el-select v-model="backtestForm.horizonDays">
                <el-option label="T+1" :value="1" />
                <el-option label="T+3" :value="3" />
                <el-option label="T+5" :value="5" />
              </el-select>
            </el-form-item>
          </div>
          <div class="form-grid four compact-grid">
            <el-form-item label="选股 Top K">
              <el-input-number v-model="rankForm.topK" :min="1" :max="20" controls-position="right" />
            </el-form-item>
            <el-form-item label="回测 Top K">
              <el-input-number v-model="backtestForm.topK" :min="1" :max="20" controls-position="right" />
            </el-form-item>
            <el-form-item label="模型评测样本">
              <el-input-number v-model="modelEvalForm.sampleCount" :min="1" :max="200" controls-position="right" />
            </el-form-item>
            <el-form-item label="模型评测类型">
              <el-select v-model="modelEvalForm.evalType">
                <el-option label="报告 JSON" value="REPORT_JSON" />
                <el-option label="提示词稳定性" value="PROMPT_STABILITY" />
              </el-select>
            </el-form-item>
          </div>
          <div class="form-actions">
            <el-button type="primary" :icon="Timer" :loading="saving" @click="saveTaskConfig">保存调度配置</el-button>
            <el-button :icon="Refresh" :loading="loading" @click="loadTaskConfig">重新读取</el-button>
          </div>
        </el-form>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">执行日志</h2>
          <p class="surface-subtitle">优先展示后端任务日志，本地按钮触发记录作为辅助</p>
        </div>
        <el-button text type="primary" :disabled="!logs.length" @click="clearLogs">清空本地日志</el-button>
      </div>
      <div class="surface-body log-board">
        <div v-for="log in displayLogs" :key="log.id" class="log-row" :class="log.status">
          <span class="log-dot"></span>
          <div>
            <strong>{{ log.title }}</strong>
            <p>{{ log.message }}</p>
          </div>
          <time>{{ log.time }}</time>
        </div>
        <el-empty v-if="!displayLogs.length" description="暂无执行日志，先运行一次任务或流水线" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, markRaw, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Aim,
  CircleCheck,
  Collection,
  Cpu,
  DataAnalysis,
  DocumentChecked,
  Finished,
  MagicStick,
  Refresh,
  SetUp,
  Timer,
  TrendCharts,
  VideoPlay,
} from '@element-plus/icons-vue'
import { analyzeWatchlist } from '../services/ai'
import { fetchDailyInsightToday } from '../services/dailyInsight'
import { evolveAiStrategy, refreshAiEvolutionFactors, verifyAiEvolutionReviews } from '../services/aiEvolution'
import {
  buildWatchlistSamples,
  fetchLearningDashboard,
  rankLearningUniverse,
  runLearningBacktest,
  runLearningExperiment,
  runLearningModelEval,
  verifyLearningLabels,
} from '../services/aiLearning'
import { fetchModelConfig, fetchSchedulerJobLogs, fetchSchedulerStatus, saveModelConfig, toggleAutoClosePipeline } from '../services/settings'

const defaultPrompt =
  '你是一名A股投研助手。请基于以下行情、K线、财务和持仓数据，输出 JSON 结构：technicalAnalysis、riskWarning、buySellPoints、score。'

const form = reactive({
  apiBaseUrl: '',
  modelName: '',
  apiKey: '',
  timeout: 60000,
  temperature: 0.2,
  maxTokens: 2048,
  intradayInterval: 30,
  closeTime: '15:30',
  analysisScope: '全部自选股',
  promptTemplate: defaultPrompt,
})

const rankForm = reactive({
  universeCode: 'WATCHLIST',
  horizonDays: 3,
  topK: 10,
})

const backtestForm = reactive({
  universeCode: 'WATCHLIST',
  horizonDays: 3,
  topK: 5,
})

const modelEvalForm = reactive({
  evalType: 'REPORT_JSON',
  sampleCount: 30,
})

const closeTime = ref(form.closeTime)
const loading = ref(false)
const saving = ref(false)
const togglingAutoPipeline = ref(false)
const runningTaskKey = ref('')
const pipelineRunning = ref('')
const schedulerStatus = ref(null)
const learningDashboard = ref(null)
const dailyInsight = ref(null)
const backendJobLogs = ref([])
const taskResults = reactive({})
const logs = ref([])
const activePipeline = ref('close')

const pipelineDefinitions = {
  intraday: {
    title: '盘中快速巡检',
    tasks: ['analyze', 'rank'],
  },
  close: {
    title: '收盘学习流水线',
    tasks: ['sample', 'analyze', 'verify', 'factor', 'rank', 'experiment', 'backtest', 'modelEval'],
  },
}

const taskDefinitions = [
  {
    key: 'analyze',
    title: '自选股 AI 分析',
    description: '拉取自选股实时行情和近期 K 线，调用当前模型生成结构化报告。',
    cadence: '盘中每 N 分钟 / 手动',
    input: '输入：自选股 + 实时行情',
    output: '产出：AI 报告',
    tone: 'blue',
    primary: true,
    icon: markRaw(Cpu),
    actionIcon: markRaw(VideoPlay),
    action: () => analyzeWatchlist(),
  },
  {
    key: 'sample',
    title: '固化学习样本',
    description: '把自选股在当前时点的行情、K线和因子快照保存为可复盘样本。',
    cadence: '收盘后优先',
    input: '输入：WATCHLIST',
    output: '产出：训练样本',
    tone: 'cyan',
    icon: markRaw(Collection),
    actionIcon: markRaw(Collection),
    action: () => buildWatchlistSamples({ universeCode: 'WATCHLIST', samplePhase: 'AFTER_CLOSE' }),
  },
  {
    key: 'verify',
    title: 'T+N 复盘打标',
    description: '用真实 K 线校验历史报告方向、收益和回撤，给学习系统补充标签。',
    cadence: '交易日 16:10 后',
    input: '输入：历史报告 + K线',
    output: '产出：验证标签',
    tone: 'green',
    icon: markRaw(CircleCheck),
    actionIcon: markRaw(CircleCheck),
    action: async () => {
      await verifyLearningLabels()
      await verifyAiEvolutionReviews()
    },
  },
  {
    key: 'factor',
    title: '刷新因子权重',
    description: '根据复盘结果更新有效因子、失效因子和不同市场环境下的权重。',
    cadence: '复盘完成后',
    input: '输入：标签 + 因子命中',
    output: '产出：因子统计',
    tone: 'purple',
    icon: markRaw(DataAnalysis),
    actionIcon: markRaw(DataAnalysis),
    action: async () => {
      await verifyLearningLabels()
      await refreshAiEvolutionFactors()
    },
  },
  {
    key: 'rank',
    title: '生成 Top K 候选',
    description: '用当前策略扫描自选股，输出可进入观察、回测和模拟盘的候选列表。',
    cadence: '盘中 / 收盘后',
    input: `输入：T+${rankForm.horizonDays} Top ${rankForm.topK}`,
    output: '产出：选股排名',
    tone: 'orange',
    primary: true,
    icon: markRaw(MagicStick),
    actionIcon: markRaw(MagicStick),
    action: () => rankLearningUniverse({ ...rankForm }),
  },
  {
    key: 'experiment',
    title: '运行策略实验',
    description: '对当前策略做训练、验证、测试窗口切分，检查是否有资格晋级。',
    cadence: '样本充足后',
    input: '输入：样本外标签',
    output: '产出：实验记录',
    tone: 'slate',
    icon: markRaw(SetUp),
    actionIcon: markRaw(SetUp),
    action: () => runLearningExperiment({
      title: `自动化策略实验 ${formatDateTime(new Date())}`,
      universeCode: 'WATCHLIST',
    }),
  },
  {
    key: 'backtest',
    title: 'Top K 回测验证',
    description: '用已验证标签回测候选组合，检查胜率、收益和最大回撤是否达标。',
    cadence: '策略实验后',
    input: `输入：T+${backtestForm.horizonDays} Top ${backtestForm.topK}`,
    output: '产出：回测记录',
    tone: 'red',
    primary: true,
    icon: markRaw(TrendCharts),
    actionIcon: markRaw(TrendCharts),
    action: () => runLearningBacktest({ ...backtestForm }),
  },
  {
    key: 'modelEval',
    title: '模型输出评测',
    description: '评测 JSON 成功率、报告稳定性和结构化质量，避免模型切换后输出不可用。',
    cadence: '换模型 / 换提示词后',
    input: `输入：${modelEvalForm.sampleCount} 条样本`,
    output: '产出：模型评分',
    tone: 'indigo',
    icon: markRaw(DocumentChecked),
    actionIcon: markRaw(DocumentChecked),
    action: () => runLearningModelEval({ ...modelEvalForm }),
  },
  {
    key: 'evolve',
    title: '生成策略候选版本',
    description: '基于复盘和因子统计生成下一版策略建议，先生成候选，不自动启用。',
    cadence: '胜率稳定后',
    input: '输入：因子统计',
    output: '产出：策略版本',
    tone: 'teal',
    icon: markRaw(Aim),
    actionIcon: markRaw(Aim),
    action: () => evolveAiStrategy(),
  },
]

const taskCards = computed(() => taskDefinitions.map((task) => ({
  ...task,
  input: taskInputText(task),
  status: resolveTaskStatus(task.key),
})))

const currentPipelineTitle = computed(() => pipelineDefinitions[activePipeline.value].title)

const currentPipelineSteps = computed(() => {
  const tasks = pipelineDefinitions[activePipeline.value].tasks
  return tasks.map((key, index) => {
    const task = taskDefinitions.find((item) => item.key === key)
    return {
      key,
      order: String(index + 1).padStart(2, '0'),
      title: task?.title || key,
    }
  })
})

const autoClosePipelineText = computed(() => {
  if (!schedulerStatus.value) {
    return '读取中'
  }
  if (schedulerStatus.value.autoClosePipelineRunning) {
    return '运行中'
  }
  return schedulerStatus.value.autoClosePipelineEnabled ? '已开启' : '已关闭'
})

const autoClosePipelineClass = computed(() => {
  if (!schedulerStatus.value) {
    return 'warn'
  }
  if (schedulerStatus.value.autoClosePipelineRunning) {
    return 'warn'
  }
  return schedulerStatus.value.autoClosePipelineEnabled ? 'ok' : 'warn'
})

const autoClosePipelineHelper = computed(() => {
  if (!schedulerStatus.value) {
    return '正在读取任务状态'
  }
  const status = schedulerStatus.value.autoClosePipelineLastStatus || 'IDLE'
  const finishedAt = schedulerStatus.value.autoClosePipelineLastFinishedAt
  const message = schedulerStatus.value.autoClosePipelineLastMessage
  if (status === 'SUCCESS') {
    return finishedAt ? `上次成功：${finishedAt}` : '上次执行成功'
  }
  if (status === 'FAILED') {
    return message ? `上次失败：${message}` : '上次执行失败'
  }
  if (status === 'RUNNING') {
    return '后端正在按顺序执行 AI 学习任务'
  }
  return schedulerStatus.value.autoClosePipelineEnabled ? '等待下一个交易日 16:00' : '开启后每个开盘日 16:00 自动执行'
})

const dailyInsightStatusText = computed(() => {
  if (!dailyInsight.value) {
    return '读取中'
  }
  if (!dailyInsight.value.snapshotReady) {
    return '未生成'
  }
  const count = dailyInsight.value.summary?.itemCount || 0
  return count > 0 ? '已生成' : '空结果'
})

const dailyInsightStatusClass = computed(() => {
  if (!dailyInsight.value || !dailyInsight.value.snapshotReady) {
    return 'warn'
  }
  return Number(dailyInsight.value.summary?.itemCount || 0) > 0 ? 'ok' : 'danger'
})

const dailyInsightHelper = computed(() => {
  if (!dailyInsight.value) {
    return '正在读取每日投研快照'
  }
  if (!dailyInsight.value.snapshotReady) {
    return dailyInsight.value.message || '流水线完成后应生成每日投研结果'
  }
  const summary = dailyInsight.value.summary || {}
  if (Number(summary.itemCount || 0) === 0) {
    return '流水线有结果但每日投研为空，需要检查样本和预测'
  }
  return `推荐 ${summary.recommendationCount || 0}，回避 ${summary.avoidCount || 0}，生成 ${formatDateTime(summary.generatedAt)}`
})

const displayLogs = computed(() => [
  ...backendJobLogs.value.map((item) => ({
    id: `backend-${item.id}`,
    title: item.jobName || item.jobType || '后端任务',
    status: normalizeLogStatus(item.status),
    message: `${item.status || '-'} · 成功 ${item.successCount || 0} / 处理 ${item.processedCount || 0}${item.errorMessage ? ` · ${item.errorMessage}` : ''}`,
    time: formatDateTime(item.startedAt),
  })),
  ...logs.value,
].slice(0, 40))

function resolveTaskStatus(key) {
  if (runningTaskKey.value === key) {
    return 'running'
  }
  if (taskResults[key]?.ok === false) {
    return 'failed'
  }
  if (taskResults[key]?.ok === true) {
    return 'done'
  }
  return 'ready'
}

function taskStatusText(status) {
  return {
    ready: '待执行',
    running: '执行中',
    done: '已完成',
    failed: '失败',
  }[status]
}

function taskTagType(status) {
  return {
    ready: 'info',
    running: 'warning',
    done: 'success',
    failed: 'danger',
  }[status]
}

function stepState(key) {
  return {
    running: runningTaskKey.value === key,
    done: taskResults[key]?.ok === true,
    failed: taskResults[key]?.ok === false,
  }
}

function metricValue(label) {
  const metric = learningDashboard.value?.metrics?.find((item) => item.label === label)
  return metric?.value || '-'
}

function metricHelper(label, fallback) {
  const metric = learningDashboard.value?.metrics?.find((item) => item.label === label)
  return metric?.helper || fallback
}

async function loadTaskConfig() {
  loading.value = true
  try {
    const [config, status, dashboard, insight, jobLogs] = await Promise.all([
      fetchModelConfig(),
      fetchSchedulerStatus(),
      fetchLearningDashboard().catch((error) => {
        console.warn('[猫狗智投] AI 学习总览读取失败', error)
        return null
      }),
      fetchDailyInsightToday().catch((error) => {
        console.warn('[猫狗智投] 每日投研结果读取失败', error)
        return null
      }),
      fetchSchedulerJobLogs(20).catch((error) => {
        console.warn('[猫狗智投] 后端任务日志读取失败', error)
        return []
      }),
    ])
    Object.assign(form, {
      ...config,
      apiKey: '',
      promptTemplate: config.promptTemplate || defaultPrompt,
    })
    closeTime.value = form.closeTime
    schedulerStatus.value = status
    learningDashboard.value = dashboard
    dailyInsight.value = insight
    backendJobLogs.value = jobLogs || []
  } catch (error) {
    ElMessage.error(error.message || '自动化任务配置获取失败')
  } finally {
    loading.value = false
  }
}

async function saveTaskConfig() {
  saving.value = true
  try {
    const saved = await saveModelConfig({
      ...form,
      apiKey: null,
      closeTime: closeTime.value || '15:30',
    })
    Object.assign(form, {
      ...saved,
      apiKey: '',
      promptTemplate: saved.promptTemplate || form.promptTemplate,
    })
    closeTime.value = form.closeTime
    schedulerStatus.value = await fetchSchedulerStatus()
    dailyInsight.value = await fetchDailyInsightToday().catch(() => dailyInsight.value)
    backendJobLogs.value = await fetchSchedulerJobLogs(20).catch(() => backendJobLogs.value)
    addLog('保存调度配置', 'success', `盘中间隔 ${form.intradayInterval} 分钟，收盘时间 ${form.closeTime}`)
    ElMessage.success('任务配置已保存')
  } catch (error) {
    addLog('保存调度配置', 'error', error.message || '保存任务配置失败')
    ElMessage.error(error.message || '保存任务配置失败')
  } finally {
    saving.value = false
  }
}

async function toggleAutoPipeline() {
  if (!schedulerStatus.value) {
    return
  }
  const nextEnabled = !schedulerStatus.value.autoClosePipelineEnabled
  togglingAutoPipeline.value = true
  try {
    schedulerStatus.value = await toggleAutoClosePipeline(nextEnabled)
    backendJobLogs.value = await fetchSchedulerJobLogs(20).catch(() => backendJobLogs.value)
    addLog(
      '每日自动收盘流水线',
      'success',
      nextEnabled ? '已开启：每个开盘日 16:00 自动执行收盘学习顺序' : '已关闭：后端不会再自动触发收盘学习流水线',
    )
    ElMessage.success(nextEnabled ? '每日自动收盘流水线已开启' : '每日自动收盘流水线已关闭')
  } catch (error) {
    addLog('每日自动收盘流水线', 'error', error.message || '启停失败')
    ElMessage.error(error.message || '自动流水线启停失败')
  } finally {
    togglingAutoPipeline.value = false
  }
}

async function runSingleTask(task) {
  try {
    await executeTask(task)
  } catch (error) {
    ElMessage.error(error.message || `${task.title}执行失败`)
  }
}

async function runTaskByKey(key) {
  const task = taskDefinitions.find((item) => item.key === key)
  if (!task) {
    return
  }
  await runSingleTask(task)
}

async function runPipeline(type) {
  activePipeline.value = type
  const pipeline = pipelineDefinitions[type]
  if (!pipeline || pipelineRunning.value) {
    return
  }
  pipelineRunning.value = type
  addLog(pipeline.title, 'running', '流水线开始执行')
  try {
    for (const key of pipeline.tasks) {
      const task = taskDefinitions.find((item) => item.key === key)
      if (task) {
        await executeTask(task, { silent: true })
      }
    }
    await refreshLearningDashboard()
    await refreshDailyInsightState()
    addLog(pipeline.title, 'success', '流水线已执行完成')
    ElMessage.success(`${pipeline.title}已完成`)
  } catch (error) {
    addLog(pipeline.title, 'error', error.message || '流水线执行失败')
    ElMessage.error(error.message || `${pipeline.title}执行失败`)
  } finally {
    runningTaskKey.value = ''
    pipelineRunning.value = ''
  }
}

async function executeTask(task, options = {}) {
  runningTaskKey.value = task.key
  taskResults[task.key] = { ok: null, at: Date.now() }
  addLog(task.title, 'running', '任务开始执行')
  try {
    await task.action()
    taskResults[task.key] = { ok: true, at: Date.now() }
    addLog(task.title, 'success', '任务执行成功')
    if (!options.silent) {
      ElMessage.success(`${task.title}已完成`)
      await refreshLearningDashboard()
    }
  } catch (error) {
    console.error(`[猫狗智投] ${task.title}失败`, error)
    taskResults[task.key] = { ok: false, at: Date.now(), message: error.message }
    addLog(task.title, 'error', error.message || '任务执行失败')
    throw error
  } finally {
    if (!pipelineRunning.value) {
      runningTaskKey.value = ''
    }
  }
}

async function refreshLearningDashboard() {
  try {
    learningDashboard.value = await fetchLearningDashboard()
  } catch (error) {
    console.warn('[猫狗智投] AI 学习总览刷新失败', error)
  }
}

async function refreshDailyInsightState() {
  try {
    dailyInsight.value = await fetchDailyInsightToday()
    backendJobLogs.value = await fetchSchedulerJobLogs(20)
  } catch (error) {
    console.warn('[猫狗智投] 每日投研状态刷新失败', error)
  }
}

function addLog(title, status, message) {
  logs.value = [
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      status,
      message,
      time: formatDateTime(new Date()),
    },
    ...logs.value,
  ].slice(0, 30)
}

function clearLogs() {
  logs.value = []
}

function normalizeLogStatus(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'SUCCESS') return 'success'
  if (value === 'FAILED') return 'error'
  if (value === 'RUNNING') return 'running'
  return 'ready'
}

function taskInputText(task) {
  if (task.key === 'rank') {
    return `输入：T+${rankForm.horizonDays} Top ${rankForm.topK}`
  }
  if (task.key === 'backtest') {
    return `输入：T+${backtestForm.horizonDays} Top ${backtestForm.topK}`
  }
  if (task.key === 'modelEval') {
    return `输入：${modelEvalForm.sampleCount} 条样本`
  }
  return task.input
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(0, 19)
  }
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

onMounted(loadTaskConfig)
</script>

<style scoped>
.automation-page {
  gap: 22px;
}

.command-surface {
  overflow: hidden;
}

.command-header {
  align-items: flex-start;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.command-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.status-tile {
  min-height: 118px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f8fafc;
}

.status-tile span,
.strip-label {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.status-tile strong {
  display: block;
  margin-top: 10px;
  color: #0f172a;
  font-size: 24px;
  font-weight: 850;
  line-height: 30px;
}

.status-tile strong.ok {
  color: #16a34a;
}

.status-tile strong.warn {
  color: #d97706;
}

.status-tile em {
  display: block;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 18px;
}

.pipeline-strip {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 18px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px;
  background: #eff6ff;
}

.pipeline-strip strong {
  display: block;
  margin-top: 8px;
  color: #1e3a8a;
  font-size: 18px;
  line-height: 26px;
}

.pipeline-strip ol {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pipeline-strip li {
  min-height: 66px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.72);
}

.pipeline-strip li span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pipeline-strip li p {
  margin: 4px 0 0;
  color: #1e3a8a;
  font-size: 13px;
  font-weight: 750;
  line-height: 18px;
}

.pipeline-strip li.done {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.pipeline-strip li.running {
  border-color: #fed7aa;
  background: #fff7ed;
}

.pipeline-strip li.failed {
  border-color: #fecaca;
  background: #fef2f2;
}

.automation-layout {
  grid-template-columns: minmax(0, 1.75fr) minmax(340px, 0.75fr);
  align-items: start;
}

.task-board {
  display: grid;
  gap: 12px;
}

.task-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  border: 1px solid #e5e7eb;
  border-left-width: 4px;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
}

.task-row.blue {
  border-left-color: #2563eb;
}

.task-row.cyan {
  border-left-color: #0891b2;
}

.task-row.green {
  border-left-color: #16a34a;
}

.task-row.purple {
  border-left-color: #7c3aed;
}

.task-row.orange {
  border-left-color: #ea580c;
}

.task-row.slate {
  border-left-color: #475569;
}

.task-row.red {
  border-left-color: #dc2626;
}

.task-row.indigo {
  border-left-color: #4f46e5;
}

.task-row.teal {
  border-left-color: #0f766e;
}

.task-row.running {
  border-color: #fed7aa;
  border-left-color: #f59e0b;
  background: #fff7ed;
}

.task-row.failed {
  border-color: #fecaca;
  border-left-color: #dc2626;
  background: #fef2f2;
}

.task-row.done {
  border-color: #bbf7d0;
  border-left-color: #16a34a;
  background: #f0fdf4;
}

.task-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 24px;
}

.task-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-title-line strong {
  color: #0f172a;
  font-size: 15px;
  line-height: 22px;
}

.task-copy p {
  margin: 4px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 20px;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.task-meta span {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 3px 7px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.strategy-panel {
  display: grid;
  gap: 14px;
}

.strategy-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 16px;
}

.strategy-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.strategy-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 850;
}

.strategy-item strong {
  color: #0f172a;
  font-size: 15px;
  line-height: 22px;
}

.strategy-item p {
  margin: 5px 0 12px;
  color: #64748b;
  font-size: 13px;
  line-height: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid.four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.compact-grid {
  margin-top: 4px;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

.log-board {
  display: grid;
  gap: 10px;
  max-height: 440px;
  overflow: auto;
}

.log-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) 150px;
  align-items: start;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.log-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-top: 6px;
  background: #94a3b8;
}

.log-row.running .log-dot {
  background: #f59e0b;
}

.log-row.success .log-dot {
  background: #16a34a;
}

.log-row.error .log-dot {
  background: #dc2626;
}

.log-row strong {
  color: #0f172a;
  font-size: 14px;
  line-height: 20px;
}

.log-row p {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 20px;
}

.log-row time {
  color: #94a3b8;
  font-size: 12px;
  line-height: 20px;
  text-align: right;
}

@media (max-width: 1240px) {
  .status-grid,
  .form-grid.four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pipeline-strip {
    grid-template-columns: 1fr;
  }

  .pipeline-strip ol {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .automation-layout {
    grid-template-columns: 1fr;
  }
}
</style>
