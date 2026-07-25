<template>
  <section class="report-section">
    <div class="section-head">
      <h3>{{ title }}</h3>
      <span>{{ resolvedTotal }} 只</span>
    </div>

    <div v-loading="loading" v-if="visibleItems.length" class="stock-card-grid">
      <article
        v-for="item in visibleItems"
        :key="`${title}-${item.stockCode}`"
        class="stock-card"
        :class="tone"
      >
        <div class="stock-head">
          <div>
            <strong>{{ displayStockName(item) }}</strong>
            <span>{{ item.stockCode }}</span>
          </div>
          <b>{{ formatScore(item.compositeScore) }}</b>
        </div>

        <div class="decision-evidence-grid">
          <div class="official-action">
            <span>最终动作</span>
            <strong>{{ statusLabel(item.action, '观察') }} · {{ statusLabel(item.actionBucket, '待确认') }}</strong>
          </div>
          <div>
            <span>系统评分</span>
            <strong>系统分 {{ formatOptionalScore(item.systemScore) }}</strong>
          </div>
          <div>
            <span>AI 报告观点</span>
            <strong>AI {{ statusLabel(item.aiDecision, '未结构化') }} · {{ formatPercent(item.aiConfidence) }}</strong>
          </div>
          <div>
            <span>风险等级</span>
            <strong>{{ statusLabel(item.riskLevel, '待确认') }} · {{ formatOptionalScore(item.riskScore) }}</strong>
          </div>
          <div>
            <span>历史验证</span>
            <strong>{{ statusLabel(item.evidenceScope, '证据范围未记录') }} · {{ formatPercent(item.historicalHitRate) }} · {{ item.historicalSampleCount || 0 }} 样本</strong>
            <em v-if="item.historicalHitRateLower !== null && item.historicalHitRateLower !== undefined">
              95% 区间 {{ formatPercent(item.historicalHitRateLower) }} - {{ formatPercent(item.historicalHitRateUpper) }}
            </em>
          </div>
        </div>

        <div class="decision-arbitration">
          <strong>正式裁决</strong>
          <span>{{ localizeStatusText(item.decisionSource, '规则决策') }} · {{ item.decisionPolicyVersion || '策略版本未记录' }}</span>
          <em>数据质量 {{ formatOptionalScore(item.dataQualityScore) }} · {{ item.confidenceLevel === 'LOW_SAMPLE' ? '低样本，结论已保守降级' : '样本外证据已参与评分' }}</em>
        </div>

        <div class="freshness-row" :class="statusClass(item.freshnessStatus)">
          <strong>{{ statusLabel(item.freshnessStatus, '数据不可用') }}</strong>
          <span>{{ localizeStatusText(item.freshnessMessage, '暂无数据新鲜度说明') }}</span>
        </div>

        <div v-if="item.triggerFactors?.length" class="factor-evidence-list">
          <span
            v-for="factor in item.triggerFactors"
            :key="factor.factorCode"
            :title="factor.evidence || factor.factorCode"
          >
            {{ factor.factorName || factor.factorCode }} {{ formatOptionalScore(factor.contribution) }}
          </span>
        </div>

        <section v-if="item.positionPlan" class="position-plan">
          <div class="position-plan-head">
            <strong>持仓条件计划</strong>
            <span>成本 {{ formatPrice(item.positionPlan.averageCost) }} · 现价 {{ formatPrice(item.positionPlan.currentPrice) }} · 浮盈 {{ formatPercent(item.positionPlan.profitRate) }}</span>
          </div>
          <ul>
            <li v-if="item.positionPlan.protectionCondition"><b>保护位：</b>{{ item.positionPlan.protectionCondition }}</li>
            <li v-if="item.positionPlan.reduceCondition"><b>减仓：</b>{{ item.positionPlan.reduceCondition }}</li>
            <li v-if="item.positionPlan.takeProfitCondition"><b>止盈：</b>{{ item.positionPlan.takeProfitCondition }}</li>
            <li v-if="item.positionPlan.invalidationCondition"><b>失效：</b>{{ item.positionPlan.invalidationCondition }}</li>
          </ul>
          <p v-if="item.positionPlan.riskAdvice">{{ item.positionPlan.riskAdvice }}</p>
        </section>

        <section v-if="item.decisionPlans?.length" class="decision-plan">
          <div class="decision-plan-head">
            <strong>正式条件复盘计划</strong>
            <span>{{ statusLabel(item.decisionPlans[0].planSource, '规则条件计划') }}</span>
          </div>
          <div class="decision-plan-list">
            <div v-for="plan in item.decisionPlans" :key="`${item.stockCode}-${plan.horizonDays}`" class="decision-plan-row">
              <b>T+{{ plan.horizonDays }}</b>
              <span>{{ statusLabel(plan.officialAction, '观察') }}</span>
              <span>{{ statusLabel(plan.status, '待处理') }}</span>
              <span v-if="plan.netActionReturn !== null && plan.netActionReturn !== undefined">净收益 {{ formatPercent(plan.netActionReturn) }}</span>
              <span v-else>目标 {{ plan.targetTradeDate || '-' }}</span>
            </div>
          </div>
          <p v-if="item.decisionPlans[0].message">{{ localizeStatusText(item.decisionPlans[0].message) }}</p>
        </section>
        <section v-else-if="item.reportId" class="decision-plan report-plan-link">
          <div class="decision-plan-head">
            <strong>正式条件复盘计划</strong>
            <span>AI 报告已关联</span>
          </div>
          <p>该正式结论采用已关联 AI 报告的 T+1、T+2、T+3 条件计划复盘。</p>
        </section>

        <p class="stock-reason">{{ localizeStatusText(item.reasonSummary, '暂无说明') }}</p>
        <div class="stock-actions">
          <el-button text type="primary" @click="emit('open', item)">查看分析报告</el-button>
          <el-button v-if="item.sampleId" text @click="emit('open-sample', item)">查看研究样本</el-button>
        </div>
        <div class="feedback-actions">
          <span>本条结论</span>
          <el-button
            text
            size="small"
            :loading="feedbackLoadingStock === item.stockCode"
            :type="feedbackType(item) === 'HELPFUL' ? 'success' : 'default'"
            @click="emit('feedback', { item, feedbackType: 'HELPFUL' })"
          >有帮助</el-button>
          <el-button
            text
            size="small"
            :loading="feedbackLoadingStock === item.stockCode"
            :type="feedbackType(item) === 'NOT_HELPFUL' ? 'danger' : 'default'"
            @click="emit('feedback', { item, feedbackType: 'NOT_HELPFUL' })"
          >需改进</el-button>
          <el-button
            text
            size="small"
            :loading="feedbackLoadingStock === item.stockCode"
            :type="feedbackType(item) === 'UNCLEAR' ? 'warning' : 'default'"
            @click="emit('feedback', { item, feedbackType: 'UNCLEAR' })"
          >理由不清楚</el-button>
        </div>
      </article>
    </div>
    <el-pagination
      v-if="paginated && resolvedTotal > pageSize"
      v-model:current-page="currentPage"
      class="stock-pagination"
      small
      background
      layout="prev, pager, next"
      :page-size="pageSize"
      :total="resolvedTotal"
    />
    <el-empty v-else-if="!loading" description="暂无数据" />
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElButton, ElEmpty } from 'element-plus'
import { localizeStatusText, statusLabel } from '../utils/statusLabels'

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  tone: { type: String, default: 'watch' },
  paginated: { type: Boolean, default: false },
  pageSize: { type: Number, default: 6 },
  total: { type: Number, default: null },
  serverPaginated: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  loading: { type: Boolean, default: false },
  feedbackByStock: { type: Object, default: () => ({}) },
  feedbackLoadingStock: { type: String, default: '' },
})

const emit = defineEmits(['open', 'open-sample', 'page-change', 'feedback'])
const currentPage = ref(props.serverPaginated ? props.page : 1)
const resolvedTotal = computed(() => props.total === null ? props.items.length : props.total)
const visibleItems = computed(() => {
  if (props.serverPaginated) return props.items
  if (!props.paginated) return props.items
  const size = Math.max(1, props.pageSize)
  const start = (currentPage.value - 1) * size
  return props.items.slice(start, start + size)
})

watch(() => props.items, () => {
  if (!props.serverPaginated) currentPage.value = 1
}, { deep: false })

watch(() => props.page, (page) => {
  if (props.serverPaginated) currentPage.value = page
})

watch(currentPage, (page) => {
  if (props.serverPaginated && page !== props.page) emit('page-change', page)
})

function displayStockName(item) {
  const code = String(item?.stockCode || '').trim()
  const storedName = String(item?.stockName || '').trim()
  if (isUsableStockName(storedName, code)) return storedName
  return code
}

function isUsableStockName(name, code) {
  if (!name || name === code || name === '未知股票') return false
  return !/^\d{6}(?:\.(?:SH|SZ|BJ))?$/i.test(name)
}

function formatScore(value) {
  return Number(value || 0).toFixed(1)
}

function formatOptionalScore(value) {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value).toFixed(1)
}

function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '-'
  return `${Number(value).toFixed(1)}%`
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value).toFixed(2)
}

function statusClass(value) {
  const status = String(value || '').toUpperCase()
  if (status.includes('SUCCESS') || status.includes('READY') || status.includes('REALTIME') || status.includes('FRESH')) {
    return 'ok'
  }
  if (status.includes('FAILED') || status.includes('UNAVAILABLE')) {
    return 'danger'
  }
  return 'warn'
}

function feedbackType(item) {
  return props.feedbackByStock?.[item?.stockCode]?.feedbackType || ''
}
</script>

<style scoped>
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

.stock-head > div {
  min-width: 0;
}

.stock-head strong,
.stock-head span {
  display: block;
  overflow-wrap: anywhere;
}

.stock-head strong {
  color: #111827;
}

.stock-head span {
  color: #64748b;
  font-size: 12px;
}

.stock-head b {
  flex: 0 0 auto;
  color: #b45309;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.decision-evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;
}

.decision-evidence-grid > div {
  min-width: 0;
  padding: 10px 12px;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.decision-evidence-grid > div:nth-child(2n) { border-right: 0; }
.decision-evidence-grid > div:nth-last-child(-n + 2) { border-bottom: 0; }

.decision-evidence-grid > div:last-child:nth-child(odd) {
  grid-column: span 2;
  border-right: 0;
}

.official-action strong {
  color: #9f1239;
}

.decision-evidence-grid span,
.decision-evidence-grid strong {
  display: block;
  overflow-wrap: anywhere;
}

.decision-evidence-grid em {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  font-style: normal;
  line-height: 16px;
}

.decision-evidence-grid span {
  color: #64748b;
  font-size: 11px;
  line-height: 16px;
}

.decision-evidence-grid strong {
  margin-top: 4px;
  color: #1f2937;
  font-size: 13px;
  line-height: 19px;
}

.freshness-row {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  margin-top: 10px;
  padding-left: 10px;
  border-left: 3px solid currentColor;
  font-size: 12px;
  line-height: 18px;
}

.decision-arbitration {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 3px 10px;
  align-items: baseline;
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 6px;
  background: #f8fafc;
}

.decision-arbitration strong { color: #334155; font-size: 12px; }
.decision-arbitration span,
.decision-arbitration em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.decision-arbitration em { grid-column: 1 / -1; }

.freshness-row span {
  color: #64748b;
  overflow-wrap: anywhere;
}

.factor-evidence-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 12px;
}

.factor-evidence-list span {
  padding-left: 8px;
  border-left: 2px solid #93c5fd;
  color: #334155;
  font-size: 12px;
  line-height: 18px;
}

.position-plan {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #fed7aa;
  border-radius: 6px;
  background: #fff7ed;
}

.position-plan-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
}

.position-plan-head strong {
  color: #9a3412;
  font-size: 13px;
}

.position-plan-head span,
.position-plan li,
.position-plan p {
  color: #7c2d12;
  font-size: 12px;
  line-height: 18px;
}

.position-plan ul {
  display: grid;
  gap: 5px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.position-plan p {
  margin: 10px 0 0;
}

.decision-plan {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
}

.decision-plan-head,
.decision-plan-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 10px;
}

.decision-plan-head strong { color: #1d4ed8; font-size: 13px; }
.decision-plan-head span,
.decision-plan p { color: #1e40af; font-size: 12px; line-height: 18px; }

.decision-plan-list {
  display: grid;
  gap: 5px;
  margin-top: 9px;
}

.decision-plan-row {
  justify-content: flex-start;
  color: #1e3a8a;
  font-size: 12px;
  line-height: 18px;
}

.decision-plan-row b { min-width: 28px; }
.decision-plan p { margin: 9px 0 0; }
.report-plan-link { border-style: dashed; background: #f8fafc; }
.report-plan-link .decision-plan-head strong { color: #475569; }
.report-plan-link .decision-plan-head span,
.report-plan-link p { color: #64748b; }

.stock-reason {
  min-height: 42px;
  margin: 10px 0 6px;
  color: #334155;
  line-height: 1.6;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.stock-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.stock-actions :deep(.el-button) {
  margin: 0;
}

.feedback-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}

.feedback-actions > span {
  color: #64748b;
  font-size: 12px;
}

.feedback-actions :deep(.el-button) {
  margin: 0;
}

.stock-pagination {
  justify-content: center;
  margin-top: 16px;
}

.ok { color: #15803d; }
.warn { color: #b45309; }
.danger { color: #dc2626; }

@media (max-width: 1180px) {
  .stock-card-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .decision-evidence-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .decision-evidence-grid > div,
  .decision-evidence-grid > div:nth-child(2n),
  .decision-evidence-grid > div:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .decision-evidence-grid > div:last-child {
    grid-column: auto;
    border-bottom: 0;
  }
}
</style>
