<template>
  <div class="research-panel-stack">
    <section class="surface research-toolbar-panel research-context-band">
      <div>
        <h3>样本外验证</h3>
        <p>滚动窗口验证负责时间折叠和基准对照，组合回测负责成交限制、交易成本、净值和回撤。</p>
      </div>
      <el-tag type="warning" effect="plain">不等同于未来收益</el-tag>
    </section>
    <div class="research-subtabs" role="tablist" aria-label="实验与回测证据类型">
      <button
        v-for="dataset in datasets"
        :key="dataset.key"
        type="button"
        role="tab"
        :aria-selected="activeKey === dataset.key"
        :class="{ active: activeKey === dataset.key }"
        @click="activeKey = dataset.key"
      >{{ dataset.label }}</button>
    </div>
    <ResearchEvidenceTable
      :key="activeDataset.key"
      :title="activeDataset.title"
      :subtitle="activeDataset.subtitle"
      :loader="activeDataset.loader"
      :detail-loader="activeDataset.detailLoader"
      :columns="activeDataset.columns"
      :status-options="runStatusOptions"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  fetchBacktestRun,
  fetchBacktestRuns,
  fetchWalkForwardRun,
  fetchWalkForwardRuns,
} from '../../services/researchLab'
import ResearchEvidenceTable from './ResearchEvidenceTable.vue'

const runStatusOptions = Object.freeze([
  { label: '执行中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCESS' },
  { label: '部分成功', value: 'PARTIAL_SUCCESS' },
  { label: '执行失败', value: 'FAILED' },
  { label: '数据积累不足', value: 'INSUFFICIENT_DATA' },
])
const datasets = Object.freeze([
  {
    key: 'walk-forward', label: '滚动验证', title: '滚动窗口验证',
    subtitle: '展开详情可查看每个时间折叠、隔离窗口和基准表现。',
    loader: fetchWalkForwardRuns, detailLoader: fetchWalkForwardRun,
    columns: [
      { key: 'id', label: '运行 ID', width: 86, mono: true, fixed: 'left' },
      { key: 'runKey', label: '运行键', minWidth: 180, mono: true },
      { key: 'strategyReleaseId', label: '策略 ID', width: 92, mono: true },
      { key: 'modelVersionId', label: '模型 ID', width: 90, mono: true },
      { key: 'purgeTradingDays', label: '清洗日', width: 82 },
      { key: 'embargoTradingDays', label: '隔离日', width: 82 },
      { key: 'engineVersion', label: '引擎版本', width: 118, mono: true },
      { key: 'status', label: '状态', width: 106, kind: 'status' },
      { key: 'completedAt', label: '完成时间', minWidth: 164 },
    ],
  },
  {
    key: 'backtests', label: '组合回测', title: '组合级可执行回测',
    subtitle: '展开详情可查看每日净值、交易、持仓和成本证据。',
    loader: fetchBacktestRuns, detailLoader: fetchBacktestRun,
    columns: [
      { key: 'id', label: '回测 ID', width: 86, mono: true, fixed: 'left' },
      { key: 'endTradeDate', label: '截至交易日', width: 112, mono: true },
      { key: 'horizonDays', label: '周期', width: 72, kind: 'horizon' },
      { key: 'topK', label: '持仓数', width: 78 },
      { key: 'totalReturn', label: '总收益', width: 92, kind: 'ratio' },
      { key: 'benchmarkReturn', label: '基准收益', width: 98, kind: 'ratio' },
      { key: 'alpha', label: '超额收益', width: 98, kind: 'ratio' },
      { key: 'sharpeRatio', label: '夏普', width: 78, kind: 'score' },
      { key: 'maxDrawdown', label: '最大回撤', width: 98, kind: 'ratio' },
      { key: 'turnoverRate', label: '换手率', width: 88, kind: 'ratio' },
      { key: 'tradeCount', label: '交易数', width: 78 },
      { key: 'status', label: '状态', width: 106, kind: 'status' },
      { key: 'completedAt', label: '完成时间', minWidth: 164 },
    ],
  },
])
const activeKey = ref('walk-forward')
const activeDataset = computed(() => datasets.find((item) => item.key === activeKey.value) || datasets[0])
</script>
