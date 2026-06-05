<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">选股实验室</h2>
          <p class="surface-subtitle">用当前策略扫描股票池，输出可复盘的 Top K 候选</p>
        </div>
        <div class="header-actions">
          <el-select v-model="form.universeCode" style="width: 150px">
            <el-option label="自选股" value="WATCHLIST" />
          </el-select>
          <el-select v-model="form.horizonDays" style="width: 110px">
            <el-option label="T+1" :value="1" />
            <el-option label="T+3" :value="3" />
            <el-option label="T+5" :value="5" />
          </el-select>
          <el-input-number v-model="form.topK" :min="1" :max="20" />
          <el-button :icon="Refresh" :loading="loading" @click="loadPredictions">刷新</el-button>
          <el-button type="primary" :icon="MagicStick" :loading="ranking" @click="rankUniverse">生成 Top K</el-button>
        </div>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">候选股票</h2>
          <p class="surface-subtitle">分数越高、风险越低，越适合进入后续复盘和模拟盘</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table v-loading="loading || ranking" :data="rows" class="compact-table" height="660">
          <el-table-column prop="rankNo" label="排名" width="80" align="center">
            <template #default="{ row }">
              <span class="rank-chip">{{ row.rankNo || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="stockName" label="股票" min-width="150">
            <template #default="{ row }">
              <strong>{{ row.stockName }}</strong>
              <div class="muted mono">{{ row.stockCode }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="action" label="动作" width="100">
            <template #default="{ row }">
              <el-tag :type="actionType(row.action)" effect="plain">{{ actionText(row.action) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="targetDirection" label="方向" width="100" />
          <el-table-column prop="horizonDays" label="周期" width="80">
            <template #default="{ row }">T+{{ row.horizonDays }}</template>
          </el-table-column>
          <el-table-column label="分数" width="150">
            <template #default="{ row }">
              <el-progress :percentage="Number(row.score || 0)" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column label="置信度" width="150">
            <template #default="{ row }">
              <el-progress :percentage="Number(row.confidence || 0)" :stroke-width="8" status="success" />
            </template>
          </el-table-column>
          <el-table-column label="风险" width="150">
            <template #default="{ row }">
              <el-progress :percentage="Number(row.riskScore || 0)" :stroke-width="8" status="exception" />
            </template>
          </el-table-column>
          <el-table-column label="因子理由" min-width="340">
            <template #default="{ row }">
              <div class="reason-list">
                <span v-for="reason in parseReasons(row.reasonJson)" :key="reason.factorCode">
                  {{ reason.factorName || reason.factorCode }} · {{ reason.contribution }}
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="生成时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!rows.length && !loading && !ranking" description="暂无预测排序，点击生成 Top K" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick, Refresh } from '@element-plus/icons-vue'
import { fetchLearningPredictions, rankLearningUniverse } from '../services/aiLearning'

const loading = ref(false)
const ranking = ref(false)
const predictionData = ref(null)
const rankData = ref(null)
const form = reactive({
  universeCode: 'WATCHLIST',
  horizonDays: 3,
  topK: 10,
})

const rows = computed(() => rankData.value?.predictions || predictionData.value?.predictions || [])

async function loadPredictions() {
  loading.value = true
  try {
    predictionData.value = await fetchLearningPredictions(200)
  } catch (error) {
    ElMessage.error(error.message || '预测列表加载失败')
  } finally {
    loading.value = false
  }
}

async function rankUniverse() {
  ranking.value = true
  try {
    rankData.value = await rankLearningUniverse(form)
    ElMessage.success('选股排序已生成')
  } catch (error) {
    console.error('[猫狗智投] 选股排序失败', error)
    ElMessage.error(error.message || '选股排序失败')
  } finally {
    ranking.value = false
  }
}

function parseReasons(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.slice(0, 4) : []
  } catch {
    return []
  }
}

function actionText(value) {
  return { BUY: '买入', HOLD: '持有', REDUCE: '减仓', SELL: '卖出', WATCH: '观察' }[value] || value || '-'
}

function actionType(value) {
  return value === 'BUY' ? 'danger' : value === 'HOLD' ? 'success' : value === 'REDUCE' || value === 'SELL' ? 'warning' : 'info'
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-'
}

onMounted(loadPredictions)
</script>

<style scoped>
.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.rank-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 800;
}

.reason-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reason-list span {
  max-width: 160px;
  overflow: hidden;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 4px 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
