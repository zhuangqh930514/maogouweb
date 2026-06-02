<template>
  <div class="page">
    <el-alert
      v-if="dashboard && !dashboard.schemaReady"
      :title="dashboard.message"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="surface evolution-hero">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">AI 进化总览</h2>
          <p class="surface-subtitle">把 AI 分析从“生成报告”升级为“复盘、归因、调权、可回滚策略”</p>
        </div>
        <div class="hero-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadDashboard">刷新</el-button>
          <el-button type="primary" :icon="VideoPlay" @click="router.push('/ai-reviews')">执行复盘</el-button>
        </div>
      </div>
      <div v-loading="loading" class="surface-body">
        <div class="metric-grid">
          <div v-for="metric in dashboard?.metrics || fallbackMetrics" :key="metric.label" class="evolution-metric" :class="metric.tone">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <em>{{ metric.helper }}</em>
          </div>
        </div>
      </div>
    </section>

    <div class="section-grid dashboard-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">高权重因子</h2>
            <p class="surface-subtitle">基于历史复盘结果自动统计</p>
          </div>
          <el-button text type="primary" @click="router.push('/ai-factors')">查看因子学习</el-button>
        </div>
        <div class="surface-body factor-list">
          <div v-for="factor in dashboard?.topFactors || []" :key="factor.factorCode" class="factor-row">
            <div>
              <strong>{{ factor.factorName }}</strong>
              <span>{{ factor.factorCode }} · {{ factor.factorGroup }}</span>
            </div>
            <div class="factor-score">
              <b>{{ formatPercent(factor.successRate) }}</b>
              <small>样本 {{ factor.sampleCount }} · 均收 {{ formatSignedPercent(factor.avgReturn) }}</small>
            </div>
          </div>
          <el-empty v-if="!dashboard?.topFactors?.length" description="暂无因子统计，请先执行复盘验证" />
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">近期复盘动态</h2>
            <p class="surface-subtitle">验证 AI 判断是否被市场兑现</p>
          </div>
        </div>
        <div class="surface-body activity-list">
          <div v-for="activity in dashboard?.recentActivities || []" :key="`${activity.title}-${activity.time}`" class="activity-row">
            <span class="activity-dot" :class="activity.type?.toLowerCase()"></span>
            <div>
              <strong>{{ activity.title }}</strong>
              <p>{{ activity.description }}</p>
              <small>{{ formatDateTime(activity.time) }}</small>
            </div>
          </div>
          <el-empty v-if="!dashboard?.recentActivities?.length" description="暂无复盘动态" />
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">当前策略</h2>
          <p class="surface-subtitle">策略版本可以生成、启用，也可以回滚</p>
        </div>
        <el-button text type="primary" @click="router.push('/ai-strategies')">进入策略进化</el-button>
      </div>
      <div class="surface-body active-strategy">
        {{ dashboard?.activeStrategy || '暂无已启用策略' }}
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, VideoPlay } from '@element-plus/icons-vue'
import { fetchAiEvolutionDashboard } from '../services/aiEvolution'

const router = useRouter()
const loading = ref(false)
const dashboard = ref(null)

const fallbackMetrics = [
  { label: 'AI 报告数', value: '0', helper: '等待数据', tone: 'blue' },
  { label: '验证样本', value: '0', helper: '等待复盘', tone: 'green' },
  { label: '方向命中率', value: '0%', helper: '等待统计', tone: 'red' },
  { label: '平均收益', value: '0%', helper: '等待统计', tone: 'yellow' },
]

async function loadDashboard() {
  loading.value = true
  try {
    dashboard.value = await fetchAiEvolutionDashboard()
  } catch (error) {
    ElMessage.error(error.message || 'AI 进化总览加载失败')
  } finally {
    loading.value = false
  }
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
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
.evolution-hero {
  border-color: #dbeafe;
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.evolution-metric {
  min-height: 120px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
  background: #f8fafc;
}

.evolution-metric span,
.evolution-metric em {
  display: block;
  color: #64748b;
  font-style: normal;
  font-size: 13px;
}

.evolution-metric strong {
  display: block;
  margin: 12px 0 8px;
  color: #111827;
  font-size: 30px;
  line-height: 36px;
}

.evolution-metric.blue {
  background: linear-gradient(180deg, #eff6ff, #fff);
}

.evolution-metric.green {
  background: linear-gradient(180deg, #f0fdf4, #fff);
}

.evolution-metric.red {
  background: linear-gradient(180deg, #fef2f2, #fff);
}

.evolution-metric.yellow {
  background: linear-gradient(180deg, #fffbeb, #fff);
}

.dashboard-layout {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.factor-list,
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.factor-row,
.activity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px 16px;
  background: #fff;
}

.factor-row strong,
.activity-row strong {
  display: block;
  color: #111827;
  font-size: 15px;
}

.factor-row span,
.activity-row small,
.activity-row p,
.factor-score small {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.factor-score {
  text-align: right;
}

.factor-score b {
  color: #2563eb;
  font-size: 18px;
}

.activity-row {
  justify-content: flex-start;
}

.activity-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #93c5fd;
}

.activity-dot.success {
  background: #22c55e;
}

.active-strategy {
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 18px;
  font-weight: 800;
}

@media (max-width: 1240px) {
  .metric-grid,
  .dashboard-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
