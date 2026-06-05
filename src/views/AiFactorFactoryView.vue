<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">因子工厂</h2>
          <p class="surface-subtitle">标准化因子字典、命中值、样本外表现和因子相关性</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadFactory">刷新</el-button>
          <el-button type="primary" :icon="CircleCheck" :loading="verifying" @click="verifyLabels">刷新标签与因子统计</el-button>
        </div>
      </div>
      <div class="surface-body">
        <div class="summary-grid">
          <div class="summary-item">
            <span>因子定义</span>
            <strong>{{ factory?.definitionCount || 0 }}</strong>
          </div>
          <div class="summary-item">
            <span>启用因子</span>
            <strong>{{ factory?.enabledDefinitionCount || 0 }}</strong>
          </div>
          <div class="summary-item">
            <span>因子值样本</span>
            <strong>{{ factory?.factorValueCount || 0 }}</strong>
          </div>
        </div>
      </div>
    </section>

    <div class="section-grid grid-main-side">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">因子表现</h2>
            <p class="surface-subtitle">按当前权重排序，重点看样本数和 Wilson 置信下界</p>
          </div>
        </div>
        <div class="surface-body">
          <el-table v-loading="loading || verifying" :data="factory?.performances || []" class="compact-table" height="620">
            <el-table-column prop="factorName" label="因子" min-width="180">
              <template #default="{ row }">
                <strong>{{ row.factorName }}</strong>
                <div class="muted mono">{{ row.factorCode }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="factorGroup" label="分类" width="120" />
            <el-table-column prop="marketRegime" label="环境" width="100" />
            <el-table-column prop="sampleCount" label="样本" width="80" align="right" />
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
            <el-table-column label="均回撤" width="100" align="right">
              <template #default="{ row }">{{ formatSignedPercent(row.avgDrawdown) }}</template>
            </el-table-column>
            <el-table-column label="权重" width="130">
              <template #default="{ row }">
                <el-progress :percentage="Number(row.weightScore || 0)" :stroke-width="8" />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">因子相关性</h2>
            <p class="surface-subtitle">观察经常同时命中的因子组合</p>
          </div>
        </div>
        <div class="surface-body correlation-list">
          <div v-for="item in factory?.correlations || []" :key="`${item.leftFactorCode}-${item.rightFactorCode}`" class="correlation-row">
            <strong>{{ item.leftFactorCode }}</strong>
            <span>+</span>
            <strong>{{ item.rightFactorCode }}</strong>
            <em>{{ formatPercent(item.coHitRate) }} · 样本 {{ item.sampleCount }}</em>
          </div>
          <el-empty v-if="!factory?.correlations?.length" description="暂无相关性数据" />
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">标准因子字典</h2>
          <p class="surface-subtitle">AI 报告只能引用系统计算出的标准因子 code</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="loading" :data="factory?.definitions || []" class="compact-table" height="520">
          <el-table-column prop="factorName" label="因子" min-width="180">
            <template #default="{ row }">
              <strong>{{ row.factorName }}</strong>
              <div class="muted mono">{{ row.factorCode }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="factorGroup" label="分类" width="130" />
          <el-table-column prop="direction" label="方向" width="110">
            <template #default="{ row }">
              <el-tag :type="directionType(row.direction)" effect="plain">{{ directionText(row.direction) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="默认权重" width="110" align="right">
            <template #default="{ row }">{{ Number(row.defaultWeight || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="formulaDesc" label="公式说明" min-width="320" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" effect="plain">{{ row.enabled ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, Refresh } from '@element-plus/icons-vue'
import { fetchFactorFactory, verifyLearningLabels } from '../services/aiLearning'

const loading = ref(false)
const verifying = ref(false)
const factory = ref(null)

async function loadFactory() {
  loading.value = true
  try {
    factory.value = await fetchFactorFactory()
  } catch (error) {
    ElMessage.error(error.message || '因子工厂加载失败')
  } finally {
    loading.value = false
  }
}

async function verifyLabels() {
  verifying.value = true
  try {
    await verifyLearningLabels()
    await loadFactory()
    ElMessage.success('标签和因子统计已刷新')
  } catch (error) {
    console.error('[猫狗智投] 刷新因子统计失败', error)
    ElMessage.error(error.message || '刷新因子统计失败')
  } finally {
    verifying.value = false
  }
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatSignedPercent(value) {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

function directionText(value) {
  return { POSITIVE: '正向', NEGATIVE: '负向', NEUTRAL: '中性' }[value] || value || '-'
}

function directionType(value) {
  return value === 'POSITIVE' ? 'success' : value === 'NEGATIVE' ? 'danger' : 'info'
}

onMounted(loadFactory)
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

.correlation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.correlation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1fr);
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.correlation-row strong {
  overflow: hidden;
  color: #111827;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.correlation-row span {
  color: #94a3b8;
  text-align: center;
}

.correlation-row em {
  grid-column: 1 / -1;
  color: #64748b;
  font-style: normal;
  font-size: 12px;
}
</style>
