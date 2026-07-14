<template>
  <div class="page">
    <el-alert
      v-if="strategyData && !strategyData.schemaReady"
      :title="strategyData.message"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">策略进化</h2>
          <p class="surface-subtitle">根据复盘和因子表现生成可启用、可回滚的策略版本</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadStrategies">刷新</el-button>
          <el-button type="primary" :icon="MagicStick" :loading="evolving" @click="evolveStrategy">生成新策略</el-button>
        </div>
      </div>
    </section>

    <div v-loading="loading || evolving" class="strategy-grid">
      <section
        v-for="version in strategyData?.versions || []"
        :key="version.versionNo"
        class="surface strategy-card"
        :class="{ active: version.status === 'ACTIVE' }"
      >
        <div class="strategy-card-header">
          <div>
            <el-tag :type="statusType(version.status)" effect="plain">{{ statusText(version.status) }}</el-tag>
            <h3>{{ version.title }}</h3>
            <p>{{ version.versionNo }} · {{ formatDateTime(version.createdAt) }}</p>
          </div>
          <el-button
            v-if="version.id && version.status !== 'ACTIVE'"
            type="primary"
            plain
            :loading="activatingId === version.id"
            @click="activateStrategy(version)"
          >
            启用 / 回滚
          </el-button>
        </div>
        <div class="strategy-metrics">
          <span>胜率 <strong>{{ formatPercent(version.successRate) }}</strong></span>
          <span>均收 <strong :class="Number(version.avgReturn || 0) >= 0 ? 'up' : 'down'">{{ formatSignedPercent(version.avgReturn) }}</strong></span>
          <span>回撤 <strong>{{ formatSignedPercent(version.maxDrawdown) }}</strong></span>
          <span>样本 <strong>{{ version.sampleCount || 0 }}</strong></span>
        </div>
        <div class="strategy-section">
          <label>策略说明</label>
          <p>{{ version.strategySummary || '暂无策略说明' }}</p>
        </div>
        <div class="strategy-section">
          <label>因子快照</label>
          <pre>{{ version.factorSnapshot || '等待因子学习数据' }}</pre>
        </div>
        <div class="strategy-section">
          <label>提示词调权建议</label>
          <pre>{{ version.promptTemplate || '等待生成策略版本' }}</pre>
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">进化日志</h2>
          <p class="surface-subtitle">记录每次生成、启用和回滚的变化</p>
        </div>
      </div>
      <div class="surface-body">
        <el-timeline v-if="strategyData?.logs?.length">
          <el-timeline-item
            v-for="log in strategyData.logs"
            :key="log.id"
            :timestamp="formatDateTime(log.createdAt)"
            placement="top"
          >
            <strong>{{ actionText(log.actionType) }}</strong>
            <p>{{ log.actionSummary }}</p>
            <small>{{ log.afterSnapshot }}</small>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无进化日志" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, Refresh } from '@element-plus/icons-vue'
import { activateAiStrategy, evolveAiStrategy, fetchAiEvolutionStrategies } from '../services/aiEvolution'

const loading = ref(false)
const evolving = ref(false)
const activatingId = ref(null)
const strategyData = ref(null)

async function loadStrategies() {
  loading.value = true
  try {
    strategyData.value = await fetchAiEvolutionStrategies()
  } catch (error) {
    ElMessage.error(error.message || '策略版本加载失败')
  } finally {
    loading.value = false
  }
}

async function evolveStrategy() {
  evolving.value = true
  try {
    strategyData.value = await evolveAiStrategy()
    ElMessage.success('新策略版本已生成')
  } catch (error) {
    console.error('[猫狗智投] 生成策略失败', error)
    ElMessage.error(error.message || '生成策略失败')
  } finally {
    evolving.value = false
  }
}

async function activateStrategy(version) {
  try {
    await ElMessageBox.confirm(`确认启用 / 回滚到 ${version.versionNo} 吗？`, '策略版本切换', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  activatingId.value = version.id
  try {
    strategyData.value = await activateAiStrategy(version.id)
    ElMessage.success('策略版本已切换')
  } catch (error) {
    console.error('[猫狗智投] 切换策略失败', error)
    ElMessage.error(error.message || '切换策略失败')
  } finally {
    activatingId.value = null
  }
}

function statusText(value) {
  return {
    ACTIVE: '运行中',
    STANDBY: '可回滚',
    PLANNED: '规划中',
  }[value] || '未知'
}

function statusType(value) {
  return value === 'ACTIVE' ? 'success' : value === 'STANDBY' ? 'primary' : 'info'
}

function actionText(value) {
  return {
    EVOLVE: '生成策略',
    ACTIVATE: '启用 / 回滚策略',
  }[value] || value || '策略事件'
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

onMounted(loadStrategies)
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.strategy-card {
  padding: 22px;
}

.strategy-card.active {
  border-color: #93c5fd;
  box-shadow: 0 18px 36px -26px rgba(37, 99, 235, 0.5);
}

.strategy-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.strategy-card h3 {
  margin: 12px 0 6px;
  color: #111827;
  font-size: 20px;
}

.strategy-card p {
  margin: 0;
  color: #64748b;
  line-height: 22px;
}

.strategy-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 20px 0;
}

.strategy-metrics span {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
}

.strategy-metrics strong {
  display: block;
  margin-top: 6px;
  color: #111827;
  font-size: 16px;
}

.strategy-section {
  margin-top: 16px;
}

.strategy-section label {
  display: block;
  margin-bottom: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
}

.strategy-section pre,
.strategy-section p {
  min-height: 48px;
  margin: 0;
  white-space: pre-wrap;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
  color: #334155;
  font-family: inherit;
  font-size: 13px;
  line-height: 22px;
}

@media (max-width: 1240px) {
  .strategy-grid {
    grid-template-columns: 1fr;
  }
}
</style>
