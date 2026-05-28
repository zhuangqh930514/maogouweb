<template>
  <div class="page">
    <NewsTicker :items="newsItems" @select="openNews" />
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <div v-loading="marketLoading" class="home-index-grid">
      <MetricCard
        v-for="item in marketIndexes"
        :key="item.code"
        :title="item.name"
        :value="item.value.toLocaleString('zh-CN')"
        :change="item.change"
        :percent="item.percent"
        :trend="item.trend"
        compact
      />
    </div>

    <div class="section-grid grid-main-side">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">涨跌分布</h2>
          </div>
        </div>
        <div v-loading="marketLoading" class="surface-body breadth-panel">
          <div class="breadth-bars">
            <div
              v-for="bucket in marketBreadth.buckets"
              :key="`${bucket.direction}-${bucket.label}`"
              class="breadth-bucket"
            >
              <strong :class="bucket.direction">{{ bucket.count }}</strong>
              <div class="bar-wrap">
                <span
                  class="bar"
                  :class="bucket.direction"
                  :style="{ height: `${barHeight(bucket.count)}px` }"
                ></span>
              </div>
              <em>{{ bucket.label }}</em>
            </div>
          </div>

          <div class="breadth-summary">
            <span>涨跌</span>
            <strong class="down">跌 {{ marketBreadth.downCount }} 家</strong>
            <strong class="up">涨 {{ marketBreadth.upCount }} 家</strong>
            <strong class="flat">平 {{ marketBreadth.flatCount }} 家</strong>
            <strong class="up">涨停 {{ marketBreadth.limitUpCount }} 家</strong>
            <strong class="down">跌停 {{ marketBreadth.limitDownCount }} 家</strong>
          </div>
          <div class="breadth-ratio">
            <span class="down" :style="{ flex: marketBreadth.downCount || 1 }"></span>
            <span class="flat" :style="{ flex: marketBreadth.flatCount || 1 }"></span>
            <span class="up" :style="{ flex: marketBreadth.upCount || 1 }"></span>
          </div>

          <div class="breadth-summary funds">
            <span>暗盘资金</span>
            <strong class="down">净流出 {{ marketBreadth.fundOutCount }} 家</strong>
            <strong class="up">净流入 {{ marketBreadth.fundInCount }} 家</strong>
          </div>
          <div class="breadth-ratio">
            <span class="down" :style="{ flex: marketBreadth.fundOutCount || 1 }"></span>
            <span class="flat" :style="{ flex: marketBreadth.fundFlatCount || 1 }"></span>
            <span class="up" :style="{ flex: marketBreadth.fundInCount || 1 }"></span>
          </div>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">财经快讯</h2>
          </div>
        </div>
        <div v-loading="newsLoading" class="surface-body news-list">
          <button
            v-for="item in newsItems"
            :key="`${item.time}-${item.title}`"
            class="news-row"
            type="button"
            @click="openNews(item)"
          >
            <span class="news-dot"></span>
            <span class="news-time">{{ item.time }}</span>
            <div>
              <div class="news-title">{{ item.title }}</div>
              <div class="news-source">{{ item.source }}</div>
            </div>
          </button>
        </div>
      </section>
    </div>

    <div class="section-grid grid-main-side">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">市场前十热度股票</h2>
            <p class="surface-subtitle">按全市场主力净流入热度排序展示</p>
          </div>
          <el-tag class="tag-red" effect="plain">TOP 10</el-tag>
        </div>
        <div class="surface-body">
          <el-table :data="marketHotStocks" class="compact-table" row-key="code">
            <el-table-column prop="rank" label="排名" width="80" />
            <el-table-column prop="name" label="股票" min-width="120">
              <template #default="{ row }">
                <strong>{{ row.name }}</strong>
                <div class="muted mono">{{ row.code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="现价" width="110">
              <template #default="{ row }">
                <span class="mono">{{ row.price.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="涨跌幅" width="110">
              <template #default="{ row }">
                <span :class="row.percent >= 0 ? 'up' : 'down'" class="mono">
                  {{ formatPercent(row.percent) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="净流入" min-width="150">
              <template #default="{ row }">
                <span :class="row.netInflow >= 0 ? 'up' : 'down'">{{ formatNetInflow(row.netInflow) }}</span>
              </template>
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
              <el-empty description="暂无热度股票" />
            </template>
          </el-table>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">AI 智能分析摘要</h2>
            <p class="surface-subtitle">qwen3.6 结构化报告</p>
          </div>
          <el-tag v-if="latestReport" class="tag-red" effect="plain">评分 {{ latestReport.score }}</el-tag>
        </div>
        <div class="surface-body report-summary">
          <template v-if="latestReport">
            <h3>{{ latestReport.stock }} {{ latestReport.code }}</h3>
            <p>{{ latestReport.technicalAnalysis || '暂无技术面分析' }}</p>
            <AiReportBlock title="建议买卖点" :text="latestReport.buySellPoints || '暂无建议买卖点'" tone="green" />
          </template>
          <el-empty v-else description="暂无 AI 分析报告" />
        </div>
      </section>
    </div>

    <el-dialog
      v-model="newsReaderVisible"
      :title="activeNews?.title || '财经快讯'"
      width="860px"
      top="5vh"
      class="news-reader-dialog"
      destroy-on-close
    >
      <iframe
        v-if="activeNewsUrl"
        class="news-reader-frame"
        :src="activeNewsUrl"
        referrerpolicy="no-referrer-when-downgrade"
        title="财经快讯原文"
      ></iframe>
      <el-empty v-else description="这条快讯暂时没有原文链接" />
      <template #footer>
        <el-button @click="newsReaderVisible = false">关闭</el-button>
        <el-button v-if="activeNewsUrl" type="primary" @click="openOriginalNews">打开原文</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AiReportBlock from '../components/AiReportBlock.vue'
import MetricCard from '../components/MetricCard.vue'
import NewsTicker from '../components/NewsTicker.vue'
import { fetchAiReports } from '../services/ai'
import { fetchLatestNews, fetchMarketBreadth, fetchMarketIndexes, fetchMarketHotStocks } from '../services/market'
import { addWatchStock, fetchWatchlist } from '../services/watchlist'
import { isAshareMarketOpen } from '../utils/marketTime'

const marketLoading = ref(false)
const newsLoading = ref(false)
const errorMessage = ref('')
const marketIndexes = ref([])
const marketBreadth = ref(emptyBreadth())
const newsItems = ref([])
const marketHotStocks = ref([])
const aiReports = ref([])
const watchlistCodes = ref(new Set())
const addingCodes = ref(new Set())
const newsReaderVisible = ref(false)
const activeNews = ref(null)
const activeNewsUrl = computed(() => normalizeNewsUrl(activeNews.value?.url))
const latestReport = computed(() => aiReports.value[0])
const maxBucketCount = computed(() => Math.max(1, ...marketBreadth.value.buckets.map((item) => item.count)))
let refreshTimer = null
let breadthRefreshTimer = null
let newsRefreshTimer = null

async function loadNews() {
  newsLoading.value = true
  errorMessage.value = ''
  try {
    newsItems.value = await fetchLatestNews(50)
  } catch (error) {
    errorMessage.value = error.message || '财经快讯获取失败'
    ElMessage.error(errorMessage.value)
  } finally {
    newsLoading.value = false
  }
}

async function loadMarket() {
  marketLoading.value = true
  errorMessage.value = ''
  try {
    const [indexesResult, breadthResult] = await Promise.allSettled([loadMarketIndexes(), loadMarketBreadth()])
    if (indexesResult.status === 'rejected' && breadthResult.status === 'rejected') {
      throw indexesResult.reason
    }
  } catch (error) {
    errorMessage.value = error.message || '实时行情数据获取失败'
    ElMessage.error(errorMessage.value)
  } finally {
    marketLoading.value = false
  }
}

async function loadMarketIndexes() {
  try {
    marketIndexes.value = (await fetchMarketIndexes()).map(normalizeIndex)
  } catch (error) {
    ElMessage.error(error?.message || '核心指数数据获取失败')
    throw error
  }
}

async function loadMarketBreadth() {
  try {
    marketBreadth.value = normalizeBreadth(await fetchMarketBreadth())
  } catch (error) {
    ElMessage.error(error?.message || '涨跌分布数据获取失败')
    throw error
  }
}

function emptyBreadth() {
  return {
    buckets: [
      { label: '>10%', count: 0, direction: 'down' },
      { label: '10~7', count: 0, direction: 'down' },
      { label: '7~5', count: 0, direction: 'down' },
      { label: '5~3', count: 0, direction: 'down' },
      { label: '3~0', count: 0, direction: 'down' },
      { label: '0', count: 0, direction: 'flat' },
      { label: '0~3', count: 0, direction: 'up' },
      { label: '3~5', count: 0, direction: 'up' },
      { label: '5~7', count: 0, direction: 'up' },
      { label: '7~10', count: 0, direction: 'up' },
      { label: '>10%', count: 0, direction: 'up' },
    ],
    upCount: 0,
    downCount: 0,
    flatCount: 0,
    limitUpCount: 0,
    limitDownCount: 0,
    fundInCount: 0,
    fundOutCount: 0,
    fundFlatCount: 0,
  }
}

function normalizeBreadth(value) {
  return {
    ...emptyBreadth(),
    ...value,
    buckets: (value?.buckets || emptyBreadth().buckets).map((item) => ({
      ...item,
      count: Number(item.count || 0),
    })),
    upCount: Number(value?.upCount || 0),
    downCount: Number(value?.downCount || 0),
    flatCount: Number(value?.flatCount || 0),
    limitUpCount: Number(value?.limitUpCount || 0),
    limitDownCount: Number(value?.limitDownCount || 0),
    fundInCount: Number(value?.fundInCount || 0),
    fundOutCount: Number(value?.fundOutCount || 0),
    fundFlatCount: Number(value?.fundFlatCount || 0),
  }
}

function barHeight(count) {
  return Math.max(4, Math.round((Number(count || 0) / maxBucketCount.value) * 118))
}

async function loadHomeExtras() {
  try {
    const [stocks, reports] = await Promise.all([fetchMarketHotStocks(10), fetchAiReports()])
    marketHotStocks.value = stocks.map(normalizeHotStock)
    aiReports.value = reports
  } catch (error) {
    ElMessage.error(error.message || '首页热度股票/AI 摘要获取失败')
  }
}

async function loadWatchlistCodes() {
  try {
    const list = await fetchWatchlist()
    watchlistCodes.value = new Set(list.map((item) => item.code))
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

function normalizeIndex(item) {
  return {
    ...item,
    value: Number(item.value),
    change: Number(item.change),
    percent: Number(item.percent),
    trend: (item.trend || []).map((value) => Number(value)),
  }
}

function normalizeHotStock(item) {
  return {
    ...item,
    rank: Number(item.rank || 0),
    price: Number(item.price || 0),
    percent: Number(item.percent || 0),
    netInflow: Number(item.netInflow || 0),
  }
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

function openNews(item) {
  activeNews.value = item
  newsReaderVisible.value = true
}

function openOriginalNews() {
  window.open(activeNewsUrl.value, '_blank', 'noopener,noreferrer')
}

function normalizeNewsUrl(url) {
  if (!url) {
    return ''
  }
  if (window.location.protocol === 'https:' && url.startsWith('http://')) {
    return url.replace('http://', 'https://')
  }
  return url
}

onMounted(() => {
  loadNews()
  loadMarket()
  loadHomeExtras()
  loadWatchlistCodes()
  refreshTimer = window.setInterval(() => {
    if (isAshareMarketOpen()) {
      loadMarketIndexes()
      loadHomeExtras()
    }
  }, 10000)
  breadthRefreshTimer = window.setInterval(() => {
    if (isAshareMarketOpen()) {
      loadMarketBreadth()
    }
  }, 60000)
  newsRefreshTimer = window.setInterval(loadNews, 60000)
})

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }
  if (breadthRefreshTimer) {
    window.clearInterval(breadthRefreshTimer)
  }
  if (newsRefreshTimer) {
    window.clearInterval(newsRefreshTimer)
  }
})
</script>

<style scoped>
.home-index-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: 620px;
  overflow-y: auto;
  padding-right: 10px;
}

.news-list::-webkit-scrollbar {
  width: 6px;
}

.news-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.breadth-panel {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.breadth-bars {
  min-height: 172px;
  display: grid;
  grid-template-columns: repeat(11, minmax(0, 1fr));
  align-items: end;
  gap: 10px;
  padding-top: 8px;
}

.breadth-bucket {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.breadth-bucket strong {
  font-size: 16px;
  line-height: 20px;
}

.breadth-bucket em {
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
  line-height: 16px;
  white-space: nowrap;
}

.bar-wrap {
  height: 124px;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 28px;
  min-height: 4px;
  border-radius: 5px 5px 0 0;
}

.up {
  color: #ef3348;
}

.down {
  color: #16a34a;
}

.flat {
  color: #8b8f98;
}

.bar.up,
.breadth-ratio .up {
  background: #ff2f45;
}

.bar.down,
.breadth-ratio .down {
  background: #16a34a;
}

.bar.flat,
.breadth-ratio .flat {
  background: #9ca3af;
}

.breadth-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 16px;
  line-height: 24px;
}

.breadth-summary span {
  color: #111827;
  font-size: 18px;
  font-weight: 800;
}

.breadth-summary strong {
  font-weight: 800;
}

.breadth-summary.funds {
  margin-top: 4px;
}

.breadth-ratio {
  height: 10px;
  display: flex;
  gap: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: #f1f5f9;
}

.breadth-ratio span {
  min-width: 4px;
}

.news-row {
  display: grid;
  grid-template-columns: 8px 44px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid #eef2f7;
  padding-bottom: 16px;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.news-row:hover .news-title {
  color: #2563eb;
}

.news-row:last-child {
  border-bottom: 0;
}

.news-dot {
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 999px;
  background: #2563eb;
}

.news-time {
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  line-height: 22px;
}

.news-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
}

.news-source {
  color: #9ca3af;
  font-size: 12px;
  line-height: 18px;
}

.report-summary h3 {
  margin: 0 0 10px;
  font-size: 22px;
  line-height: 30px;
}

.report-summary p {
  margin: 0 0 18px;
  color: #4b5563;
  line-height: 24px;
}

:deep(.news-reader-dialog .el-dialog__body) {
  padding: 0;
}

.news-reader-frame {
  display: block;
  width: 100%;
  height: 72vh;
  border: 0;
  background: #fff;
}
</style>
