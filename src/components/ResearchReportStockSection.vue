<template>
  <section class="report-section">
    <div class="section-head">
      <h3>{{ title }}</h3>
      <span>{{ items.length }} 只</span>
    </div>

    <div v-if="items.length" class="stock-card-grid">
      <article
        v-for="item in items"
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
          <div>
            <span>系统评分</span>
            <strong>系统分 {{ formatOptionalScore(item.systemScore) }}</strong>
          </div>
          <div>
            <span>AI 决策</span>
            <strong>AI {{ statusLabel(item.aiDecision, '未结构化') }} · {{ formatPercent(item.aiConfidence) }}</strong>
          </div>
          <div>
            <span>风险等级</span>
            <strong>{{ statusLabel(item.riskLevel, '待确认') }} · {{ formatOptionalScore(item.riskScore) }}</strong>
          </div>
          <div>
            <span>历史验证</span>
            <strong>{{ formatPercent(item.historicalHitRate) }} · {{ item.historicalSampleCount || 0 }} 样本</strong>
          </div>
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

        <p class="stock-reason">{{ localizeStatusText(item.reasonSummary, '暂无说明') }}</p>
        <div class="stock-actions">
          <el-button text type="primary" @click="emit('open', item)">查看分析报告</el-button>
          <el-button v-if="item.sampleId" text @click="emit('open-sample', item)">查看研究样本</el-button>
        </div>
      </article>
    </div>
    <el-empty v-else description="暂无数据" />
  </section>
</template>

<script setup>
import { ElButton, ElEmpty } from 'element-plus'
import { localizeStatusText, statusLabel } from '../utils/statusLabels'

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  tone: { type: String, default: 'watch' },
  stockNameMap: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['open', 'open-sample'])

function displayStockName(item) {
  const code = String(item?.stockCode || '').trim()
  const storedName = String(item?.stockName || '').trim()
  if (isUsableStockName(storedName, code)) return storedName
  const currentName = String(props.stockNameMap?.[code] || '').trim()
  return isUsableStockName(currentName, code) ? currentName : code
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

.decision-evidence-grid span,
.decision-evidence-grid strong {
  display: block;
  overflow-wrap: anywhere;
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
    border-bottom: 0;
  }
}
</style>
