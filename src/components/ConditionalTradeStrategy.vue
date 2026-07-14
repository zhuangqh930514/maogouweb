<template>
  <section class="strategy-panel">
    <header class="strategy-header">
      <div>
        <div class="strategy-kicker">CONDITIONAL EXECUTION PLAN</div>
        <h3>未来 3 日条件交易方案</h3>
        <p>规则版本 {{ strategy?.lineage?.ruleConfigVersion || '-' }} · 策略 {{ strategy?.lineage?.strategyReleaseVersion || '基础规则' }}</p>
      </div>
      <div class="strategy-header-tags">
        <el-tag type="warning" effect="plain">非涨跌预测</el-tag>
        <el-tag type="success" effect="plain">条件满足后执行</el-tag>
      </div>
    </header>

    <div class="context-strip">
      <div>
        <span>持仓状态</span>
        <strong>{{ strategy?.position?.holding ? `${strategy.position.quantity || 0} 股` : '未持仓' }}</strong>
        <em v-if="strategy?.position?.holding">成本 {{ money(strategy.position.averageCost) }} · 盈亏 {{ signedPercent(strategy.position.profitRate) }}</em>
        <em v-else>当前价 {{ money(strategy?.position?.currentPrice) }}</em>
      </div>
      <div>
        <span>市场环境</span>
        <strong>{{ regimeText(strategy?.market?.marketRegime) }}</strong>
        <em>{{ strategy?.market?.sectorName || '板块数据待确认' }}</em>
      </div>
      <div>
        <span>研究样本</span>
        <strong>{{ strategy?.lineage?.sampleId || '-' }}</strong>
        <em>数据质量 {{ percentValue(strategy?.lineage?.dataQualityScore) }}</em>
      </div>
      <div>
        <span>策略验证分</span>
        <strong>{{ numberValue(strategy?.lineage?.strategyValidationScore) }}</strong>
        <em>配置指纹 {{ shortFingerprint(strategy?.lineage?.configFingerprint) }}</em>
      </div>
    </div>

    <div class="risk-layout">
      <div class="risk-total" :class="riskTone(strategy?.riskScore?.level)">
        <el-progress
          type="dashboard"
          :percentage="Number(strategy?.riskScore?.total || 0)"
          :width="116"
          :stroke-width="10"
          :color="riskColor(strategy?.riskScore?.level)"
        >
          <template #default="{ percentage }">
            <strong>{{ percentage }}</strong>
            <span>Risk Score</span>
          </template>
        </el-progress>
        <div>
          <span>{{ riskLevelText(strategy?.riskScore?.level) }}</span>
          <p>{{ strategy?.riskScore?.advice || '-' }}</p>
        </div>
      </div>
      <div class="risk-components">
        <div v-for="item in strategy?.riskScore?.components || []" :key="item.code" class="risk-component">
          <div>
            <span>{{ item.name }}</span>
            <em>{{ numberValue(Number(item.weight || 0) * 100) }}%</em>
          </div>
          <el-progress
            :percentage="Number(item.score || 0)"
            :stroke-width="7"
            :show-text="false"
            :color="riskBarColor(item.score)"
          />
          <small>{{ item.evidence || '-' }} · {{ item.dataStatus === 'MISSING' ? '数据缺失' : '数据可用' }}</small>
        </div>
      </div>
    </div>

    <div class="plan-section">
      <div class="section-heading">
        <div>
          <span>TRADING PLANS</span>
          <h4>T+1 / T+2 / T+3 操作计划</h4>
        </div>
        <el-tag type="info" effect="plain">IF A → THEN B</el-tag>
      </div>
      <el-tabs v-model="activePlan" class="plan-tabs">
        <el-tab-pane
          v-for="plan in strategy?.tradingPlans || []"
          :key="plan.horizonDays"
          :name="String(plan.horizonDays)"
          :label="`T+${plan.horizonDays}`"
        >
          <div class="plan-summary">
            <div>
              <span>当前状态</span>
              <strong>{{ plan.currentState }}</strong>
            </div>
            <div>
              <span>当前动作</span>
              <strong>{{ actionText(plan.currentAction) }}</strong>
            </div>
            <p>{{ plan.objective }}</p>
            <ReviewBadge :review="reviewFor(plan.horizonDays)" />
          </div>

          <div class="rule-list">
            <article v-for="rule in plan.rules || []" :key="rule.ruleCode" class="rule-item" :class="{ matched: rule.matched }">
              <div class="rule-topline">
                <div>
                  <el-tag :type="rule.matched ? 'success' : 'info'" effect="plain">
                    {{ rule.matched ? '当前已满足' : '条件未完整满足' }}
                  </el-tag>
                  <strong>{{ rule.state }}</strong>
                  <code>{{ rule.ruleCode }}</code>
                </div>
                <div class="rule-strength">
                  <span>信号强度</span>
                  <strong>{{ numberValue(rule.signalStrength) }}</strong>
                </div>
              </div>
              <p class="if-then">{{ rule.ifThen }}</p>
              <div class="condition-grid">
                <div
                  v-for="condition in rule.triggerConditions || []"
                  :key="condition.code"
                  class="condition-item"
                  :class="conditionTone(condition.satisfied)"
                >
                  <span class="condition-dot"></span>
                  <div>
                    <strong>{{ condition.label }}</strong>
                    <small>当前 {{ condition.actual }} · 阈值 {{ condition.operator }} {{ condition.threshold }}</small>
                  </div>
                  <em>{{ conditionStatus(condition.satisfied) }}</em>
                </div>
              </div>
              <div class="rule-footer">
                <span>动作 <strong>{{ actionText(rule.action) }}</strong></span>
                <span>仓位 <strong>{{ rule.position }}</strong></span>
                <span class="rule-risk">{{ rule.riskWarning }}</span>
              </div>
              <div v-if="rule.factorEvidence?.length" class="factor-row">
                <span>研究因子</span>
                <el-tooltip
                  v-for="factor in rule.factorEvidence"
                  :key="factor.factorCode"
                  :content="factorTooltip(factor)"
                  placement="top"
                >
                  <el-tag :type="factor.hit ? 'success' : 'info'" effect="plain">{{ factor.factorCode }}</el-tag>
                </el-tooltip>
              </div>
            </article>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="model-layout">
      <section class="model-group buy-group">
        <div class="section-heading compact">
          <div>
            <span>ENTRY MODELS</span>
            <h4>买点模型</h4>
          </div>
        </div>
        <ModelRow v-for="model in strategy?.buyModels || []" :key="model.modelCode" :model="model" tone="buy" />
      </section>

      <section class="model-group sell-group">
        <div class="section-heading compact">
          <div>
            <span>EXIT MODELS</span>
            <h4>卖点模型</h4>
          </div>
        </div>
        <ModelRow v-for="model in strategy?.sellModels || []" :key="model.modelCode" :model="model" tone="sell" />
      </section>
    </div>

    <section v-if="reviews?.length" class="review-section">
      <div class="section-heading compact">
        <div>
          <span>LEARNING FEEDBACK</span>
          <h4>条件策略复盘</h4>
        </div>
      </div>
      <div class="review-grid">
        <div v-for="review in reviews" :key="review.id || review.horizonDays" class="review-item">
          <div>
            <strong>T+{{ review.horizonDays }}</strong>
            <el-tag :type="reviewTagType(review.status)" effect="plain">{{ reviewStatusText(review.status) }}</el-tag>
          </div>
          <p>{{ review.feedbackSummary || `计划验证日 ${review.targetTradeDate || '-'}` }}</p>
          <dl v-if="review.status === 'VERIFIED'">
            <div><dt>触发规则</dt><dd>{{ review.triggeredState || review.triggeredRuleCode }}</dd></div>
            <div><dt>触发后收益</dt><dd :class="Number(review.postTriggerReturn || 0) >= 0 ? 'up' : 'down'">{{ signedPercent(review.postTriggerReturn) }}</dd></div>
            <div><dt>复盘分</dt><dd>{{ numberValue(review.reviewScore) }}</dd></div>
          </dl>
        </div>
      </div>
    </section>

    <el-alert
      v-if="strategy?.dataLimitations?.length"
      title="数据边界"
      type="warning"
      :closable="false"
      show-icon
    >
      <ul class="limitation-list">
        <li v-for="item in strategy.dataLimitations" :key="item">{{ item }}</li>
      </ul>
    </el-alert>
  </section>
</template>

<script setup>
import { defineComponent, h, ref } from 'vue'
import { ElTag } from 'element-plus'

const props = defineProps({
  strategy: { type: Object, required: true },
  reviews: { type: Array, default: () => [] },
})

const activePlan = ref('1')

const ReviewBadge = defineComponent({
  props: { review: { type: Object, default: null } },
  setup(componentProps) {
    return () => h(ElTag, {
      type: reviewTagType(componentProps.review?.status),
      effect: 'plain',
    }, () => componentProps.review ? reviewStatusText(componentProps.review.status) : '等待复盘')
  },
})

const ModelRow = defineComponent({
  props: {
    model: { type: Object, required: true },
    tone: { type: String, default: 'buy' },
  },
  setup(componentProps) {
    return () => h('article', {
      class: ['model-row', componentProps.tone, { triggered: componentProps.model.triggered }],
    }, [
      h('div', { class: 'model-row-head' }, [
        h('div', [
          h('strong', componentProps.model.type),
          h('code', componentProps.model.modelCode),
        ]),
        h(ElTag, {
          type: componentProps.model.triggered ? (componentProps.tone === 'buy' ? 'success' : 'danger') : 'info',
          effect: 'plain',
        }, () => componentProps.model.triggered ? '已触发' : '等待触发'),
      ]),
      h('p', { class: 'model-if-then' }, componentProps.model.ifThen),
      componentProps.model.triggerConditions?.length
        ? h('div', { class: 'model-condition-list' }, componentProps.model.triggerConditions.map((condition) => h('div', {
          class: ['model-condition', conditionTone(condition.satisfied)],
        }, [
          h('span', condition.label),
          h('em', `${conditionStatus(condition.satisfied)} · ${condition.actual || '-'}`),
        ])))
        : null,
      h('div', { class: 'model-meta' }, [
        h('span', `动作 ${actionText(componentProps.model.action)}`),
        h('span', `参考位 ${componentProps.model.referencePrice || '-'}`),
        h('span', `仓位 ${componentProps.model.position || '-'}`),
        h('span', `强度 ${numberValue(componentProps.model.confidence)}`),
      ]),
      h('small', { class: 'model-risk' }, componentProps.model.riskWarning || '-'),
    ])
  },
})

function reviewFor(horizon) {
  return props.reviews.find((item) => Number(item.horizonDays) === Number(horizon)) || null
}

function conditionStatus(value) {
  return value === true ? '已满足' : value === false ? '未满足' : '数据缺失'
}

function conditionTone(value) {
  return value === true ? 'is-hit' : value === false ? 'is-miss' : 'is-unknown'
}

function actionText(value) {
  return {
    BUY: '买入', ADD: '增加仓位', HOLD: '持有', WATCH: '观察', REDUCE: '减仓',
    SELL: '退出', TAKE_PROFIT: '分批止盈', STOP_LOSS: '止损', REASSESS: '重新评估',
  }[value] || value || '-'
}

function regimeText(value) {
  return { BULL: '强势', BEAR: '弱势', SIDEWAYS: '震荡', UNKNOWN: '待确认' }[value] || value || '待确认'
}

function riskLevelText(value) {
  return { LOW: '低风险', MEDIUM: '中风险', HIGH: '高风险' }[value] || '风险待确认'
}

function riskTone(value) {
  return `risk-${String(value || 'MEDIUM').toLowerCase()}`
}

function riskColor(value) {
  return { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626' }[value] || '#d97706'
}

function riskBarColor(score) {
  const value = Number(score || 0)
  return value >= 60 ? '#dc2626' : value >= 30 ? '#d97706' : '#16a34a'
}

function reviewTagType(status) {
  return status === 'VERIFIED' ? 'success' : status === 'NO_TRIGGER' ? 'info' : 'warning'
}

function reviewStatusText(status) {
  return { VERIFIED: '已验证', NO_TRIGGER: '未触发', PENDING: '等待复盘' }[status] || '等待复盘'
}

function factorTooltip(factor) {
  const sample = factor.sampleCount ? `样本 ${factor.sampleCount}` : '低样本'
  const rate = factor.historicalSuccessRate == null ? '胜率待积累' : `历史有效率 ${numberValue(factor.historicalSuccessRate)}%`
  return `${factor.factorName || factor.factorCode} · ${sample} · ${rate}`
}

function money(value) {
  return value == null ? '-' : `¥${Number(value).toFixed(2)}`
}

function signedPercent(value) {
  if (value == null) return '-'
  const number = Number(value)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

function percentValue(value) {
  return value == null ? '-' : `${Number(value).toFixed(1)}%`
}

function numberValue(value) {
  return value == null ? '-' : Number(value).toFixed(1)
}

function shortFingerprint(value) {
  return value ? `${value.slice(0, 8)}…` : '-'
}
</script>

<style scoped>
.strategy-panel {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 20px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #fff;
}

.strategy-header,
.section-heading,
.rule-topline,
.rule-footer,
.model-row-head,
.strategy-header-tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.strategy-kicker,
.section-heading span {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}

.strategy-header h3,
.section-heading h4 {
  margin: 4px 0 0;
  color: #111827;
  letter-spacing: 0;
}

.strategy-header h3 {
  font-size: 20px;
}

.strategy-header p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 12px;
}

.context-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

.context-strip > div {
  min-width: 0;
  padding: 14px 16px;
  border-right: 1px solid #e5e7eb;
}

.context-strip > div:last-child {
  border-right: 0;
}

.context-strip span,
.plan-summary span,
.rule-strength span {
  display: block;
  color: #64748b;
  font-size: 11px;
}

.context-strip strong,
.plan-summary strong {
  display: block;
  margin-top: 5px;
  color: #111827;
  font-size: 15px;
}

.context-strip em {
  display: block;
  overflow: hidden;
  margin-top: 5px;
  color: #64748b;
  font-style: normal;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-layout {
  display: grid;
  grid-template-columns: minmax(240px, 0.8fr) minmax(0, 1.7fr);
  gap: 18px;
}

.risk-total {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px;
  border-left: 4px solid #d97706;
  background: #f8fafc;
}

.risk-total.risk-low { border-left-color: #16a34a; }
.risk-total.risk-high { border-left-color: #dc2626; }

.risk-total :deep(.el-progress__text) strong,
.risk-total :deep(.el-progress__text) span {
  display: block;
  text-align: center;
}

.risk-total :deep(.el-progress__text) strong { font-size: 24px; }
.risk-total :deep(.el-progress__text) span { margin-top: 2px; color: #64748b; font-size: 10px; }

.risk-total > div > span {
  color: #111827;
  font-size: 16px;
  font-weight: 800;
}

.risk-total p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.risk-components {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 18px;
}

.risk-component > div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
  font-size: 12px;
}

.risk-component em { color: #64748b; font-style: normal; }
.risk-component small { display: block; margin-top: 6px; color: #94a3b8; font-size: 10px; }

.section-heading.compact { margin-bottom: 12px; }
.section-heading h4 { font-size: 15px; }

.plan-tabs {
  margin-top: 10px;
  --el-color-primary: #1d4ed8;
}

.plan-summary {
  display: grid;
  grid-template-columns: 140px 140px minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 13px 16px;
  background: #f1f5f9;
}

.plan-summary p { margin: 0; color: #475569; font-size: 12px; }

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.rule-item,
.model-row,
.review-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.rule-item { padding: 15px; }
.rule-item.matched { border-color: #86efac; box-shadow: inset 3px 0 #16a34a; }

.rule-topline > div:first-child {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.rule-topline code,
.model-row code {
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
}

.rule-strength { text-align: right; }
.rule-strength strong { display: block; margin-top: 2px; font-size: 18px; }

.if-then,
.model-if-then {
  margin: 12px 0;
  color: #1e3a8a;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.65;
}

.condition-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.condition-item {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  background: #f8fafc;
}

.condition-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
.condition-item.is-hit .condition-dot { background: #16a34a; }
.condition-item.is-miss .condition-dot { background: #dc2626; }
.condition-item.is-unknown .condition-dot { background: #d97706; }
.condition-item strong { display: block; font-size: 11px; }
.condition-item small { display: block; margin-top: 3px; color: #64748b; font-size: 10px; }
.condition-item em { color: #64748b; font-style: normal; font-size: 10px; }

.rule-footer {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 12px;
  color: #64748b;
  font-size: 11px;
}

.rule-footer strong { color: #111827; }
.rule-risk { flex: 1 1 300px; text-align: right; }

.factor-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}

.factor-row > span { margin-right: 3px; color: #64748b; font-size: 10px; }

.model-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.model-group { min-width: 0; }
.model-row { margin-top: 9px; padding: 13px 14px; }
.model-row.triggered.buy { border-color: #86efac; box-shadow: inset 3px 0 #16a34a; }
.model-row.triggered.sell { border-color: #fca5a5; box-shadow: inset 3px 0 #dc2626; }
.model-row-head > div { display: flex; align-items: center; gap: 8px; }
.model-if-then { margin: 9px 0; font-size: 11px; font-weight: 600; }
.model-condition-list { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.model-condition {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-left: 2px solid #94a3b8;
  background: #f8fafc;
  font-size: 10px;
}
.model-condition.is-hit { border-left-color: #16a34a; }
.model-condition.is-miss { border-left-color: #dc2626; }
.model-condition.is-unknown { border-left-color: #d97706; }
.model-condition span { min-width: 0; color: #334155; }
.model-condition em { flex: 0 0 auto; color: #64748b; font-style: normal; text-align: right; }
.model-meta { display: flex; flex-wrap: wrap; gap: 12px; color: #475569; font-size: 11px; }
.model-risk { display: block; margin-top: 8px; color: #94a3b8; font-size: 10px; }

.review-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.review-item { padding: 13px; }
.review-item > div:first-child { display: flex; justify-content: space-between; align-items: center; }
.review-item p { min-height: 38px; margin: 9px 0 0; color: #64748b; font-size: 11px; line-height: 1.6; }
.review-item dl { margin: 10px 0 0; }
.review-item dl div { display: flex; justify-content: space-between; gap: 8px; margin-top: 5px; font-size: 10px; }
.review-item dt { color: #94a3b8; }
.review-item dd { margin: 0; color: #334155; font-weight: 700; text-align: right; }

.limitation-list { margin: 4px 0 0; padding-left: 18px; line-height: 1.7; }
.up { color: #dc2626 !important; }
.down { color: #16a34a !important; }

@container (max-width: 760px) {
  .context-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .context-strip > div:nth-child(2) { border-right: 0; }
  .context-strip > div:nth-child(-n + 2) { border-bottom: 1px solid #e5e7eb; }
  .risk-layout,
  .model-layout { grid-template-columns: minmax(0, 1fr); }
  .plan-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .plan-summary p { grid-column: 1 / -1; }
  .review-grid { grid-template-columns: minmax(0, 1fr); }
}

@container (max-width: 520px) {
  .strategy-panel { padding: 14px; }
  .strategy-header { align-items: flex-start; flex-direction: column; }
  .strategy-header-tags { flex-wrap: wrap; }
  .risk-total { align-items: flex-start; flex-direction: column; }
  .risk-components,
  .condition-grid { grid-template-columns: minmax(0, 1fr); }
  .plan-summary { grid-template-columns: minmax(0, 1fr); }
  .rule-topline { align-items: flex-start; }
  .rule-strength { flex: 0 0 64px; }
  .rule-risk { text-align: left; }
}

@container (max-width: 390px) {
  .context-strip { grid-template-columns: minmax(0, 1fr); }
  .context-strip > div { border-right: 0; border-bottom: 1px solid #e5e7eb; }
}
</style>
