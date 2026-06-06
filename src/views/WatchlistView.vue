<template>
  <div class="page">
    <section class="surface toolbar-surface">
      <div class="surface-body watch-toolbar">
        <el-segmented v-model="group" :options="['全部', 'AI重点', '高波动', '稳健持有']" />
        <div class="toolbar-spacer"></div>
        <el-autocomplete
          v-model="newCode"
          :fetch-suggestions="queryStockSuggestions"
          value-key="label"
          placeholder="输入股票代码 / 名称，如 比亚迪"
          clearable
          @select="selectSuggestion"
        >
          <template #default="{ item }">
            <div class="stock-suggestion">
              <strong>{{ item.name }}</strong>
              <span>{{ item.code }} · {{ item.market }}</span>
            </div>
          </template>
        </el-autocomplete>
        <el-button type="primary" :icon="Plus" :loading="adding" @click="addStock">添加股票</el-button>
      </div>
    </section>

    <div class="section-grid watch-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">自选股列表</h2>
          </div>
          <el-button
            type="danger"
            plain
            :disabled="!selectedRows.length"
            :loading="batchDeleting"
            @click="deleteSelectedStocks"
          >
            批量删除
          </el-button>
        </div>
        <div class="surface-body">
          <el-table
            ref="watchTableRef"
            v-loading="loading"
            :data="pagedStocks"
            class="compact-table"
            row-key="code"
            highlight-current-row
            @row-click="selectStock"
            @selection-change="selectedRows = $event"
          >
            <el-table-column type="selection" width="46" />
            <el-table-column label="排序" width="70">
              <template #default>
                <span class="drag-handle" title="拖拽排序">☰</span>
              </template>
            </el-table-column>
            <el-table-column label="股票" min-width="150">
              <template #default="{ row }">
                <strong>{{ row.name }}</strong>
                <div class="muted mono">{{ row.code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="最新价" width="110">
              <template #default="{ row }">
                <span class="mono">{{ row.price.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="涨跌幅" width="110">
              <template #default="{ row }">
                <span :class="row.percent >= 0 ? 'up' : 'down'">
                  {{ row.percent >= 0 ? '+' : '' }}{{ row.percent.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="volumeRatio" label="量比" width="90" />
            <el-table-column label="AI评分" width="110">
              <template #default="{ row }">
                <el-tag :class="row.aiScore >= 75 ? 'tag-red' : 'tag-blue'" effect="plain">{{ row.aiScore }}</el-tag>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无自选股，请先添加股票代码" />
            </template>
          </el-table>
          <div v-if="filteredStocks.length" class="table-footer">
            <span>当前筛选 {{ filteredStocks.length }} 只，自选总数 {{ watchStocks.length }} 只</span>
            <el-pagination
              v-model:current-page="watchPage"
              v-model:page-size="watchPageSize"
              :page-sizes="[20, 50, 100]"
              :total="filteredStocks.length"
              background
              layout="sizes, prev, pager, next, total"
            />
          </div>
        </div>
      </section>

      <section v-if="selected" class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">个股详情预览</h2>
          </div>
          <el-tag class="tag-blue" effect="plain">AI评分 {{ selected.aiScore }}</el-tag>
        </div>
        <div v-loading="detailLoading" class="surface-body detail-panel">
          <div class="stock-heading">
            <div>
              <h3>{{ selected.name }} <span>{{ selected.code }}</span></h3>
              <div class="stock-price" :class="selected.percent >= 0 ? 'up' : 'down'">
                {{ selected.price.toFixed(2) }}
                {{ selected.percent >= 0 ? '+' : '' }}{{ selected.percent.toFixed(2) }}%
              </div>
            </div>
            <el-tag class="tag-blue" effect="plain">{{ selected.advice }}</el-tag>
          </div>

          <el-tabs v-model="detailTab">
            <el-tab-pane label="K线图" name="kline">
              <EChart :option="klineOption(detail?.kline || [])" height="260px" />
            </el-tab-pane>
            <el-tab-pane label="分时图" name="line">
              <EChart :option="lineOption(selected.name, intradayValues, intradayTimes)" height="260px" />
            </el-tab-pane>
            <el-tab-pane label="基础财务" name="finance">
              <div class="finance-grid">
                <div v-for="item in financeItems" :key="item.label" class="finance-item">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>

          <AiReportBlock title="AI建议" :text="`当前策略：${selected.advice}。回踩关键均线区间后再确认买点，避免追高。`" tone="green" />
        </div>
      </section>
      <section v-else class="surface empty-detail">
        <el-empty description="选择一只自选股后查看实时详情" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import AiReportBlock from '../components/AiReportBlock.vue'
import EChart from '../components/EChart.vue'
import { klineOption, lineOption } from '../services/chartOptions'
import { fetchStockDetail, searchStocks } from '../services/stocks'
import { addWatchStock, fetchWatchlist, removeWatchStocks, reorderWatchStocks } from '../services/watchlist'
import { isAshareMarketOpen } from '../utils/marketTime'

const group = ref('全部')
const detailTab = ref('kline')
const newCode = ref('')
const selectedSuggestion = ref(null)
const loading = ref(false)
const detailLoading = ref(false)
const adding = ref(false)
const batchDeleting = ref(false)
const watchStocks = ref([])
const selectedRows = ref([])
const selected = ref(null)
const detail = ref(null)
const watchTableRef = ref(null)
const watchPage = ref(1)
const watchPageSize = ref(50)
let refreshTimer = null
let draggedCode = null

const filteredStocks = computed(() => {
  if (group.value === 'AI重点') return watchStocks.value.filter((item) => item.aiScore >= 78)
  if (group.value === '高波动') return watchStocks.value.filter((item) => item.volumeRatio >= 1.8)
  if (group.value === '稳健持有') return watchStocks.value.filter((item) => item.advice === '稳健持有')
  return watchStocks.value
})
const pagedStocks = computed(() => {
  const start = (watchPage.value - 1) * watchPageSize.value
  return filteredStocks.value.slice(start, start + watchPageSize.value)
})

const intradayValues = computed(() => (detail.value?.intraday || []).map((point) => Number(point.value)))
const intradayTimes = computed(() => (detail.value?.intraday || []).map((point) => point.time))
const finance = computed(() => ({
  pe: Number(detail.value?.finance?.pe ?? selected.value?.pe ?? 0),
  pb: Number(detail.value?.finance?.pb ?? selected.value?.pb ?? 0),
  totalMarketValue: Number(detail.value?.finance?.totalMarketValue ?? 0),
  circulatingMarketValue: Number(detail.value?.finance?.circulatingMarketValue ?? 0),
  eps: Number(detail.value?.finance?.eps ?? 0),
  bps: Number(detail.value?.finance?.bps ?? 0),
  revenue: Number(detail.value?.finance?.revenue ?? 0),
  revenueGrowth: Number(detail.value?.finance?.revenueGrowth ?? selected.value?.revenueGrowth ?? 0),
  netProfit: Number(detail.value?.finance?.netProfit ?? 0),
  profitGrowth: Number(detail.value?.finance?.profitGrowth ?? selected.value?.profitGrowth ?? 0),
  roe: Number(detail.value?.finance?.roe ?? 0),
  grossMargin: Number(detail.value?.finance?.grossMargin ?? 0),
  netMargin: Number(detail.value?.finance?.netMargin ?? 0),
  debtRatio: Number(detail.value?.finance?.debtRatio ?? 0),
  operatingCashFlowPerShare: Number(detail.value?.finance?.operatingCashFlowPerShare ?? 0),
}))
const financeItems = computed(() => [
  { label: 'PE(TTM)', value: formatNumberOrEmpty(finance.value.pe) },
  { label: 'PB', value: formatNumberOrEmpty(finance.value.pb) },
  { label: '总市值', value: formatYi(finance.value.totalMarketValue) },
  { label: '流通市值', value: formatYi(finance.value.circulatingMarketValue) },
  { label: 'EPS', value: formatNumberOrEmpty(finance.value.eps) },
  { label: '每股净资产', value: formatNumberOrEmpty(finance.value.bps) },
  { label: '营业收入', value: formatYi(finance.value.revenue) },
  { label: '营收同比', value: formatPercent(finance.value.revenueGrowth) },
  { label: '归母净利润', value: formatYi(finance.value.netProfit) },
  { label: '净利同比', value: formatPercent(finance.value.profitGrowth) },
  { label: 'ROE', value: formatPercent(finance.value.roe) },
  { label: '毛利率', value: formatPercent(finance.value.grossMargin) },
  { label: '净利率', value: formatPercent(finance.value.netMargin) },
  { label: '资产负债率', value: formatPercent(finance.value.debtRatio) },
  { label: '每股经营现金流', value: formatNumberOrEmpty(finance.value.operatingCashFlowPerShare) },
])

async function loadWatchlist({ loadInitialDetail = true } = {}) {
  loading.value = true
  try {
    const list = await fetchWatchlist()
    watchStocks.value = list.map(normalizeStock)
    if (loadInitialDetail && !selected.value && watchStocks.value.length) {
      void selectStock(watchStocks.value[0])
    } else if (selected.value) {
      selected.value = watchStocks.value.find((item) => item.code === selected.value.code) || watchStocks.value[0] || null
    }
    clampWatchPage()
    await nextTick()
    bindRowDragEvents()
  } catch (error) {
    ElMessage.error(error.message || '自选股列表获取失败')
  } finally {
    loading.value = false
  }
}

async function refreshWatchlistRealtime() {
  await loadWatchlist({ loadInitialDetail: false })
}

async function selectStock(row) {
  selected.value = row
  detailLoading.value = true
  try {
    detail.value = await fetchStockDetail(row.code)
  } catch (error) {
    detail.value = null
    ElMessage.error(error.message || '个股详情获取失败')
  } finally {
    detailLoading.value = false
  }
}

async function addStock() {
  const code = selectedSuggestion.value?.code || extractStockCode(newCode.value)
  if (!code) {
    ElMessage.warning('请选择匹配到的股票或输入 6 位股票代码')
    return
  }
  adding.value = true
  try {
    const stock = normalizeStock(await addWatchStock(code, group.value === '全部' ? '全部' : group.value))
    newCode.value = ''
    selectedSuggestion.value = null
    ElMessage.success(`已添加 ${stock.name || stock.code}`)
    await loadWatchlist()
    await selectStock(stock)
  } catch (error) {
    ElMessage.error(error.message || '添加自选股失败')
  } finally {
    adding.value = false
  }
}

async function queryStockSuggestions(query, callback) {
  selectedSuggestion.value = null
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

function selectSuggestion(item) {
  selectedSuggestion.value = item
  newCode.value = `${item.name} ${item.code}`
}

function extractStockCode(value) {
  const match = value.trim().match(/\d{6}/)
  return match ? match[0] : ''
}

async function deleteSelectedStocks() {
  const codes = selectedRows.value.map((item) => item.code)
  if (!codes.length) {
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${codes.length} 只自选股？`, '批量删除自选股', { type: 'warning' })
    batchDeleting.value = true
    await removeWatchStocks(codes)
    ElMessage.success('已批量删除')
    if (selected.value && codes.includes(selected.value.code)) {
      selected.value = null
      detail.value = null
    }
    selectedRows.value = []
    await loadWatchlist()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '批量删除失败')
    }
  } finally {
    batchDeleting.value = false
  }
}

async function reorderStocks(sourceCode, targetCode) {
  if (!sourceCode || !targetCode || sourceCode === targetCode) {
    return
  }
  const sourceIndex = watchStocks.value.findIndex((item) => item.code === sourceCode)
  const targetIndex = watchStocks.value.findIndex((item) => item.code === targetCode)
  if (sourceIndex < 0 || targetIndex < 0) {
    return
  }
  const nextStocks = [...watchStocks.value]
  const [moved] = nextStocks.splice(sourceIndex, 1)
  nextStocks.splice(targetIndex, 0, moved)
  watchStocks.value = nextStocks
  await nextTick()
  bindRowDragEvents()
  try {
    await reorderWatchStocks(nextStocks.map((item) => item.code))
  } catch (error) {
    ElMessage.error(error.message || '排序保存失败')
    await loadWatchlist()
  }
}

function bindRowDragEvents() {
  const rows = watchTableRef.value?.$el?.querySelectorAll('.el-table__body-wrapper tbody tr')
  if (!rows?.length) {
    return
  }
  rows.forEach((row, index) => {
    const stock = pagedStocks.value[index]
    if (!stock) {
      return
    }
    row.setAttribute('draggable', 'true')
    row.dataset.code = stock.code
    row.ondragstart = () => {
      draggedCode = stock.code
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
      await reorderStocks(draggedCode, stock.code)
    }
  })
}

function normalizeStock(item) {
  return {
    ...item,
    price: Number(item.price || 0),
    percent: Number(item.percent || 0),
    volumeRatio: Number(item.volumeRatio || 0),
    aiScore: Number(item.aiScore || 0),
    pe: Number(item.pe || 0),
    pb: Number(item.pb || 0),
    revenueGrowth: Number(item.revenueGrowth || 0),
    profitGrowth: Number(item.profitGrowth || 0),
  }
}

function formatPercent(value) {
  const number = Number(value || 0)
  if (!number) {
    return '暂无'
  }
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`
}

function formatNumberOrEmpty(value) {
  const number = Number(value || 0)
  return number ? number.toFixed(2) : '暂无'
}

function formatYi(value) {
  const number = Number(value || 0)
  if (!number) {
    return '暂无'
  }
  return `${(number / 100000000).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}亿`
}

watch(group, () => {
  watchPage.value = 1
  if (filteredStocks.value.length && !filteredStocks.value.some((item) => item.code === selected.value?.code)) {
    selectStock(filteredStocks.value[0])
  }
  nextTick(bindRowDragEvents)
})

watch([filteredStocks, watchPageSize], () => {
  clampWatchPage()
  nextTick(bindRowDragEvents)
})

watch(watchPage, () => {
  selectedRows.value = []
  nextTick(bindRowDragEvents)
})

function clampWatchPage() {
  const totalPages = Math.max(1, Math.ceil(filteredStocks.value.length / watchPageSize.value))
  if (watchPage.value > totalPages) {
    watchPage.value = totalPages
  }
}

onMounted(() => {
  loadWatchlist()
  refreshTimer = window.setInterval(() => {
    if (!document.hidden && isAshareMarketOpen()) {
      refreshWatchlistRealtime()
    }
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.toolbar-surface .surface-body {
  padding-bottom: 14px;
}

.watch-toolbar {
  display: grid;
  grid-template-columns: auto minmax(24px, 1fr) 260px auto;
  align-items: center;
  gap: 14px;
}

.toolbar-spacer {
  min-width: 24px;
}

.stock-suggestion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.stock-suggestion strong {
  color: #111827;
}

.stock-suggestion span {
  color: #6b7280;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
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

.watch-layout {
  grid-template-columns: minmax(0, 1.45fr) minmax(420px, 0.9fr);
}

.stock-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.stock-heading h3 {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
}

.stock-heading h3 span {
  color: #6b7280;
  font-size: 14px;
}

.stock-price {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 800;
  line-height: 34px;
}

.finance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 10px 0 16px;
}

.finance-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.finance-item span {
  color: #6b7280;
  font-size: 12px;
}

.finance-item strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
}

.empty-detail {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
