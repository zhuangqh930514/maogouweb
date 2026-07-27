<template>
  <div class="page">
    <section class="surface toolbar-surface">
      <div class="surface-body watch-toolbar">
        <el-segmented v-model="group" :options="['全部', 'AI重点', '高波动', '稳健持有']" />
        <el-input
          v-model="keyword"
          class="watch-search"
          :prefix-icon="Search"
          clearable
          placeholder="搜索自选股名称或代码"
        />
        <el-select v-model="sortMode" class="sort-select" aria-label="自选股排序方式">
          <el-option label="手动排序" value="MANUAL" />
          <el-option label="AI 评分从高到低" value="AI_SCORE_DESC" />
          <el-option label="涨跌幅从高到低" value="PERCENT_DESC" />
          <el-option label="涨跌幅从低到高" value="PERCENT_ASC" />
          <el-option label="量比从高到低" value="VOLUME_RATIO_DESC" />
        </el-select>
        <el-switch v-model="pinnedOnly" class="pinned-switch" active-text="仅看置顶" />
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
            <p class="surface-caption">{{ manualSortEnabled ? '拖动手柄调整顺序；置顶股票始终显示在列表顶部。' : '当前为筛选或自动排序结果，切换为“手动排序”后可拖动调整。' }}</p>
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
        <div class="surface-body watch-table-wrap" @dragover.prevent @drop="handleTableDrop">
          <el-table
            v-loading="loading"
            :data="watchStocks"
            class="compact-table"
            row-key="code"
            highlight-current-row
            @row-click="selectStock"
            @selection-change="selectedRows = $event"
          >
            <el-table-column type="selection" width="46" />
            <el-table-column width="44" align="center">
              <template #default="{ row }">
                <button
                  type="button"
                  class="drag-handle"
                  :class="{ disabled: !manualSortEnabled }"
                  :disabled="!manualSortEnabled"
                  :draggable="manualSortEnabled"
                  title="拖动调整顺序"
                  @click.stop
                  @dragstart.stop="startDrag(row, $event)"
                  @dragend="draggingCode = ''"
                >
                  <el-icon><Rank /></el-icon>
                </button>
              </template>
            </el-table-column>
            <el-table-column label="股票" min-width="150">
              <template #default="{ row }">
                <div class="watch-stock-name">
                  <strong>{{ row.name }}</strong>
                  <el-tag v-if="row.pinned" size="small" effect="plain" class="pin-tag">置顶</el-tag>
                </div>
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
            <el-table-column label="操作" width="86" align="right">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="togglePinned(row)">
                  {{ row.pinned ? '取消置顶' : '置顶' }}
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无自选股，请先添加股票代码" />
            </template>
          </el-table>
          <div v-if="watchTotal" class="table-footer">
            <span>{{ group }}共 {{ watchTotal }} 只</span>
            <el-pagination
              :current-page="watchPage"
              :page-size="watchPageSize"
              :page-sizes="[20, 50, 100]"
              :total="watchTotal"
              background
              layout="sizes, prev, pager, next, total"
              @current-change="handleWatchPageChange"
              @size-change="handleWatchPageSizeChange"
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Rank, Search } from '@element-plus/icons-vue'
import AiReportBlock from '../components/AiReportBlock.vue'
import EChart from '../components/EChart.vue'
import { klineOption, lineOption } from '../services/chartOptions'
import { fetchStockDetail, searchStocks } from '../services/stocks'
import {
  addWatchStock,
  fetchWatchlist,
  fetchWatchlistPage,
  pinWatchStock,
  removeWatchStocks,
  reorderWatchStocks,
} from '../services/watchlist'
import { isAshareMarketOpen } from '../utils/marketTime'

const group = ref('全部')
const keyword = ref('')
const sortMode = ref('MANUAL')
const pinnedOnly = ref(false)
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
const watchPage = ref(1)
const watchPageSize = ref(50)
const watchTotal = ref(0)
const draggingCode = ref('')
let refreshTimer = null
let initialQuoteRefreshTimer = null
let keywordTimer = null

const manualSortEnabled = computed(() => (
  group.value === '全部'
  && sortMode.value === 'MANUAL'
  && !keyword.value.trim()
  && !pinnedOnly.value
))

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

async function loadWatchlist({ loadInitialDetail = true, silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const result = await fetchWatchlistPage({
      page: watchPage.value,
      pageSize: watchPageSize.value,
      view: group.value,
      keyword: keyword.value.trim(),
      sort: sortMode.value,
      pinnedOnly: pinnedOnly.value,
    })
    watchStocks.value = (result?.items || []).map(normalizeStock)
    watchTotal.value = Number(result?.total || 0)
    watchPage.value = Number(result?.page || 1)
    watchPageSize.value = Number(result?.pageSize || watchPageSize.value)
    if (loadInitialDetail && !selected.value && watchStocks.value.length) {
      void selectStock(watchStocks.value[0])
    } else if (selected.value) {
      const nextSelection = watchStocks.value.find((item) => item.code === selected.value.code) || watchStocks.value[0] || null
      if (!nextSelection) {
        selected.value = null
        detail.value = null
      } else if (nextSelection.code !== selected.value.code) {
        void selectStock(nextSelection)
      } else {
        selected.value = nextSelection
      }
    }
  } catch (error) {
    if (!silent) ElMessage.error(error.message || '自选股列表获取失败')
  } finally {
    if (!silent) loading.value = false
  }
}

async function refreshWatchlistRealtime() {
  await loadWatchlist({ loadInitialDetail: false, silent: true })
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
    const stock = normalizeStock(await addWatchStock(code))
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

function startDrag(row, event) {
  if (!manualSortEnabled.value) {
    event.preventDefault()
    return
  }
  draggingCode.value = row.code
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', row.code)
}

async function handleTableDrop(event) {
  if (!manualSortEnabled.value || !draggingCode.value) {
    return
  }
  const targetRow = event.target instanceof Element ? event.target.closest('tr') : null
  const displayedRows = Array.from(event.currentTarget.querySelectorAll('.el-table__body tbody tr'))
  const targetIndex = targetRow ? displayedRows.indexOf(targetRow) : -1
  const target = targetIndex >= 0 ? watchStocks.value[targetIndex] : null
  const sourceCode = draggingCode.value
  draggingCode.value = ''
  if (!target || target.code === sourceCode) {
    return
  }
  const source = watchStocks.value.find((item) => item.code === sourceCode)
  if (source && source.pinned !== target.pinned) {
    ElMessage.warning('置顶股票和普通股票分别排序；请拖到同一类股票内调整顺序')
    return
  }
  try {
    const allStocks = (await fetchWatchlist()).map(normalizeStock)
    const codes = allStocks.map((item) => item.code)
    const sourceIndex = codes.indexOf(sourceCode)
    const destinationIndex = codes.indexOf(target.code)
    if (sourceIndex < 0 || destinationIndex < 0) {
      throw new Error('未找到需要排序的自选股')
    }
    codes.splice(sourceIndex, 1)
    codes.splice(destinationIndex, 0, sourceCode)
    await reorderWatchStocks(codes)
    ElMessage.success('排序已保存')
    await loadWatchlist({ loadInitialDetail: false })
  } catch (error) {
    ElMessage.error(error.message || '保存排序失败')
  }
}

async function togglePinned(row) {
  try {
    await pinWatchStock(row.code, !row.pinned)
    ElMessage.success(row.pinned ? '已取消置顶' : '已置顶')
    selectedRows.value = []
    await loadWatchlist({ loadInitialDetail: false })
  } catch (error) {
    ElMessage.error(error.message || '更新置顶状态失败')
  }
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
    pinned: item.pinned === true || Number(item.pinned) === 1,
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

watch([group, sortMode, pinnedOnly], async () => {
  watchPage.value = 1
  selectedRows.value = []
  await loadWatchlist()
})

watch(keyword, () => {
  if (keywordTimer) {
    window.clearTimeout(keywordTimer)
  }
  keywordTimer = window.setTimeout(async () => {
    watchPage.value = 1
    selectedRows.value = []
    await loadWatchlist()
  }, 300)
})

async function handleWatchPageChange(page) {
  watchPage.value = page
  selectedRows.value = []
  await loadWatchlist({ loadInitialDetail: false })
}

async function handleWatchPageSizeChange(pageSize) {
  watchPageSize.value = pageSize
  watchPage.value = 1
  selectedRows.value = []
  await loadWatchlist({ loadInitialDetail: false })
}

onMounted(() => {
  loadWatchlist()
  initialQuoteRefreshTimer = window.setTimeout(refreshWatchlistRealtime, 2500)
  refreshTimer = window.setInterval(() => {
    if (!document.hidden && isAshareMarketOpen()) {
      refreshWatchlistRealtime()
    }
  }, 30000)
})

onUnmounted(() => {
  if (initialQuoteRefreshTimer) {
    window.clearTimeout(initialQuoteRefreshTimer)
  }
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }
  if (keywordTimer) {
    window.clearTimeout(keywordTimer)
  }
})
</script>

<style scoped>
.toolbar-surface .surface-body {
  padding-bottom: 14px;
}

.watch-toolbar {
  display: grid;
  grid-template-columns: auto minmax(190px, 1fr) 178px auto 260px auto;
  align-items: center;
  gap: 14px;
}

.sort-select {
  width: 178px;
}

.pinned-switch {
  white-space: nowrap;
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

.surface-caption {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 20px;
}

.watch-stock-name {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.pin-tag {
  border-color: #bfdbfe;
  color: #2563eb;
  flex: 0 0 auto;
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 30px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #94a3b8;
  cursor: grab;
}

.drag-handle:hover:not(.disabled) {
  background: #eff6ff;
  color: #2563eb;
}

.drag-handle:active:not(.disabled) {
  cursor: grabbing;
}

.drag-handle.disabled {
  cursor: not-allowed;
  opacity: 0.42;
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

@media (max-width: 1280px) {
  .watch-toolbar {
    grid-template-columns: auto minmax(180px, 1fr) 166px auto;
  }

  .watch-toolbar .el-autocomplete {
    grid-column: 2 / span 2;
  }
}

@media (max-width: 760px) {
  .watch-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .watch-toolbar .el-segmented,
  .watch-search,
  .sort-select,
  .watch-toolbar .el-autocomplete {
    grid-column: 1 / -1;
    width: 100%;
  }

  .pinned-switch {
    grid-column: 1;
  }

  .watch-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
