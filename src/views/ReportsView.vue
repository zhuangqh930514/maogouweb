<template>
  <div class="page">
    <section class="surface toolbar-surface">
      <div class="surface-body reports-toolbar">
        <el-segmented v-model="filter" :options="reportFilterOptions" @change="handleReportFilterChange" />
        <div class="reports-toolbar-actions">
          <el-autocomplete
            v-model="stockKeyword"
            :fetch-suggestions="queryStockSuggestions"
            value-key="label"
            placeholder="输入股票代码 / 名称"
            clearable
            class="reports-stock-search"
            @select="selectStockSuggestion"
            @clear="clearStockSuggestion"
          >
            <template #default="{ item }">
              <div class="stock-suggestion">
                <strong>{{ item.name }}</strong>
                <span>{{ item.code }} · {{ item.market }}</span>
              </div>
            </template>
          </el-autocomplete>
          <el-select
            v-model="selectedPromptTemplateId"
            :loading="promptTemplatesLoading"
            placeholder="默认提示词"
            clearable
            filterable
            class="prompt-template-select"
          >
            <el-option
              v-for="item in promptTemplates"
              :key="item.id"
              :label="item.title"
              :value="item.id"
            />
          </el-select>
          <el-button type="primary" :loading="stockAnalyzing" @click="runSingleStockAnalysis">分析个股</el-button>
          <el-button type="primary" :icon="Cpu" :loading="analyzing" @click="runWatchlistAnalysis">立即分析自选股</el-button>
        </div>
      </div>
      <div v-if="analysisProgress.visible" class="analysis-progress">
        <div class="analysis-progress-meta">
          <strong>{{ analysisProgress.title }}</strong>
          <span>{{ analysisProgress.message }}</span>
        </div>
        <el-progress
          :percentage="analysisProgress.percent"
          :status="analysisProgress.status"
          :stroke-width="8"
          striped
          striped-flow
        />
        <details v-if="analysisProgress.details" class="analysis-progress-details">
          <summary>查看跳过或失败明细</summary>
          <pre>{{ analysisProgress.details }}</pre>
        </details>
      </div>
      <div class="report-query-bar">
        <div class="report-date-controls">
          <span class="report-query-label">报告日期</span>
          <el-segmented
            v-model="dateShortcut"
            :options="dateShortcutOptions"
            @change="handleDateShortcutChange"
          />
          <el-date-picker
            v-model="reportDate"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder="选择报告日期"
            clearable
            :disabled-date="disableFutureDate"
            class="report-date-picker"
            @change="handleReportDateChange"
          />
        </div>
        <div class="report-query-summary">
          <el-tag v-if="reportDate && reportDate === latestAvailableDate" type="success" effect="plain">
            最新有数据
          </el-tag>
          <strong>{{ reportDate || '暂无数据日期' }}</strong>
          <span>共 {{ reportTotal }} 份报告</span>
        </div>
      </div>
    </section>

    <div class="section-grid reports-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">报告列表</h2>
            <p class="surface-subtitle">{{ reportDate || '-' }} · 按生成时间倒序</p>
          </div>
          <el-button
            type="danger"
            plain
            :disabled="!selectedIds.length"
            :loading="batchDeleting"
            @click="deleteSelectedReports"
          >
            批量删除
          </el-button>
        </div>
        <div v-loading="loading" class="surface-body report-list-shell">
          <div class="report-list">
            <button
              v-for="report in aiReports"
              :key="report.id"
              class="report-item"
              :class="{ active: selected?.id === report.id }"
              @click="selectReport(report)"
            >
              <div class="report-item-main">
                <el-checkbox
                  :model-value="selectedIds.includes(report.id)"
                  @click.stop
                  @change="toggleReportSelection(report.id, $event)"
                />
                <span class="report-item-content">
                  <strong>{{ report.stock }}</strong>
                  <em>{{ localizeStatusText(report.advice, '暂无建议') }}</em>
                </span>
              </div>
              <span class="report-score" :class="report.score >= 75 ? 'up' : 'muted'">{{ report.score }}</span>
              <small class="report-meta">
                <span>{{ formatDateTime(report.generatedAt) }}</span>
                <span>来源：{{ report.sourceModel || '未记录' }}</span>
              </small>
            </button>
            <el-empty
              v-if="!aiReports.length"
              :description="reportDate ? `${reportDate} 暂无 AI 分析报告` : '暂无 AI 分析报告'"
            />
          </div>
          <div v-if="reportTotal" class="report-list-footer">
            <span>第 {{ reportPage }} / {{ reportTotalPages }} 页</span>
            <el-pagination
              :current-page="reportPage"
              :page-size="reportPageSize"
              :total="reportTotal"
              :pager-count="5"
              background
              layout="prev, pager, next"
              @current-change="handleReportPageChange"
            />
          </div>
        </div>
      </section>

      <section v-if="normalizedSelectedReport" v-loading="detailLoading" class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">{{ normalizedSelectedReport.stock }} {{ normalizedSelectedReport.code }} | 结构化分析报告</h2>
            <p class="surface-subtitle">生成时间：{{ formatDateTime(normalizedSelectedReport.generatedAt) }} | 数据范围：近 60 日 K线 + 实时行情</p>
          </div>
          <el-tag :class="normalizedSelectedReport.score >= 75 ? 'tag-red' : 'tag-blue'" effect="plain">综合评分 {{ normalizedSelectedReport.score }}</el-tag>
        </div>
        <div class="surface-body report-detail">
          <el-alert
            v-if="normalizedSelectedReport.status === 'FAILED' && normalizedSelectedReport.errorMessage"
            :title="normalizedSelectedReport.errorMessage"
            type="error"
            show-icon
            :closable="false"
          />
          <div class="lineage-grid">
            <div class="lineage-card">
              <span>样本 ID</span>
              <strong>{{ normalizedSelectedReport.sampleId || '-' }}</strong>
              <em>用于固化本次分析快照</em>
            </div>
            <div class="lineage-card">
              <span>预测 ID</span>
              <strong>{{ normalizedSelectedReport.predictionId || '-' }}</strong>
              <em>学习系统对应的预测记录</em>
            </div>
            <div class="lineage-card">
              <span>策略版本</span>
              <strong>{{ normalizedSelectedReport.strategyVersionId || '-' }}</strong>
              <em>当前分析绑定的策略版本</em>
            </div>
            <div class="lineage-card">
              <span>数据质量 / 置信度</span>
              <strong>{{ formatLineagePercent(normalizedSelectedReport.dataQualityScore) }} / {{ formatLineagePercent(normalizedSelectedReport.calibratedConfidence) }}</strong>
              <em>会参与投研日报推荐排序</em>
            </div>
          </div>
          <ConditionalTradeStrategy
            v-if="normalizedSelectedReport.conditionalStrategyDisplay"
            :strategy="normalizedSelectedReport.conditionalStrategyDisplay"
            :reviews="normalizedSelectedReport.tradePlanReviews || []"
          />
          <AiReportBlock title="技术面分析" :content="normalizedSelectedReport.technicalAnalysisDisplay" />
          <AiReportBlock title="风险提示" :content="normalizedSelectedReport.riskWarningDisplay" tone="yellow" />
          <AiReportBlock title="建议买卖点" :content="normalizedSelectedReport.buySellPointsDisplay" tone="green" />
          <AiReportBlock title="Prompt 数据摘要" :content="normalizedSelectedReport.promptSummaryDisplay" />
          <div class="report-actions">
            <el-button :icon="Refresh" :loading="regenerating" @click="regenerateSelectedReport">重新生成</el-button>
          </div>
        </div>
      </section>
      <section v-else class="surface empty-report">
        <el-empty description="生成或选择一份报告后查看详情" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Cpu, Refresh } from '@element-plus/icons-vue'
import AiReportBlock from '../components/AiReportBlock.vue'
import ConditionalTradeStrategy from '../components/ConditionalTradeStrategy.vue'
import {
  analyzeStock,
  analyzeWatchlist,
  deleteAiReports,
  fetchAiReport,
  fetchAiReportPage,
  fetchAiReports,
  fetchCurrentWatchlistAnalysisJob,
  fetchWatchlistAnalysisJob,
} from '../services/ai'
import { fetchModelConfig, fetchPromptTemplates } from '../services/settings'
import { searchStocks } from '../services/stocks'
import { localizeStatusText, statusLabel } from '../utils/statusLabels'

const reportFilterOptions = [
  { label: '全部报告', value: 'ALL' },
  { label: '高风险', value: 'HIGH_RISK' },
  { label: '建议买入', value: 'BUY' },
  { label: '建议减仓', value: 'REDUCE' },
]
const dateShortcutOptions = [
  { label: '最新', value: 'LATEST' },
  { label: '今日', value: 'TODAY' },
  { label: '昨日', value: 'YESTERDAY' },
  { label: '前日', value: 'BEFORE_YESTERDAY' },
]
const filter = ref('ALL')
const dateShortcut = ref('LATEST')
const reportDate = ref('')
const latestAvailableDate = ref('')
const reportPage = ref(1)
const reportPageSize = ref(10)
const reportTotal = ref(0)
const reportTotalPages = ref(0)
const route = useRoute()
const loading = ref(false)
const detailLoading = ref(false)
const analyzing = ref(false)
const stockAnalyzing = ref(false)
const regenerating = ref(false)
const batchDeleting = ref(false)
const stockKeyword = ref('')
const selectedSuggestion = ref(null)
const selectedPromptTemplateId = ref(null)
const promptTemplates = ref([])
const promptTemplatesLoading = ref(false)
const currentModelName = ref('')
const aiReports = ref([])
const selectedIds = ref([])
const selected = ref(null)
const analysisProgress = reactive({
  visible: false,
  percent: 0,
  status: undefined,
  title: '',
  message: '',
  details: '',
})
let analysisProgressTimer = null
let watchlistJobPollTimer = null
let activeWatchlistJobId = null
let finalizedWatchlistJobId = null
let detailRequestToken = 0
const WATCHLIST_JOB_POLL_MS = 2000

const normalizedSelectedReport = computed(() => {
  if (!selected.value) {
    return null
  }
  return {
    ...selected.value,
    technicalAnalysisDisplay: normalizeReportField(selected.value.technicalAnalysis, 'technicalAnalysis'),
    riskWarningDisplay: normalizeReportField(selected.value.riskWarning, 'riskWarning'),
    buySellPointsDisplay: normalizeReportField(selected.value.buySellPoints, 'buySellPoints'),
    conditionalStrategyDisplay: normalizeConditionalStrategy(selected.value.conditionalStrategy),
    promptSummaryDisplay: normalizeReportField(selected.value.promptSummary, 'promptSummary'),
  }
})

async function loadReports({ preferredReportId = null } = {}) {
  loading.value = true
  try {
    const result = await fetchAiReportPage({
      page: reportPage.value,
      pageSize: reportPageSize.value,
      date: reportDate.value || undefined,
      filter: filter.value,
    })
    aiReports.value = result?.items || []
    reportTotal.value = Number(result?.total || 0)
    reportPage.value = Number(result?.page || 1)
    reportPageSize.value = Number(result?.pageSize || reportPageSize.value)
    reportTotalPages.value = Number(result?.totalPages || 0)
    if (result?.selectedDate) {
      reportDate.value = result.selectedDate
    }
    if (result?.latestAvailableDate) {
      latestAvailableDate.value = result.latestAvailableDate
    }
    const preferredId = Number(preferredReportId || 0)
    const currentId = Number(selected.value?.id || 0)
    const nextSelection = aiReports.value.find((item) => item.id === preferredId)
      || aiReports.value.find((item) => item.id === currentId)
      || aiReports.value[0]
      || null
    if (nextSelection) {
      await selectReport(nextSelection, { silent: true })
    } else {
      selected.value = null
    }
  } catch (error) {
    ElMessage.error(error.message || 'AI 报告获取失败')
  } finally {
    loading.value = false
  }
}

async function selectReport(report, { silent = false } = {}) {
  if (!report?.id) {
    selected.value = report || null
    return
  }
  const requestToken = ++detailRequestToken
  selected.value = report
  detailLoading.value = true
  try {
    const detail = await fetchAiReport(report.id)
    if (requestToken === detailRequestToken) {
      selected.value = detail || report
    }
  } catch (error) {
    if (!silent) {
      ElMessage.error(error.message || '报告详情加载失败')
    }
  } finally {
    if (requestToken === detailRequestToken) {
      detailLoading.value = false
    }
  }
}

async function handleReportFilterChange() {
  reportPage.value = 1
  selectedIds.value = []
  await loadReports()
}

async function handleDateShortcutChange(shortcut) {
  reportPage.value = 1
  selectedIds.value = []
  reportDate.value = shortcut === 'LATEST'
    ? ''
    : localDateKeyWithOffset(shortcut === 'TODAY' ? 0 : shortcut === 'YESTERDAY' ? -1 : -2)
  await loadReports()
}

async function handleReportDateChange(value) {
  reportDate.value = value || ''
  dateShortcut.value = value ? shortcutForDate(value) : 'LATEST'
  reportPage.value = 1
  selectedIds.value = []
  await loadReports()
}

async function handleReportPageChange(page) {
  reportPage.value = page
  selectedIds.value = []
  await loadReports()
}

function disableFutureDate(value) {
  return localDateKey(value) > localDateKey(new Date())
}

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDateKeyWithOffset(days) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function shortcutForDate(value) {
  if (value === localDateKeyWithOffset(0)) return 'TODAY'
  if (value === localDateKeyWithOffset(-1)) return 'YESTERDAY'
  if (value === localDateKeyWithOffset(-2)) return 'BEFORE_YESTERDAY'
  return 'CUSTOM'
}

async function syncRouteSelection() {
  const routeReportId = Number(route.query.reportId || 0)
  const routeCode = typeof route.query.code === 'string' ? route.query.code : ''
  const currentPageMatch = routeReportId
    ? aiReports.value.find((item) => item.id === routeReportId)
    : aiReports.value.find((item) => item.code === routeCode)
  if (currentPageMatch) {
    await selectReport(currentPageMatch)
    return
  }
  try {
    const target = routeReportId
      ? await fetchAiReport(routeReportId)
      : routeCode
        ? (await fetchAiReports(routeCode))[0]
        : null
    if (!target) {
      return
    }
    const targetDate = buildReportDateKey(target.generatedAt)
    if (targetDate && targetDate !== reportDate.value) {
      reportDate.value = targetDate
      dateShortcut.value = shortcutForDate(targetDate)
      reportPage.value = 1
      await loadReports({ preferredReportId: target.id })
      return
    }
    await selectReport(aiReports.value.find((item) => item.id === target.id) || target)
  } catch (error) {
    ElMessage.error(error.message || '关联报告加载失败')
  }
}

async function refreshReportsAfterAnalysis(report) {
  filter.value = 'ALL'
  reportDate.value = buildReportDateKey(report?.generatedAt) || localDateKey(new Date())
  dateShortcut.value = shortcutForDate(reportDate.value)
  reportPage.value = 1
  selectedIds.value = []
  await loadReports({ preferredReportId: report?.id })
}

function beginAnalysisProgress(title) {
  stopAnalysisProgressTimer()
  Object.assign(analysisProgress, {
    visible: true,
    percent: 8,
    status: undefined,
    title,
    message: '正在校验实时行情、最新K线和资讯新鲜度...',
    details: '',
  })
  analysisProgressTimer = window.setInterval(() => {
    if (!analysisProgress.visible || analysisProgress.percent >= 92) {
      return
    }
    analysisProgress.percent += analysisProgress.percent < 55 ? 7 : 3
    if (analysisProgress.percent >= 68) {
      analysisProgress.message = '模型已返回内容，正在解析结构化报告...'
    } else if (analysisProgress.percent >= 36) {
      analysisProgress.message = '实时数据校验通过，正在调用大模型生成技术面、风险和买卖点...'
    }
  }, 900)
}

function completeAnalysisProgress(message) {
  stopAnalysisProgressTimer()
  Object.assign(analysisProgress, {
    visible: true,
    percent: 100,
    status: 'success',
    message,
    details: '',
  })
  window.setTimeout(() => {
    if (analysisProgress.status === 'success') {
      analysisProgress.visible = false
    }
  }, 1200)
}

function failAnalysisProgress(message) {
  stopAnalysisProgressTimer()
  Object.assign(analysisProgress, {
    visible: true,
    percent: 100,
    status: 'exception',
    message,
    details: '',
  })
}

function stopAnalysisProgressTimer() {
  if (analysisProgressTimer) {
    window.clearInterval(analysisProgressTimer)
    analysisProgressTimer = null
  }
}

function logAnalysisError(stage, error, context = {}) {
  console.error(`[猫狗智投] ${stage}失败`, {
    context,
    message: error?.message,
    status: error?.status,
    payload: error?.payload,
    stack: error?.stack,
  })
}

function isFailedReport(report) {
  return report?.status === 'FAILED'
}

function reportFailureMessage(report, fallback) {
  return report?.errorMessage || fallback
}

async function loadPromptTemplates() {
  promptTemplatesLoading.value = true
  try {
    promptTemplates.value = await fetchPromptTemplates()
  } catch (error) {
    ElMessage.error(error.message || '提示词模板获取失败')
  } finally {
    promptTemplatesLoading.value = false
  }
}

async function loadCurrentModelConfig() {
  try {
    const config = await fetchModelConfig()
    currentModelName.value = config?.modelName || ''
  } catch (error) {
    currentModelName.value = ''
  }
}

function normalizeReportField(value, field) {
  if (value == null) {
    return '暂无内容'
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    return formatStructuredField(value, field)
  }
  const raw = String(value).trim()
  if (!raw) {
    return '暂无内容'
  }
  const parsed = parseJsonSafely(raw)
  if (!parsed) {
    return raw
  }
  return formatStructuredField(parsed, field)
}

function normalizeConditionalStrategy(value) {
  if (!value) {
    return null
  }
  if (isPlainObject(value)) {
    return value.schemaVersion ? value : null
  }
  const parsed = parseJsonSafely(String(value))
  return isPlainObject(parsed) && parsed.schemaVersion ? parsed : null
}

function formatStructuredField(payload, field) {
  if (field === 'technicalAnalysis') {
    return formatTechnicalAnalysis(payload)
  }
  if (field === 'riskWarning') {
    return formatRiskWarning(payload)
  }
  if (field === 'buySellPoints') {
    return formatBuySellPoints(payload)
  }
  if (field === 'promptSummary') {
    return formatPromptSummary(payload)
  }
  return payload
}

function formatTechnicalAnalysis(payload) {
  const source = unwrapFieldPayload(payload, 'technicalAnalysis')
  if (!isPlainObject(source)) {
    return payload
  }

  const sections = []
  const trend = source.trend || {}
  const ma = source.movingAverages || {}
  const pattern = source.klinePattern || {}
  const volume = source.volume || {}
  const supportResistance = source.supportResistance || {}

  const trendSentence = [
    source.trendAssessment ? `整体趋势上，${source.trendAssessment}` : '',
    trend.shortTerm ? `短线来看，${trend.shortTerm}` : '',
    trend.mediumTerm ? `中线方面，${trend.mediumTerm}` : '',
  ].filter(Boolean).join('；')
  if (trendSentence) {
    sections.push(trendSentence + '。')
  }

  const maParts = [
    ma.currentPrice ? `当前价格 ${ma.currentPrice}` : '',
    ma.ma5 ? `MA5 ${ma.ma5}` : '',
    ma.ma10 ? `MA10 ${ma.ma10}` : '',
    ma.ma20 ? `MA20 ${ma.ma20}` : '',
    ma.ma30 ? `MA30 ${ma.ma30}` : '',
    ma.ma60 ? `MA60 ${ma.ma60}` : '',
    ma.bias ? ma.bias : '',
  ].filter(Boolean)
  if (maParts.length) {
    sections.push(`均线结构上，${maParts.join('，')}。`)
  }

  const patternParts = [
    pattern.patternName ? `K线形态表现为${pattern.patternName}` : '',
    pattern.description || '',
  ].filter(Boolean)
  if (patternParts.length) {
    sections.push(`${patternParts.join('，')}。`)
  }

  const signalParts = [source.signal, source.description].filter(Boolean)
  if (signalParts.length) {
    sections.push(`信号判断：${signalParts.join('，')}。`)
  }

  const volumeParts = [
    volume.recentAction ? `量能表现为${volume.recentAction}` : '',
    volume.volumeRatio !== undefined && volume.volumeRatio !== null ? `量比 ${volume.volumeRatio}` : '',
    volume.comment || '',
    source.volumeAnalysis || '',
  ].filter(Boolean)
  if (volumeParts.length) {
    sections.push(`成交量方面，${volumeParts.join('，')}。`)
  }

  const supportParts = []
  if (supportResistance.support?.length) {
    supportParts.push(`支撑位参考 ${supportResistance.support.join(' / ')}`)
  }
  if (supportResistance.resistance?.length) {
    supportParts.push(`压力位参考 ${supportResistance.resistance.join(' / ')}`)
  }
  if (supportResistance.nearestSupport) {
    supportParts.push(`最近支撑位 ${supportResistance.nearestSupport}`)
  }
  if (supportResistance.nearestResistance) {
    supportParts.push(`最近压力位 ${supportResistance.nearestResistance}`)
  }
  if (supportParts.length) {
    sections.push(`${supportParts.join('，')}。`)
  }

  return sections.length ? sections.join('\n') : formatObjectAsReadableText(source)
}

function formatRiskWarning(payload) {
  const source = unwrapFieldPayload(payload, 'riskWarning')
  if (!isPlainObject(source)) {
    return payload
  }
  const lines = []
  if (source.headline) {
    lines.push(`核心风险：${source.headline}。`)
  }
  if (source.currentRisks?.length) {
    lines.push(...source.currentRisks.map((item) => `- ${item}`))
  }
  if (source.triggerConditions?.length) {
    lines.push(`风险触发条件：${source.triggerConditions.join('；')}。`)
  }
  if (source.observationPoints?.length) {
    lines.push(`后续观察重点：${source.observationPoints.join('；')}。`)
  }
  if (source.overallAdvice) {
    lines.push(`应对建议：${source.overallAdvice}。`)
  }
  return lines.length ? lines.join('\n') : formatObjectAsReadableText(source)
}

function formatBuySellPoints(payload) {
  const source = unwrapFieldPayload(payload, 'buySellPoints')
  if (!isPlainObject(source)) {
    return payload
  }
  const lines = []
  if (source.action) {
    lines.push(`当前建议：${statusLabel(source.action)}。`)
  }
  if (source.buyTriggers?.length) {
    lines.push(`关注买点：${source.buyTriggers.join('；')}。`)
  }
  if (source.reduceTriggers?.length) {
    lines.push(`减仓/卖出条件：${source.reduceTriggers.join('；')}。`)
  }
  if (source.stopLoss) {
    lines.push(`止损参考：${source.stopLoss}。`)
  }
  if (source.invalidationCondition) {
    lines.push(`失效条件：${source.invalidationCondition}。`)
  }
  if (source.positionSuggestion) {
    lines.push(`仓位建议：${source.positionSuggestion}。`)
  }
  return lines.length ? lines.join('\n') : formatObjectAsReadableText(source)
}

function formatPromptSummary(payload) {
  const source = unwrapFieldPayload(payload, 'promptSummary')
  if (!isPlainObject(source)) {
    return payload
  }
  const lines = [
    source.marketSnapshot ? `行情摘要：${source.marketSnapshot}。` : '',
    source.valuationSnapshot ? `估值摘要：${source.valuationSnapshot}。` : '',
    source.growthSnapshot ? `成长摘要：${source.growthSnapshot}。` : '',
    source.klineSummary ? `K线摘要：${source.klineSummary}。` : '',
    source.volumeSummary ? `量能摘要：${source.volumeSummary}。` : '',
  ].filter(Boolean)
  return lines.length ? lines.join('\n') : formatObjectAsReadableText(source)
}

function unwrapFieldPayload(payload, field) {
  if (!isPlainObject(payload)) {
    return payload
  }
  if (payload[field]) {
    return payload[field]
  }
  return payload
}

function formatObjectAsReadableText(source) {
  return Object.entries(source)
    .map(([key, value]) => `${formatReadableKey(key)}：${formatReadableValue(value)}`)
    .filter(Boolean)
    .join('；')
}

function formatReadableValue(value) {
  if (value == null) {
    return ''
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatReadableValue(item)).filter(Boolean).join(' / ')
  }
  if (isPlainObject(value)) {
    return Object.entries(value)
      .map(([key, item]) => `${formatReadableKey(key)}${formatReadableValue(item) ? ` ${formatReadableValue(item)}` : ''}`)
      .filter(Boolean)
      .join('，')
  }
  return String(value).trim()
}

function formatReadableKey(key) {
  return key
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
}

function parseJsonSafely(raw) {
  const normalized = stripCodeFence(raw)
  if (!/^(\{|\[)/.test(normalized)) {
    return null
  }
  try {
    return JSON.parse(normalized)
  } catch {
    return null
  }
}

function stripCodeFence(raw) {
  const fencedMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fencedMatch ? fencedMatch[1].trim() : raw.trim()
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function formatDateTime(value) {
  if (!value) {
    return '--'
  }
  const normalized = String(value).trim().replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function formatLineagePercent(value) {
  const number = Number(value || 0)
  if (Number.isNaN(number)) {
    return '--'
  }
  return `${(number > 1 ? number : number * 100).toFixed(1)}%`
}

async function queryStockSuggestions(query, callback) {
  const keyword = query.trim()
  if (!keyword) {
    callback([])
    return
  }
  try {
    const results = await searchStocks(keyword, 10)
    callback(results.map((item) => ({
      ...item,
      label: `${item.name} ${item.code}`,
    })))
  } catch (error) {
    callback([])
  }
}

function selectStockSuggestion(item) {
  selectedSuggestion.value = item
  stockKeyword.value = `${item.name} ${item.code}`
}

function clearStockSuggestion() {
  selectedSuggestion.value = null
}

function extractStockCode(value) {
  const match = value.trim().match(/\d{6}/)
  return match ? match[0] : ''
}

function buildReportDateKey(value) {
  if (!value) {
    return ''
  }
  const normalized = String(value).trim().replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function findExistingCoverableReport(reports, code, modelName) {
  if (!code || !modelName) {
    return null
  }
  const today = todayDateKey()
  return reports.find((item) => item.code === code && item.sourceModel === modelName && buildReportDateKey(item.generatedAt) === today) || null
}

function toggleReportSelection(id, checked) {
  if (checked) {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value = [...selectedIds.value, id]
    }
    return
  }
  selectedIds.value = selectedIds.value.filter((item) => item !== id)
}

async function deleteSelectedReports() {
  const ids = selectedIds.value.slice()
  if (!ids.length) {
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${ids.length} 份报告？`, '批量删除报告', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  batchDeleting.value = true
  try {
    await deleteAiReports(ids)
    const deletedIdSet = new Set(ids)
    if (selected.value && deletedIdSet.has(selected.value.id)) {
      selected.value = null
    }
    selectedIds.value = []
    await loadReports()
    ElMessage.success(`已删除 ${ids.length} 份报告`)
  } catch (error) {
    ElMessage.error(error.message || '批量删除报告失败')
  } finally {
    batchDeleting.value = false
  }
}

async function runSingleStockAnalysis() {
  const code = selectedSuggestion.value?.code || extractStockCode(stockKeyword.value)
  if (!code) {
    ElMessage.warning('请输入或选择有效的 6 位股票代码')
    return
  }

  const modelName = currentModelName.value
  let targetReportId = null
  try {
    const latestReports = await fetchAiReports(code)
    const existingReport = findExistingCoverableReport(latestReports, code, modelName)
    if (existingReport) {
      await ElMessageBox.confirm(
        `${existingReport.stock || code} 今天已经有一份来源为 ${modelName} 的报告，生成后会直接覆盖 ${formatDateTime(existingReport.generatedAt)} 的这份报告。是否继续？`,
        '将覆盖当日报告',
        {
          type: 'warning',
          confirmButtonText: '继续覆盖',
          cancelButtonText: '取消',
        },
      )
      targetReportId = existingReport.id
    }
  } catch (error) {
    if (error === 'cancel' || error === 'close' || error?.message === 'cancel') {
      return
    }
    ElMessage.error(error.message || '分析前检查历史报告失败')
    return
  }

  stockAnalyzing.value = true
  beginAnalysisProgress(`正在分析 ${code}`)
  try {
    const report = await analyzeStock(code, true, selectedPromptTemplateId.value, targetReportId)
    selectedSuggestion.value = null
    await refreshReportsAfterAnalysis(report)
    if (isFailedReport(report)) {
      const message = reportFailureMessage(report, `${report.stock || code} 的 AI 分析失败，已刷新失败报告`)
      logAnalysisError('个股分析返回失败报告', new Error(message), { code, reportId: report.id, promptTemplateId: selectedPromptTemplateId.value, targetReportId })
      failAnalysisProgress(message)
      ElMessage.error(message)
      return
    }
    completeAnalysisProgress(`已完成 ${report.stock || code} 的 AI 分析，并刷新报告列表`)
    ElMessage.success(targetReportId ? `已覆盖并更新 ${report.stock || code} 的 AI 报告` : `已完成 ${report.stock || code} 的 AI 分析`)
  } catch (error) {
    logAnalysisError('个股分析', error, { code, promptTemplateId: selectedPromptTemplateId.value, targetReportId })
    failAnalysisProgress(error.message || '个股分析失败，请查看浏览器控制台和后端日志')
    ElMessage.error(error.message || '个股分析失败')
  } finally {
    stockAnalyzing.value = false
  }
}

async function runWatchlistAnalysis() {
  if (analyzing.value) {
    return
  }
  analyzing.value = true
  stopAnalysisProgressTimer()
  Object.assign(analysisProgress, {
    visible: true,
    percent: 1,
    status: undefined,
    title: '正在提交自选股后台分析任务',
    message: '任务提交后可离开本页，返回时会自动恢复真实进度',
    details: '',
  })
  try {
    const job = await analyzeWatchlist(selectedPromptTemplateId.value)
    if (!job?.id) {
      throw new Error('后台未返回任务 ID，本次分析未启动')
    }
    activeWatchlistJobId = job.id
    finalizedWatchlistJobId = null
    applyWatchlistJobProgress(job)
    if (isWatchlistJobTerminal(job)) {
      await finalizeWatchlistJob(job)
      return
    }
    scheduleWatchlistJobPoll(job.id)
  } catch (error) {
    logAnalysisError('自选股分析', error, { promptTemplateId: selectedPromptTemplateId.value })
    clearWatchlistJobPollTimer()
    activeWatchlistJobId = null
    analyzing.value = false
    failAnalysisProgress(error.message || '自选股分析失败，请查看浏览器控制台和后端日志')
    ElMessage.error(error.message || '触发分析失败')
  }
}

function isWatchlistJobTerminal(job) {
  return job?.terminal === true || ['SUCCESS', 'PARTIAL', 'FAILED'].includes(job?.status)
}

function applyWatchlistJobProgress(job) {
  const total = Number(job?.totalCount || 0)
  const completed = Number(job?.completedCount || 0)
  const analyzedCount = Number(job?.analyzedCount || 0)
  const skippedCount = Number(job?.skippedCount || 0)
  const failedCount = Number(job?.failedCount || 0)
  const terminal = isWatchlistJobTerminal(job)
  const currentStock = [job?.currentStockName, job?.currentStockCode].filter(Boolean).join(' ')
  let message = job?.message || `已处理 ${completed}/${total} 只`
  if (!terminal && currentStock) {
    message = `${message}；当前：${currentStock}`
  }
  if (terminal) {
    message = `${message}（成功 ${analyzedCount}，跳过 ${skippedCount}，失败 ${failedCount}）`
  }
  Object.assign(analysisProgress, {
    visible: true,
    percent: Math.max(0, Math.min(100, Number(job?.progressPercent || 0))),
    status: job?.status === 'SUCCESS' ? 'success' : job?.status === 'FAILED' ? 'exception' : job?.status === 'PARTIAL' ? 'warning' : undefined,
    title: terminal ? '自选股后台分析已结束' : '正在后台分析自选股',
    message,
    details: job?.issueDetails || job?.lastError || '',
  })
  analyzing.value = !terminal
}

function scheduleWatchlistJobPoll(jobId, delay = WATCHLIST_JOB_POLL_MS) {
  clearWatchlistJobPollTimer()
  watchlistJobPollTimer = window.setTimeout(() => {
    pollWatchlistJob(jobId)
  }, delay)
}

async function pollWatchlistJob(jobId) {
  if (!jobId || activeWatchlistJobId !== jobId) {
    return
  }
  try {
    const job = await fetchWatchlistAnalysisJob(jobId)
    applyWatchlistJobProgress(job)
    if (isWatchlistJobTerminal(job)) {
      await finalizeWatchlistJob(job)
      return
    }
    scheduleWatchlistJobPoll(jobId)
  } catch (error) {
    logAnalysisError('查询自选股分析进度', error, { jobId })
    analysisProgress.message = `进度查询暂时失败：${error.message || '网络异常'}；后台任务不受影响，正在重试`
    scheduleWatchlistJobPoll(jobId, 5000)
  }
}

async function finalizeWatchlistJob(job) {
  if (!job?.id || finalizedWatchlistJobId === job.id) {
    return
  }
  finalizedWatchlistJobId = job.id
  activeWatchlistJobId = null
  clearWatchlistJobPollTimer()
  analyzing.value = false
  applyWatchlistJobProgress(job)
  filter.value = 'ALL'
  reportDate.value = ''
  dateShortcut.value = 'LATEST'
  reportPage.value = 1
  selectedIds.value = []
  await loadReports()
  const successCount = Number(job?.analyzedCount || 0)
  const skippedCount = Number(job?.skippedCount || 0)
  const failedCount = Number(job?.failedCount || 0)
  if (job.status === 'SUCCESS') {
    ElMessage.success(`自选股分析完成，成功生成 ${successCount} 份报告`)
    return
  }
  const summary = `成功 ${successCount} 只，跳过 ${skippedCount} 只，失败 ${failedCount} 只`
  if (job.status === 'PARTIAL') {
    ElMessage.warning(`自选股分析部分完成：${summary}`)
    return
  }
  ElMessage.error(job?.lastError || `自选股分析失败：${summary}`)
}

async function restoreWatchlistAnalysisJob() {
  try {
    const job = await fetchCurrentWatchlistAnalysisJob()
    if (!job?.id || isWatchlistJobTerminal(job)) {
      return
    }
    activeWatchlistJobId = job.id
    finalizedWatchlistJobId = null
    applyWatchlistJobProgress(job)
    scheduleWatchlistJobPoll(job.id)
  } catch (error) {
    logAnalysisError('恢复自选股分析任务', error)
  }
}

function clearWatchlistJobPollTimer() {
  if (watchlistJobPollTimer) {
    window.clearTimeout(watchlistJobPollTimer)
    watchlistJobPollTimer = null
  }
}

async function regenerateSelectedReport() {
  const currentReport = normalizedSelectedReport.value
  const code = currentReport?.code
  if (!code || !currentReport?.id) {
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认重新生成 ${currentReport.stock || code} 的报告并覆盖当前内容吗？`,
      '覆盖当前报告',
      {
        type: 'warning',
        confirmButtonText: '确认覆盖',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }
  regenerating.value = true
  beginAnalysisProgress(`正在重新生成 ${code}`)
  try {
    const report = await analyzeStock(code, true, selectedPromptTemplateId.value, currentReport.id)
    await refreshReportsAfterAnalysis(report)
    if (isFailedReport(report)) {
      const message = reportFailureMessage(report, `${report.stock || code} 的 AI 分析失败，已刷新失败报告`)
      logAnalysisError('重新生成返回失败报告', new Error(message), { code, reportId: report.id, promptTemplateId: selectedPromptTemplateId.value })
      failAnalysisProgress(message)
      ElMessage.error(message)
      return
    }
    completeAnalysisProgress(`已重新生成并覆盖 ${report.stock || code} 的 AI 报告`)
    ElMessage.success(`已重新生成并覆盖 ${report.stock || code} 的 AI 报告`)
  } catch (error) {
    logAnalysisError('重新生成报告', error, { code, promptTemplateId: selectedPromptTemplateId.value, targetReportId: currentReport.id })
    failAnalysisProgress(error.message || '重新生成失败，请查看浏览器控制台和后端日志')
    ElMessage.error(error.message || '重新生成失败')
  } finally {
    regenerating.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadReports(),
    loadPromptTemplates(),
    loadCurrentModelConfig(),
  ])
  await syncRouteSelection()
  await restoreWatchlistAnalysisJob()
})

watch(
  () => [route.query.reportId, route.query.code],
  async () => {
    if (!aiReports.value.length) {
      return
    }
    await syncRouteSelection()
  },
)

onUnmounted(() => {
  stopAnalysisProgressTimer()
  clearWatchlistJobPollTimer()
  activeWatchlistJobId = null
})
</script>

<style scoped>
.reports-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.reports-toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 1;
  min-width: min(100%, 720px);
}

.analysis-progress {
  border-top: 1px solid #e5e7eb;
  padding: 14px 30px 18px;
}

.analysis-progress-details {
  margin-top: 10px;
  color: #475569;
  font-size: 13px;
}

.analysis-progress-details summary {
  width: fit-content;
  cursor: pointer;
  color: #2563eb;
}

.analysis-progress-details pre {
  max-height: 180px;
  margin: 8px 0 0;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
  font-family: inherit;
}

.analysis-progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
  color: #111827;
}

.analysis-progress-meta strong {
  font-size: 14px;
  line-height: 22px;
}

.analysis-progress-meta span {
  color: #6b7280;
  font-size: 13px;
  line-height: 20px;
  text-align: right;
}

.report-query-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 30px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}

.report-date-controls,
.report-query-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.report-query-label {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.report-date-picker {
  width: 168px;
}

.report-query-summary {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.report-query-summary strong {
  color: #0f172a;
  font-size: 14px;
}

.reports-stock-search {
  min-width: 300px;
  flex: 1 1 420px;
}

.prompt-template-select {
  width: 240px;
  flex: 0 0 240px;
}

.stock-suggestion {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stock-suggestion strong {
  font-size: 14px;
  line-height: 20px;
}

.stock-suggestion span {
  color: #6b7280;
  font-size: 12px;
  line-height: 18px;
}

.reports-layout {
  grid-template-columns: 440px minmax(0, 1fr);
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-list-shell {
  display: flex;
  flex-direction: column;
  min-height: 520px;
}

.report-list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  color: #64748b;
  font-size: 12px;
}

.report-item {
  display: grid;
  grid-template-areas:
    "main score"
    "main meta";
  grid-template-columns: minmax(0, 1fr) minmax(148px, 180px);
  grid-template-rows: auto auto;
  align-items: start;
  column-gap: 16px;
  row-gap: 8px;
  min-height: 92px;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 18px;
  text-align: left;
  cursor: pointer;
}

.report-item-main {
  grid-area: main;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.report-item-content {
  flex: 1;
  min-width: 0;
}

.report-item.active {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.report-item strong,
.report-item em {
  display: block;
  font-style: normal;
}

.report-item strong {
  font-size: 16px;
}

.report-item em {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.report-score {
  grid-area: score;
  font-size: 24px;
  font-weight: 800;
  text-align: right;
}

.report-meta {
  grid-area: meta;
  justify-self: end;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
  max-width: 100%;
  gap: 4px;
  color: #9ca3af;
  line-height: 1.2;
  text-align: right;
  overflow-wrap: anywhere;
}

.report-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lineage-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.lineage-card {
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.lineage-card span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.lineage-card strong {
  display: block;
  margin-top: 6px;
  color: #111827;
  font-size: 16px;
}

.lineage-card em {
  display: block;
  margin-top: 6px;
  color: #6b7280;
  font-style: normal;
  line-height: 1.5;
}

.report-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.empty-report {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1100px) {
  .reports-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .reports-toolbar-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .reports-stock-search,
  .prompt-template-select {
    flex: 1 1 100%;
    width: 100%;
  }

  .lineage-grid {
    grid-template-columns: 1fr;
  }

  .report-query-bar,
  .report-date-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .report-query-summary {
    justify-content: space-between;
    width: 100%;
  }

  .report-date-picker {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .report-query-summary,
  .report-list-footer {
    flex-wrap: wrap;
  }

  .report-list-shell {
    min-height: 0;
  }

  .report-item {
    grid-template-areas:
      "main score"
      "meta meta";
    grid-template-columns: minmax(0, 1fr) 44px;
    min-height: 104px;
    padding: 14px;
  }

  .report-meta {
    margin-top: 2px;
  }
}
</style>
