<template>
  <div class="research-panel-stack">
    <section class="surface research-toolbar-panel lineage-band">
      <div>
        <h3>正式研究血缘</h3>
        <p>数据批次、样本、预测、真实标签和预测评价使用同一套不可变证据。</p>
      </div>
      <div class="lineage-flow" aria-label="研究数据血缘">
        <span>数据批次</span><i>→</i><span>样本与因子</span><i>→</i><span>分周期预测</span><i>→</i><span>真实标签</span><i>→</i><span>预测评价</span>
      </div>
    </section>

    <div class="research-subtabs" role="tablist" aria-label="样本与标签证据类型">
      <button
        v-for="dataset in datasets"
        :key="dataset.key"
        type="button"
        role="tab"
        :aria-selected="activeKey === dataset.key"
        :class="{ active: activeKey === dataset.key }"
        @click="activeKey = dataset.key"
      >
        {{ dataset.label }}
      </button>
    </div>

    <ResearchEvidenceTable
      :key="activeDataset.key"
      :title="activeDataset.title"
      :subtitle="activeDataset.subtitle"
      :loader="activeDataset.loader"
      :detail-loader="activeDataset.detailLoader"
      :columns="activeDataset.columns"
      :status-options="activeDataset.statusOptions"
      :show-stock-filter="activeDataset.showStock"
      :show-quality-filter="activeDataset.showQuality"
      :initial-stock-code="activeKey === 'samples' ? String(route.query.stockCode || '') : ''"
      :initial-detail-id="activeKey === 'samples' ? route.query.sampleId : ''"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchPredictionEvaluations,
  fetchResearchLabels,
  fetchResearchPredictions,
  fetchResearchSample,
  fetchResearchSamples,
} from '../../services/researchLab'
import ResearchEvidenceTable from './ResearchEvidenceTable.vue'

const route = useRoute()

const datasets = Object.freeze([
  {
    key: 'samples',
    label: '正式样本',
    title: '正式样本',
    subtitle: '查看信息截至时间、可交易状态、数据质量和输入指纹。',
    loader: fetchResearchSamples,
    detailLoader: fetchResearchSample,
    showStock: true,
    showQuality: true,
    statusOptions: [
      { label: '可交易', value: 'TRADABLE' },
      { label: '已排除', value: 'EXCLUDED' },
      { label: '未成交', value: 'UNFILLED' },
    ],
    columns: [
      { key: 'stockCode', label: '股票', width: 92, mono: true, fixed: 'left' },
      { key: 'stockName', label: '名称', minWidth: 110 },
      { key: 'tradeDate', label: '交易日', width: 112, mono: true },
      { key: 'samplePhase', label: '样本时点', width: 110, kind: 'status' },
      { key: 'marketRegime', label: '市场环境', width: 110, kind: 'status' },
      { key: 'dataQualityScore', label: '质量分', width: 86, kind: 'score', digits: 1 },
      { key: 'qualityStatus', label: '质量状态', width: 118, kind: 'status' },
      { key: 'tradableStatus', label: '可交易状态', width: 112, kind: 'status' },
      { key: 'asOfTime', label: '信息截至时间', minWidth: 164 },
    ],
  },
  {
    key: 'predictions',
    label: '分周期预测',
    title: '分周期预测',
    subtitle: '一条记录只代表一个交易周期，结论与策略版本、样本和输入指纹绑定。',
    loader: fetchResearchPredictions,
    showStock: true,
    statusOptions: [
      { label: '买入', value: 'BUY' },
      { label: '持有', value: 'HOLD' },
      { label: '观察', value: 'WATCH' },
      { label: '减仓', value: 'REDUCE' },
      { label: '卖出', value: 'SELL' },
      { label: '暂不判断', value: 'ABSTAIN' },
    ],
    columns: [
      { key: 'stockCode', label: '股票', width: 92, mono: true, fixed: 'left' },
      { key: 'tradeDate', label: '交易日', width: 112, mono: true },
      { key: 'horizonDays', label: '周期', width: 74, kind: 'horizon' },
      { key: 'action', label: '动作', width: 100, kind: 'status' },
      { key: 'targetDirection', label: '方向', width: 96, kind: 'status' },
      { key: 'score', label: '预测分', width: 86, kind: 'score' },
      { key: 'calibratedConfidence', label: '置信度', width: 98, kind: 'ratio' },
      { key: 'expectedExcessReturn', label: '预期超额', width: 106, kind: 'ratio' },
      { key: 'riskScore', label: '风险分', width: 86, kind: 'score' },
      { key: 'predictedAt', label: '预测时间', minWidth: 164 },
    ],
  },
  {
    key: 'labels',
    label: '真实标签',
    title: '真实市场标签',
    subtitle: '标签独立于模型预测，包含真实成交限制、成本、收益和不利波动。',
    loader: fetchResearchLabels,
    showStock: true,
    statusOptions: [
      { label: '标签已成熟', value: 'MATURED' },
      { label: '待处理', value: 'PENDING' },
      { label: '未成交', value: 'UNFILLED' },
    ],
    columns: [
      { key: 'stockCode', label: '股票', width: 92, mono: true, fixed: 'left' },
      { key: 'entryTradeDate', label: '入场日', width: 112, mono: true },
      { key: 'horizonTradingDays', label: '周期', width: 74, kind: 'horizon' },
      { key: 'actualDirection', label: '实际方向', width: 104, kind: 'status' },
      { key: 'netReturn', label: '净收益', width: 94, kind: 'ratio' },
      { key: 'excessReturn', label: '超额收益', width: 98, kind: 'ratio' },
      { key: 'maxAdverseReturn', label: '最大不利波动', width: 126, kind: 'ratio' },
      { key: 'executionStatus', label: '成交状态', width: 108, kind: 'status' },
      { key: 'labelStatus', label: '标签状态', width: 112, kind: 'status' },
      { key: 'maturedAt', label: '成熟时间', minWidth: 164 },
    ],
  },
  {
    key: 'evaluations',
    label: '预测评价',
    title: '预测样本外评价',
    subtitle: '只展示正式预测与成熟真实标签的配对评价，不在页面重新计算命中率。',
    loader: fetchPredictionEvaluations,
    showStock: true,
    statusOptions: [
      { label: '已评估', value: 'EVALUATED' },
      { label: '待处理', value: 'PENDING' },
      { label: '未成交', value: 'UNFILLED' },
    ],
    columns: [
      { key: 'predictionId', label: '预测 ID', width: 92, mono: true, fixed: 'left' },
      { key: 'sampleLabelId', label: '标签 ID', width: 88, mono: true },
      { key: 'directionCorrect', label: '方向正确', width: 92, kind: 'boolean' },
      { key: 'actionEffective', label: '动作有效', width: 92, kind: 'boolean' },
      { key: 'netReturn', label: '净收益', width: 94, kind: 'ratio' },
      { key: 'excessReturn', label: '超额收益', width: 98, kind: 'ratio' },
      { key: 'probabilityError', label: '概率误差', width: 98, kind: 'ratio' },
      { key: 'evaluationScore', label: '评价分', width: 86, kind: 'score' },
      { key: 'evaluationStatus', label: '评价状态', width: 108, kind: 'status' },
      { key: 'evaluatedAt', label: '评价时间', minWidth: 164 },
    ],
  },
])

const activeKey = ref('samples')
const activeDataset = computed(() => datasets.find((item) => item.key === activeKey.value) || datasets[0])
</script>
