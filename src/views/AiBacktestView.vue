<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">回测中心</h2>
          <p class="surface-subtitle">上线前用真实标签验证 Top K 组合收益、胜率和最大回撤</p>
        </div>
        <div class="header-actions">
          <el-select v-model="form.horizonDays" style="width: 110px">
            <el-option label="T+1" :value="1" />
            <el-option label="T+3" :value="3" />
            <el-option label="T+5" :value="5" />
          </el-select>
          <el-input-number v-model="form.topK" :min="1" :max="20" />
          <el-button :icon="Refresh" :loading="loading" @click="loadBacktests">刷新</el-button>
          <el-button type="primary" :icon="TrendCharts" :loading="running" @click="runBacktest">运行回测</el-button>
        </div>
      </div>
    </section>

    <div class="section-grid grid-main-side">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">回测记录</h2>
            <p class="surface-subtitle">点击记录查看交易明细</p>
          </div>
        </div>
        <div class="surface-body">
          <el-table v-loading="loading || running" :data="data?.runs || []" class="compact-table" height="620" @row-click="openDetail">
            <el-table-column prop="title" label="回测" min-width="190">
              <template #default="{ row }">
                <strong>{{ row.title }}</strong>
                <div class="muted mono">#{{ row.id }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="horizonDays" label="周期" width="80">
              <template #default="{ row }">T+{{ row.horizonDays }}</template>
            </el-table-column>
            <el-table-column prop="topK" label="TopK" width="80" />
            <el-table-column label="总收益" width="110" align="right">
              <template #default="{ row }">
                <span :class="Number(row.totalReturn || 0) >= 0 ? 'up' : 'down'">{{ formatSignedPercent(row.totalReturn) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="胜率" width="100" align="right">
              <template #default="{ row }">{{ formatPercent(row.winRate) }}</template>
            </el-table-column>
            <el-table-column label="平均收益" width="110" align="right">
              <template #default="{ row }">{{ formatSignedPercent(row.avgReturn) }}</template>
            </el-table-column>
            <el-table-column label="最大回撤" width="110" align="right">
              <template #default="{ row }">{{ formatSignedPercent(row.maxDrawdown) }}</template>
            </el-table-column>
            <el-table-column prop="tradeCount" label="交易" width="80" align="right" />
            <el-table-column prop="createdAt" label="时间" min-width="170">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">回测指标</h2>
            <p class="surface-subtitle">当前选中回测的完整指标</p>
          </div>
        </div>
        <div class="surface-body detail-side">
          <pre>{{ prettyJson(detail?.metricsJson) }}</pre>
          <pre>{{ prettyJson(detail?.equityCurveJson) }}</pre>
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">交易明细</h2>
          <p class="surface-subtitle">净收益和最大回撤用于判断策略是否适合上线</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table :data="detail?.trades || []" class="compact-table" height="520">
          <el-table-column prop="stockName" label="股票" min-width="150">
            <template #default="{ row }">
              <strong>{{ row.stockName }}</strong>
              <div class="muted mono">{{ row.stockCode }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="rankNo" label="排名" width="80" />
          <el-table-column prop="entryDate" label="入场日" width="120" />
          <el-table-column prop="exitDate" label="出场日" width="120" />
          <el-table-column prop="entryPrice" label="入场价" width="110" align="right" />
          <el-table-column prop="exitPrice" label="出场价" width="110" align="right" />
          <el-table-column label="净收益" width="120" align="right">
            <template #default="{ row }">
              <span :class="Number(row.netReturn || 0) >= 0 ? 'up' : 'down'">{{ formatSignedPercent(row.netReturn) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="最大回撤" width="120" align="right">
            <template #default="{ row }">{{ formatSignedPercent(row.maxDrawdown) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!detail?.trades?.length" description="请选择或运行一次回测" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, TrendCharts } from '@element-plus/icons-vue'
import { fetchLearningBacktestDetail, fetchLearningBacktests, runLearningBacktest } from '../services/aiLearning'

const form = reactive({ horizonDays: 3, topK: 5 })
const data = ref(null)
const detail = ref(null)
const loading = ref(false)
const running = ref(false)

async function loadBacktests() {
  loading.value = true
  try {
    data.value = await fetchLearningBacktests()
    if (!detail.value && data.value?.runs?.[0]) {
      await openDetail(data.value.runs[0])
    }
  } catch (error) {
    ElMessage.error(error.message || '回测记录加载失败')
  } finally {
    loading.value = false
  }
}

async function runBacktest() {
  running.value = true
  try {
    detail.value = await runLearningBacktest({ universeCode: 'WATCHLIST', horizonDays: form.horizonDays, topK: form.topK })
    await loadBacktests()
    ElMessage.success('回测已完成')
  } catch (error) {
    console.error('[猫狗智投] 运行回测失败', error)
    ElMessage.error(error.message || '运行回测失败')
  } finally {
    running.value = false
  }
}

async function openDetail(row) {
  try {
    detail.value = await fetchLearningBacktestDetail(row.id)
  } catch (error) {
    ElMessage.error(error.message || '回测详情加载失败')
  }
}

function prettyJson(value) {
  if (!value) return '{}'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatSignedPercent(value) {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
}

onMounted(loadBacktests)
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.detail-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

pre {
  min-height: 160px;
  max-height: 260px;
  overflow: auto;
  margin: 0;
  border-radius: 8px;
  padding: 12px;
  background: #0f172a;
  color: #dbeafe;
  font-size: 12px;
  line-height: 18px;
}
</style>
