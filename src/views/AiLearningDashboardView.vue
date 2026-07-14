<template>
  <div class="page">
    <el-alert
      v-if="dashboard && !dashboard.schemaReady"
      :title="dashboard.message"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">AI 学习总览</h2>
          <p class="surface-subtitle">用样本、因子、标签、回测和策略版本证明 AI 判断力是否真的提升</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadDashboard">刷新</el-button>
          <el-button :icon="Collection" :loading="building" @click="buildSamples">构建样本</el-button>
          <el-button type="primary" :icon="CircleCheck" :loading="verifying" @click="verifyLabels">复盘打标</el-button>
          <el-button type="success" :icon="TrendCharts" :loading="backtesting" @click="runBacktest">跑回测</el-button>
        </div>
      </div>
      <div class="surface-body">
        <div class="learning-metrics">
          <div v-for="metric in dashboard?.metrics || fallbackMetrics" :key="metric.label" class="learning-metric" :class="metric.tone">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <em>{{ metric.helper }}</em>
          </div>
        </div>
      </div>
    </section>

    <div class="section-grid grid-2">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">样本外胜率</h2>
            <p class="surface-subtitle">绿色基线为 50%，低于基线时不允许盲目进化</p>
          </div>
        </div>
        <div class="surface-body">
          <EChart :option="winRateOption" height="300px" />
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">净收益曲线</h2>
            <p class="surface-subtitle">按已验证标签累计，用于发现策略退化</p>
          </div>
        </div>
        <div class="surface-body">
          <EChart :option="equityOption" height="300px" />
        </div>
      </section>
    </div>

    <div class="section-grid grid-main-side">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">高权重因子</h2>
            <p class="surface-subtitle">优先看置信下界和样本量，避免样本内自嗨</p>
          </div>
          <el-button text type="primary" @click="router.push('/ai-factor-hub')">进入因子中心</el-button>
        </div>
        <div class="surface-body">
          <el-table :data="dashboard?.topFactors || []" class="compact-table" height="360">
            <el-table-column prop="factorName" label="因子" min-width="170">
              <template #default="{ row }">
                <strong>{{ row.factorName }}</strong>
                <div class="muted mono">{{ row.factorCode }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="marketRegime" label="环境" width="100">
              <template #default="{ row }">{{ statusLabel(row.marketRegime, '待确认') }}</template>
            </el-table-column>
            <el-table-column label="样本" width="80" align="right" prop="sampleCount" />
            <el-table-column label="胜率" width="100" align="right">
              <template #default="{ row }">{{ formatPercent(row.successRate) }}</template>
            </el-table-column>
            <el-table-column label="置信下界" width="110" align="right">
              <template #default="{ row }">{{ formatPercent(row.confidenceLowerBound) }}</template>
            </el-table-column>
            <el-table-column label="均收" width="100" align="right">
              <template #default="{ row }">
                <span :class="Number(row.avgReturn || 0) >= 0 ? 'up' : 'down'">{{ formatSignedPercent(row.avgReturn) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="权重" width="130">
              <template #default="{ row }">
                <el-progress :percentage="Number(row.weightScore || 0)" :stroke-width="8" />
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!dashboard?.topFactors?.length" description="暂无因子统计，请先构建样本并复盘打标" />
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">学习告警</h2>
            <p class="surface-subtitle">开放前必须持续关注这些风险</p>
          </div>
        </div>
        <div class="surface-body alert-list">
          <el-alert
            v-for="alert in dashboard?.alerts || []"
            :key="alert.title"
            :title="alert.title"
            :description="alert.message"
            :type="alert.level === 'danger' ? 'error' : alert.level"
            show-icon
            :closable="false"
          />
          <el-empty v-if="!dashboard?.alerts?.length" description="暂无学习告警" />
          <div class="active-strategy">
            <span>当前策略</span>
            <strong>{{ dashboard?.activeStrategy || '暂无启用策略' }}</strong>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleCheck, Collection, Refresh, TrendCharts } from '@element-plus/icons-vue'
import EChart from '../components/EChart.vue'
import {
  buildWatchlistSamples,
  fetchLearningDashboard,
  runLearningBacktest,
  verifyLearningLabels,
} from '../services/aiLearning'
import { statusLabel } from '../utils/statusLabels'

const router = useRouter()
const dashboard = ref(null)
const loading = ref(false)
const building = ref(false)
const verifying = ref(false)
const backtesting = ref(false)

const fallbackMetrics = [
  { label: '样本数', value: '0', helper: '等待构建', tone: 'blue' },
  { label: '样本外胜率', value: '0%', helper: '等待复盘', tone: 'green' },
  { label: '平均净收益', value: '0%', helper: '等待标签', tone: 'red' },
  { label: '平均最大浮亏', value: '0%', helper: '等待回测', tone: 'yellow' },
]

const winRateOption = computed(() => lineOption(
  '样本外胜率',
  dashboard.value?.winRateCurve || [],
  '%',
))

const equityOption = computed(() => lineOption(
  '累计净收益',
  dashboard.value?.equityCurve || [],
  '%',
))

async function loadDashboard() {
  loading.value = true
  try {
    dashboard.value = await fetchLearningDashboard()
  } catch (error) {
    ElMessage.error(error.message || 'AI 学习总览加载失败')
  } finally {
    loading.value = false
  }
}

async function buildSamples() {
  building.value = true
  try {
    await buildWatchlistSamples({ universeCode: 'WATCHLIST', samplePhase: 'AFTER_CLOSE' })
    ElMessage.success('自选股学习样本已构建')
    await loadDashboard()
  } catch (error) {
    console.error('[猫狗智投] 构建学习样本失败', error)
    ElMessage.error(error.message || '构建学习样本失败')
  } finally {
    building.value = false
  }
}

async function verifyLabels() {
  verifying.value = true
  try {
    await verifyLearningLabels()
    ElMessage.success('复盘标签已刷新')
    await loadDashboard()
  } catch (error) {
    console.error('[猫狗智投] 复盘打标失败', error)
    ElMessage.error(error.message || '复盘打标失败')
  } finally {
    verifying.value = false
  }
}

async function runBacktest() {
  backtesting.value = true
  try {
    await runLearningBacktest({ universeCode: 'WATCHLIST', horizonDays: 3, topK: 5 })
    ElMessage.success('Top 5 回测已完成')
    await loadDashboard()
  } catch (error) {
    console.error('[猫狗智投] 回测失败', error)
    ElMessage.error(error.message || '回测失败')
  } finally {
    backtesting.value = false
  }
}

function lineOption(title, points, suffix) {
  const labels = points.map((item) => item.label)
  return {
    grid: { left: 38, right: 20, top: 34, bottom: 32 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: labels, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { formatter: `{value}${suffix}` }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [
      {
        name: title,
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: points.map((item) => Number(item.value || 0)),
        lineStyle: { color: '#2563eb', width: 3 },
        itemStyle: { color: '#2563eb' },
        areaStyle: { color: 'rgba(37, 99, 235, 0.08)' },
      },
      {
        name: '基线',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: points.map((item) => Number(item.benchmarkValue || 0)),
        lineStyle: { color: '#16a34a', width: 1.5, type: 'dashed' },
      },
    ],
  }
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatSignedPercent(value) {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

onMounted(loadDashboard)
</script>

<style scoped>
.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.learning-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.learning-metric {
  min-height: 116px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
  background: #f8fafc;
}

.learning-metric span,
.learning-metric em {
  display: block;
  color: #64748b;
  font-style: normal;
  font-size: 13px;
}

.learning-metric strong {
  display: block;
  margin: 10px 0 8px;
  color: #111827;
  font-size: 30px;
  line-height: 36px;
}

.learning-metric.blue {
  background: linear-gradient(180deg, #eff6ff, #fff);
}

.learning-metric.green {
  background: linear-gradient(180deg, #f0fdf4, #fff);
}

.learning-metric.red {
  background: linear-gradient(180deg, #fef2f2, #fff);
}

.learning-metric.yellow {
  background: linear-gradient(180deg, #fffbeb, #fff);
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.active-strategy {
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px;
  background: #eff6ff;
}

.active-strategy span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.active-strategy strong {
  display: block;
  margin-top: 8px;
  color: #1d4ed8;
  line-height: 22px;
}
</style>
