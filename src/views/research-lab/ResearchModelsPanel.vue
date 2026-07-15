<template>
  <div class="research-panel-stack">
    <section class="surface research-toolbar-panel research-context-band">
      <div>
        <h3>可复现训练链路</h3>
        <p>训练数据集冻结样本、标签与时间切分，模型版本保存产物校验和、参数、指标和校准证据。</p>
      </div>
      <el-tag type="info" effect="plain">模型不直接自动晋级</el-tag>
    </section>
    <div class="research-subtabs" role="tablist" aria-label="模型训练证据类型">
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
      :status-options="activeDataset.statusOptions"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  fetchModelVersion,
  fetchModelVersions,
  fetchTrainingDataset,
  fetchTrainingDatasets,
} from '../../services/researchLab'
import ResearchEvidenceTable from './ResearchEvidenceTable.vue'

const datasets = Object.freeze([
  {
    key: 'datasets', label: '训练数据集', title: '冻结训练数据集',
    subtitle: '详情最多展示 100 条数据集血缘明细，完整记录由后端正式表保存。',
    loader: fetchTrainingDatasets, detailLoader: fetchTrainingDataset,
    statusOptions: [
      { label: '就绪', value: 'READY' },
      { label: '已完成', value: 'COMPLETED' },
      { label: '数据积累不足', value: 'INSUFFICIENT_DATA' },
      { label: '执行失败', value: 'FAILED' },
    ],
    columns: [
      { key: 'id', label: '数据集 ID', width: 92, mono: true, fixed: 'left' },
      { key: 'versionNo', label: '版本', width: 112, mono: true },
      { key: 'modelFamily', label: '模型族', width: 122 },
      { key: 'purpose', label: '用途', width: 108 },
      { key: 'trainStartDate', label: '训练开始', width: 112, mono: true },
      { key: 'trainEndDate', label: '训练结束', width: 112, mono: true },
      { key: 'maxHorizonDays', label: '最大周期', width: 88, kind: 'horizon' },
      { key: 'rowCount', label: '样本行数', width: 92 },
      { key: 'status', label: '状态', width: 112, kind: 'status' },
      { key: 'asOfTime', label: '数据截至时间', minWidth: 164 },
    ],
  },
  {
    key: 'models', label: '模型版本', title: '正式模型版本',
    subtitle: '候选模型必须完成样本外验证、回测和影子评估后才有资格进入治理。',
    loader: fetchModelVersions, detailLoader: fetchModelVersion,
    statusOptions: [
      { label: '候选模型', value: 'CANDIDATE' },
      { label: '已验证模型', value: 'VALIDATED' },
      { label: '影子运行', value: 'SHADOW' },
      { label: '运行中', value: 'ACTIVE' },
      { label: '已退役', value: 'RETIRED' },
      { label: '执行失败', value: 'FAILED' },
    ],
    columns: [
      { key: 'id', label: '模型 ID', width: 86, mono: true, fixed: 'left' },
      { key: 'versionNo', label: '版本', width: 116, mono: true },
      { key: 'modelFamily', label: '模型族', width: 122 },
      { key: 'algorithm', label: '算法', width: 116 },
      { key: 'trainingDatasetId', label: '数据集 ID', width: 96, mono: true },
      { key: 'sampleCount', label: '样本数', width: 88 },
      { key: 'featureVersion', label: '特征版本', width: 116, mono: true },
      { key: 'status', label: '状态', width: 108, kind: 'status' },
      { key: 'trainEndDate', label: '训练截至日', width: 112, mono: true },
      { key: 'createdAt', label: '创建时间', minWidth: 164 },
    ],
  },
])
const activeKey = ref('datasets')
const activeDataset = computed(() => datasets.find((item) => item.key === activeKey.value) || datasets[0])
</script>
