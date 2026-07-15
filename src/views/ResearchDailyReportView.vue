<template>
  <div class="page research-daily-report-page">
    <section class="surface hero-surface">
      <div class="surface-header hero-header">
        <div>
          <h2 class="surface-title">投研日报</h2>
          <p class="surface-subtitle">
            交易日 {{ activeReport?.tradeDate || '-' }} · {{ statusLabel(activeReport?.reportStatus, '暂无数据') }} ·
            {{ statusLabel(activeReport?.freshnessStatus, '数据不可用') }}
          </p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadReports">刷新</el-button>
          <el-dropdown trigger="click" @command="handleHeaderCommand">
            <el-button :icon="MoreFilled" :loading="rebuilding">更多</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="automation">查看自动化任务</el-dropdown-item>
                <el-dropdown-item command="rebuild" divided>从当前快照重建日报</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div v-loading="loading" class="surface-body">
        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="warning"
          show-icon
          :closable="false"
        />

        <div v-if="activeReport" class="metric-grid">
          <div class="metric-item recommend">
            <span>推荐关注</span><strong class="mono">{{ activeReport.recommendationCount || 0 }}</strong>
          </div>
          <div class="metric-item watch">
            <span>谨慎观察</span><strong class="mono">{{ activeReport.watchCount || 0 }}</strong>
          </div>
          <div class="metric-item avoid">
            <span>建议回避</span><strong class="mono">{{ activeReport.avoidCount || 0 }}</strong>
          </div>
          <div class="metric-item risk">
            <span>持仓风险</span><strong class="mono">{{ activeReport.holdingRiskCount || 0 }}</strong>
          </div>
          <div class="metric-item hit-rate">
            <span>平均命中率</span><strong class="mono">{{ formatPercent(activeReport.content?.insightSummary?.overallHitRate) }}</strong>
          </div>
          <div class="metric-item quality">
            <span>数据质量</span><strong class="mono">{{ formatPercent(activeReport.content?.freshness?.dataQualityScore) }}</strong>
          </div>
        </div>

        <div v-if="activeReport" class="status-grid">
          <div class="status-tile">
            <span>日报版本</span>
            <strong>V{{ activeReport.reportVersion }}</strong>
            <em>{{ localizeStatusText(activeReport.title) }}</em>
          </div>
          <div class="status-tile">
            <span>生成时间</span>
            <strong>{{ formatDateTime(activeReport.generatedAt) }}</strong>
            <em>{{ localizeStatusText(activeReport.executiveSummary) }}</em>
          </div>
          <div class="status-tile">
            <span>快照时间</span>
            <strong>{{ formatDateTime(activeReport.content?.insightSummary?.generatedAt) }}</strong>
            <em>最新样本 {{ formatDateTime(activeReport.content?.freshness?.latestSampleAt) }}</em>
          </div>
          <div class="status-tile">
            <span>策略状态</span>
            <strong>{{ statusLabel(activeReport.marketRegime, '待确认') }}</strong>
            <em>{{ activeReport.content?.strategyPerformance?.title || '未绑定策略' }}</em>
          </div>
          <div class="status-tile">
            <span>流水线状态</span>
            <strong :class="statusClass(activeReport.reportStatus)">{{ statusLabel(activeReport.reportStatus, '待确认') }}</strong>
            <em>{{ activeReport.content?.pipeline?.errorMessage || '自动化结果已同步到日报' }}</em>
          </div>
          <div class="status-tile">
            <span>低样本结论</span>
            <strong>{{ activeReport.content?.insightSummary?.lowSampleCount || 0 }}</strong>
            <em>共 {{ activeReport.content?.insightSummary?.itemCount || 0 }} 只股票进入日报</em>
          </div>
        </div>
      </div>
    </section>

    <div class="section-grid report-layout">
      <section class="surface report-main">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">今日结论</h2>
            <p class="surface-subtitle">每日自动化收盘后生成的统一投研结论</p>
          </div>
          <el-tag v-if="activeReport?.current" type="danger" effect="dark">当前版本</el-tag>
        </div>
        <div class="surface-body" v-if="activeReport">
          <div class="summary-block">
            <p>{{ localizeStatusText(activeReport.executiveSummary) }}</p>
          </div>

          <el-alert
            v-if="activeReport.reportStatus === 'FAILED_PIPELINE'"
            title="本日报来自失败流水线，只展示已固化数据，不代表完整收盘决策。"
            type="error"
            show-icon
            :closable="false"
            class="failed-report-alert"
          />

          <el-alert
            v-else-if="!activeReport.content?.insightSummary?.snapshotId"
            title="这是字段升级前生成的旧版日报，未固化系统评分、AI 决策和风险等级。请从右上角“更多”按当前交易日重建。"
            type="warning"
            show-icon
            :closable="false"
            class="failed-report-alert"
          />

          <el-alert
            v-else-if="activeReport.reportStatus === 'EMPTY_RESULT'"
            title="日报已正常生成，但当前自选股没有可用于形成结论的样本或预测。"
            type="info"
            show-icon
            :closable="false"
            class="failed-report-alert"
          />

          <el-alert
            v-else-if="activeReport.reportStatus === 'DATA_UNAVAILABLE'"
            title="日报已生成，但核心行情或样本质量不足，本次不形成可执行股票建议。"
            type="warning"
            show-icon
            :closable="false"
            class="failed-report-alert"
          />

          <ReportStockSection title="推荐关注" :items="activeReport.content?.recommendations || []" :stock-name-map="stockNameMap" tone="recommend" @open="openReportItem" @open-sample="openSampleItem" />
          <ReportStockSection title="谨慎观察" :items="activeReport.content?.watches || []" :stock-name-map="stockNameMap" tone="watch" @open="openReportItem" @open-sample="openSampleItem" />
          <ReportStockSection title="建议回避" :items="activeReport.content?.avoids || []" :stock-name-map="stockNameMap" tone="avoid" @open="openReportItem" @open-sample="openSampleItem" />
          <ReportStockSection title="持仓风险" :items="activeReport.content?.holdingRisks || []" :stock-name-map="stockNameMap" tone="risk" @open="openPortfolio" />
        </div>
        <el-empty v-else description="暂无投研日报" />
      </section>

      <section class="surface report-side">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">历史日报</h2>
            <p class="surface-subtitle">支持按交易日回看自动化结果</p>
          </div>
          <el-button text type="primary" @click="openAutomation">自动化任务</el-button>
        </div>
        <div class="surface-body report-history">
          <button
            v-for="report in reports"
            :key="report.id"
            class="history-item"
            :class="{ active: report.id === activeReport?.id }"
            @click="loadDetail(report.id)"
          >
            <div>
              <strong>{{ report.tradeDate }}</strong>
              <span>{{ localizeStatusText(report.title) }}</span>
            </div>
            <div class="history-meta">
              <em>V{{ report.reportVersion }}</em>
              <i :class="statusClass(report.reportStatus)">{{ statusLabel(report.reportStatus, '待确认') }}</i>
            </div>
          </button>
          <el-empty v-if="!loading && !reports.length" description="暂无历史日报" />
        </div>
      </section>
    </div>

    <div v-if="activeReport" class="section-grid report-layout secondary-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">关键因子</h2>
            <p class="surface-subtitle">影响今日结论的主要因子与证据</p>
          </div>
        </div>
        <div class="surface-body factor-list">
          <div v-for="factor in activeReport.content?.keyFactors || []" :key="factor.factorCode" class="factor-item">
            <div>
              <strong>{{ factor.factorName }}</strong>
              <span>{{ factor.factorCode }}</span>
            </div>
            <b>{{ formatFactorScore(factor.contribution) }}</b>
            <p>{{ factor.evidence || '暂无额外证据' }}</p>
          </div>
          <el-empty v-if="!(activeReport.content?.keyFactors || []).length" description="暂无关键因子" />
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">数据与自动化</h2>
            <p class="surface-subtitle">核对日报来源、策略版本、流水线状态和数据边界</p>
          </div>
        </div>
        <details class="surface-body automation-disclosure">
          <summary>查看策略、数据时间与流水线步骤</summary>
          <div class="detail-stack automation-detail">
            <div class="detail-card">
              <span>策略版本</span>
              <strong>{{ activeReport.content?.strategyPerformance?.versionNo || '未绑定' }}</strong>
              <em>{{ activeReport.content?.strategyPerformance?.title || '未绑定策略' }}</em>
            </div>
            <div class="detail-card">
              <span>总收益 / Alpha</span>
              <strong>{{ formatDecimalRatio(activeReport.content?.strategyPerformance?.totalReturn) }} / {{ formatDecimalRatio(activeReport.content?.strategyPerformance?.alpha) }}</strong>
              <em>最大回撤 {{ formatDecimalRatio(activeReport.content?.strategyPerformance?.maxDrawdown) }}</em>
            </div>
            <div class="detail-card">
              <span>流水线步骤</span>
              <strong>{{ statusLabel(activeReport.content?.pipeline?.status, '待确认') }}</strong>
              <em>{{ statusLabel(activeReport.content?.pipeline?.failedStep, '无失败步骤') }}</em>
            </div>
            <div class="pipeline-steps">
              <div v-for="step in activeReport.content?.pipeline?.steps || []" :key="step.stepKey" class="pipeline-step">
                <strong>{{ statusLabel(step.stepKey) }}</strong>
                <span>{{ statusLabel(step.status, '待确认') }}</span>
                <em>{{ step.errorMessage || `输入 ${step.inputCount || 0} / 输出 ${step.outputCount || 0}` }}</em>
              </div>
            </div>
          </div>
        </details>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElEmpty, ElMessage, ElMessageBox } from 'element-plus'
import { MoreFilled, Refresh } from '@element-plus/icons-vue'
import ReportStockSection from '../components/ResearchReportStockSection.vue'
import { localizeStatusText, statusLabel } from '../utils/statusLabels'
import {
  fetchLatestResearchDailyReport,
  fetchResearchDailyReportDetail,
  fetchResearchDailyReports,
  rebuildResearchDailyReport,
} from '../services/researchDailyReport'
import { fetchWatchlist } from '../services/watchlist'

const router = useRouter()
const loading = ref(false)
const rebuilding = ref(false)
const reports = ref([])
const activeReport = ref(null)
const errorMessage = ref('')
const stockNameMap = ref({})

async function loadReports() {
  loading.value = true
  errorMessage.value = ''
  void loadStockNames()
  try {
    const [latest, history] = await Promise.all([
      fetchLatestResearchDailyReport(),
      fetchResearchDailyReports(20),
    ])
    activeReport.value = latest
    reports.value = history
  } catch (error) {
    errorMessage.value = error.message || '投研日报加载失败'
    activeReport.value = null
    reports.value = []
  } finally {
    loading.value = false
  }
}

async function loadStockNames() {
  try {
    const watchlist = await fetchWatchlist()
    stockNameMap.value = Object.fromEntries((watchlist || [])
      .filter((item) => item?.code && item?.name)
      .map((item) => [String(item.code), String(item.name)]))
  } catch {
    stockNameMap.value = {}
  }
}

async function loadDetail(reportId) {
  if (!reportId) return
  loading.value = true
  errorMessage.value = ''
  try {
    activeReport.value = await fetchResearchDailyReportDetail(reportId)
  } catch (error) {
    errorMessage.value = error.message || '日报详情加载失败'
  } finally {
    loading.value = false
  }
}

async function rebuildReport() {
  rebuilding.value = true
  try {
    activeReport.value = await rebuildResearchDailyReport(activeReport.value?.tradeDate)
    reports.value = await fetchResearchDailyReports(20)
    ElMessage.success('投研日报已重建')
  } catch (error) {
    ElMessage.error(error.message || '投研日报重建失败')
  } finally {
    rebuilding.value = false
  }
}

async function handleHeaderCommand(command) {
  if (command === 'automation') {
    openAutomation()
    return
  }
  if (command !== 'rebuild') return
  try {
    await ElMessageBox.confirm(
      `此操作将使用 ${activeReport.value?.tradeDate || '当前交易日'} 已固化的决策快照生成新版本，不会重新执行整套分析流水线。`,
      '从当前快照重建日报',
      {
        confirmButtonText: '确认重建',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  await rebuildReport()
}

function openReportItem(item) {
  router.push({
    path: '/reports',
    query: {
      reportId: item?.reportId || '',
      code: item?.stockCode || '',
    },
  })
}

function openSampleItem(item) {
  router.push({
    path: '/research-lab',
    query: {
      tab: 'samples',
      sampleId: item?.sampleId || '',
      stockCode: item?.stockCode || '',
    },
  })
}

function openAutomation() {
  router.push('/automation-tasks')
}

function openPortfolio() {
  router.push('/portfolio')
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
}

function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '-'
  return `${Number(value).toFixed(1)}%`
}

function formatDecimalRatio(value) {
  const number = Number(value || 0) * 100
  return `${number.toFixed(2)}%`
}

function formatFactorScore(value) {
  const number = Number(value || 0)
  return number.toFixed(1)
}

function statusClass(value) {
  return {
    READY: 'ok',
    SUCCESS: 'ok',
    EMPTY_RESULT: 'warn',
    DATA_UNAVAILABLE: 'warn',
    PARTIAL_READY: 'warn',
    PARTIAL_SUCCESS: 'warn',
    FAILED_PIPELINE: 'danger',
    FAILED: 'danger',
  }[value] || 'warn'
}

onMounted(loadReports)
</script>

<style scoped>
.research-daily-report-page {
  gap: 22px;
  color: #111827;
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
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin: 4px 0 18px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.metric-item {
  min-width: 0;
  padding: 15px 18px;
  border-right: 1px solid #e5e7eb;
}

.metric-item:last-child {
  border-right: 0;
}

.metric-item span {
  display: block;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.metric-item strong {
  display: block;
  margin-top: 6px;
  color: #111827;
  font-size: 26px;
  line-height: 32px;
}

.metric-item.recommend strong { color: #dc2626; }
.metric-item.watch strong { color: #b45309; }
.metric-item.avoid strong { color: #15803d; }
.metric-item.risk strong { color: #be123c; }
.metric-item.hit-rate strong { color: #1d4ed8; }
.metric-item.quality strong { color: #047857; }

.status-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.status-tile {
  min-width: 0;
  min-height: 118px;
  padding: 15px 16px;
  border-right: 1px solid #e5e7eb;
}

.status-tile:last-child {
  border-right: 0;
}

.status-tile span,
.status-tile em {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.status-tile strong {
  display: block;
  margin: 8px 0 6px;
  color: #111827;
  font-size: 17px;
  line-height: 24px;
  overflow-wrap: anywhere;
}

.report-layout {
  grid-template-columns: minmax(0, 1.75fr) minmax(300px, 0.85fr);
}

.failed-report-alert {
  margin-top: 18px;
}

.secondary-layout {
  margin-top: 0;
}

.summary-block {
  padding: 15px 18px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #334155;
  line-height: 1.7;
}

.summary-block p {
  max-width: 72ch;
  margin: 0;
  text-wrap: pretty;
}

.factor-item strong {
  display: block;
  color: #111827;
  overflow-wrap: anywhere;
}

.factor-item span {
  color: #64748b;
  font-size: 12px;
}

.factor-item b {
  color: #b45309;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.report-history,
.factor-list,
.detail-stack,
.pipeline-steps {
  display: grid;
  gap: 10px;
}

.history-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, background-color 180ms ease;
}

.history-item:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.history-item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.history-item.active {
  border-color: #93c5fd;
  background: #eff6ff;
}

.history-item > div:first-child {
  min-width: 0;
}

.history-item strong {
  display: block;
  color: #111827;
}

.history-item span,
.history-item em,
.history-item i {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.history-meta {
  flex: 0 0 auto;
  text-align: right;
}

.factor-item,
.detail-card,
.pipeline-step {
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.factor-item p,
.detail-card em,
.pipeline-step em {
  margin: 8px 0 0;
  color: #475569;
  font-style: normal;
  line-height: 1.6;
  text-wrap: pretty;
}

.detail-card span,
.pipeline-step span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.detail-card strong,
.pipeline-step strong {
  display: block;
  margin-top: 6px;
  color: #111827;
  overflow-wrap: anywhere;
}

.automation-disclosure {
  padding-top: 14px;
}

.automation-disclosure summary {
  color: #1d4ed8;
  font-weight: 700;
  cursor: pointer;
}

.automation-disclosure summary:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
}

.automation-detail {
  margin-top: 16px;
}

.ok { color: #15803d !important; }
.warn { color: #b45309 !important; }
.danger { color: #dc2626 !important; }

@media (max-width: 1440px) {
  .report-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .metric-grid,
  .status-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .metric-item,
  .status-tile {
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
  }

  .metric-item:nth-child(3n),
  .status-tile:nth-child(3n) {
    border-right: 0;
  }

  .metric-item:nth-last-child(-n + 3),
  .status-tile:nth-last-child(-n + 3) {
    border-bottom: 0;
  }

  .status-tile:last-child {
    grid-column: auto;
    border-right: 0;
  }
}

@media (max-width: 760px) {
  .research-daily-report-page {
    gap: 14px;
  }

  .hero-header,
  .header-actions {
    width: 100%;
  }

  .header-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .header-actions :deep(.el-button) {
    width: 100%;
    margin: 0;
  }

  .header-actions :deep(.el-dropdown) {
    width: 100%;
  }

  .metric-grid,
  .status-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .metric-item,
  .status-tile {
    grid-column: auto;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .metric-item:nth-last-child(-n + 3),
  .status-tile:nth-last-child(-n + 3) {
    border-bottom: 1px solid #e5e7eb;
  }

  .metric-item:last-child,
  .status-tile:last-child {
    border-bottom: 0;
  }

  .history-item {
    align-items: flex-start;
  }

}

@media (prefers-reduced-motion: reduce) {
  .history-item {
    transition: none;
  }
}
</style>
