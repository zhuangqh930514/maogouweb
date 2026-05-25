<template>
  <div class="page">
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <div v-loading="loading" class="section-grid grid-4">
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
            <h2 class="surface-title">核心指数分时 / K线联动分析</h2>
            <p class="surface-subtitle">展示上证指数、深证成指、创业板指、科创板指走势</p>
          </div>
          <el-tag class="tag-blue" effect="plain">10 秒刷新</el-tag>
        </div>
        <div v-loading="loading" class="surface-body">
          <EChart :option="multiIndexOption(marketIndexes)" height="430px" />
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">实时数据源</h2>
            <p class="surface-subtitle">后端通过新浪行情接口拉取指数点位和分时走势</p>
          </div>
        </div>
        <div class="surface-body source-panel">
          <div
            v-for="item in marketIndexes"
            :key="item.code"
            class="source-row"
          >
            <span>{{ item.name }}</span>
            <strong>{{ item.code }}</strong>
            <em>{{ item.trend.length }} 个分时点</em>
          </div>
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">指数成分与资金概览</h2>
          <p class="surface-subtitle">来自 /api/market/indexes 的实时指数快照</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="loading" :data="indexRows" class="compact-table" row-key="code">
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="code" label="代码" width="130" />
          <el-table-column label="最新点位" width="150">
            <template #default="{ row }">
              <span class="mono">{{ row.value.toLocaleString('zh-CN') }}</span>
            </template>
          </el-table-column>
          <el-table-column label="涨跌额" width="130">
            <template #default="{ row }">
              <span :class="row.change >= 0 ? 'up' : 'down'">
                {{ row.change >= 0 ? '+' : '' }}{{ row.change.toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="涨跌幅" width="130">
            <template #default="{ row }">
              <span :class="row.percent >= 0 ? 'up' : 'down'">
                {{ row.percent >= 0 ? '+' : '' }}{{ row.percent.toFixed(2) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column label="分时点数" width="120">
            <template #default="{ row }">
              <span class="mono">{{ row.trend.length }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" min-width="160" />
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import EChart from '../components/EChart.vue'
import MetricCard from '../components/MetricCard.vue'
import { multiIndexOption } from '../services/chartOptions'
import { fetchMarketIndexes } from '../services/market'

const loading = ref(false)
const errorMessage = ref('')
const marketIndexes = ref([])
const indexRows = computed(() => marketIndexes.value.map((item) => ({
  ...item,
  status: item.percent >= 0 ? '实时上涨' : '实时回落',
})))
let refreshTimer = null

async function loadIndexes() {
  loading.value = true
  errorMessage.value = ''
  try {
    const indexes = await fetchMarketIndexes()
    marketIndexes.value = indexes.map(normalizeIndex)
  } catch (error) {
    errorMessage.value = error.message || '大盘实时数据获取失败'
    ElMessage.error(errorMessage.value)
  } finally {
    loading.value = false
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

onMounted(() => {
  loadIndexes()
  refreshTimer = window.setInterval(loadIndexes, 10000)
})

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.source-panel {
  display: grid;
  gap: 12px;
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
