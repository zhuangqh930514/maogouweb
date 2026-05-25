<template>
  <div class="page">
    <NewsTicker :items="newsItems" @select="openNews" />
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <div v-loading="marketLoading" class="section-grid grid-4">
      <MetricCard
        v-for="item in marketIndexes"
        :key="item.code"
        :title="item.name"
        :value="item.value.toLocaleString('zh-CN')"
        :change="item.change"
        :percent="item.percent"
        :trend="item.trend"
      />
    </div>

    <div class="section-grid grid-main-side">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">沪深核心指数实时分时</h2>
          </div>
        </div>
        <div v-loading="marketLoading" class="surface-body">
          <EChart :option="lineOption(firstIndex?.name || '上证指数', intradayValues, intradayTimes)" height="320px" />
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
            <h2 class="surface-title">自选股与持仓盈亏</h2>
            <p class="surface-subtitle">实时价驱动持仓浮动盈亏计算</p>
          </div>
          <el-button type="primary" :icon="Plus">添加自选</el-button>
        </div>
        <div class="surface-body">
          <el-table :data="watchStocks.slice(0, 4)" class="compact-table" row-key="code">
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
                  {{ row.percent >= 0 ? '+' : '' }}{{ row.percent.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="advice" label="AI建议" min-width="140">
              <template #default="{ row }">
                <el-tag class="tag-blue" effect="plain">{{ row.advice }}</el-tag>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无自选股" />
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
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AiReportBlock from '../components/AiReportBlock.vue'
import EChart from '../components/EChart.vue'
import MetricCard from '../components/MetricCard.vue'
import NewsTicker from '../components/NewsTicker.vue'
import { lineOption } from '../services/chartOptions'
import { fetchAiReports } from '../services/ai'
import { fetchIndexIntraday, fetchLatestNews, fetchMarketIndexes } from '../services/market'
import { fetchWatchlist } from '../services/watchlist'

const marketLoading = ref(false)
const newsLoading = ref(false)
const errorMessage = ref('')
const marketIndexes = ref([])
const newsItems = ref([])
const watchStocks = ref([])
const aiReports = ref([])
const intradayPoints = ref([])
const newsReaderVisible = ref(false)
const activeNews = ref(null)
const firstIndex = computed(() => marketIndexes.value[0])
const intradayValues = computed(() => intradayPoints.value.map((point) => Number(point.value)))
const intradayTimes = computed(() => intradayPoints.value.map((point) => point.time))
const activeNewsUrl = computed(() => normalizeNewsUrl(activeNews.value?.url))
const latestReport = computed(() => aiReports.value[0])
let refreshTimer = null
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
    const indexes = await fetchMarketIndexes()
    marketIndexes.value = indexes.map(normalizeIndex)
    if (indexes[0]?.code) {
      intradayPoints.value = await fetchIndexIntraday(indexes[0].code)
    }
  } catch (error) {
    errorMessage.value = error.message || '实时行情数据获取失败'
    ElMessage.error(errorMessage.value)
  } finally {
    marketLoading.value = false
  }
}

async function loadHomeExtras() {
  try {
    const [stocks, reports] = await Promise.all([fetchWatchlist(), fetchAiReports()])
    watchStocks.value = stocks.map(normalizeStock)
    aiReports.value = reports
  } catch (error) {
    ElMessage.error(error.message || '首页自选股/AI 摘要获取失败')
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

function normalizeStock(item) {
  return {
    ...item,
    price: Number(item.price || 0),
    percent: Number(item.percent || 0),
    volumeRatio: Number(item.volumeRatio || 0),
  }
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
  refreshTimer = window.setInterval(loadMarket, 10000)
  newsRefreshTimer = window.setInterval(loadNews, 60000)
})

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }
  if (newsRefreshTimer) {
    window.clearInterval(newsRefreshTimer)
  }
})
</script>

<style scoped>
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
