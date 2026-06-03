<template>
  <div class="page">
    <el-alert
      v-if="reviewData && !reviewData.schemaReady"
      :title="reviewData.message"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">复盘验证</h2>
          <p class="surface-subtitle">验证 AI 报告在 T+1 / T+2 / T+3 的方向、收益和回撤</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadReviews">刷新</el-button>
          <el-button type="primary" :icon="CircleCheck" :loading="verifying" @click="verifyReviews">执行复盘验证</el-button>
        </div>
      </div>
      <div class="surface-body">
        <div class="summary-grid">
          <div class="summary-card">
            <span>可复盘报告</span>
            <strong>{{ reviewData?.reportCount || 0 }}</strong>
          </div>
          <div class="summary-card">
            <span>已验证报告</span>
            <strong>{{ reviewData?.verifiedCount || 0 }}</strong>
          </div>
          <div class="summary-card">
            <span>待验证报告</span>
            <strong>{{ reviewData?.pendingCount || 0 }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header review-detail-header">
        <div>
          <h2 class="surface-title">验证明细</h2>
          <p class="surface-subtitle">用真实 K 线结果校验模型判断</p>
        </div>
        <div class="review-filters-shell">
          <div class="review-filters">
            <label class="review-filter-group">
              <span class="review-filter-label">个股</span>
              <el-select
                v-model="stockFilter"
                class="review-filter"
                filterable
                allow-create
                default-first-option
                clearable
                :reserve-keyword="false"
                placeholder="名称或代码"
              >
                <el-option
                  v-for="option in stockOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </label>
            <label class="review-filter-group">
              <span class="review-filter-label">周期</span>
              <el-select
                v-model="horizonFilter"
                class="review-filter review-filter-short"
                filterable
                allow-create
                default-first-option
                clearable
                :reserve-keyword="false"
                placeholder="T+1 / 1"
              >
                <el-option
                  v-for="option in horizonOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </label>
            <el-button
              v-if="hasActiveFilters"
              class="review-filter-reset"
              :icon="RefreshLeft"
              circle
              @click="resetFilters"
            />
          </div>
          <div class="review-filter-meta">
            <strong>{{ filteredItems.length }}</strong>
            <span>/ {{ reviewItems.length }} 条</span>
          </div>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="loading || verifying" :data="filteredItems" class="compact-table" height="580">
          <el-table-column prop="stockName" label="股票" min-width="150">
            <template #default="{ row }">
              <div class="review-stock-cell">
                <strong>{{ row.stockName }}</strong>
                <div class="muted mono">{{ row.stockCode }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="reportDate" label="报告日" min-width="120">
            <template #default="{ row }">
              <span class="review-date mono">{{ row.reportDate }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="horizonDays" label="周期" width="90">
            <template #default="{ row }">
              <span class="review-horizon-chip">T+{{ row.horizonDays }}</span>
            </template>
          </el-table-column>
          <el-table-column label="方向" min-width="160">
            <template #default="{ row }">
              <div class="review-direction">
                <el-tag class="review-direction-tag" effect="plain">{{ directionText(row.predictionDirection) }}</el-tag>
              <span class="direction-arrow">→</span>
                <el-tag class="review-direction-tag" :type="row.directionCorrect ? 'success' : 'danger'" effect="plain">{{ directionText(row.actualDirection) }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="收益" min-width="120" align="right">
            <template #default="{ row }">
              <strong :class="Number(row.pctChange || 0) >= 0 ? 'up' : 'down'" class="mono review-metric">
                {{ formatSignedPercent(row.pctChange) }}
              </strong>
            </template>
          </el-table-column>
          <el-table-column label="最大回撤" min-width="120" align="right">
            <template #default="{ row }">
              <span class="mono review-metric review-drawdown">{{ formatSignedPercent(row.maxDrawdown) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="复盘分" min-width="120" align="right">
            <template #default="{ row }">
              <strong class="mono review-score">{{ Number(row.successScore || 0).toFixed(1) }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="结果" width="110">
            <template #default="{ row }">
              <el-tag class="review-result-tag" :type="row.success ? 'success' : 'warning'" effect="plain">
                {{ row.success ? '有效' : '待改进' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="验证时间" min-width="170">
            <template #default="{ row }">
              <span class="muted mono">{{ formatDateTime(row.evaluatedAt) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && !filteredItems.length" :description="emptyDescription" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, Refresh, RefreshLeft } from '@element-plus/icons-vue'
import { fetchAiEvolutionReviews, verifyAiEvolutionReviews } from '../services/aiEvolution'

const loading = ref(false)
const verifying = ref(false)
const reviewData = ref(null)
const stockFilter = ref('')
const horizonFilter = ref('')

const reviewItems = computed(() => reviewData.value?.items || [])

const stockOptions = computed(() => {
  const seen = new Set()
  return reviewItems.value
    .map((item) => {
      const label = item.stockName ? `${item.stockName} ${item.stockCode}` : item.stockCode
      return {
        label,
        value: item.stockCode
      }
    })
    .filter((item) => {
      if (!item.value || seen.has(item.value)) {
        return false
      }
      seen.add(item.value)
      return true
    })
})

const horizonOptions = computed(() => {
  const values = Array.from(
    new Set(
      reviewItems.value
        .map((item) => Number(item.horizonDays))
        .filter((value) => Number.isFinite(value))
    )
  ).sort((left, right) => left - right)

  return values.map((value) => ({
    label: `T+${value}`,
    value: `T+${value}`
  }))
})

const filteredItems = computed(() => {
  const stockKeyword = String(stockFilter.value || '').trim().toLowerCase()
  const horizonKeyword = normalizeHorizon(horizonFilter.value)

  return reviewItems.value.filter((item) => {
    const stockMatched =
      !stockKeyword ||
      String(item.stockCode || '').toLowerCase().includes(stockKeyword) ||
      String(item.stockName || '').toLowerCase().includes(stockKeyword)

    const horizonMatched = !horizonKeyword || `T+${Number(item.horizonDays || 0)}` === horizonKeyword

    return stockMatched && horizonMatched
  })
})

const emptyDescription = computed(() => (
  reviewItems.value.length ? '暂无匹配的验证结果' : '暂无验证结果，点击执行复盘验证'
))

const hasActiveFilters = computed(() => Boolean(String(stockFilter.value || '').trim() || String(horizonFilter.value || '').trim()))

async function loadReviews() {
  loading.value = true
  try {
    reviewData.value = await fetchAiEvolutionReviews()
  } catch (error) {
    ElMessage.error(error.message || '复盘数据加载失败')
  } finally {
    loading.value = false
  }
}

async function verifyReviews() {
  verifying.value = true
  try {
    reviewData.value = await verifyAiEvolutionReviews()
    ElMessage.success('复盘验证已完成')
  } catch (error) {
    console.error('[猫狗智投] 复盘验证失败', error)
    ElMessage.error(error.message || '复盘验证失败')
  } finally {
    verifying.value = false
  }
}

function directionText(value) {
  if (value === 'UP') return '看涨'
  if (value === 'DOWN') return '看跌'
  if (value === 'SIDEWAYS') return '震荡'
  return '未知'
}

function formatSignedPercent(value) {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
}

function normalizeHorizon(value) {
  const raw = String(value || '').trim().toUpperCase()
  if (!raw) return ''
  if (/^T\+\d+$/.test(raw)) return raw
  if (/^\d+$/.test(raw)) return `T+${raw}`
  return raw
}

function resetFilters() {
  stockFilter.value = ''
  horizonFilter.value = ''
}

onMounted(loadReviews)
</script>

<style scoped>
.review-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.review-filters-shell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.review-filters {
  display: flex;
  gap: 12px;
  flex-wrap: nowrap;
  align-items: center;
}

.review-filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.review-filter-label {
  color: #64748b;
  font-size: 12px;
  line-height: 1;
}

.review-filter {
  width: 240px;
}

.review-filter-short {
  width: 140px;
}

.review-filter-reset {
  flex: 0 0 auto;
}

.review-filter-meta {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1;
}

.review-filter-meta strong {
  color: #0f172a;
  font-size: 16px;
  line-height: 1;
}

.review-stock-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-date,
.review-metric,
.review-score {
  font-variant-numeric: tabular-nums;
}

.review-horizon-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 0 10px;
  height: 28px;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.review-direction {
  display: inline-flex;
  align-items: center;
}

.review-direction-tag,
.review-result-tag {
  min-width: 64px;
  justify-content: center;
}

.review-metric,
.review-drawdown,
.review-score {
  font-size: 14px;
}

.review-drawdown {
  color: #475569;
}

.review-score {
  color: #0f172a;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f8fafc;
}

.summary-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 28px;
}

.direction-arrow {
  margin: 0 8px;
  color: #94a3b8;
}

@media (max-width: 960px) {
  .review-detail-header {
    flex-direction: column;
    align-items: stretch;
  }

  .review-filters {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .review-filters-shell {
    align-items: stretch;
  }

  .review-filter-meta {
    text-align: left;
  }

  .review-filter,
  .review-filter-short {
    width: min(100%, 220px);
  }

  .review-filter-group {
    width: 100%;
  }
}
</style>
