<template>
  <div class="page">
    <el-alert
      v-if="reviewData && !reviewData.schemaReady"
      :title="reviewData.message"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">复盘验证</h2>
          <p class="surface-subtitle">验证 AI 报告在 T+1 / T+2 / T+3 的方向、收益和回撤</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadReviews">刷新</el-button>
          <el-button type="primary" :icon="CircleCheck" :loading="verifying" @click="verifyReviews">执行复盘验证</el-button>
        </div>
      </div>
      <div class="surface-body">
        <div class="summary-grid">
          <div class="summary-card">
            <span>可复盘报告</span>
            <strong>{{ reviewData?.reportCount || 0 }}</strong>
          </div>
          <div class="summary-card">
            <span>已验证报告</span>
            <strong>{{ reviewData?.verifiedCount || 0 }}</strong>
          </div>
          <div class="summary-card">
            <span>待验证报告</span>
            <strong>{{ reviewData?.pendingCount || 0 }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">验证明细</h2>
          <p class="surface-subtitle">用真实 K 线结果校验模型判断</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="loading || verifying" :data="reviewData?.items || []" class="compact-table" height="580">
          <el-table-column prop="stockName" label="股票" min-width="150">
            <template #default="{ row }">
              <strong>{{ row.stockName }}</strong>
              <div class="muted mono">{{ row.stockCode }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="reportDate" label="报告日" min-width="120" />
          <el-table-column prop="horizonDays" label="周期" width="90">
            <template #default="{ row }">T+{{ row.horizonDays }}</template>
          </el-table-column>
          <el-table-column label="方向" min-width="160">
            <template #default="{ row }">
              <el-tag effect="plain">{{ directionText(row.predictionDirection) }}</el-tag>
              <span class="direction-arrow">→</span>
              <el-tag :type="row.directionCorrect ? 'success' : 'danger'" effect="plain">{{ directionText(row.actualDirection) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="收益" min-width="120" align="right">
            <template #default="{ row }">
              <span :class="Number(row.pctChange || 0) >= 0 ? 'up' : 'down'">{{ formatSignedPercent(row.pctChange) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="最大回撤" min-width="120" align="right">
            <template #default="{ row }">{{ formatSignedPercent(row.maxDrawdown) }}</template>
          </el-table-column>
          <el-table-column label="复盘分" min-width="120" align="right">
            <template #default="{ row }">
              <strong>{{ Number(row.successScore || 0).toFixed(1) }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="结果" width="110">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'warning'" effect="plain">{{ row.success ? '有效' : '待改进' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="验证时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.evaluatedAt) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && !reviewData?.items?.length" description="暂无验证结果，点击执行复盘验证" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, Refresh } from '@element-plus/icons-vue'
import { fetchAiEvolutionReviews, verifyAiEvolutionReviews } from '../services/aiEvolution'

const loading = ref(false)
const verifying = ref(false)
const reviewData = ref(null)

async function loadReviews() {
  loading.value = true
  try {
    reviewData.value = await fetchAiEvolutionReviews()
  } catch (error) {
    ElMessage.error(error.message || '复盘数据加载失败')
  } finally {
    loading.value = false
  }
}

async function verifyReviews() {
  verifying.value = true
  try {
    reviewData.value = await verifyAiEvolutionReviews()
    ElMessage.success('复盘验证已完成')
  } catch (error) {
    console.error('[猫狗智投] 复盘验证失败', error)
    ElMessage.error(error.message || '复盘验证失败')
  } finally {
    verifying.value = false
  }
}

function directionText(value) {
  if (value === 'UP') return '看涨'
  if (value === 'DOWN') return '看跌'
  if (value === 'SIDEWAYS') return '震荡'
  return '未知'
}

function formatSignedPercent(value) {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
}

onMounted(loadReviews)
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f8fafc;
}

.summary-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 28px;
}

.direction-arrow {
  margin: 0 8px;
  color: #94a3b8;
}
</style>
