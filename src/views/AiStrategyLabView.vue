<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">策略实验室</h2>
          <p class="surface-subtitle">新策略必须经过样本外实验和基线对照，不能只看样本内胜率</p>
        </div>
        <div class="header-actions">
          <el-input v-model="title" clearable placeholder="实验名称" style="width: 240px" />
          <el-button :icon="Refresh" :loading="loading" @click="loadExperiments">刷新</el-button>
          <el-button type="primary" :icon="MagicStick" :loading="running" @click="runExperiment">运行实验</el-button>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">实验记录</h2>
          <p class="surface-subtitle">记录训练、验证、测试窗口和能否晋级策略版本</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="loading || running" :data="data?.experiments || []" class="compact-table" height="660">
          <el-table-column prop="title" label="实验" min-width="190">
            <template #default="{ row }">
              <strong>{{ row.title }}</strong>
              <div class="muted mono">#{{ row.id }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === 'COMPLETED' ? 'success' : 'info'" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="universeCode" label="股票池" width="110" />
          <el-table-column label="训练窗口" min-width="180">
            <template #default="{ row }">{{ row.trainStartDate || '-' }} ~ {{ row.trainEndDate || '-' }}</template>
          </el-table-column>
          <el-table-column label="验证窗口" min-width="180">
            <template #default="{ row }">{{ row.validationStartDate || '-' }} ~ {{ row.validationEndDate || '-' }}</template>
          </el-table-column>
          <el-table-column label="测试窗口" min-width="180">
            <template #default="{ row }">{{ row.testStartDate || '-' }} ~ {{ row.testEndDate || '-' }}</template>
          </el-table-column>
          <el-table-column label="是否可晋级" width="120">
            <template #default="{ row }">
              <el-tag :type="row.canPromote ? 'success' : 'warning'" effect="plain">{{ row.canPromote ? '可晋级' : '观察' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="实验指标" min-width="280">
            <template #default="{ row }">
              <pre>{{ prettyJson(row.metricsJson) }}</pre>
            </template>
          </el-table-column>
          <el-table-column label="基线指标" min-width="220">
            <template #default="{ row }">
              <pre>{{ prettyJson(row.baselineMetricsJson) }}</pre>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!data?.experiments?.length && !loading && !running" description="暂无实验记录" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick, Refresh } from '@element-plus/icons-vue'
import { fetchLearningExperiments, runLearningExperiment } from '../services/aiLearning'

const title = ref('')
const data = ref(null)
const loading = ref(false)
const running = ref(false)

async function loadExperiments() {
  loading.value = true
  try {
    data.value = await fetchLearningExperiments()
  } catch (error) {
    ElMessage.error(error.message || '策略实验加载失败')
  } finally {
    loading.value = false
  }
}

async function runExperiment() {
  running.value = true
  try {
    data.value = await runLearningExperiment({ title: title.value, universeCode: 'WATCHLIST' })
    ElMessage.success('策略实验已完成')
  } catch (error) {
    console.error('[猫狗智投] 策略实验失败', error)
    ElMessage.error(error.message || '策略实验失败')
  } finally {
    running.value = false
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

onMounted(loadExperiments)
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

pre {
  max-height: 120px;
  overflow: auto;
  margin: 0;
  border-radius: 8px;
  padding: 10px;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  line-height: 18px;
}
</style>
