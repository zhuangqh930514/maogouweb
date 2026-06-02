<template>
  <div class="page">
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <div v-loading="loading" class="market-index-strip">
      <article
        v-for="item in displayIndexes"
        :key="item.code"
        class="market-index-card surface"
        :class="{ active: selectedIndex?.code === item.code }"
        role="button"
        tabindex="0"
        @click="selectIndex(item)"
        @keydown.enter="selectIndex(item)"
      >
        <div class="market-index-title">{{ item.name }}</div>
        <div class="market-index-main">
          <div class="market-index-value mono">{{ item.value.toLocaleString('zh-CN') }}</div>
          <div class="market-index-percent" :class="item.percent >= 0 ? 'up' : 'down'">
            {{ item.percent >= 0 ? '+' : '' }}{{ item.percent.toFixed(2) }}%
          </div>
        </div>
      </article>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">{{ selectedIndex?.name || '指数' }} 行情图</h2>
          <p class="surface-subtitle">点击上方指数卡片切换标的，支持日线、周线、月线</p>
        </div>
        <el-segmented v-model="chartPeriod" :options="periodOptions" />
      </div>
      <div v-loading="chartLoading" class="surface-body">
        <EChart
          :option="isIntraday ? lineOption(selectedIndex?.name || '指数分时', intradayValues, intradayTimes) : klineOption(klinePoints)"
          height="430px"
        />
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">板块热力图</h2>
          <p class="surface-subtitle">涨幅最大的 10 个板块与跌幅最大的 10 个板块</p>
        </div>
        <el-tag class="tag-blue" effect="plain">实时板块</el-tag>
      </div>
      <div v-loading="sectorLoading" class="surface-body">
        <div class="sector-heatmap">
          <article
            v-for="item in sectorHeatmapItems"
            :key="`${item.direction}-${item.code}`"
            class="sector-tile"
            :class="[item.direction, tileSizeClass(item), { active: selectedSector?.code === item.code }]"
            role="button"
            tabindex="0"
            @click="selectSector(item)"
            @keydown.enter="selectSector(item)"
          >
            <div class="sector-name">{{ item.name }}</div>
            <strong>{{ formatPercent(item.percent) }}</strong>
            <span>{{ formatNetInflow(item.netInflow) }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">{{ selectedSector?.name || '板块' }} 热门股票</h2>
          <p class="surface-subtitle">按主力净流入排序展示热度最高的 10 只股票</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="hotStocksLoading" :data="sectorHotStocks" class="compact-table" row-key="code">
          <el-table-column prop="rank" label="排名" width="80" />
          <el-table-column label="股票" min-width="150">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
              <div class="muted mono">{{ row.code }}</div>
            </template>
          </el-table-column>
          <el-table-column label="最新价" width="120">
            <template #default="{ row }">
              <span class="mono">{{ row.price.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="涨跌幅" width="120">
            <template #default="{ row }">
              <span :class="row.percent >= 0 ? 'up' : 'down'">{{ formatPercent(row.percent) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="主力净流入" width="150">
            <template #default="{ row }">
              <span :class="row.netInflow >= 0 ? 'up' : 'down'">{{ formatNetInflow(row.netInflow) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="成交额" width="130">
            <template #default="{ row }">{{ formatAmount(row.amount) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="110" align="right">
            <template #default="{ row }">
              <el-button
                size="small"
                :type="isInWatchlist(row.code) ? 'info' : 'primary'"
                :plain="!isInWatchlist(row.code)"
                :disabled="isInWatchlist(row.code)"
                :loading="isAddingWatchlist(row.code)"
                @click="handleAddWatchStock(row)"
              >
                {{ isInWatchlist(row.code) ? '已加入' : '加入自选' }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="点击上方任意板块查看热门股票" />
          </template>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import EChart from '../components/EChart.vue'
import { klineOption, lineOption } from '../services/chartOptions'
import { fetchIndexIntraday, fetchIndexKline, fetchMarketIndexes, fetchSectorHeatmap, fetchSectorHotStocks } from '../services/market'
import { addWatchStock, fetchWatchlistCodes } from '../services/watchlist'
import { isAshareMarketOpen } from '../utils/marketTime'

const loading = ref(false)
const chartLoading = ref(false)
const sectorLoading = ref(false)
const hotStocksLoading = ref(false)
const errorMessage = ref('')
const marketIndexes = ref([])
const displayIndexes = computed(() => orderIndexes(marketIndexes.value))
const selectedIndex = ref(null)
const chartPeriod = ref('intraday')
const klinePoints = ref([])
const intradayPoints = ref([])
const isIntraday = computed(() => chartPeriod.value === 'intraday')
const intradayValues = computed(() => intradayPoints.value.map((point) => Number(point.value)))
const intradayTimes = computed(() => intradayPoints.value.map((point) => point.time))
const periodOptions = [
  { label: '分时', value: 'intraday' },
  { label: '日K', value: 'day' },
  { label: '周K', value: 'week' },
  { label: '月K', value: 'month' },
]
const sectorHeatmapItems = ref([])
const selectedSector = ref(null)
const sectorHotStocks = ref([])
const watchlistCodes = ref(new Set())
const addingCodes = ref(new Set())
const INDEX_REFRESH_MS = 15000
const SECTOR_REFRESH_MS = 60000
let indexRefreshTimer = null
let sectorRefreshTimer = null

async function loadIndexes() {
  loading.value = true
  errorMessage.value = ''
  try {
    const indexes = await fetchMarketIndexes()
    marketIndexes.value = indexes.map(normalizeIndex)
    if (!selectedIndex.value && displayIndexes.value.length) {
      await selectIndex(displayIndexes.value[0])
    } else if (selectedIndex.value) {
      selectedIndex.value = marketIndexes.value.find((item) => item.code === selectedIndex.value.code) || selectedIndex.value
    }
  } catch (error) {
    errorMessage.value = error.message || '大盘实时数据获取失败'
    ElMessage.error(errorMessage.value)
  } finally {
    loading.value = false
  }
}

async function loadSectorHeatmap({ silent = false } = {}) {
  if (sectorLoading.value) {
    return
  }
  sectorLoading.value = true
  try {
    const data = await fetchSectorHeatmap()
    sectorHeatmapItems.value = (data.items || []).map((item) => ({
      ...item,
      value: Number(item.value || 0),
      percent: Number(item.percent || 0),
      netInflow: Number(item.netInflow || 0),
      rank: Number(item.rank || 0),
    }))
    if (!selectedSector.value && sectorHeatmapItems.value.length) {
      await selectSector(sectorHeatmapItems.value[0])
    } else if (selectedSector.value) {
      selectedSector.value = sectorHeatmapItems.value.find((item) => item.code === selectedSector.value.code) || selectedSector.value
    }
  } catch (error) {
    if (!silent || !sectorHeatmapItems.value.length) {
      ElMessage.error(error.message || '板块热力图获取失败')
    }
  } finally {
    sectorLoading.value = false
  }
}

async function selectSector(item) {
  selectedSector.value = item
  hotStocksLoading.value = true
  try {
    sectorHotStocks.value = (await fetchSectorHotStocks(item.code, 10)).map((stock) => ({
      ...stock,
      price: Number(stock.price || 0),
      percent: Number(stock.percent || 0),
      netInflow: Number(stock.netInflow || 0),
      volume: Number(stock.volume || 0),
      amount: Number(stock.amount || 0),
      rank: Number(stock.rank || 0),
    }))
  } catch (error) {
    sectorHotStocks.value = []
    ElMessage.error(error.message || '板块热门股票获取失败')
  } finally {
    hotStocksLoading.value = false
  }
}

async function selectIndex(item) {
  selectedIndex.value = item
  await loadSelectedKline()
}

async function loadWatchlistCodes() {
  try {
    const codes = await fetchWatchlistCodes()
    watchlistCodes.value = new Set(codes)
  } catch (error) {
    ElMessage.error(error.message || '自选股状态获取失败')
  }
}

function isInWatchlist(code) {
  return watchlistCodes.value.has(code)
}

function isAddingWatchlist(code) {
  return addingCodes.value.has(code)
}

async function handleAddWatchStock(row) {
  const code = row?.code
  if (!code || isInWatchlist(code) || isAddingWatchlist(code)) {
    return
  }
  const nextAddingCodes = new Set(addingCodes.value)
  nextAddingCodes.add(code)
  addingCodes.value = nextAddingCodes
  try {
    const stock = await addWatchStock(code, '全部')
    const nextWatchlistCodes = new Set(watchlistCodes.value)
    nextWatchlistCodes.add(code)
    watchlistCodes.value = nextWatchlistCodes
    ElMessage.success(`已加入自选：${stock?.name || row.name || code}`)
  } catch (error) {
    ElMessage.error(error.message || '加入自选失败')
  } finally {
    const nextAddingCodesAfter = new Set(addingCodes.value)
    nextAddingCodesAfter.delete(code)
    addingCodes.value = nextAddingCodesAfter
  }
}

async function loadSelectedKline() {
  if (!selectedIndex.value?.code) {
    return
  }
  chartLoading.value = true
  try {
    if (isIntraday.value) {
      intradayPoints.value = await fetchIndexIntraday(selectedIndex.value.code)
    } else {
      klinePoints.value = await fetchIndexKline(selectedIndex.value.code, chartPeriod.value, 120)
    }
  } catch (error) {
    klinePoints.value = []
    intradayPoints.value = []
    ElMessage.error(error.message || '指数图表数据获取失败')
  } finally {
    chartLoading.value = false
  }
}

function orderIndexes(indexes) {
  const orders = ['000001.SH', '399001.SZ', '399006.SZ', '000688.SH', 'A50.CFD']
  return [...indexes].sort((left, right) => {
    const leftIndex = orders.indexOf(left.code)
    const rightIndex = orders.indexOf(right.code)
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
  })
}

function normalizeIndex(item) {
  return {
    ...item,
    value: Number(item.value),
    change: Number(item.change),
    percent: Number(item.percent),
    trend: (item.trend || []).map((value) => Number(value)),
  }
}

function tileSizeClass(item) {
  if (item.direction === 'up' && item.rank === 1) {
    return 'tile-xl'
  }
  if (item.rank === 1 || item.rank === 2) {
    return 'tile-wide'
  }
  if (item.rank <= 4) {
    return 'tile-md'
  }
  return 'tile-sm'
}

function formatPercent(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`
}

function formatNetInflow(value) {
  const number = Number(value || 0)
  if (!number) {
    return '资金持平'
  }
  return `${number > 0 ? '净流入' : '净流出'} ${Math.abs(number / 100000000).toFixed(2)}亿`
}

function formatAmount(value) {
  const number = Number(value || 0)
  return number ? `${(number / 100000000).toFixed(2)}亿` : '暂无'
}

onMounted(() => {
  loadIndexes()
  loadSectorHeatmap()
  loadWatchlistCodes()
  indexRefreshTimer = window.setInterval(() => {
    if (isAshareMarketOpen()) {
      loadIndexes()
    }
  }, INDEX_REFRESH_MS)
  sectorRefreshTimer = window.setInterval(() => {
    if (isAshareMarketOpen()) {
      loadSectorHeatmap({ silent: true })
    }
  }, SECTOR_REFRESH_MS)
})

watch(chartPeriod, loadSelectedKline)

onUnmounted(() => {
  if (indexRefreshTimer) {
    window.clearInterval(indexRefreshTimer)
  }
  if (sectorRefreshTimer) {
    window.clearInterval(sectorRefreshTimer)
  }
})
</script>

<style scoped>
.source-panel {
  display: grid;
  gap: 12px;
}

.market-index-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.market-index-card {
  min-height: 92px;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.market-index-card:hover,
.market-index-card.active {
  border-color: #93c5fd;
}

.market-index-card.active {
  transform: translateY(-2px);
}

.market-index-title {
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
}

.market-index-value {
  color: #111827;
  font-size: 22px;
  font-weight: 800;
  line-height: 28px;
}

.market-index-main {
  margin-top: 12px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.market-index-percent {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 15px;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;
}

.market-index-percent.up {
  color: #dc2626;
  background: #fff1f2;
}

.market-index-percent.down {
  color: #16a34a;
  background: #f0fdf4;
}

.sector-heatmap {
  min-height: 360px;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  grid-auto-rows: 78px;
  grid-auto-flow: dense;
  gap: 12px;
}

.sector-tile {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 12px;
  padding: 14px;
  color: #ffffff;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.sector-tile:hover,
.sector-tile.active {
  border-color: rgba(255, 255, 255, 0.86);
  transform: translateY(-2px);
}

.sector-tile.up {
  background: #ef4444;
}

.sector-tile.down {
  background: #16a34a;
}

.sector-tile.tile-xl {
  grid-column: span 2;
  grid-row: span 3;
}

.sector-tile.tile-wide {
  grid-column: span 2;
  grid-row: span 2;
}

.sector-tile.tile-md {
  grid-column: span 2;
}

.sector-name {
  font-size: 15px;
  font-weight: 800;
  line-height: 20px;
}

.sector-tile strong {
  margin-top: 8px;
  font-size: 24px;
  line-height: 30px;
}

.sector-tile span {
  margin-top: 6px;
  font-size: 12px;
  line-height: 16px;
  opacity: 0.86;
}

.sector-tile.tile-xl .sector-name {
  font-size: 22px;
  line-height: 28px;
}

.sector-tile.tile-xl strong {
  font-size: 38px;
  line-height: 46px;
}

.sector-tile.tile-wide strong {
  font-size: 30px;
  line-height: 36px;
}

.source-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  background: #eff6ff;
}

.source-row span {
  font-size: 13px;
  font-weight: 700;
}

.source-row strong {
  color: #2563eb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

.source-row em {
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}
</style>
