<template>
  <div class="page automation-page">
    <section class="surface automation-heading">
      <div>
        <h2 class="surface-title">自动化任务</h2>
        <p class="surface-subtitle">查看日度投研、周度验证和月度训练的调度状态。</p>
      </div>
      <div class="automation-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadAutomation">刷新状态</el-button>
        <el-button
          :type="schedulerStatus?.autoClosePipelineEnabled ? 'danger' : 'primary'"
          :icon="schedulerStatus?.autoClosePipelineEnabled ? VideoPause : VideoPlay"
          :loading="toggling"
          :disabled="schedulerStatus && !schedulerStatus.enabled"
          @click="toggleDailyAutomation"
        >
          {{ schedulerStatus?.autoClosePipelineEnabled ? '关闭每日自动投研' : '开启每日自动投研' }}
        </el-button>
      </div>
    </section>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <section v-loading="loading" class="surface automation-health">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">调度健康状态</h2>
          <p class="surface-subtitle">研究任务按固定顺序自动运行，日常使用无需逐项执行。</p>
        </div>
        <el-tag :type="schedulerStatus?.enabled ? 'success' : 'danger'" effect="plain">
          {{ schedulerStatus?.enabled ? '系统调度已启用' : '系统调度未启用' }}
        </el-tag>
      </div>
      <div class="automation-schedule-list">
        <article class="automation-schedule-row">
          <div class="schedule-marker daily"><el-icon><Calendar /></el-icon></div>
          <div class="schedule-copy">
            <div class="schedule-title-line">
              <strong>每日自动投研</strong>
              <el-tag :type="dailyTagType" effect="plain" size="small">{{ dailyStatusText }}</el-tag>
            </div>
            <p>每个交易日收盘后固化研究数据，并生成当前用户的投研日报。</p>
            <dl class="schedule-metadata">
              <div><dt>下次执行</dt><dd>{{ schedulerStatus?.nextAutoClosePipelineTime || '-' }}</dd></div>
              <div><dt>最近完成</dt><dd>{{ schedulerStatus?.autoClosePipelineLastFinishedAt || '-' }}</dd></div>
              <div><dt>最近结果</dt><dd>{{ statusLabel(schedulerStatus?.autoClosePipelineLastStatus, '尚未运行') }}</dd></div>
            </dl>
            <p v-if="schedulerStatus?.autoClosePipelineLastMessage" class="schedule-message">
              {{ localizeStatusText(schedulerStatus.autoClosePipelineLastMessage) }}
            </p>
          </div>
          <el-button text type="primary" @click="openDailyReport">查看投研日报</el-button>
        </article>

        <article class="automation-schedule-row">
          <div class="schedule-marker weekly"><el-icon><TrendCharts /></el-icon></div>
          <div class="schedule-copy">
            <div class="schedule-title-line">
              <strong>周度策略验证</strong>
              <el-tag type="info" effect="plain" size="small">自动执行</el-tag>
            </div>
            <p>更新因子样本外表现、漂移、滚动验证、组合回测和候选策略影子评估。</p>
            <dl class="schedule-metadata">
              <div><dt>下次执行</dt><dd>{{ schedulerStatus?.nextWeeklyEvolutionTime || '-' }}</dd></div>
              <div><dt>调度规则</dt><dd class="mono">{{ schedulerStatus?.weeklyEvolutionCron || '-' }}</dd></div>
            </dl>
          </div>
          <el-button text type="primary" @click="openResearchLab('experiments')">查看验证证据</el-button>
        </article>

        <article class="automation-schedule-row">
          <div class="schedule-marker monthly"><el-icon><Cpu /></el-icon></div>
          <div class="schedule-copy">
            <div class="schedule-title-line">
              <strong>月度模型训练</strong>
              <el-tag type="info" effect="plain" size="small">准入后执行</el-tag>
            </div>
            <p>准入条件满足后冻结训练数据集并生成候选模型，候选不会自动替换正式策略。</p>
            <dl class="schedule-metadata">
              <div><dt>下次执行</dt><dd>{{ schedulerStatus?.nextMonthlyTrainingTime || '-' }}</dd></div>
              <div><dt>调度规则</dt><dd class="mono">{{ schedulerStatus?.monthlyTrainingCron || '-' }}</dd></div>
            </dl>
          </div>
          <el-button text type="primary" @click="openResearchLab('models')">查看训练证据</el-button>
        </article>
      </div>
    </section>

    <section class="surface automation-report-status">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">最近投研日报</h2>
          <p class="surface-subtitle">用于确认每日自动化是否已生成可读结果。</p>
        </div>
      </div>
      <div v-if="latestReport" class="latest-report-line">
        <div>
          <strong>{{ latestReport.tradeDate }} · 第 {{ latestReport.reportVersion }} 版</strong>
          <span>{{ localizeStatusText(latestReport.title) }}</span>
        </div>
        <dl>
          <div><dt>状态</dt><dd>{{ statusLabel(latestReport.reportStatus) }}</dd></div>
          <div><dt>推荐</dt><dd>{{ latestReport.recommendationCount || 0 }}</dd></div>
          <div><dt>观察</dt><dd>{{ latestReport.watchCount || 0 }}</dd></div>
          <div><dt>回避</dt><dd>{{ latestReport.avoidCount || 0 }}</dd></div>
          <div><dt>新鲜度</dt><dd>{{ statusLabel(latestReport.freshnessStatus) }}</dd></div>
        </dl>
        <el-button type="primary" @click="openDailyReport">打开日报</el-button>
      </div>
      <el-empty v-else description="尚未生成投研日报" />
    </section>

    <section class="surface automation-log-surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">后端任务日志</h2>
          <p class="surface-subtitle">日志来自服务器持久化记录，刷新页面后仍可追溯。</p>
        </div>
        <el-button text type="primary" @click="openResearchLab('runs')">查看全局运行记录</el-button>
      </div>
      <el-table :data="jobLogs" row-key="id" stripe empty-text="暂无后端任务日志">
        <el-table-column prop="jobName" label="任务" min-width="170" />
        <el-table-column label="类型" min-width="132">
          <template #default="scope">{{ statusLabel(scope?.row?.jobType) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="106">
          <template #default="scope">
            <el-tag :type="statusTagType(scope?.row?.status)" effect="plain" size="small">{{ statusLabel(scope?.row?.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理结果" width="142">
          <template #default="scope">{{ scope?.row?.successCount || 0 }} 成功 / {{ scope?.row?.failedCount || 0 }} 失败</template>
        </el-table-column>
        <el-table-column label="开始时间" min-width="164">
          <template #default="scope">{{ formatDateTime(scope?.row?.startedAt) }}</template>
        </el-table-column>
        <el-table-column label="结束时间" min-width="164">
          <template #default="scope">{{ formatDateTime(scope?.row?.finishedAt) }}</template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误" min-width="260" show-overflow-tooltip />
      </el-table>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Calendar, Cpu, Refresh, TrendCharts, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { fetchSchedulerJobLogs, fetchSchedulerStatus, toggleAutoClosePipeline } from '../services/settings'
import { localizeStatusText, statusLabel } from '../utils/statusLabels'
import { statusTagType } from './research-lab/researchPresentation'

const router = useRouter()
const schedulerStatus = ref(null)
const jobLogs = ref([])
const loading = ref(false)
const toggling = ref(false)
const errorMessage = ref('')

const latestReport = computed(() => schedulerStatus.value?.latestResearchDailyReport || null)
const dailyStatusText = computed(() => {
  if (!schedulerStatus.value) return '读取中'
  if (!schedulerStatus.value.enabled) return '系统调度未启用'
  if (schedulerStatus.value.autoClosePipelineRunning) return '执行中'
  if (!schedulerStatus.value.autoClosePipelineEnabled) return '已关闭'
  return '已开启'
})
const dailyTagType = computed(() => {
  if (!schedulerStatus.value?.enabled) return 'danger'
  if (schedulerStatus.value?.autoClosePipelineRunning) return 'warning'
  return schedulerStatus.value?.autoClosePipelineEnabled ? 'success' : 'info'
})

onMounted(loadAutomation)

async function loadAutomation() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [status, logs] = await Promise.all([fetchSchedulerStatus(), fetchSchedulerJobLogs(30)])
    schedulerStatus.value = status
    jobLogs.value = logs || []
  } catch (error) {
    errorMessage.value = error.message || '自动化任务状态加载失败'
  } finally {
    loading.value = false
  }
}

async function toggleDailyAutomation() {
  const enabled = !schedulerStatus.value?.autoClosePipelineEnabled
  try {
    await ElMessageBox.confirm(
      enabled
        ? '开启后，每个交易日 16:00 自动运行日度研究并生成投研日报。'
        : '关闭后将停止每日自动投研，周度验证和月度训练的系统调度配置不受影响。',
      enabled ? '开启每日自动投研' : '关闭每日自动投研',
      { confirmButtonText: enabled ? '确认开启' : '确认关闭', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  toggling.value = true
  try {
    schedulerStatus.value = await toggleAutoClosePipeline(enabled)
    ElMessage.success(enabled ? '每日自动投研已开启' : '每日自动投研已关闭')
  } catch (error) {
    ElMessage.error(error.message || '自动投研开关更新失败')
  } finally {
    toggling.value = false
  }
}

function openDailyReport() {
  router.push('/research-daily-reports')
}

function openResearchLab(tab) {
  router.push({ path: '/research-lab', query: { tab } })
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
}
</script>

<style scoped>
.automation-page {
  gap: 18px;
}

.automation-heading,
.automation-health,
.automation-report-status,
.automation-log-surface {
  box-shadow: none;
}

.automation-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 22px;
}

.automation-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.automation-schedule-list {
  border-top: 1px solid #e5e7eb;
}

.automation-schedule-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 20px 22px;
  border-bottom: 1px solid #e5e7eb;
}

.automation-schedule-row:last-child {
  border-bottom: 0;
}

.schedule-marker {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #1f4f8f;
  background: #eaf1fb;
}

.schedule-marker.weekly {
  color: #0f766e;
  background: #e7f6f3;
}

.schedule-marker.monthly {
  color: #7c3f00;
  background: #fff3df;
}

.schedule-copy {
  min-width: 0;
}

.schedule-title-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.schedule-title-line strong {
  color: #172033;
  font-size: 15px;
}

.schedule-copy > p {
  margin: 6px 0 0;
  color: #5d687b;
  font-size: 13px;
  line-height: 1.6;
}

.schedule-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin: 14px 0 0;
}

.schedule-metadata div {
  display: flex;
  gap: 7px;
}

.schedule-metadata dt,
.schedule-metadata dd {
  margin: 0;
  font-size: 12px;
}

.schedule-metadata dt {
  color: #738098;
}

.schedule-metadata dd {
  color: #263248;
  font-weight: 600;
}

.schedule-message {
  color: #8a4b08 !important;
}

.latest-report-line {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(420px, 2fr) auto;
  align-items: center;
  gap: 20px;
  padding: 20px 22px;
  border-top: 1px solid #e5e7eb;
}

.latest-report-line > div strong,
.latest-report-line > div span {
  display: block;
}

.latest-report-line > div span {
  margin-top: 5px;
  color: #647087;
  font-size: 13px;
}

.latest-report-line dl {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin: 0;
}

.latest-report-line dl div {
  padding: 0 12px;
  border-right: 1px solid #e5e7eb;
}

.latest-report-line dl div:last-child {
  border-right: 0;
}

.latest-report-line dt,
.latest-report-line dd {
  margin: 0;
  text-align: center;
  font-size: 12px;
}

.latest-report-line dt {
  color: #738098;
}

.latest-report-line dd {
  margin-top: 5px;
  color: #172033;
  font-weight: 700;
}

@media (max-width: 920px) {
  .automation-heading,
  .automation-schedule-row,
  .latest-report-line {
    align-items: flex-start;
    grid-template-columns: 1fr;
  }

  .automation-heading {
    flex-direction: column;
  }

  .automation-actions,
  .automation-actions .el-button {
    width: 100%;
  }

  .latest-report-line dl {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .automation-heading {
    padding: 16px 14px;
  }

  .automation-schedule-row {
    padding: 16px 14px;
  }

  .latest-report-line {
    padding: 16px 14px;
  }

  .latest-report-line dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 0;
  }

  .latest-report-line dl div {
    border-right: 0;
  }
}
</style>
