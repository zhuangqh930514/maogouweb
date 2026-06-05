<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">模型评测中心</h2>
          <p class="surface-subtitle">比较模型输出质量、JSON 成功率和报告稳定性，避免只凭主观感觉换模型</p>
        </div>
        <div class="header-actions">
          <el-select v-model="form.evalType" style="width: 170px">
            <el-option label="报告 JSON" value="REPORT_JSON" />
            <el-option label="提示词稳定性" value="PROMPT_STABILITY" />
          </el-select>
          <el-input-number v-model="form.sampleCount" :min="1" :max="200" />
          <el-button :icon="Refresh" :loading="loading" @click="loadEvals">刷新</el-button>
          <el-button type="primary" :icon="DataAnalysis" :loading="running" @click="runEval">运行评测</el-button>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">评测记录</h2>
          <p class="surface-subtitle">当前版本先基于历史报告统计，后续可扩展为实时多模型 A/B</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="loading || running" :data="data?.runs || []" class="compact-table" height="660">
          <el-table-column prop="modelName" label="模型" min-width="180">
            <template #default="{ row }">
              <strong>{{ row.modelName }}</strong>
              <div class="muted mono">{{ row.provider }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="evalType" label="类型" width="150" />
          <el-table-column label="JSON 成功率" width="150">
            <template #default="{ row }">
              <el-progress :percentage="Number(row.jsonSuccessRate || 0)" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column prop="sampleCount" label="样本" width="90" align="right" />
          <el-table-column label="综合分" width="150">
            <template #default="{ row }">
              <el-progress :percentage="Number(row.score || 0)" :stroke-width="8" status="success" />
            </template>
          </el-table-column>
          <el-table-column label="指标" min-width="280">
            <template #default="{ row }">
              <pre>{{ prettyJson(row.metricsJson) }}</pre>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag type="success" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!data?.runs?.length && !loading && !running" description="暂无评测记录" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DataAnalysis, Refresh } from '@element-plus/icons-vue'
import { fetchLearningModelEvals, runLearningModelEval } from '../services/aiLearning'

const form = reactive({ evalType: 'REPORT_JSON', sampleCount: 30 })
const data = ref(null)
const loading = ref(false)
const running = ref(false)

async function loadEvals() {
  loading.value = true
  try {
    data.value = await fetchLearningModelEvals()
  } catch (error) {
    ElMessage.error(error.message || '模型评测加载失败')
  } finally {
    loading.value = false
  }
}

async function runEval() {
  running.value = true
  try {
    data.value = await runLearningModelEval(form)
    ElMessage.success('模型评测已完成')
  } catch (error) {
    console.error('[猫狗智投] 模型评测失败', error)
    ElMessage.error(error.message || '模型评测失败')
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

onMounted(loadEvals)
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
