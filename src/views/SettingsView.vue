<template>
  <div class="page">
    <div class="settings-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">本地大模型接入配置</h2>
            <p class="surface-subtitle">模型接入、提示词模板和自动化任务是 AI 分析闭环的配置入口</p>
          </div>
          <div class="header-actions">
            <el-button @click="router.push('/prompt-templates')">提示词管理</el-button>
            <el-button @click="router.push('/automation-tasks')">自动化任务</el-button>
          </div>
        </div>
        <div v-loading="loading" class="surface-body">
          <el-form :model="form" label-position="top">
            <el-form-item label="接入类型">
              <el-radio-group v-model="provider" class="provider-selector" @change="applyProviderPreset">
                <el-radio-button v-for="preset in modelPresets" :key="preset.key" :label="preset.key">
                  {{ preset.label }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
            <div class="provider-note">
              <strong>{{ currentPreset.label }}</strong>
              <span>{{ currentPreset.note }}</span>
            </div>
            <el-form-item label="API Base URL">
              <el-input v-model="form.apiBaseUrl" />
            </el-form-item>
            <div class="form-grid">
              <el-form-item label="Model Name">
                <el-input v-model="form.modelName" />
              </el-form-item>
              <el-form-item label="API Key">
                <el-input v-model="form.apiKey" show-password :placeholder="apiKeyPlaceholder" />
              </el-form-item>
            </div>
            <div class="form-grid three">
              <el-form-item label="Timeout(ms)">
                <el-input-number v-model="form.timeout" :min="1000" controls-position="right" />
              </el-form-item>
              <el-form-item label="Temperature">
                <el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" controls-position="right" />
              </el-form-item>
              <el-form-item label="Max Tokens">
                <el-input-number v-model="form.maxTokens" :min="256" :step="256" controls-position="right" />
              </el-form-item>
            </div>
            <div class="form-actions">
              <el-button type="primary" :icon="Connection" :loading="testing" @click="testConnection">测试连接</el-button>
              <el-button :icon="Check" :loading="saving" @click="saveConfig">保存配置</el-button>
            </div>
          </el-form>
          <div v-if="testResult" class="test-result" :class="{ failed: !testResult.success }">
            <strong>{{ testResult.success ? '连接测试成功' : '连接测试失败' }}</strong>
            <span>{{ testResult.message }}，耗时 {{ testResult.latencyMs }}ms。</span>
          </div>
          <p class="security-note">API Key 建议仅后端保存，前端不直接暴露；生产环境使用加密字段或环境变量。</p>
        </div>
      </section>

    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Check, Connection } from '@element-plus/icons-vue'
import { fetchModelConfig, saveModelConfig, testModelConnection } from '../services/settings'

const router = useRouter()
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
})
const closeTime = ref(form.closeTime)
const provider = ref('ollama')
const apiKeyMasked = ref('')
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref(null)
const modelPresets = [
  {
    key: 'ollama',
    label: 'Ollama',
    apiBaseUrl: 'http://localhost:11434/v1',
    modelName: 'qwen3.6',
    note: '适合本机 Ollama，兼容 OpenAI /v1/chat/completions，API Key 可留空。',
  },
  {
    key: 'vllm',
    label: 'vLLM',
    apiBaseUrl: 'http://localhost:8000/v1',
    modelName: 'qwen3.6',
    note: '适合本机或内网 vLLM OpenAI-compatible server。',
  },
  {
    key: 'deepseek',
    label: 'DeepSeek',
    apiBaseUrl: 'https://api.deepseek.com',
    modelName: 'deepseek-chat',
    note: '适合第三方 DeepSeek API，需要填写 DeepSeek API Key。',
  },
  {
    key: 'custom',
    label: '自定义',
    apiBaseUrl: '',
    modelName: '',
    note: '适合任意 OpenAI 兼容服务，例如硅基流动、One API、LiteLLM 或公司内部网关。',
  },
]
const currentPreset = computed(() => modelPresets.find((item) => item.key === provider.value) || modelPresets[0])
const apiKeyPlaceholder = computed(() => {
  if (apiKeyMasked.value) {
    return `已保存 ${apiKeyMasked.value}，留空则继续使用`
  }
  return provider.value === 'deepseek' ? '请输入 DeepSeek API Key' : '本地模型通常可留空'
})

async function loadConfig() {
  loading.value = true
  try {
    const config = await fetchModelConfig()
    apiKeyMasked.value = config.apiKeyMasked || ''
    Object.assign(form, {
      ...config,
      apiKey: '',
    })
    closeTime.value = form.closeTime
    provider.value = inferProvider(config)
  } catch (error) {
    ElMessage.error(error.message || '模型配置获取失败')
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const saved = await saveModelConfig(buildPayload())
    apiKeyMasked.value = saved.apiKeyMasked || apiKeyMasked.value
    Object.assign(form, {
      ...saved,
      apiKey: '',
    })
    closeTime.value = form.closeTime
    ElMessage.success('配置已保存')
  } catch (error) {
    ElMessage.error(error.message || '保存配置失败')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  try {
    testResult.value = await testModelConnection(buildPayload())
    if (testResult.value.success) {
      ElMessage.success('连接测试成功')
    } else {
      ElMessage.error(testResult.value.message || '连接测试失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '连接测试失败')
  } finally {
    testing.value = false
  }
}

function applyProviderPreset(key) {
  const preset = modelPresets.find((item) => item.key === key)
  if (!preset || preset.key === 'custom') {
    return
  }
  form.apiBaseUrl = preset.apiBaseUrl
  form.modelName = preset.modelName
}

function buildPayload() {
  return {
    ...form,
    apiKey: form.apiKey?.trim() || null,
    closeTime: closeTime.value || '15:30',
  }
}

function inferProvider(config) {
  const baseUrl = (config.apiBaseUrl || '').toLowerCase()
  const modelName = (config.modelName || '').toLowerCase()
  if (baseUrl.includes('deepseek') || modelName.startsWith('deepseek')) {
    return 'deepseek'
  }
  if (baseUrl.includes(':8000')) {
    return 'vllm'
  }
  if (baseUrl.includes('11434') || baseUrl.includes('ollama')) {
    return 'ollama'
  }
  return 'custom'
}

onMounted(loadConfig)
</script>

<style scoped>
.settings-layout {
  display: grid;
  gap: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.provider-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.provider-note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: -2px 0 18px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 14px 16px;
  color: #1d4ed8;
}

.provider-note span {
  color: #4b5563;
  font-size: 13px;
  line-height: 22px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.test-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 24px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
  padding: 16px;
  color: #166534;
}

.test-result.failed {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.security-note {
  margin: 18px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 22px;
}

.task-state {
  margin-top: 24px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 14px 16px;
  color: #2563eb;
  font-weight: 700;
}

</style>
