<template>
  <div v-loading="loading" class="research-panel-stack">
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false">
      <template #default><el-button text type="primary" @click="$emit('retry')">重新加载</el-button></template>
    </el-alert>

    <template v-if="overview">
      <section class="surface research-operation-panel">
        <div class="research-operation-header">
          <div>
            <h3>运行与数据质量</h3>
            <p>只读取已落库的运行、来源和决策证据，不触发分析或自动重跑。</p>
          </div>
          <el-select :model-value="windowDays" aria-label="运维观察窗口" @update:model-value="$emit('window-change', Number($event))">
            <el-option v-for="day in [7, 14, 30, 60, 90]" :key="day" :label="`近 ${day} 天`" :value="day" />
          </el-select>
        </div>
        <p class="operations-generated-at">数据生成时间：{{ formatDateTime(overview.generatedAt) }} · 最新交易日：{{ overview.tradeDate || '暂无正式全局研究' }}</p>
      </section>

      <section class="surface evidence-summary operations-summary">
        <div v-for="metric in metrics" :key="metric.label" class="evidence-metric">
          <span>{{ metric.label }}</span>
          <strong class="mono">{{ metric.value }}</strong>
          <small :class="metric.tone">{{ metric.hint }}</small>
        </div>
      </section>

      <section class="surface research-table-panel">
        <div class="research-table-header">
          <div>
            <h3>待处理告警</h3>
            <p class="research-table-subtitle">告警保留运行、步骤、股票、来源、原因与重试上下文；未记录的字段不会被系统推断。</p>
          </div>
          <el-tag :type="alertTagType" effect="plain">{{ alerts.length }} 条</el-tag>
        </div>
        <el-table :data="alerts" row-key="id" stripe empty-text="当前没有需要处理的告警">
          <el-table-column label="级别" width="96">
            <template #default="scope"><el-tag :type="severityType(scope.row.severity)" effect="plain">{{ statusLabel(scope.row.severity) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="告警" min-width="170">
            <template #default="scope"><strong>{{ scope.row.title }}</strong><br><span class="mono operations-secondary">{{ statusLabel(scope.row.category) }}</span></template>
          </el-table-column>
          <el-table-column label="运行 / 步骤" min-width="150">
            <template #default="scope"><span class="mono">{{ runStep(scope.row) }}</span></template>
          </el-table-column>
          <el-table-column label="股票 / 来源" min-width="140">
            <template #default="scope"><div class="mono">{{ scope.row.stockCode || '未记录' }}</div><div class="operations-secondary">{{ scope.row.providerCode || '未记录' }}</div></template>
          </el-table-column>
          <el-table-column label="原因" min-width="270">
            <template #default="scope"><span class="operations-cause">{{ scope.row.cause || '未记录' }}</span></template>
          </el-table-column>
          <el-table-column label="重试" min-width="164">
            <template #default="scope"><div>{{ retryText(scope.row) }}</div><div class="operations-secondary">{{ formatDateTime(scope.row.nextRetryAt) }}</div></template>
          </el-table-column>
        </el-table>
      </section>

      <div class="research-split">
        <section class="surface research-table-panel">
          <div class="research-table-header"><div><h3>任务健康</h3><p class="research-table-subtitle">运行状态、近期耗时与失效租约。</p></div></div>
          <dl class="evidence-list evidence-list-wide">
            <div><dt>运行状态</dt><dd>{{ taskStatusText }}</dd></div>
            <div><dt>P50 / P95 耗时</dt><dd class="mono">{{ formatMillis(overview.tasks?.latencyP50Millis) }} / {{ formatMillis(overview.tasks?.latencyP95Millis) }}</dd></div>
            <div><dt>失效运行</dt><dd>{{ overview.tasks?.staleRunningCount || 0 }} 条</dd></div>
          </dl>
        </section>
        <section class="surface research-table-panel">
          <div class="research-table-header"><div><h3>样本覆盖</h3><p class="research-table-subtitle">仅统计最新全局数据批次已固化的样本状态。</p></div></div>
          <dl class="evidence-list evidence-list-wide">
            <div v-for="item in coverage" :key="item.status"><dt>{{ statusLabel(item.status) }}</dt><dd class="mono">{{ formatNumber(item.count) }}</dd></div>
            <div v-if="coverage.length === 0"><dt>覆盖状态</dt><dd>最新批次尚未固化样本</dd></div>
          </dl>
        </section>
      </div>

      <section class="surface research-table-panel">
        <div class="research-table-header"><div><h3>数据源健康</h3><p class="research-table-subtitle">数据源失败或处于冷却期时，正式研究应等待或降级，不能用缓存和演示数据伪装成功。</p></div></div>
        <el-table :data="sources" row-key="id" stripe empty-text="尚无数据源健康记录">
          <el-table-column prop="providerCode" label="提供方" min-width="118" />
          <el-table-column prop="endpointType" label="接口类型" min-width="118" />
          <el-table-column label="状态" width="112"><template #default="scope"><el-tag :type="statusType(scope.row.sourceStatus)" effect="plain">{{ statusLabel(scope.row.sourceStatus) }}</el-tag></template></el-table-column>
          <el-table-column label="最近成功" min-width="164"><template #default="scope">{{ formatDateTime(scope.row.lastSuccessAt) }}</template></el-table-column>
          <el-table-column label="连续失败" width="104"><template #default="scope"><span class="mono">{{ scope.row.consecutiveFailureCount || 0 }}</span></template></el-table-column>
          <el-table-column label="冷却至" min-width="164"><template #default="scope">{{ formatDateTime(scope.row.cooldownUntil) }}</template></el-table-column>
          <el-table-column label="最近原因" min-width="240"><template #default="scope"><span class="operations-cause">{{ scope.row.cause || '-' }}</span></template></el-table-column>
        </el-table>
      </section>

      <div class="research-split">
        <section class="surface research-table-panel">
          <div class="research-table-header"><div><h3>用户日报覆盖</h3><p class="research-table-subtitle">有自选股或真实持仓的活跃用户必须有当日投研日报。</p></div></div>
          <dl class="evidence-list evidence-list-wide">
            <div><dt>应生成用户</dt><dd class="mono">{{ overview.dailyReports?.eligibleUserCount || 0 }}</dd></div>
            <div><dt>已生成日报</dt><dd class="mono">{{ overview.dailyReports?.reportReadyUserCount || 0 }}</dd></div>
            <div><dt>缺失日报</dt><dd class="mono">{{ overview.dailyReports?.missingReportUserCount || 0 }}</dd></div>
            <div><dt>连续两日缺失</dt><dd class="mono">{{ consecutiveMissingUsers.length }}</dd></div>
          </dl>
          <ul v-if="missingUsers.length" class="operations-evidence-list"><li v-for="item in missingUsers" :key="item.userId">{{ item.displayName }}（用户 #{{ item.userId }}）</li></ul>
          <ul v-if="consecutiveMissingUsers.length" class="operations-evidence-list"><li v-for="item in consecutiveMissingUsers" :key="`consecutive-${item.userId}`">{{ item.displayName }}（{{ item.missingTradeDates || '日期未记录' }}）</li></ul>
        </section>
        <section class="surface research-table-panel">
          <div class="research-table-header"><div><h3>真实持仓覆盖</h3><p class="research-table-subtitle">持仓缺少当日正式结论时必须优先处置。</p></div></div>
          <dl class="evidence-list evidence-list-wide">
            <div><dt>有效持仓</dt><dd class="mono">{{ overview.holdings?.activeHoldingCount || 0 }}</dd></div>
            <div><dt>缺少结论</dt><dd class="mono">{{ overview.holdings?.withoutDailyConclusionCount || 0 }}</dd></div>
          </dl>
          <ul v-if="holdingGaps.length" class="operations-evidence-list"><li v-for="item in holdingGaps" :key="`${item.userId}-${item.stockCode}`">{{ item.stockName }} {{ item.stockCode }}（用户 #{{ item.userId }}，{{ item.netQuantity }} 股）</li></ul>
        </section>
      </div>

      <div class="research-split">
        <section class="surface research-table-panel">
          <div class="research-table-header"><div><h3>模型失败分类</h3><p class="research-table-subtitle">按真实失败文本归类，未知错误保留原始原因，不假装可恢复。</p></div></div>
          <dl class="evidence-list evidence-list-wide">
            <div v-for="(count, type) in modelFailureGroups" :key="type"><dt>{{ statusLabel(type) }}</dt><dd class="mono">{{ count }}</dd></div>
            <div v-if="Object.keys(modelFailureGroups).length === 0"><dt>失败记录</dt><dd>当前窗口没有模型失败</dd></div>
          </dl>
        </section>
        <section class="surface research-table-panel">
          <div class="research-table-header"><div><h3>结论一致性</h3><p class="research-table-subtitle">正式日报动作与关联 AI 报告动作冲突时，需要检查已保存的裁决证据。</p></div></div>
          <dl class="evidence-list evidence-list-wide">
            <div><dt>动作冲突</dt><dd class="mono">{{ overview.decisionConflicts?.conflictCount || 0 }}</dd></div>
            <div><dt>无报告关联</dt><dd class="mono">{{ overview.decisionConflicts?.withoutReportCount || 0 }}</dd></div>
            <div><dt>研究池污染</dt><dd class="mono">{{ overview.universePollution?.issueCount || 0 }}</dd></div>
            <div><dt>来源血缘</dt><dd class="mono">{{ overview.universeLineage?.recordedCount || 0 }} 条{{ Number(overview.universeLineage?.invalidCount || 0) ? `，异常 ${overview.universeLineage.invalidCount}` : '' }}</dd></div>
          </dl>
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
  windowDays: { type: Number, default: 14 },
})
defineEmits(['retry', 'window-change'])

const alerts = computed(() => props.overview?.alerts || [])
const sources = computed(() => props.overview?.sources?.providers || [])
const coverage = computed(() => props.overview?.sources?.coverage || [])
const missingUsers = computed(() => props.overview?.dailyReports?.missingUsers || [])
const consecutiveMissingUsers = computed(() => props.overview?.dailyReports?.consecutiveMissingUsers || [])
const holdingGaps = computed(() => props.overview?.holdings?.gaps || [])
const modelFailureGroups = computed(() => props.overview?.modelFailures?.groupedCounts || {})
const alertTagType = computed(() => alerts.value.some((item) => item.severity === 'CRITICAL') ? 'danger' : alerts.value.length ? 'warning' : 'success')
const taskStatusText = computed(() => Object.entries(props.overview?.tasks?.statusCounts || {})
  .map(([status, count]) => `${statusLabel(status)} ${count}`).join(' · ') || '当前窗口没有运行记录')
const metrics = computed(() => [
  { label: '运行记录', value: formatNumber(props.overview?.tasks?.totalRuns), hint: `近 ${props.overview?.windowDays || props.windowDays} 天`, tone: '' },
  { label: '失效运行', value: formatNumber(props.overview?.tasks?.staleRunningCount), hint: '无有效租约', tone: Number(props.overview?.tasks?.staleRunningCount || 0) ? 'operations-danger' : '' },
  { label: '模型失败', value: formatNumber(props.overview?.modelFailures?.totalFailures), hint: '按真实错误分类', tone: Number(props.overview?.modelFailures?.totalFailures || 0) ? 'operations-warning' : '' },
  { label: '缺失日报', value: formatNumber(props.overview?.dailyReports?.missingReportUserCount), hint: '活跃用户', tone: Number(props.overview?.dailyReports?.missingReportUserCount || 0) ? 'operations-warning' : '' },
  { label: '连续两日缺失', value: formatNumber(consecutiveMissingUsers.value.length), hint: '最近已完成交易日', tone: consecutiveMissingUsers.value.length ? 'operations-danger' : '' },
  { label: '持仓无结论', value: formatNumber(props.overview?.holdings?.withoutDailyConclusionCount), hint: '优先处理', tone: Number(props.overview?.holdings?.withoutDailyConclusionCount || 0) ? 'operations-danger' : '' },
  { label: '动作冲突', value: formatNumber(props.overview?.decisionConflicts?.conflictCount), hint: '日报与报告', tone: Number(props.overview?.decisionConflicts?.conflictCount || 0) ? 'operations-warning' : '' },
  { label: '无报告关联', value: formatNumber(props.overview?.decisionConflicts?.withoutReportCount), hint: '可能是规则降级', tone: Number(props.overview?.decisionConflicts?.withoutReportCount || 0) ? 'operations-warning' : '' },
  { label: '研究池污染', value: formatNumber(props.overview?.universePollution?.issueCount), hint: '禁止进入正式样本', tone: Number(props.overview?.universePollution?.issueCount || 0) ? 'operations-danger' : '' },
  { label: '来源血缘异常', value: formatNumber(props.overview?.universeLineage?.invalidCount), hint: '只按快照事实审计', tone: Number(props.overview?.universeLineage?.invalidCount || 0) ? 'operations-danger' : '' },
])

function severityType(value) { return value === 'CRITICAL' ? 'danger' : value === 'WARNING' ? 'warning' : 'info' }
function statusType(value) {
  const status = String(value || '').toUpperCase()
  if (['HEALTHY', 'READY', 'REALTIME'].includes(status)) return 'success'
  if (['UNAVAILABLE', 'FAILED', 'FAILED_FINAL'].includes(status)) return 'danger'
  if (['STALE', 'WAITING_SOURCE', 'FAILED_RECOVERABLE'].includes(status)) return 'warning'
  return 'info'
}
function runStep(alert) {
  const run = alert.pipelineRunId ? `#${alert.pipelineRunId}` : '未关联运行'
  return alert.step ? `${run} / ${statusLabel(alert.step)}` : run
}
function retryText(alert) { return alert.retryCount === null || alert.retryCount === undefined ? '未记录重试' : `已重试 ${alert.retryCount} 次` }
function formatDateTime(value) { return value ? String(value).replace('T', ' ').slice(0, 19) : '-' }
function formatNumber(value) { return new Intl.NumberFormat('zh-CN').format(Number(value || 0)) }
function formatMillis(value) {
  const milliseconds = Number(value)
  if (!Number.isFinite(milliseconds)) return '-'
  if (milliseconds < 1000) return `${milliseconds} ms`
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)} 秒`
  return `${(milliseconds / 60_000).toFixed(1)} 分钟`
}
</script>
