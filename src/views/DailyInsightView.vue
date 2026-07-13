<template>
  <div class="page daily-insight-page">
    <section class="surface hero-surface">
      <div class="surface-header hero-header">
        <div>
          <h2 class="surface-title">每日 AI 投研结果中心</h2>
          <p class="surface-subtitle">
            交易日 {{ summary.tradeDate || '-' }} · {{ snapshotStatusText }} · {{ freshnessText(summary.freshnessStatus) }}
          </p>
        </div>
        <div class="header-actions">
          <el-button @click="openResearchDailyReports">投研日报</el-button>
          <el-button @click="openAutomationTasks">自动化任务</el-button>
          <el-button :icon="Refresh" :loading="loading" @click="loadInsight">刷新</el-button>
          <el-button type="primary" :icon="MagicStick" :loading="rebuilding" @click="rebuildInsight">
            重建今日结果
          </el-button>
        </div>
      </div>

      <div v-loading="loading" class="surface-body">
        <el-alert
          v-if="loadError || !dailyInsight?.snapshotReady"
          :title="loadError || dailyInsight?.message || '今日尚未生成每日 AI 投研结果'"
          :type="loadError ? 'error' : dailyInsight?.summary?.snapshotId ? 'info' : 'warning'"
          show-icon
          :closable="false"
        />
        <div class="metric-grid">
          <MetricCard title="推荐关注" :value="String(summary.recommendationCount || 0)" :percent="summary.overallHitRate || 0" />
          <MetricCard title="回避股票" :value="String(summary.avoidCount || 0)" :percent="summary.dataQualityScore || 0" />
          <MetricCard title="平均命中率" :value="formatPercent(summary.overallHitRate)" :show-trend="false" />
          <MetricCard title="数据质量" :value="formatPercent(summary.dataQualityScore)" :show-trend="false" />
        </div>

        <div class="status-grid">
          <div class="status-tile">
            <span>最近生成</span>
            <strong>{{ formatDateTime(summary.generatedAt) }}</strong>
            <em>{{ summary.pipelineMessage || dailyInsight?.message || '等待每日快照' }}</em>
          </div>
          <div class="status-tile">
            <span>最新报告</span>
            <strong>{{ formatDateTime(summary.latestReportAt) }}</strong>
            <em>报告 decision 会参与最终排序，缺失时降级观察</em>
          </div>
          <div class="status-tile">
            <span>最新样本</span>
            <strong>{{ formatDateTime(summary.latestSampleAt) }}</strong>
            <em>样本少于 10 会标记 LOW_SAMPLE</em>
          </div>
          <div class="status-tile">
            <span>自动任务</span>
            <strong :class="statusClass(summary.pipelineStatus)">{{ summary.pipelineStatus || 'EMPTY' }}</strong>
            <em>任务日志来自后端 ai_learning_job_log</em>
          </div>
        </div>
      </div>
    </section>

    <div class="section-grid insight-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">推荐关注</h2>
            <p class="surface-subtitle">BUY/HOLD 且分数、风险、数据质量和历史表现均达标</p>
          </div>
          <el-tag type="danger" effect="plain">{{ recommendations.length }} 只</el-tag>
        </div>
        <div class="surface-body">
          <InsightTable :rows="recommendations" tone="recommend" @open-report="openReport" @open-sample="openSample" />
          <el-empty v-if="!loading && !recommendations.length" description="暂无满足条件的推荐关注股票" />
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">回避股票</h2>
            <p class="surface-subtitle">风险偏高、数据质量不足或历史命中率弱的股票</p>
          </div>
          <el-tag type="warning" effect="plain">{{ avoids.length }} 只</el-tag>
        </div>
        <div class="surface-body">
          <InsightTable :rows="avoids" tone="avoid" @open-report="openReport" @open-sample="openSample" />
          <el-empty v-if="!loading && !avoids.length" description="暂无明确回避股票" />
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">谨慎观察</h2>
          <p class="surface-subtitle">样本不足、结构化决策缺失或暂未达到强推荐门槛</p>
        </div>
        <el-button text type="primary" @click="openReviews">查看复盘验证</el-button>
      </div>
      <div class="surface-body">
        <InsightTable :rows="watches" tone="watch" @open-report="openReport" @open-sample="openSample" />
        <el-empty v-if="!loading && !watches.length" description="暂无谨慎观察项" />
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">后端任务日志</h2>
          <p class="surface-subtitle">用于判断 16:00 自动流水线是否真正跑完</p>
        </div>
      </div>
      <div class="surface-body job-log-list">
        <div v-for="log in latestJobLogs" :key="log.id" class="job-log-row" :class="log.status?.toLowerCase()">
          <span class="log-dot"></span>
          <div>
            <strong>{{ log.jobName }}</strong>
            <p>{{ log.status }} · 成功 {{ log.successCount || 0 }} / 处理 {{ log.processedCount || 0 }} · {{ log.errorMessage || '无错误信息' }}</p>
          </div>
          <time>{{ formatDateTime(log.startedAt) }}</time>
        </div>
        <el-empty v-if="!latestJobLogs.length" description="暂无后端任务日志" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElMessage, ElProgress, ElTable, ElTableColumn, ElTag } from 'element-plus'
import { MagicStick, Refresh } from '@element-plus/icons-vue'
import MetricCard from '../components/MetricCard.vue'
import { fetchDailyInsightToday, rebuildDailyInsight } from '../services/dailyInsight'

const router = useRouter()
const loading = ref(false)
const rebuilding = ref(false)
const dailyInsight = ref(null)
const loadError = ref('')

const emptySummary = {
  tradeDate: '',
  generatedAt: '',
  pipelineStatus: 'EMPTY',
  pipelineMessage: '',
  freshnessStatus: 'EMPTY',
  dataQualityScore: 0,
  recommendationCount: 0,
  avoidCount: 0,
  watchCount: 0,
  itemCount: 0,
  lowSampleCount: 0,
  overallHitRate: 0,
  latestReportAt: '',
  latestSampleAt: '',
}

const summary = computed(() => dailyInsight.value?.summary || emptySummary)
const recommendations = computed(() => dailyInsight.value?.recommendations || [])
const watches = computed(() => dailyInsight.value?.watches || [])
const avoids = computed(() => dailyInsight.value?.avoids || [])
const latestJobLogs = computed(() => dailyInsight.value?.latestJobLogs || [])
const snapshotStatusText = computed(() => {
  if (dailyInsight.value?.snapshotReady) return '已生成快照'
  if (summary.value?.snapshotId) return '快照无结果'
  return '等待生成快照'
})

const InsightTable = defineComponent({
  props: {
    rows: { type: Array, required: true },
    tone: { type: String, default: 'watch' },
  },
  emits: ['open-report', 'open-sample'],
  setup(props, { emit }) {
    return () => h(ElTable, {
      data: props.rows,
      class: 'compact-table insight-table',
      height: props.rows.length > 6 ? 520 : undefined,
      border: false,
    }, () => [
      h(ElTableColumn, { label: '股票', minWidth: 150 }, {
        default: ({ row }) => h('div', { class: 'stock-cell' }, [
          h('strong', row.stockName || row.stockCode),
          h('span', row.stockCode),
        ]),
      }),
      h(ElTableColumn, { label: '动作', width: 96 }, {
        default: ({ row }) => h(ElTag, { type: actionTagType(row.finalAction), effect: 'plain' }, () => actionText(row.finalAction)),
      }),
      h(ElTableColumn, { label: '综合分', width: 130 }, {
        default: ({ row }) => h(ElProgress, {
          percentage: Number(row.compositeScore || 0),
          strokeWidth: 8,
          status: props.tone === 'avoid' ? 'exception' : 'success',
        }),
      }),
      h(ElTableColumn, { label: '历史命中', width: 132 }, {
        default: ({ row }) => h('div', { class: 'hit-cell' }, [
          h('strong', formatPercent(row.historicalHitRate)),
          h('span', `样本 ${row.historicalSampleCount || 0}`),
        ]),
      }),
      h(ElTableColumn, { label: '数据', width: 132 }, {
        default: ({ row }) => h('div', { class: 'fresh-cell' }, [
          h(ElTag, { type: freshnessTagType(row.freshnessStatus), effect: 'plain' }, () => freshnessText(row.freshnessStatus)),
          h('span', formatPercent(row.dataQualityScore)),
        ]),
      }),
      h(ElTableColumn, { label: '触发因子', minWidth: 260 }, {
        default: ({ row }) => h('div', { class: 'factor-list' }, parseFactors(row.triggerFactorsJson).map((factor) => (
          h('span', { key: factor.factorCode || factor.factorName }, factor.factorName || factor.factorCode)
        ))),
      }),
      h(ElTableColumn, { label: '说明', minWidth: 260 }, {
        default: ({ row }) => h('p', { class: 'reason-text' }, row.reasonSummary || row.freshnessMessage || '-'),
      }),
      h(ElTableColumn, { label: '操作', width: 148, fixed: 'right' }, {
        default: ({ row }) => h('div', { class: 'table-actions' }, [
          h(ElButton, { text: true, type: 'primary', disabled: !row.reportId, onClick: () => emit('open-report', row) }, () => '报告'),
          h(ElButton, { text: true, type: 'primary', disabled: !row.sampleId, onClick: () => emit('open-sample', row) }, () => '样本'),
        ]),
      }),
    ])
  },
})

async function loadInsight() {
  loading.value = true
  loadError.value = ''
  try {
    dailyInsight.value = await fetchDailyInsightToday()
  } catch (error) {
    dailyInsight.value = null
    loadError.value = error.message || '每日投研结果加载失败'
    ElMessage.error(error.message || '每日投研结果加载失败')
  } finally {
    loading.value = false
  }
}

async function rebuildInsight() {
  rebuilding.value = true
  try {
    dailyInsight.value = await rebuildDailyInsight()
    if (dailyInsight.value?.snapshotReady) {
      ElMessage.success('每日投研结果已重建')
    } else {
      ElMessage.warning(dailyInsight.value?.message || '暂无可汇总数据，请先执行收盘投研流水线')
    }
  } catch (error) {
    console.error('[猫狗智投] 每日投研结果重建失败', error)
    ElMessage.error(error.message || '每日投研结果重建失败')
  } finally {
    rebuilding.value = false
  }
}

function openReport(row) {
  router.push({
    path: '/reports',
    query: {
      reportId: row?.reportId || undefined,
      code: row?.stockCode || undefined,
    },
  })
}

function openSample(row) {
  router.push({ path: '/ai-samples', query: { sampleId: row?.sampleId || undefined } })
}

function openReviews() {
  router.push('/ai-reviews')
}

function openResearchDailyReports() {
  router.push('/research-daily-reports')
}

function openAutomationTasks() {
  router.push('/automation-tasks')
}

function parseFactors(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.slice(0, 4) : []
  } catch {
    return []
  }
}

function actionText(value) {
  return { BUY: '买入', HOLD: '持有', WATCH: '观察', REDUCE: '减仓', SELL: '卖出', UNAVAILABLE: '数据不可用' }[value] || value || '-'
}

function actionTagType(value) {
  if (value === 'BUY') return 'danger'
  if (value === 'HOLD') return 'success'
  if (value === 'REDUCE' || value === 'SELL') return 'warning'
  return 'info'
}

function freshnessText(value) {
  return { FRESH: '实时可用', PARTIAL: '部分新鲜', STALE: '数据过期', EMPTY: '无新鲜数据', UNAVAILABLE: '数据不可用' }[value] || value || '-'
}

function freshnessTagType(value) {
  return { FRESH: 'success', PARTIAL: 'warning', STALE: 'danger', EMPTY: 'info', UNAVAILABLE: 'danger' }[value] || 'info'
}

function statusClass(value) {
  return {
    SUCCESS: 'ok',
    AUTO_CLOSE: 'ok',
    MANUAL: 'ok',
    FAILED: 'danger',
    EMPTY: 'warn',
  }[value] || 'warn'
}

function formatPercent(value) {
  const number = Number(value || 0)
  return `${number.toFixed(1)}%`
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
}

onMounted(loadInsight)
</script>

<style scoped>
.daily-insight-page {
  gap: 22px;
}

.hero-surface {
  overflow: hidden;
}

.hero-header {
  align-items: flex-start;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 16px 0;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.status-tile {
  min-height: 116px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
}

.status-tile span,
.status-tile em {
  display: block;
  color: var(--muted);
  font-style: normal;
}

.status-tile strong {
  display: block;
  margin: 10px 0 8px;
  color: var(--text);
  font-size: 22px;
}

.status-tile strong.ok {
  color: #16a34a;
}

.status-tile strong.warn {
  color: #d97706;
}

.status-tile strong.danger {
  color: #dc2626;
}

.insight-layout {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

:deep(.insight-table .stock-cell) {
  display: grid;
  gap: 2px;
}

:deep(.insight-table .stock-cell span),
:deep(.hit-cell span),
:deep(.fresh-cell span),
.reason-text {
  color: var(--muted);
}

:deep(.hit-cell),
:deep(.fresh-cell) {
  display: grid;
  gap: 4px;
}

:deep(.factor-list) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

:deep(.factor-list span) {
  border-radius: 999px;
  padding: 4px 8px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 12px;
}

.reason-text {
  margin: 0;
  line-height: 1.6;
}

:deep(.table-actions) {
  display: flex;
  gap: 6px;
}

.job-log-list {
  display: grid;
  gap: 12px;
}

.job-log-row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) 170px;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.job-log-row p {
  margin: 4px 0 0;
  color: var(--muted);
}

.job-log-row time {
  color: var(--muted);
  text-align: right;
}

.log-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #94a3b8;
}

.job-log-row.success .log-dot {
  background: #16a34a;
}

.job-log-row.failed .log-dot,
.job-log-row.error .log-dot {
  background: #ef4444;
}

.job-log-row.running .log-dot {
  background: #d97706;
}

@media (max-width: 1200px) {
  .metric-grid,
  .status-grid,
  .insight-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .metric-grid,
  .status-grid,
  .insight-layout,
  .job-log-row {
    grid-template-columns: 1fr;
  }

  .job-log-row time {
    text-align: left;
  }
}
</style>
