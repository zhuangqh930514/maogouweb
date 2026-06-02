<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">定时分析任务</h2>
          <p class="surface-subtitle">Spring Task 拉取自选股行情并调用本地模型</p>
        </div>
      </div>
      <div v-loading="loading" class="surface-body">
        <el-form :model="form" label-position="top">
          <div class="form-grid three">
            <el-form-item label="盘中分析间隔">
              <el-input-number v-model="form.intradayInterval" :min="5" :step="5" controls-position="right" />
            </el-form-item>
            <el-form-item label="收盘后分析时间">
              <el-time-picker v-model="closeTime" format="HH:mm" value-format="HH:mm" />
            </el-form-item>
            <el-form-item label="分析范围">
              <el-select v-model="form.analysisScope">
                <el-option label="全部自选股" value="全部自选股" />
                <el-option label="仅已持仓" value="仅已持仓" />
                <el-option label="AI重点分组" value="AI重点分组" />
              </el-select>
            </el-form-item>
          </div>
          <div class="form-actions">
            <el-button type="primary" :icon="Timer" :loading="saving" @click="saveTaskConfig">保存任务配置</el-button>
            <el-button :icon="VideoPlay" :loading="runningAnalysis" @click="runAnalysisOnce">立即执行一次</el-button>
            <el-button :icon="DataAnalysis" :loading="runningEvolution" @click="runEvolutionOnce">立即复盘学习</el-button>
          </div>
        </el-form>
        <div class="task-state">
          <div>{{ schedulerStatusText }}</div>
          <div class="task-state-sub">{{ evolutionStatusText }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DataAnalysis, Timer, VideoPlay } from '@element-plus/icons-vue'
import { analyzeWatchlist } from '../services/ai'
import { refreshAiEvolutionFactors, verifyAiEvolutionReviews } from '../services/aiEvolution'
import { fetchModelConfig, fetchSchedulerStatus, saveModelConfig } from '../services/settings'

const defaultPrompt =
  '你是一名A股投研助手。请基于以下行情、K线、财务和持仓数据，输出 JSON 结构：technicalAnalysis、riskWarning、buySellPoints、score。'

const form = reactive({
  apiBaseUrl: '',
  modelName: '',
  apiKey: '',
  timeout: 60000,
  temperature: 0.2,
  maxTokens: 2048,
  intradayInterval: 30,
  closeTime: '15:30',
  analysisScope: '全部自选股',
  promptTemplate: defaultPrompt,
})

const closeTime = ref(form.closeTime)
const loading = ref(false)
const saving = ref(false)
const runningAnalysis = ref(false)
const runningEvolution = ref(false)
const schedulerStatus = ref(null)

const schedulerStatusText = computed(() => {
  if (!schedulerStatus.value) {
    return '正在读取定时任务状态...'
  }
  const enabledText = schedulerStatus.value.enabled ? '已启用' : '未启用'
  return `Spring Task ${enabledText}：下次收盘分析 ${schedulerStatus.value.nextCloseAnalysisTime}`
})

const evolutionStatusText = computed(() => {
  if (!schedulerStatus.value) {
    return ''
  }
  return `自动复盘学习：Cron ${schedulerStatus.value.evolutionReviewCron || '未配置'}，默认 ${schedulerStatus.value.nextEvolutionReviewTime || '交易日 16:10'}`
})

async function loadTaskConfig() {
  loading.value = true
  try {
    const [config, status] = await Promise.all([fetchModelConfig(), fetchSchedulerStatus()])
    Object.assign(form, {
      ...config,
      apiKey: '',
      promptTemplate: config.promptTemplate || defaultPrompt,
    })
    closeTime.value = form.closeTime
    schedulerStatus.value = status
  } catch (error) {
    ElMessage.error(error.message || '自动化任务配置获取失败')
  } finally {
    loading.value = false
  }
}

async function saveTaskConfig() {
  saving.value = true
  try {
    const saved = await saveModelConfig({
      ...form,
      apiKey: null,
      closeTime: closeTime.value || '15:30',
    })
    Object.assign(form, {
      ...saved,
      apiKey: '',
      promptTemplate: saved.promptTemplate || form.promptTemplate,
    })
    closeTime.value = form.closeTime
    schedulerStatus.value = await fetchSchedulerStatus()
    ElMessage.success('任务配置已保存')
  } catch (error) {
    ElMessage.error(error.message || '保存任务配置失败')
  } finally {
    saving.value = false
  }
}

async function runAnalysisOnce() {
  runningAnalysis.value = true
  try {
    await analyzeWatchlist()
    ElMessage.success('已触发自选股 AI 分析')
  } catch (error) {
    ElMessage.error(error.message || '触发分析失败')
  } finally {
    runningAnalysis.value = false
  }
}

async function runEvolutionOnce() {
  runningEvolution.value = true
  try {
    await verifyAiEvolutionReviews()
    await refreshAiEvolutionFactors()
    ElMessage.success('已完成 AI 复盘学习')
  } catch (error) {
    console.error('[猫狗智投] AI 复盘学习失败', error)
    ElMessage.error(error.message || 'AI 复盘学习失败')
  } finally {
    runningEvolution.value = false
  }
}

onMounted(loadTaskConfig)
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

.task-state {
  margin-top: 24px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px 18px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 18px;
  font-weight: 800;
}

.task-state-sub {
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}
</style>
