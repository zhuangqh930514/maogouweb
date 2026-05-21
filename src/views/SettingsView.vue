<template>
  <div class="page">
    <div class="section-grid settings-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">本地大模型接入配置</h2>
            <p class="surface-subtitle">兼容 Ollama / vLLM 暴露的 OpenAI RESTful API</p>
          </div>
        </div>
        <div class="surface-body">
          <el-form :model="form" label-position="top">
            <el-form-item label="API Base URL">
              <el-input v-model="form.apiBaseUrl" />
            </el-form-item>
            <div class="form-grid">
              <el-form-item label="Model Name">
                <el-input v-model="form.modelName" />
              </el-form-item>
              <el-form-item label="API Key">
                <el-input v-model="form.apiKey" show-password />
              </el-form-item>
            </div>
            <div class="form-grid three">
              <el-form-item label="Timeout(ms)">
                <el-input-number v-model="form.timeout" :min="1000" controls-position="right" />
              </el-form-item>
              <el-form-item label="Temperature">
                <el-input-number v-model="form.temperature" :min="0" :max="1" :step="0.1" controls-position="right" />
              </el-form-item>
              <el-form-item label="Max Tokens">
                <el-input-number v-model="form.maxTokens" :min="256" :step="256" controls-position="right" />
              </el-form-item>
            </div>
            <div class="form-actions">
              <el-button type="primary" :icon="Connection" @click="testConnection">测试连接</el-button>
              <el-button :icon="Check">保存配置</el-button>
            </div>
          </el-form>
          <div class="test-result">
            <strong>连接测试成功</strong>
            <span>OpenAI Compatible API 响应正常，模型 qwen3.6 可用，平均延迟 812ms。</span>
          </div>
          <p class="security-note">API Key 建议仅后端保存，前端不直接暴露；生产环境使用加密字段或环境变量。</p>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">定时分析任务</h2>
            <p class="surface-subtitle">Spring Task 拉取自选股行情并调用本地模型</p>
          </div>
        </div>
        <div class="surface-body">
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
              <el-button type="primary" :icon="Timer">启用任务</el-button>
              <el-button :icon="VideoPlay">立即执行一次</el-button>
            </div>
          </el-form>
          <div class="task-state">Spring Task 已启用：下次执行 2026-05-21 15:30:00</div>
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">分析 Prompt 模板</h2>
          <p class="surface-subtitle">将行情、K线、财务和持仓数据封装为结构化推理输入</p>
        </div>
      </div>
      <div class="surface-body">
        <el-input v-model="form.promptTemplate" type="textarea" :rows="6" />
        <div class="form-actions prompt-actions">
          <el-button>恢复默认模板</el-button>
          <el-button type="primary">保存模板</el-button>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">配置中心关联数据</h2>
          <p class="surface-subtitle">后续接 Spring Boot / MyBatis-Plus 时建议的接口和存储映射</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table :data="mappingRows" class="compact-table" row-key="name">
          <el-table-column prop="name" label="配置项" width="180" />
          <el-table-column prop="table" label="建议存储" width="240" />
          <el-table-column prop="api" label="后端接口" width="260" />
          <el-table-column prop="desc" label="说明" />
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Connection, Timer, VideoPlay } from '@element-plus/icons-vue'
import { modelConfig } from '../services/mockData'

const form = reactive({ ...modelConfig })
const closeTime = ref(form.closeTime)
const mappingRows = [
  { name: '模型配置', table: 'system_config / ai_model_config', api: 'GET/PUT /api/settings/model', desc: '保存 baseUrl、modelName、apiKey' },
  { name: '调度配置', table: 'system_config / scheduler_config', api: 'GET/PUT /api/settings/scheduler', desc: '保存盘中间隔与收盘任务时间' },
  { name: 'Prompt模板', table: 'ai_prompt_template', api: 'GET/PUT /api/settings/prompt', desc: '用于封装自选股行情和K线数据' },
]

function testConnection() {
  ElMessage.success('连接测试成功')
}
</script>

<style scoped>
.settings-layout {
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.9fr);
}

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

.prompt-actions {
  justify-content: flex-end;
}
</style>
