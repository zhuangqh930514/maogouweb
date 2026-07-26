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
          <el-dropdown v-if="advancedMode" trigger="click" @command="handleHeaderCommand">
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
            <span>日报固化时间</span>
            <strong>{{ formatDateTime(activeReport.content?.insightSummary?.generatedAt) }}</strong>
            <em>收盘样本 {{ formatDateTime(activeReport.content?.freshness?.latestSampleAt) }}</em>
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
            <span>下一次自动运行</span>
            <strong>{{ formatDateTime(nextAutoRunAt) }}</strong>
            <em>{{ nextAutoRunAt ? '收盘后自动生成最新结论' : '自动运行时间暂未确认' }}</em>
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
            title="这是字段升级前生成的旧版日报，未固化系统评分、AI 决策和风险等级，不能作为当前正式决策。"
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

          <section class="action-center">
            <div class="section-headline">
              <div>
                <h3>今日优先处理</h3>
                <p>先处理触发条件和持仓风险，再查看完整观察池。</p>
              </div>
              <el-tag :type="actionableItems.length ? 'danger' : 'info'" effect="plain">
                {{ actionableItems.length ? `${actionableItems.length} 项待关注` : '暂无交易条件' }}
              </el-tag>
            </div>
            <el-empty
              v-if="!actionableItems.length"
              description="今日没有触发可执行的买入、回避或持仓风险条件"
            />
            <div v-else class="priority-grid">
              <article v-for="item in actionableItems" :key="`priority-${item.stockCode}`" class="priority-item" :class="item.tone">
                <div class="priority-item-head">
                  <div>
                    <strong>{{ displayStockName(item) }}</strong>
                    <span>{{ item.stockCode }}</span>
                  </div>
                  <el-tag size="small" :type="priorityTagType(item)">{{ statusLabel(item.action, '观察') }}</el-tag>
                </div>
                <p>{{ localizeStatusText(item.reasonSummary, '系统尚未提供具体原因') }}</p>
                <dl>
                  <div><dt>系统分</dt><dd>{{ formatScore(item.systemScore) }}</dd></div>
                  <div><dt>风险</dt><dd>{{ statusLabel(item.riskLevel, '待确认') }} {{ formatScore(item.riskScore) }}</dd></div>
                  <div><dt>历史验证</dt><dd>{{ evidenceSummary(item) }}</dd></div>
                </dl>
                <div class="priority-actions">
                  <el-button v-if="item.reportId" text type="primary" @click="openReportItem(item)">查看分析报告</el-button>
                  <el-button v-else-if="item.category === 'HOLDING_RISK'" text type="danger" @click="openPortfolio">查看持仓</el-button>
                  <el-button v-else-if="item.sampleId && advancedMode" text @click="openSampleItem(item)">查看研究依据</el-button>
                </div>
              </article>
            </div>
          </section>

          <section v-if="dailyChanges.length" class="daily-change-section">
            <div class="section-headline compact">
              <div>
                <h3>较上一交易日变化</h3>
                <p>仅列出新增、移除或动作改变的股票。</p>
              </div>
            </div>
            <div class="daily-change-list">
              <div v-for="change in dailyChanges" :key="`${change.stockCode}-${change.currentAction}`" class="daily-change-item">
                <strong>{{ change.stockName }} {{ change.stockCode }}</strong>
                <span>{{ change.message }}</span>
              </div>
            </div>
          </section>

          <ReportStockSection
            v-if="(activeReport.content?.recommendations || []).length"
            title="推荐关注"
            :items="activeReport.content?.recommendations || []"
            tone="recommend"
            :feedback-by-stock="feedbackByStock"
            :feedback-loading-stock="feedbackLoadingStock"
            @open="openReportItem"
            @open-sample="openSampleItem"
            @feedback="submitFeedback"
          />
          <ReportStockSection
            v-if="(activeReport.content?.avoids || []).length"
            title="建议回避"
            :items="activeReport.content?.avoids || []"
            tone="avoid"
            :feedback-by-stock="feedbackByStock"
            :feedback-loading-stock="feedbackLoadingStock"
            @open="openReportItem"
            @open-sample="openSampleItem"
            @feedback="submitFeedback"
          />
          <ReportStockSection
            v-if="(activeReport.content?.holdingRisks || []).length"
            title="持仓风险"
            :items="activeReport.content?.holdingRisks || []"
            tone="risk"
            :feedback-by-stock="feedbackByStock"
            :feedback-loading-stock="feedbackLoadingStock"
            @open="openPortfolio"
            @feedback="submitFeedback"
          />
          <ReportStockSection
            v-if="holdingStableItems.length"
            title="持仓状态"
            :items="holdingStableItems"
            tone="watch"
            :feedback-by-stock="feedbackByStock"
            :feedback-loading-stock="feedbackLoadingStock"
            @open="openPortfolio"
            @feedback="submitFeedback"
          />
          <ReportStockSection
            v-if="holdingUnavailableItems.length"
            title="持仓数据待补"
            :items="holdingUnavailableItems"
            tone="risk"
            :feedback-by-stock="feedbackByStock"
            :feedback-loading-stock="feedbackLoadingStock"
            @open="openPortfolio"
            @feedback="submitFeedback"
          />

          <el-collapse v-model="expandedDecisionSections" class="decision-details" @change="handleDecisionSectionChange">
            <el-collapse-item :title="`完整观察池（${activeReport.watchCount || 0} 只）`" name="watches">
              <div v-if="activeReport.decisionSnapshotId" class="decision-query-toolbar">
                <el-input
                  v-model="watchQuery.keyword"
                  clearable
                  placeholder="按名称或代码筛选"
                  @keyup.enter="refreshWatchItems"
                />
                <el-select v-model="watchQuery.action" clearable placeholder="全部动作" @change="refreshWatchItems">
                  <el-option label="观察" value="WATCH" />
                  <el-option label="持有" value="HOLD" />
                  <el-option label="买入" value="BUY" />
                  <el-option label="减仓" value="REDUCE" />
                  <el-option label="卖出" value="SELL" />
                </el-select>
                <el-select v-model="watchQuery.sort" @change="refreshWatchItems">
                  <el-option label="系统评分从高到低" value="SYSTEM_SCORE_DESC" />
                  <el-option label="风险评分从高到低" value="RISK_DESC" />
                  <el-option label="股票代码" value="STOCK_ASC" />
                  <el-option label="数据新鲜度" value="FRESHNESS_ASC" />
                </el-select>
                <el-button @click="refreshWatchItems">筛选</el-button>
              </div>
              <ReportStockSection
                title="谨慎观察"
                :items="activeReport.decisionSnapshotId ? watchItems.items : (activeReport.content?.watches || [])"
                tone="watch"
                paginated
                :server-paginated="Boolean(activeReport.decisionSnapshotId)"
                :page="watchItems.page"
                :page-size="watchItems.pageSize"
                :total="activeReport.decisionSnapshotId ? watchItems.total : null"
                :loading="watchItems.loading"
                :feedback-by-stock="feedbackByStock"
                :feedback-loading-stock="feedbackLoadingStock"
                @page-change="loadWatchItems"
                @open="openReportItem"
                @open-sample="openSampleItem"
                @feedback="submitFeedback"
              />
            </el-collapse-item>
            <el-collapse-item
              v-if="dataUnavailableCount"
              :title="`数据不可用（${dataUnavailableCount} 只）`"
              name="unavailable"
            >
              <ReportStockSection
                title="数据不可用"
                :items="activeReport.decisionSnapshotId ? unavailableItems.items : (activeReport.content?.unavailable || [])"
                tone="risk"
                paginated
                :server-paginated="Boolean(activeReport.decisionSnapshotId)"
                :page="unavailableItems.page"
                :page-size="unavailableItems.pageSize"
                :total="activeReport.decisionSnapshotId ? unavailableItems.total : null"
                :loading="unavailableItems.loading"
                :feedback-by-stock="feedbackByStock"
                :feedback-loading-stock="feedbackLoadingStock"
                @page-change="loadUnavailableItems"
                @open="openReportItem"
                @open-sample="openSampleItem"
                @feedback="submitFeedback"
              />
            </el-collapse-item>
          </el-collapse>
        </div>
        <el-empty v-else description="暂无投研日报" />
      </section>

      <section class="surface report-side">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">历史日报</h2>
            <p class="surface-subtitle">支持按交易日回看自动化结果</p>
          </div>
          <el-date-picker
            v-model="historyTradeDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="筛选日期"
            clearable
            class="history-date-picker"
            @change="refreshHistory"
          />
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
          <el-pagination
            v-if="historyTotalPages > 1"
            :current-page="historyPage"
            :page-size="historyPageSize"
            :total="historyTotal"
            small
            background
            layout="prev, pager, next"
            class="history-pagination"
            @current-change="loadHistory"
          />
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
        <details v-if="advancedMode" class="surface-body automation-disclosure">
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
        <div v-else class="surface-body automation-summary">
          <div class="detail-card">
            <span>数据状态</span>
            <strong>{{ statusLabel(activeReport?.freshnessStatus, '待确认') }}</strong>
            <em>收盘样本时间 {{ formatDateTime(activeReport?.content?.freshness?.latestSampleAt) }}</em>
          </div>
          <div class="detail-card">
            <span>自动化结果</span>
            <strong :class="statusClass(activeReport?.reportStatus)">{{ statusLabel(activeReport?.reportStatus, '待确认') }}</strong>
            <em>{{ nextAutoRunAt ? `下一次自动运行 ${formatDateTime(nextAutoRunAt)}` : '运行时间暂未确认' }}</em>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElEmpty, ElMessage, ElMessageBox } from 'element-plus'
import { MoreFilled, Refresh } from '@element-plus/icons-vue'
import ReportStockSection from '../components/ResearchReportStockSection.vue'
import { localizeStatusText, statusLabel } from '../utils/statusLabels'
import {
  fetchResearchDailyReportDetail,
  fetchResearchDailyReportFeedback,
  fetchResearchDailyReportHistory,
  fetchResearchDailyReportItems,
  fetchResearchDailyReportOverview,
  rebuildResearchDailyReport,
  submitResearchDailyReportFeedback,
} from '../services/researchDailyReport'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const rebuilding = ref(false)
const reports = ref([])
const historyTradeDate = ref('')
const historyPage = ref(1)
const historyPageSize = ref(10)
const historyTotal = ref(0)
const historyTotalPages = ref(0)
const activeReport = ref(null)
const nextAutoRunAt = ref(null)
const serverDailyChanges = ref([])
const errorMessage = ref('')
const expandedDecisionSections = ref([])
const watchQuery = ref({ keyword: '', action: '', sort: 'SYSTEM_SCORE_DESC' })
const watchItems = ref(emptyDecisionPage())
const unavailableItems = ref(emptyDecisionPage())
const feedbackByStock = ref({})
const feedbackLoadingStock = ref('')
const advancedMode = computed(() => typeof localStorage !== 'undefined'
  && localStorage.getItem('maogou_advanced_mode') === 'true')

async function loadReports() {
  loading.value = true
  errorMessage.value = ''
  try {
    const overview = await fetchResearchDailyReportOverview(20)
    activeReport.value = overview?.report || null
    nextAutoRunAt.value = overview?.nextAutoRunAt || null
    try {
      const history = await fetchResearchDailyReportHistory({ page: 1, pageSize: historyPageSize.value })
      applyHistory(history, overview?.history || [])
    } catch {
      applyHistory(null, overview?.history || [])
    }
    serverDailyChanges.value = overview?.dailyChanges || []
    resetDecisionPages()
    void loadFeedback(activeReport.value?.id)
  } catch (error) {
    errorMessage.value = error.message || '投研日报加载失败'
    activeReport.value = null
    reports.value = []
    historyTotal.value = 0
    historyTotalPages.value = 0
    serverDailyChanges.value = []
    nextAutoRunAt.value = null
  } finally {
    loading.value = false
  }
}

const actionableItems = computed(() => {
  const content = activeReport.value?.content || {}
  const decorate = (items, tone) => (items || []).map(item => ({ ...item, tone }))
  const urgent = [
    ...decorate(content.holdingRisks, 'risk'),
    ...decorate(holdingUnavailableItems.value, 'risk'),
    ...decorate(content.avoids, 'avoid'),
    ...decorate(content.recommendations, 'recommend'),
  ]
  return urgent
    .sort((left, right) => Number(right.riskScore || 0) - Number(left.riskScore || 0)
      || Number(right.systemScore || 0) - Number(left.systemScore || 0))
    .slice(0, 5)
})

const holdingStableItems = computed(() => (activeReport.value?.content?.watches || [])
  .filter(item => item?.positionPlan))

const holdingUnavailableItems = computed(() => (activeReport.value?.content?.unavailable || [])
  .filter(item => item?.positionPlan))

const dailyChanges = computed(() => (serverDailyChanges.value || []).slice(0, 8).map(change => ({
  ...change,
  currentAction: change.currentAction,
  message: localizeDailyChange(change),
})))

const dataUnavailableCount = computed(() => {
  const content = activeReport.value?.content || {}
  if (!activeReport.value?.decisionSnapshotId) return (content.unavailable || []).length
  const total = Number(content.insightSummary?.itemCount || 0)
  const categorized = Number(activeReport.value.recommendationCount || 0)
    + Number(activeReport.value.watchCount || 0)
    + Number(activeReport.value.avoidCount || 0)
    + Number(activeReport.value.holdingRiskCount || 0)
  return Math.max(0, total - categorized)
})

function emptyDecisionPage() {
  return { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0, loading: false }
}

function evidenceSummary(item) {
  const scope = statusLabel(item?.evidenceScope, '证据范围未记录')
  const count = Number(item?.historicalSampleCount || 0)
  return `${scope} ${count.toLocaleString('zh-CN')} 条`
}

function resetDecisionPages() {
  watchItems.value = emptyDecisionPage()
  unavailableItems.value = emptyDecisionPage()
  expandedDecisionSections.value = []
  feedbackByStock.value = {}
  feedbackLoadingStock.value = ''
}

async function loadFeedback(reportId) {
  if (!reportId) {
    feedbackByStock.value = {}
    return
  }
  try {
    const rows = await fetchResearchDailyReportFeedback(reportId)
    if (activeReport.value?.id !== reportId) return
    feedbackByStock.value = Object.fromEntries((rows || [])
      .filter(row => row?.stockCode)
      .map(row => [row.stockCode, row]))
  } catch {
    if (activeReport.value?.id === reportId) feedbackByStock.value = {}
  }
}

async function submitFeedback({ item, feedbackType }) {
  const reportId = activeReport.value?.id
  const stockCode = item?.stockCode
  if (!reportId || !stockCode || !feedbackType) return
  feedbackLoadingStock.value = stockCode
  try {
    const saved = await submitResearchDailyReportFeedback(reportId, { stockCode, feedbackType })
    feedbackByStock.value = { ...feedbackByStock.value, [stockCode]: saved }
    ElMessage.success('反馈已记录，仅用于改进结论说明与展示')
  } catch (error) {
    ElMessage.error(error.message || '反馈保存失败')
  } finally {
    feedbackLoadingStock.value = ''
  }
}

async function loadDecisionItems(category, page = 1) {
  const reportId = activeReport.value?.id
  if (!reportId || !activeReport.value?.decisionSnapshotId) return
  const target = category === 'CAUTIOUS' ? watchItems : unavailableItems
  const filters = category === 'CAUTIOUS'
    ? { category, action: watchQuery.value.action, keyword: watchQuery.value.keyword, sort: watchQuery.value.sort }
    : { category: 'DATA_UNAVAILABLE', dataStatus: 'UNAVAILABLE', sort: 'FRESHNESS_ASC' }
  target.value.loading = true
  try {
    const response = await fetchResearchDailyReportItems(reportId, {
      ...filters,
      page,
      pageSize: target.value.pageSize,
    })
    target.value = {
      items: response?.items || [],
      total: Number(response?.total || 0),
      page: Number(response?.page || 1),
      pageSize: Number(response?.pageSize || target.value.pageSize),
      totalPages: Number(response?.totalPages || 0),
      loading: false,
    }
  } catch (error) {
    target.value = { ...target.value, items: [], total: 0, page: 1, totalPages: 0, loading: false }
    errorMessage.value = error.message || '日报明细加载失败'
  }
}

function loadWatchItems(page) {
  loadDecisionItems('CAUTIOUS', page)
}

function loadUnavailableItems(page) {
  loadDecisionItems('DATA_UNAVAILABLE', page)
}

function refreshWatchItems() {
  loadWatchItems(1)
}

function handleDecisionSectionChange(names) {
  const opened = Array.isArray(names) ? names : [names]
  if (opened.includes('watches') && !watchItems.value.loading
      && !watchItems.value.total && !watchItems.value.items.length) {
    loadWatchItems(1)
  }
  if (opened.includes('unavailable') && !unavailableItems.value.loading
      && !unavailableItems.value.total && !unavailableItems.value.items.length) {
    loadUnavailableItems(1)
  }
}

async function loadDetail(reportId) {
  if (!reportId) return
  loading.value = true
  errorMessage.value = ''
  try {
    activeReport.value = await fetchResearchDailyReportDetail(reportId)
    serverDailyChanges.value = []
    resetDecisionPages()
    void loadFeedback(activeReport.value?.id)
  } catch (error) {
    errorMessage.value = error.message || '日报详情加载失败'
  } finally {
    loading.value = false
  }
}

async function loadHistory(page = 1) {
  try {
    const history = await fetchResearchDailyReportHistory({
      page,
      pageSize: historyPageSize.value,
      tradeDate: historyTradeDate.value || undefined,
    })
    applyHistory(history, [])
  } catch (error) {
    errorMessage.value = error.message || '历史日报加载失败'
  }
}

function refreshHistory() {
  loadHistory(1)
}

function applyHistory(history, fallbackItems) {
  reports.value = history?.items || fallbackItems
  historyTotal.value = Number(history?.total ?? reports.value.length)
  historyPage.value = Number(history?.page || 1)
  historyPageSize.value = Number(history?.pageSize || historyPageSize.value)
  historyTotalPages.value = Number(history?.totalPages || (historyTotal.value ? 1 : 0))
}

async function rebuildReport() {
  rebuilding.value = true
  try {
    await rebuildResearchDailyReport(activeReport.value?.tradeDate)
    await loadReports()
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

function displayStockName(item) {
  const code = String(item?.stockCode || '').trim()
  const name = String(item?.stockName || '').trim()
  return name && name !== code && !/^\d{6}(?:\.(?:SH|SZ|BJ))?$/i.test(name) ? name : code
}

function localizeDailyChange(change) {
  const type = String(change?.changeType || '').toUpperCase()
  if (type === 'NEW') return `新增为${statusLabel(change.currentAction, '观察')}`
  if (type === 'REMOVED') return `已从${statusLabel(change.previousAction, '观察')}移出日报`
  if (type === 'DATA_UNAVAILABLE') return '当日数据不可用，暂不形成正式结论'
  if (type === 'DATA_RECOVERED') return '数据已恢复，已形成正式结论'
  if (type === 'ACTION_CHANGED') {
    return `${statusLabel(change.previousAction, '观察')}调整为${statusLabel(change.currentAction, '观察')}`
  }
  if (type === 'HOLDING_RISK_CHANGED') return '持仓风险等级或条件已变化'
  if (type === 'RISK_CHANGED') return '风险等级已变化'
  if (type === 'FACTORS_CHANGED') return '触发因子已变化'
  if (type === 'FRESHNESS_CHANGED') return '数据新鲜度已变化'
  return localizeStatusText(change?.message, '日报结论已更新')
}

function priorityTagType(item) {
  if (item?.category === 'HOLDING_RISK') return 'danger'
  if (item?.category === 'AVOID') return 'warning'
  return 'danger'
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value).toFixed(1)
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

onMounted(async () => {
  await loadReports()
  const requestedReportId = Number(route.query.reportId || 0)
  if (requestedReportId && requestedReportId !== Number(activeReport.value?.id || 0)) {
    await loadDetail(requestedReportId)
  }
})
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

.action-center,
.daily-change-section {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.section-headline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-headline h3 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  line-height: 24px;
}

.section-headline p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 20px;
}

.section-headline.compact { margin-bottom: 10px; }

.priority-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.priority-item {
  min-width: 0;
  padding: 15px 16px;
  border: 1px solid #dbe4ef;
  border-left: 4px solid #64748b;
  border-radius: 8px;
  background: #ffffff;
}

.priority-item.recommend { border-left-color: #dc2626; }
.priority-item.avoid { border-left-color: #b45309; }
.priority-item.risk { border-left-color: #be123c; }

.priority-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.priority-item-head > div { min-width: 0; }

.priority-item-head strong,
.priority-item-head span {
  display: block;
  overflow-wrap: anywhere;
}

.priority-item-head strong { color: #111827; }
.priority-item-head span { color: #64748b; font-size: 12px; }

.priority-item p {
  min-height: 40px;
  margin: 10px 0 12px;
  color: #475569;
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.priority-item dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 10px 0;
  border-top: 1px solid #eef2f7;
  border-bottom: 1px solid #eef2f7;
}

.priority-item dt,
.priority-item dd { margin: 0; }
.priority-item dt { color: #64748b; font-size: 11px; }
.priority-item dd { margin-top: 3px; color: #1f2937; font-size: 12px; overflow-wrap: anywhere; }
.priority-actions { margin-top: 6px; }

.daily-change-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.daily-change-item {
  min-width: 0;
  padding: 11px 13px;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.daily-change-item:nth-child(2n) { border-right: 0; }
.daily-change-item:nth-last-child(-n + 2) { border-bottom: 0; }
.daily-change-item strong,
.daily-change-item span { display: block; overflow-wrap: anywhere; }
.daily-change-item strong { color: #334155; font-size: 13px; }
.daily-change-item span { margin-top: 3px; color: #64748b; font-size: 12px; }

.decision-details {
  margin-top: 22px;
  border-top: 1px solid #e5e7eb;
}

.decision-details :deep(.el-collapse-item__header) {
  color: #1d4ed8;
  font-weight: 700;
}

.decision-details :deep(.el-collapse-item__content) { padding-bottom: 4px; }

.decision-query-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) minmax(120px, 0.8fr) minmax(165px, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 14px 0 2px;
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

.history-date-picker {
  width: 142px;
}

.history-pagination {
  justify-content: center;
  margin-top: 6px;
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

.automation-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
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

  .automation-summary {
    grid-template-columns: 1fr;
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

  .section-headline { align-items: flex-start; }

  .priority-grid,
  .daily-change-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .decision-query-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .decision-query-toolbar :deep(.el-button) {
    width: 100%;
  }

  .daily-change-item,
  .daily-change-item:nth-child(2n),
  .daily-change-item:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .daily-change-item:last-child { border-bottom: 0; }

}

@media (prefers-reduced-motion: reduce) {
  .history-item {
    transition: none;
  }
}
</style>
