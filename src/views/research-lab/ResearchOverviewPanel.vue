<template>
  <div v-loading="loading" class="research-panel-stack">
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button text type="primary" @click="$emit('retry')">重新加载</el-button>
      </template>
    </el-alert>

    <template v-if="overview">
      <section class="surface evidence-summary">
        <div v-for="metric in metrics" :key="metric.label" class="evidence-metric">
          <span>{{ metric.label }}</span>
          <strong class="mono">{{ metric.value }}</strong>
        </div>
      </section>

      <section class="surface readiness-band">
        <div class="readiness-heading">
          <div>
            <h3>训练准入</h3>
            <p>{{ readinessReady ? '正式训练所需证据已满足' : '研究数据仍在积累' }}</p>
          </div>
          <el-tag :type="readinessReady ? 'success' : 'warning'" effect="plain">
            {{ readinessReady ? '已满足准入条件' : '数据积累不足' }}
          </el-tag>
        </div>
        <div v-if="!readinessReady" class="readiness-gaps">
          <span v-for="gap in readinessGaps" :key="gap">{{ gap }}</span>
        </div>
      </section>

      <div class="research-split">
        <section class="surface research-evidence-block">
          <div class="research-block-header">
            <h3>当前正式策略</h3>
            <el-tag v-if="activeStrategy.status" type="success" effect="plain">
              {{ statusLabel(activeStrategy.status) }}
            </el-tag>
          </div>
          <dl v-if="activeStrategy.id" class="evidence-list">
            <div><dt>策略</dt><dd>{{ activeStrategy.title || `策略 #${activeStrategy.id}` }}</dd></div>
            <div><dt>版本</dt><dd class="mono">{{ activeStrategy.versionNo || '-' }}</dd></div>
            <div><dt>模型版本</dt><dd class="mono">{{ activeStrategy.modelVersionId || '规则基线' }}</dd></div>
            <div><dt>启用时间</dt><dd>{{ formatDateTime(activeStrategy.activatedAt) }}</dd></div>
          </dl>
          <el-empty v-else :image-size="72" description="尚未建立正式策略" />
        </section>

        <section class="surface research-evidence-block">
          <div class="research-block-header">
            <h3>最近全局流水线</h3>
            <el-tag v-if="latestPipeline.status" :type="statusType(latestPipeline.status)" effect="plain">
              {{ statusLabel(latestPipeline.status) }}
            </el-tag>
          </div>
          <dl v-if="latestPipeline.id" class="evidence-list">
            <div><dt>类型</dt><dd>{{ statusLabel(latestPipeline.pipelineType) }}</dd></div>
            <div><dt>交易日</dt><dd class="mono">{{ latestPipeline.tradeDate || '-' }}</dd></div>
            <div><dt>完成数</dt><dd class="mono">{{ latestPipeline.successCount || 0 }} / {{ latestPipeline.processedCount || 0 }}</dd></div>
            <div><dt>结束时间</dt><dd>{{ formatDateTime(latestPipeline.finishedAt) }}</dd></div>
          </dl>
          <el-empty v-else :image-size="72" description="尚无全局研究运行记录" />
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { statusLabel } from '../../utils/statusLabels'

const props = defineProps({
  overview: { type: Object, default: null },
  loading: Boolean,
  errorMessage: { type: String, default: '' },
})
defineEmits(['retry'])

const counts = computed(() => props.overview?.counts || {})
const metrics = computed(() => [
  { label: '正式样本', value: counts.value.samples || 0 },
  { label: '成熟标签', value: counts.value.matureLabels || 0 },
  { label: '预测记录', value: counts.value.predictions || 0 },
  { label: '训练数据集', value: counts.value.datasets || 0 },
  { label: '影子候选策略', value: counts.value.shadowChallengers || 0 },
])
const activeStrategy = computed(() => props.overview?.activeStrategy || {})
const latestPipeline = computed(() => props.overview?.latestPipeline || {})
const readiness = computed(() => props.overview?.trainingReadiness || {})

const readinessGaps = computed(() => {
  const gaps = []
  const tradingDays = Number(readiness.value['TRADING_DAYS:ALL'] || 0)
  const stocks = Number(readiness.value['STOCKS:ALL'] || 0)
  if (tradingDays < 120) gaps.push(`仍缺 ${120 - tradingDays} 个交易日`)
  if (stocks < 200) gaps.push(`仍缺 ${200 - stocks} 只股票`)
  for (const horizon of [1, 2, 3, 5]) {
    const count = Number(readiness.value[`HORIZON:${horizon}`] || 0)
    if (count < 20000) gaps.push(`T+${horizon} 仍缺 ${formatNumber(20000 - count)} 条成熟标签`)
  }
  for (const regime of ['UP', 'DOWN', 'SIDEWAYS']) {
    const days = Number(readiness.value[`REGIME:${regime}`] || 0)
    if (days < 20) gaps.push(`${statusLabel(regime)}环境仍缺 ${20 - days} 个交易日`)
  }
  return gaps
})
const readinessReady = computed(() => readinessGaps.value.length === 0)

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function statusType(status) {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'WAITING_SOURCE' || status === 'PARTIAL_SUCCESS') return 'warning'
  return 'info'
}
</script>
