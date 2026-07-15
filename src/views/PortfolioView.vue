<template>
  <div class="page">
    <div v-loading="loading" class="section-grid grid-4">
      <MetricCard title="总资产" :value="formatMoney(totalAsset)" :percent="profitRate" :show-trend="false" />
      <MetricCard title="持仓市值" :value="formatMoney(totalMarketValue)" :percent="todayProfitRate" :show-trend="false" />
      <MetricCard title="浮动盈亏" :value="formatSignedMoney(totalProfit)" :percent="profitRate" :show-trend="false" />
      <MetricCard title="今日盈亏" :value="formatSignedMoney(todayProfit)" :percent="todayProfitRate" :show-trend="false" />
    </div>

    <div class="section-grid portfolio-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">当前持仓</h2>
            <p class="surface-subtitle">按实时价自动计算市值、成本和浮动盈亏</p>
          </div>
          <div class="header-actions">
            <el-button
              type="danger"
              plain
              :disabled="!selectedRows.length"
              :loading="batchDeleting"
              @click="deleteSelectedPositions"
            >
              批量删除
            </el-button>
          </div>
        </div>
        <div class="surface-body">
          <el-table
            ref="portfolioTableRef"
            v-loading="loading"
            :data="pagedPositionRows"
            class="compact-table"
            row-key="code"
            @selection-change="selectedRows = $event"
          >
            <el-table-column type="selection" width="46" />
            <el-table-column label="排序" width="70">
              <template #default>
                <span class="drag-handle" title="拖拽排序">☰</span>
              </template>
            </el-table-column>
            <el-table-column label="股票" min-width="130">
              <template #default="{ row }">
                <strong>{{ row.name }}</strong>
                <div class="muted mono">{{ row.code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="买入价" width="110">
              <template #default="{ row }">{{ row.buyPrice.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="90" />
            <el-table-column label="现价" width="110">
              <template #default="{ row }">{{ row.currentPrice.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="市值" width="120">
              <template #default="{ row }">{{ formatMoney(row.marketValue) }}</template>
            </el-table-column>
            <el-table-column label="浮动盈亏" width="130">
              <template #default="{ row }">
                <span :class="row.profit >= 0 ? 'up' : 'down'">
                  {{ row.profit >= 0 ? '+' : '' }}{{ formatMoney(row.profit) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="positionRows.length" class="table-footer">
            <span>当前持仓 {{ positionRows.length }} 只</span>
            <el-pagination
              v-model:current-page="positionPage"
              v-model:page-size="positionPageSize"
              :page-sizes="[20, 50, 100]"
              :total="positionRows.length"
              background
              layout="sizes, prev, pager, next, total"
            />
          </div>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">买入记录表单</h2>
            <p class="surface-subtitle">记录真实买入操作，后端可保存到交易记录表</p>
          </div>
        </div>
        <div class="surface-body">
          <el-form :model="tradeForm" label-position="top">
            <el-form-item label="股票代码">
              <el-autocomplete
                v-model="stockKeyword"
                :fetch-suggestions="queryStockSuggestions"
                value-key="label"
                placeholder="输入股票名称 / 代码，如 贵州茅台"
                clearable
                @select="selectStockSuggestion"
                @clear="clearStockSelection"
              >
                <template #default="{ item }">
                  <div class="stock-suggestion">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.code }} · {{ item.market }}</span>
                  </div>
                </template>
              </el-autocomplete>
            </el-form-item>
            <div class="form-grid">
              <el-form-item label="买入价格">
                <el-input-number v-model="tradeForm.price" :min="0" :precision="2" controls-position="right" />
              </el-form-item>
              <el-form-item label="买入数量">
                <el-input-number v-model="tradeForm.quantity" :min="100" :step="100" controls-position="right" />
              </el-form-item>
            </div>
            <el-form-item label="买入时间">
              <el-date-picker v-model="tradeForm.time" type="datetime" placeholder="选择时间" />
            </el-form-item>
            <el-button type="primary" class="save-button" :loading="saving" @click="saveTrade">保存买入记录</el-button>
          </el-form>
          <p class="form-hint">保存后系统会按当前实时价重算浮动盈亏，并对同一股票多笔买入做成本聚合。</p>
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">组合收益走势</h2>
          <p class="surface-subtitle">近 30 日收益曲线，可扩展为和沪深300、上证指数对比</p>
        </div>
      </div>
      <div class="surface-body">
        <EChart :option="profitOption()" height="260px" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import EChart from '../components/EChart.vue'
import MetricCard from '../components/MetricCard.vue'
import { profitOption } from '../services/chartOptions'
import { createBuyTrade, fetchPortfolioPositions, removePortfolioPositions } from '../services/portfolio'
import { searchStocks } from '../services/stocks'
import { isAshareMarketOpen } from '../utils/marketTime'

const POSITION_ORDER_KEY = 'maogou_portfolio_position_order'
const loading = ref(false)
const saving = ref(false)
const batchDeleting = ref(false)
const stockKeyword = ref('')
const selectedStock = ref(null)
const selectedRows = ref([])
const positionOrder = ref(loadPositionOrder())
const portfolioTableRef = ref(null)
const summary = ref({ totalCost: 0, totalMarketValue: 0, totalProfit: 0, profitRate: 0, positions: [] })
const positionRows = computed(() => sortPositions((summary.value.positions || []).map(normalizePosition)))
const positionPage = ref(1)
const positionPageSize = ref(50)
const pagedPositionRows = computed(() => {
  const start = (positionPage.value - 1) * positionPageSize.value
  return positionRows.value.slice(start, start + positionPageSize.value)
})
let refreshTimer = null
let initialQuoteRefreshTimer = null
let draggedCode = null

const totalMarketValue = computed(() => Number(summary.value.totalMarketValue || 0))
const totalCost = computed(() => Number(summary.value.totalCost || 0))
const totalProfit = computed(() => Number(summary.value.totalProfit || 0))
const totalAsset = computed(() => totalMarketValue.value)
const profitRate = computed(() => Number(summary.value.profitRate || 0))
const todayProfit = computed(() => Number(summary.value.todayProfit || 0))
const todayProfitRate = computed(() => Number(summary.value.todayProfitRate || 0))

const tradeForm = reactive({
  code: '',
  price: 0,
  quantity: 100,
  time: new Date(),
})

async function loadPortfolio({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    summary.value = await fetchPortfolioPositions()
    selectedRows.value = []
    clampPositionPage()
    await nextTick()
    bindRowDragEvents()
  } catch (error) {
    if (!silent) ElMessage.error(error.message || '持仓数据获取失败')
  } finally {
    if (!silent) loading.value = false
  }
}

async function deleteSelectedPositions() {
  const codes = selectedRows.value.map((item) => item.code)
  if (!codes.length) {
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${codes.length} 只持仓？对应买入记录也会一并删除。`, '批量删除持仓', { type: 'warning' })
    batchDeleting.value = true
    await removePortfolioPositions(codes)
    positionOrder.value = positionOrder.value.filter((code) => !codes.includes(code))
    savePositionOrder()
    selectedRows.value = []
    ElMessage.success('已批量删除')
    await loadPortfolio()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '批量删除失败')
    }
  } finally {
    batchDeleting.value = false
  }
}

async function reorderPositions(sourceCode, targetCode) {
  if (!sourceCode || !targetCode || sourceCode === targetCode) {
    return
  }
  const rows = positionRows.value
  const sourceIndex = rows.findIndex((item) => item.code === sourceCode)
  const targetIndex = rows.findIndex((item) => item.code === targetCode)
  if (sourceIndex < 0 || targetIndex < 0) {
    return
  }
  const nextRows = [...rows]
  const [moved] = nextRows.splice(sourceIndex, 1)
  nextRows.splice(targetIndex, 0, moved)
  positionOrder.value = nextRows.map((item) => item.code)
  savePositionOrder()
  await nextTick()
  bindRowDragEvents()
}

function bindRowDragEvents() {
  const rows = portfolioTableRef.value?.$el?.querySelectorAll('.el-table__body-wrapper tbody tr')
  if (!rows?.length) {
    return
  }
  rows.forEach((row, index) => {
    const position = pagedPositionRows.value[index]
    if (!position) {
      return
    }
    row.setAttribute('draggable', 'true')
    row.dataset.code = position.code
    row.ondragstart = () => {
      draggedCode = position.code
      row.classList.add('is-dragging')
    }
    row.ondragend = () => {
      draggedCode = null
      row.classList.remove('is-dragging')
    }
    row.ondragover = (event) => {
      event.preventDefault()
    }
    row.ondrop = async (event) => {
      event.preventDefault()
      await reorderPositions(draggedCode, position.code)
    }
  })
}

function sortPositions(rows) {
  const order = positionOrder.value
  if (!order.length) {
    return rows
  }
  const orderMap = new Map(order.map((code, index) => [code, index]))
  return [...rows].sort((left, right) => {
    const leftIndex = orderMap.has(left.code) ? orderMap.get(left.code) : Number.MAX_SAFE_INTEGER
    const rightIndex = orderMap.has(right.code) ? orderMap.get(right.code) : Number.MAX_SAFE_INTEGER
    if (leftIndex === rightIndex) {
      return 0
    }
    return leftIndex - rightIndex
  })
}

function loadPositionOrder() {
  try {
    const value = window.localStorage.getItem(POSITION_ORDER_KEY)
    return value ? JSON.parse(value) : []
  } catch {
    return []
  }
}

function savePositionOrder() {
  window.localStorage.setItem(POSITION_ORDER_KEY, JSON.stringify(positionOrder.value))
}

async function saveTrade() {
  const code = selectedStock.value?.code || extractStockCode(stockKeyword.value) || extractStockCode(tradeForm.code)
  if (!code || !tradeForm.price || !tradeForm.quantity || !tradeForm.time) {
    ElMessage.warning('请完整填写买入记录')
    return
  }
  saving.value = true
  try {
    await createBuyTrade({
      code,
      buyPrice: tradeForm.price,
      quantity: tradeForm.quantity,
      buyTime: formatDateTime(tradeForm.time),
    })
    ElMessage.success('已保存买入记录')
    tradeForm.code = ''
    stockKeyword.value = ''
    selectedStock.value = null
    await loadPortfolio()
  } catch (error) {
    ElMessage.error(error.message || '保存买入记录失败')
  } finally {
    saving.value = false
  }
}

async function queryStockSuggestions(query, callback) {
  selectedStock.value = null
  tradeForm.code = extractStockCode(query)
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
  } catch {
    callback([])
  }
}

function selectStockSuggestion(item) {
  selectedStock.value = item
  tradeForm.code = item.code
  stockKeyword.value = `${item.name} ${item.code}`
}

function clearStockSelection() {
  selectedStock.value = null
  tradeForm.code = ''
}

function extractStockCode(value) {
  const match = String(value || '').trim().match(/\d{6}/)
  return match ? match[0] : ''
}

function normalizePosition(item) {
  return {
    ...item,
    buyPrice: Number(item.buyPrice || 0),
    quantity: Number(item.quantity || 0),
    currentPrice: Number(item.currentPrice || 0),
    cost: Number(item.cost || 0),
    marketValue: Number(item.marketValue || 0),
    profit: Number(item.profit || 0),
    profitRate: Number(item.profitRate || 0),
    todayProfit: Number(item.todayProfit || 0),
    todayProfitRate: Number(item.todayProfitRate || 0),
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function formatSignedMoney(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : ''}${formatMoney(number)}`
}

function formatDateTime(value) {
  const date = new Date(value)
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

watch([positionRows, positionPageSize], () => {
  clampPositionPage()
  nextTick(bindRowDragEvents)
})

watch(positionPage, () => {
  selectedRows.value = []
  nextTick(bindRowDragEvents)
})

function clampPositionPage() {
  const totalPages = Math.max(1, Math.ceil(positionRows.value.length / positionPageSize.value))
  if (positionPage.value > totalPages) {
    positionPage.value = totalPages
  }
}

onMounted(() => {
  loadPortfolio()
  initialQuoteRefreshTimer = window.setTimeout(() => loadPortfolio({ silent: true }), 2500)
  refreshTimer = window.setInterval(() => {
    if (isAshareMarketOpen()) {
      loadPortfolio({ silent: true })
    }
  }, 60000)
})

onUnmounted(() => {
  if (initialQuoteRefreshTimer) {
    window.clearTimeout(initialQuoteRefreshTimer)
  }
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.portfolio-layout {
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.75fr);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 16px;
  cursor: grab;
  user-select: none;
}

.drag-handle:hover {
  color: #2563eb;
  background: #eff6ff;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  border-top: 1px solid #e5e7eb;
  padding-top: 14px;
}

.table-footer span {
  color: #64748b;
  font-size: 13px;
  line-height: 20px;
}

:deep(.el-table__body tr.is-dragging) {
  opacity: 0.55;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.save-button {
  width: 100%;
}

.form-hint {
  margin: 18px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 22px;
}

.stock-suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.stock-suggestion span {
  color: #6b7280;
  font-size: 12px;
}
</style>
