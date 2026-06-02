<template>
  <div class="page">
    <el-alert
      v-if="factorData && !factorData.schemaReady"
      :title="factorData.message"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">因子学习</h2>
          <p class="surface-subtitle">统计哪些技术面、风险和买卖点因子真正有效</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadFactors">刷新</el-button>
          <el-button type="primary" :icon="DataAnalysis" :loading="refreshing" @click="refreshFactors">刷新因子学习</el-button>
        </div>
      </div>
      <div class="surface-body">
        <div class="factor-summary">
          <span>已识别因子：<strong>{{ factorData?.factorCount || 0 }}</strong></span>
          <span>归因样本：<strong>{{ factorData?.sampleCount || 0 }}</strong></span>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">因子表现</h2>
          <p class="surface-subtitle">按权重得分排序，作为后续策略调权依据</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="loading || refreshing" :data="factorData?.factors || []" class="compact-table" height="620">
          <el-table-column prop="factorName" label="因子" min-width="180">
            <template #default="{ row }">
              <strong>{{ row.factorName }}</strong>
              <div class="muted mono">{{ row.factorCode }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="factorGroup" label="类型" width="120">
            <template #default="{ row }">
              <el-tag effect="plain">{{ groupText(row.factorGroup) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="marketRegime" label="验证环境" min-width="120" />
          <el-table-column prop="sampleCount" label="样本" width="90" align="right" />
          <el-table-column label="胜率" width="110" align="right">
            <template #default="{ row }">{{ formatPercent(row.successRate) }}</template>
          </el-table-column>
          <el-table-column label="平均收益" width="120" align="right">
            <template #default="{ row }">
              <span :class="Number(row.avgReturn || 0) >= 0 ? 'up' : 'down'">{{ formatSignedPercent(row.avgReturn) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="平均回撤" width="120" align="right">
            <template #default="{ row }">{{ formatSignedPercent(row.avgDrawdown) }}</template>
          </el-table-column>
          <el-table-column label="权重得分" width="140" align="right">
            <template #default="{ row }">
              <el-progress :percentage="Number(row.weightScore || 0)" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.lastEvaluatedAt) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && !factorData?.factors?.length" description="暂无因子统计，请先执行复盘验证" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DataAnalysis, Refresh } from '@element-plus/icons-vue'
import { fetchAiEvolutionFactors, refreshAiEvolutionFactors } from '../services/aiEvolution'

const loading = ref(false)
const refreshing = ref(false)
const factorData = ref(null)

async function loadFactors() {
  loading.value = true
  try {
    factorData.value = await fetchAiEvolutionFactors()
  } catch (error) {
    ElMessage.error(error.message || '因子数据加载失败')
  } finally {
    loading.value = false
  }
}

async function refreshFactors() {
  refreshing.value = true
  try {
    factorData.value = await refreshAiEvolutionFactors()
    ElMessage.success('因子学习已刷新')
  } catch (error) {
    console.error('[猫狗智投] 因子学习刷新失败', error)
    ElMessage.error(error.message || '刷新因子学习失败')
  } finally {
    refreshing.value = false
  }
}

function groupText(value) {
  return {
    TECHNICAL: '技术面',
    RISK: '风险',
    DECISION: '决策',
    FUNDAMENTAL: '基本面',
  }[value] || value || '-'
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

onMounted(loadFactors)
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.factor-summary {
  display: flex;
  gap: 16px;
}

.factor-summary span {
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 14px 16px;
  background: #eff6ff;
  color: #1d4ed8;
}

.factor-summary strong {
  margin-left: 6px;
  font-size: 20px;
}
</style>
