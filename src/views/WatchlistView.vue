<template>
  <div class="page">
    <section class="surface toolbar-surface">
      <div class="surface-body watch-toolbar">
        <el-segmented v-model="group" :options="['全部', 'AI重点', '高波动', '价值股', '已持仓']" />
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
        <el-button :icon="Upload">批量导入</el-button>
      </div>
    </section>

    <div class="section-grid watch-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">自选股列表</h2>
          </div>
        </div>
        <div class="surface-body">
          <el-table
            v-loading="loading"
            :data="filteredStocks"
            class="compact-table"
            row-key="code"
            highlight-current-row
            @row-click="selectStock"
          >
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
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button link type="primary">详情</el-button>
                <el-button link type="danger" @click.stop="deleteStock(row)">删除</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无自选股，请先添加股票代码" />
            </template>
          </el-table>
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
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload } from '@element-plus/icons-vue'
import AiReportBlock from '../components/AiReportBlock.vue'
import EChart from '../components/EChart.vue'
import { klineOption, lineOption } from '../services/chartOptions'
import { fetchStockDetail, searchStocks } from '../services/stocks'
import { addWatchStock, fetchWatchlist, removeWatchStock } from '../services/watchlist'

const group = ref('全部')
const detailTab = ref('kline')
const newCode = ref('')
const selectedSuggestion = ref(null)
const loading = ref(false)
const detailLoading = ref(false)
const adding = ref(false)
const watchStocks = ref([])
const selected = ref(null)
const detail = ref(null)

const filteredStocks = computed(() => {
  if (group.value === 'AI重点') return watchStocks.value.filter((item) => item.aiScore >= 78)
  if (group.value === '高波动') return watchStocks.value.filter((item) => item.volumeRatio >= 1.8)
  if (group.value === '价值股') return watchStocks.value.filter((item) => item.pe > 0 && item.pe < 25)
  if (group.value === '已持仓') return watchStocks.value.filter((item) => ['600519', '300750', '688981', '600036'].includes(item.code))
  return watchStocks.value
})

const intradayValues = computed(() => (detail.value?.intraday || []).map((point) => Number(point.value)))
const intradayTimes = computed(() => (detail.value?.intraday || []).map((point) => point.time))
const financeItems = computed(() => [
  { label: 'PE(TTM)', value: selected.value.pe || '暂无' },
  { label: 'PB', value: selected.value.pb || '暂无' },
  { label: '营收同比', value: formatPercent(selected.value.revenueGrowth) },
  { label: '净利同比', value: formatPercent(selected.value.profitGrowth) },
])

async function loadWatchlist() {
  loading.value = true
  try {
    const list = await fetchWatchlist()
    watchStocks.value = list.map(normalizeStock)
    if (!selected.value && watchStocks.value.length) {
      await selectStock(watchStocks.value[0])
    } else if (selected.value) {
      selected.value = watchStocks.value.find((item) => item.code === selected.value.code) || watchStocks.value[0] || null
    }
  } catch (error) {
    ElMessage.error(error.message || '自选股列表获取失败')
  } finally {
    loading.value = false
  }
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

async function deleteStock(row) {
  try {
    await ElMessageBox.confirm(`确认删除 ${row.name || row.code}？`, '删除自选股', { type: 'warning' })
    await removeWatchStock(row.code)
    ElMessage.success('已删除')
    if (selected.value?.code === row.code) {
      selected.value = null
      detail.value = null
    }
    await loadWatchlist()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除自选股失败')
    }
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
  }
}

function formatPercent(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : ''}${number}%`
}

watch(group, () => {
  if (filteredStocks.value.length && !filteredStocks.value.some((item) => item.code === selected.value?.code)) {
    selectStock(filteredStocks.value[0])
  }
})

onMounted(loadWatchlist)
</script>

<style scoped>
.toolbar-surface .surface-body {
  padding-bottom: 14px;
}

.watch-toolbar {
  display: grid;
  grid-template-columns: auto minmax(24px, 1fr) 260px auto auto;
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
