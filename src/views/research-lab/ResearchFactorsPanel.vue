<template>
  <div class="research-panel-stack">
    <section class="surface research-toolbar-panel research-context-band">
      <div>
        <h3>因子证据口径</h3>
        <p>因子定义描述输入与方向，因子表现只读取已成熟的样本外结果，并按周期、窗口和市场环境分组。</p>
      </div>
      <el-tag type="info" effect="plain">周度流水线更新</el-tag>
    </section>
    <div class="research-subtabs" role="tablist" aria-label="因子研究证据类型">
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
      :columns="activeDataset.columns"
      :status-options="activeDataset.statusOptions"
      :show-quality-filter="activeDataset.showQuality"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { fetchFactorPerformance, fetchResearchFactors } from '../../services/researchLab'
import ResearchEvidenceTable from './ResearchEvidenceTable.vue'

const datasets = Object.freeze([
  {
    key: 'definitions', label: '因子定义', title: '正式因子定义',
    subtitle: '定义、输入要求和版本由后端因子注册表统一管理。',
    loader: fetchResearchFactors,
    statusOptions: [{ label: '已启用', value: 'ENABLED' }, { label: '已停用', value: 'DISABLED' }],
    columns: [
      { key: 'factorCode', label: '因子编码', minWidth: 144, mono: true, fixed: 'left' },
      { key: 'factorName', label: '因子名称', minWidth: 130 },
      { key: 'factorGroup', label: '因子组', width: 110 },
      { key: 'direction', label: '方向', width: 90, kind: 'status' },
      { key: 'defaultWeight', label: '基线权重', width: 96, kind: 'score', digits: 4 },
      { key: 'enabled', label: '启用', width: 76, kind: 'boolean' },
      { key: 'versionNo', label: '版本', width: 104, mono: true },
      { key: 'formulaDesc', label: '计算说明', minWidth: 220 },
      { key: 'updatedAt', label: '更新时间', minWidth: 164 },
    ],
  },
  {
    key: 'performance', label: '样本外表现', title: '因子样本外表现',
    subtitle: '命中率、RankIC、收益、回撤和漂移值均由正式周度研究产出。',
    loader: fetchFactorPerformance,
    showQuality: true,
    statusOptions: [
      { label: '健康', value: 'HEALTHY' },
      { label: '告警', value: 'WARNING' },
      { label: '严重告警', value: 'CRITICAL' },
    ],
    columns: [
      { key: 'factorDefinitionId', label: '因子 ID', width: 86, mono: true, fixed: 'left' },
      { key: 'horizonDays', label: '周期', width: 72, kind: 'horizon' },
      { key: 'marketRegime', label: '市场环境', width: 108, kind: 'status' },
      { key: 'windowType', label: '窗口', width: 92 },
      { key: 'windowEndDate', label: '窗口结束日', width: 112, mono: true },
      { key: 'sampleCount', label: '样本数', width: 82 },
      { key: 'successRate', label: '命中率', width: 92, kind: 'ratio' },
      { key: 'wilsonLowerBound', label: '置信下界', width: 96, kind: 'ratio' },
      { key: 'rankIc', label: 'RankIC', width: 88, kind: 'ratio' },
      { key: 'avgExcessReturn', label: '平均超额', width: 98, kind: 'ratio' },
      { key: 'avgAdverseReturn', label: '平均不利波动', width: 122, kind: 'ratio' },
      { key: 'stabilityScore', label: '稳定性', width: 88, kind: 'score' },
      { key: 'psiScore', label: 'PSI', width: 76, kind: 'score', digits: 4 },
      { key: 'confidenceLevel', label: '置信等级', width: 104, kind: 'confidence' },
      { key: 'driftStatus', label: '漂移状态', width: 104, kind: 'status' },
    ],
  },
])

const activeKey = ref('definitions')
const activeDataset = computed(() => datasets.find((item) => item.key === activeKey.value) || datasets[0])
</script>
