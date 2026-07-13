<template>
  <div class="page research-daily-report-page">
    <section class="surface hero-surface">
      <div class="surface-header hero-header">
        <div>
          <h2 class="surface-title">投研日报</h2>
          <p class="surface-subtitle">
            交易日 {{ activeReport?.tradeDate || '-' }} · {{ activeReport?.reportStatus || 'EMPTY' }} ·
            {{ activeReport?.freshnessStatus || 'UNAVAILABLE' }}
          </p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadReports">刷新</el-button>
          <el-button type="primary" :icon="MagicStick" :loading="rebuilding" @click="rebuildReport">
            重建今日日报
          </el-button>
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
        </div>

        <div v-if="activeReport" class="status-grid">
          <div class="status-tile">
            <span>日报版本</span>
            <strong>V{{ activeReport.reportVersion }}</strong>
            <em>{{ activeReport.title }}</em>
          </div>
          <div class="status-tile">
            <span>生成时间</span>
            <strong>{{ formatDateTime(activeReport.generatedAt) }}</strong>
            <em>{{ activeReport.executiveSummary }}</em>
          </div>
          <div class="status-tile">
            <span>策略状态</span>
            <strong>{{ activeReport.marketRegime || 'UNKNOWN' }}</strong>
            <em>{{ activeReport.content?.strategyPerformance?.title || '未绑定策略' }}</em>
          </div>
          <div class="status-tile">
            <span>流水线状态</span>
            <strong :class="statusClass(activeReport.reportStatus)">{{ activeReport.reportStatus }}</strong>
            <em>{{ activeReport.content?.pipeline?.errorMessage || '自动化结果已同步到日报' }}</em>
          </div>
          <div class="status-tile">
            <span>自动化闭环</span>
            <strong>{{ activeReport.pipelineRunId ? '已串联' : '手动生成' }}</strong>
            <em>{{ activeReport.pipelineRunId ? `流水线 #${activeReport.pipelineRunId} 已自动收口为日报` : '当前日报不是自动收盘流水线生成' }}</em>
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
            <p>{{ activeReport.executiveSummary }}</p>
          </div>
          <div class="pill-grid">
            <article class="pill-card recommend"><span>推荐关注</span><strong>{{ activeReport.recommendationCount || 0 }}</strong></article>
            <article class="pill-card watch"><span>谨慎观察</span><strong>{{ activeReport.watchCount || 0 }}</strong></article>
            <article class="pill-card avoid"><span>建议回避</span><strong>{{ activeReport.avoidCount || 0 }}</strong></article>
            <article class="pill-card risk"><span>持仓风险</span><strong>{{ activeReport.holdingRiskCount || 0 }}</strong></article>
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

          <ReportStockSection title="推荐关注" :items="activeReport.content?.recommendations || []" tone="recommend" @open="openReportItem" />
          <ReportStockSection title="谨慎观察" :items="activeReport.content?.watches || []" tone="watch" @open="openReportItem" />
          <ReportStockSection title="建议回避" :items="activeReport.content?.avoids || []" tone="avoid" @open="openReportItem" />
          <ReportStockSection title="持仓风险" :items="activeReport.content?.holdingRisks || []" tone="risk" @open="openPortfolio" />
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
              <span>{{ report.title }}</span>
            </div>
            <div class="history-meta">
              <em>V{{ report.reportVersion }}</em>
              <i :class="statusClass(report.reportStatus)">{{ report.reportStatus }}</i>
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
            <h2 class="surface-title">策略与流水线</h2>
            <p class="surface-subtitle">确认今日日报来源、可信度与失败位置</p>
          </div>
        </div>
        <div class="surface-body detail-stack">
          <div class="detail-card">
            <span>策略版本</span>
            <strong>{{ activeReport.content?.strategyPerformance?.versionNo || 'UNKNOWN' }}</strong>
            <em>{{ activeReport.content?.strategyPerformance?.title || '未绑定策略' }}</em>
          </div>
          <div class="detail-card">
            <span>总收益 / Alpha</span>
            <strong>{{ formatDecimalRatio(activeReport.content?.strategyPerformance?.totalReturn) }} / {{ formatDecimalRatio(activeReport.content?.strategyPerformance?.alpha) }}</strong>
            <em>最大回撤 {{ formatDecimalRatio(activeReport.content?.strategyPerformance?.maxDrawdown) }}</em>
          </div>
          <div class="detail-card">
            <span>流水线步骤</span>
            <strong>{{ activeReport.content?.pipeline?.status || 'UNKNOWN' }}</strong>
            <em>{{ activeReport.content?.pipeline?.failedStep || '无失败步骤' }}</em>
          </div>
          <div class="pipeline-steps">
            <div v-for="step in activeReport.content?.pipeline?.steps || []" :key="step.stepKey" class="pipeline-step">
              <strong>{{ step.stepKey }}</strong>
              <span>{{ step.status }}</span>
              <em>{{ step.errorMessage || `输入 ${step.inputCount || 0} / 输出 ${step.outputCount || 0}` }}</em>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElEmpty, ElMessage } from 'element-plus'
import { MagicStick, Refresh } from '@element-plus/icons-vue'
import {
  fetchLatestResearchDailyReport,
  fetchResearchDailyReportDetail,
  fetchResearchDailyReports,
  rebuildResearchDailyReport,
} from '../services/researchDailyReport'

const router = useRouter()
const loading = ref(false)
const rebuilding = ref(false)
const reports = ref([])
const activeReport = ref(null)
const errorMessage = ref('')

const ReportStockSection = {
  props: {
    title: { type: String, required: true },
    items: { type: Array, default: () => [] },
    tone: { type: String, default: 'watch' },
  },
  emits: ['open'],
  setup(props, { emit }) {
    return () => h('div', { class: 'report-section' }, [
      h('div', { class: 'section-head' }, [
        h('h3', props.title),
        h('span', `${props.items.length} 只`),
      ]),
      props.items.length
        ? h('div', { class: 'stock-card-grid' }, props.items.map((item) => h('article', { class: ['stock-card', props.tone] }, [
            h('div', { class: 'stock-head' }, [
              h('div', [h('strong', item.stockName), h('span', item.stockCode)]),
              h('b', formatFactorScore(item.compositeScore)),
            ]),
            h('div', { class: 'stock-meta' }, [
              h('span', `风险 ${formatFactorScore(item.riskScore)}`),
              h('span', `命中率 ${formatRatio(item.historicalHitRate)}`),
            ]),
            h('p', { class: 'stock-reason' }, item.reasonSummary || '暂无说明'),
            h(ElButton, { text: true, type: 'primary', onClick: () => emit('open', item) }, () => '查看关联页面'),
          ])))
        : h(ElEmpty, { description: '暂无数据' }),
    ])
  },
}

async function loadReports() {
  loading.value = true
  errorMessage.value = ''
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
    activeReport.value = await rebuildResearchDailyReport()
    reports.value = await fetchResearchDailyReports(20)
    ElMessage.success('投研日报已重建')
  } catch (error) {
    ElMessage.error(error.message || '投研日报重建失败')
  } finally {
    rebuilding.value = false
  }
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

function openAutomation() {
  router.push('/automation-tasks')
}

function openPortfolio() {
  router.push('/portfolio')
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
}

function formatRatio(value) {
  const number = Number(value || 0)
  return `${number.toFixed(2)}%`
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.metric-item span,
.pill-card span {
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

.status-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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

.pill-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.pill-card {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-right: 1px solid #e5e7eb;
}

.pill-card:last-child {
  border-right: 0;
}

.pill-card strong {
  color: #111827;
  font-size: 24px;
  line-height: 30px;
}

.pill-card.recommend { background: #fef2f2; }
.pill-card.watch { background: #fffbeb; }
.pill-card.avoid { background: #f0fdf4; }
.pill-card.risk { background: #fff1f2; }
.pill-card.recommend strong { color: #b91c1c; }
.pill-card.watch strong { color: #a16207; }
.pill-card.avoid strong { color: #166534; }
.pill-card.risk strong { color: #be123c; }

.report-section {
  margin-top: 24px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head h3 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  line-height: 24px;
}

.section-head span {
  color: #64748b;
  font-size: 13px;
}

.stock-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stock-card {
  min-width: 0;
  padding: 15px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.stock-card.recommend { border-color: #fecaca; }
.stock-card.watch { border-color: #fde68a; }
.stock-card.avoid { border-color: #bbf7d0; }
.stock-card.risk { border-color: #fecdd3; }

.stock-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.stock-head strong,
.factor-item strong {
  display: block;
  color: #111827;
  overflow-wrap: anywhere;
}

.stock-head span,
.factor-item span {
  color: #64748b;
  font-size: 12px;
}

.stock-head b,
.factor-item b {
  color: #b45309;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.stock-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  color: #475569;
  font-size: 12px;
}

.stock-reason {
  min-height: 42px;
  margin: 10px 0 6px;
  color: #334155;
  line-height: 1.6;
  text-wrap: pretty;
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

.ok { color: #15803d !important; }
.warn { color: #b45309 !important; }
.danger { color: #dc2626 !important; }

@media (max-width: 1440px) {
  .report-layout,
  .stock-card-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-tile {
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
  }

  .status-tile:nth-child(2n) {
    border-right: 0;
  }

  .status-tile:last-child {
    grid-column: 1 / -1;
    border-right: 0;
    border-bottom: 0;
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

  .metric-grid,
  .status-grid,
  .pill-grid,
  .stock-card-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .metric-item,
  .status-tile,
  .pill-card {
    grid-column: auto;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .metric-item:last-child,
  .status-tile:last-child,
  .pill-card:last-child {
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
