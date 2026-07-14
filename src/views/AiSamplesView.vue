<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">数据样本中心</h2>
          <p class="surface-subtitle">每次预测前先固化样本，避免未来函数和无法复盘的数据污染</p>
        </div>
        <div class="header-actions">
          <el-input v-model="stockCode" clearable placeholder="股票代码" style="width: 150px" @keyup.enter="loadSamples" />
          <el-button :icon="Refresh" :loading="loading" @click="loadSamples">刷新</el-button>
          <el-button type="primary" :icon="Collection" :loading="building" @click="buildSamples">构建自选股样本</el-button>
        </div>
      </div>
      <div class="surface-body">
        <div class="summary-grid">
          <div class="summary-item">
            <span>样本数</span>
            <strong>{{ sampleData?.sampleCount || 0 }}</strong>
          </div>
          <div class="summary-item">
            <span>可交易样本</span>
            <strong>{{ sampleData?.tradableCount || 0 }}</strong>
          </div>
          <div class="summary-item">
            <span>平均数据质量</span>
            <strong>{{ Number(sampleData?.avgDataQuality || 0).toFixed(1) }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">样本明细</h2>
          <p class="surface-subtitle">点击一行查看因子、预测和复盘标签</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="loading || building" :data="sampleData?.samples || []" class="compact-table" height="620" @row-click="openDetail">
          <el-table-column prop="stockName" label="股票" min-width="150">
            <template #default="{ row }">
              <strong>{{ row.stockName }}</strong>
              <div class="muted mono">{{ row.stockCode }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="tradeDate" label="交易日" width="120" />
          <el-table-column prop="samplePhase" label="阶段" width="120">
            <template #default="{ row }">{{ statusLabel(row.samplePhase) }}</template>
          </el-table-column>
          <el-table-column prop="universeCode" label="股票池" width="120">
            <template #default="{ row }">{{ statusLabel(row.universeCode) }}</template>
          </el-table-column>
          <el-table-column prop="marketRegime" label="市场环境" width="110">
            <template #default="{ row }">{{ statusLabel(row.marketRegime, '待确认') }}</template>
          </el-table-column>
          <el-table-column label="数据质量" width="160">
            <template #default="{ row }">
              <el-progress :percentage="Number(row.dataQualityScore || 0)" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column label="可交易" width="90">
            <template #default="{ row }">
              <el-tag :type="row.tradable ? 'success' : 'danger'" effect="plain">{{ row.tradable ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="factorCount" label="因子" width="80" align="right" />
          <el-table-column prop="predictionCount" label="预测" width="80" align="right" />
          <el-table-column prop="labelCount" label="标签" width="80" align="right" />
          <el-table-column prop="sampleTime" label="采样时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.sampleTime) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-drawer v-model="drawerVisible" title="样本详情" size="70%">
      <div v-if="detail" class="detail-stack">
        <section class="detail-panel">
          <div class="detail-title">特征快照</div>
          <pre>{{ prettyJson(detail.featureSnapshot) }}</pre>
        </section>
        <section class="detail-panel">
          <div class="detail-title">命中因子</div>
          <el-table :data="detail.factors || []" class="compact-table" height="260">
            <el-table-column prop="factorName" label="因子" min-width="160">
              <template #default="{ row }">
                <strong>{{ row.factorName }}</strong>
                <div class="muted mono">{{ row.factorCode }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="factorGroup" label="分类" width="120" />
            <el-table-column label="命中" width="80">
              <template #default="{ row }">
                <el-tag :type="row.hit ? 'success' : 'info'" effect="plain">{{ row.hit ? '命中' : '未命中' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="标准值" width="100" align="right">
              <template #default="{ row }">{{ Number(row.normalizedValue || 0).toFixed(3) }}</template>
            </el-table-column>
            <el-table-column prop="evidence" label="证据" min-width="260" />
          </el-table>
        </section>
        <section class="detail-panel">
          <div class="detail-title">预测与标签</div>
          <el-table :data="detail.predictions || []" class="compact-table">
            <el-table-column prop="action" label="动作" width="90">
              <template #default="{ row }">{{ statusLabel(row.action, '待确认') }}</template>
            </el-table-column>
            <el-table-column prop="targetDirection" label="方向" width="90">
              <template #default="{ row }">{{ statusLabel(row.targetDirection, '待确认') }}</template>
            </el-table-column>
            <el-table-column prop="horizonDays" label="周期" width="80" />
            <el-table-column label="分数" width="120">
              <template #default="{ row }">{{ Number(row.score || 0).toFixed(1) }}</template>
            </el-table-column>
            <el-table-column label="风险" width="120">
              <template #default="{ row }">{{ Number(row.riskScore || 0).toFixed(1) }}</template>
            </el-table-column>
            <el-table-column prop="rankNo" label="排名" width="80" />
            <el-table-column prop="createdAt" label="时间" min-width="170">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-table :data="detail.labels || []" class="compact-table label-table">
            <el-table-column prop="horizonDays" label="周期" width="80" />
            <el-table-column label="净收益" width="110">
              <template #default="{ row }">
                <span :class="Number(row.netReturn || 0) >= 0 ? 'up' : 'down'">{{ formatSignedPercent(row.netReturn) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="最大浮盈" width="110">
              <template #default="{ row }">{{ formatSignedPercent(row.maxFavorableReturn) }}</template>
            </el-table-column>
            <el-table-column label="最大浮亏" width="110">
              <template #default="{ row }">{{ formatSignedPercent(row.maxAdverseReturn) }}</template>
            </el-table-column>
            <el-table-column label="结果" width="90">
              <template #default="{ row }">
                <el-tag :type="row.hitTarget ? 'success' : 'warning'" effect="plain">{{ row.hitTarget ? '有效' : '待改进' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="evaluatedAt" label="验证时间" min-width="170">
              <template #default="{ row }">{{ formatDateTime(row.evaluatedAt) }}</template>
            </el-table-column>
          </el-table>
        </section>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Collection, Refresh } from '@element-plus/icons-vue'
import { buildWatchlistSamples, fetchLearningSampleDetail, fetchLearningSamples } from '../services/aiLearning'
import { statusLabel } from '../utils/statusLabels'

const stockCode = ref('')
const loading = ref(false)
const building = ref(false)
const sampleData = ref(null)
const detail = ref(null)
const drawerVisible = ref(false)

async function loadSamples() {
  loading.value = true
  try {
    sampleData.value = await fetchLearningSamples({ stockCode: stockCode.value, limit: 150 })
  } catch (error) {
    ElMessage.error(error.message || '样本加载失败')
  } finally {
    loading.value = false
  }
}

async function buildSamples() {
  building.value = true
  try {
    sampleData.value = await buildWatchlistSamples({ universeCode: 'WATCHLIST', samplePhase: 'AFTER_CLOSE' })
    ElMessage.success('自选股学习样本已构建')
  } catch (error) {
    console.error('[猫狗智投] 构建样本失败', error)
    ElMessage.error(error.message || '构建样本失败')
  } finally {
    building.value = false
  }
}

async function openDetail(row) {
  try {
    detail.value = await fetchLearningSampleDetail(row.id)
    drawerVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '样本详情加载失败')
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

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
}

function formatSignedPercent(value) {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

onMounted(loadSamples)
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.summary-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f8fafc;
}

.summary-item span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.summary-item strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 26px;
}

.detail-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.detail-title {
  margin-bottom: 12px;
  color: #111827;
  font-weight: 800;
}

pre {
  max-height: 280px;
  overflow: auto;
  margin: 0;
  border-radius: 8px;
  padding: 14px;
  background: #0f172a;
  color: #dbeafe;
  font-size: 12px;
  line-height: 18px;
}

.label-table {
  margin-top: 14px;
}
</style>
