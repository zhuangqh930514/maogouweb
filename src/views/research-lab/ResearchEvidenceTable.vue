<template>
  <section class="surface research-table-panel">
    <div class="research-table-header">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle" class="research-table-subtitle">{{ subtitle }}</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
    </div>

    <div v-if="filterable" class="research-toolbar">
      <div class="research-filter-row">
        <el-input
          v-if="showStockFilter"
          v-model.trim="filters.stockCode"
          clearable
          placeholder="股票代码"
          aria-label="按股票代码筛选"
          @keyup.enter="applyFilters"
        />
        <el-date-picker
          v-if="showDateFilter"
          v-model="filters.dateRange"
          type="daterange"
          unlink-panels
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          aria-label="按日期范围筛选"
        />
        <el-select
          v-if="statusOptions.length"
          v-model="filters.status"
          clearable
          placeholder="状态"
          aria-label="按状态筛选"
        >
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-select
          v-if="showQualityFilter"
          v-model="filters.qualityStatus"
          clearable
          placeholder="数据质量"
          aria-label="按数据质量筛选"
        >
          <el-option v-for="option in qualityOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="applyFilters">查询证据</el-button>
        <el-button :icon="RefreshLeft" @click="resetFilters">重置</el-button>
      </div>
    </div>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <el-table
      v-loading="loading"
      :data="items"
      row-key="fields.id"
      stripe
      table-layout="fixed"
      empty-text="当前条件下暂无正式研究证据"
    >
      <el-table-column
        v-for="column in columns"
        :key="column.key"
        :label="column.label"
        :width="column.width"
        :min-width="column.minWidth || 110"
        :fixed="column.fixed"
      >
        <template #default="scope">
          <el-tag
            v-if="column.kind === 'status'"
            size="small"
            effect="plain"
            :type="statusTagType(scope?.row?.fields?.[column.key])"
          >
            {{ statusLabel(scope?.row?.fields?.[column.key]) }}
          </el-tag>
          <el-tag
            v-else-if="column.kind === 'confidence'"
            size="small"
            effect="plain"
            :type="confidenceTagType(scope?.row?.fields?.[column.key])"
          >
            {{ confidenceLabel(scope?.row?.fields?.[column.key]) }}
          </el-tag>
          <el-tooltip
            v-if="column.kind === 'message' && scope?.row?.fields?.[column.key]"
            :content="formatCell(column, scope?.row?.fields?.[column.key])"
            placement="top"
            :show-after="250"
          >
            <span class="cell-message">{{ formatCell(column, scope?.row?.fields?.[column.key]) }}</span>
          </el-tooltip>
          <span v-else :class="{ mono: column.mono, 'cell-wrap': column.wrap }">
            {{ formatCell(column, scope?.row?.fields?.[column.key]) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column v-if="detailLoader" label="证据" width="88" fixed="right">
        <template #default="scope">
          <el-button text type="primary" @click="openDetail(scope?.row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="research-pagination">
      <span>共 {{ total }} 条</span>
      <el-pagination
        v-model:current-page="filters.page"
        v-model:page-size="filters.pageSize"
        background
        layout="prev, pager, next, sizes"
        :page-sizes="[20, 50, 100]"
        :total="total"
        @current-change="load"
        @size-change="handlePageSize"
      />
    </div>
  </section>

  <el-drawer v-model="drawerVisible" :title="`${title}详情`" size="min(720px, 94vw)" destroy-on-close>
    <div v-loading="detailLoading" class="research-detail-stack">
      <el-alert v-if="detailError" :title="detailError" type="error" show-icon :closable="false" />
      <template v-if="detail?.record">
        <section class="research-detail-section">
          <h4>主记录</h4>
          <dl class="evidence-list evidence-list-wide">
            <div v-for="entry in visibleEntries(detail.record.fields)" :key="entry.key">
              <dt>{{ researchFieldLabel(entry.key) }}</dt>
              <dd v-if="entry.json"><pre class="research-json">{{ detailJson(entry.value) }}</pre></dd>
              <dd v-else>{{ formatResearchValue(entry.key, entry.value) }}</dd>
            </div>
          </dl>
        </section>
        <section v-for="group in relatedGroups" :key="group.key" class="research-detail-section">
          <h4>{{ relatedLabel(group.key) }}（{{ group.items.length }}）</h4>
          <details v-for="(item, index) in group.items" :key="item.fields?.id || index" class="research-related-item">
            <summary>{{ relatedItemTitle(item, index) }}</summary>
            <dl class="evidence-list evidence-list-wide">
              <div v-for="entry in visibleEntries(item.fields)" :key="entry.key">
                <dt>{{ researchFieldLabel(entry.key) }}</dt>
                <dd v-if="entry.json"><pre class="research-json">{{ detailJson(entry.value) }}</pre></dd>
                <dd v-else>{{ formatResearchValue(entry.key, entry.value) }}</dd>
              </div>
            </dl>
          </details>
        </section>
      </template>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Refresh, RefreshLeft, Search } from '@element-plus/icons-vue'
import { statusLabel } from '../../utils/statusLabels'
import {
  confidenceLabel,
  detailJson,
  formatRatio,
  formatResearchValue,
  researchFieldLabel,
  statusTagType,
} from './researchPresentation'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  loader: { type: Function, required: true },
  detailLoader: { type: Function, default: null },
  columns: { type: Array, required: true },
  statusOptions: { type: Array, default: () => [] },
  showStockFilter: Boolean,
  showDateFilter: { type: Boolean, default: true },
  showQualityFilter: Boolean,
  filterable: { type: Boolean, default: true },
  initialStockCode: { type: String, default: '' },
  initialDetailId: { type: [String, Number], default: '' },
})

const qualityOptions = Object.freeze([
  { label: '就绪', value: 'READY' },
  { label: '部分就绪', value: 'PARTIAL_READY' },
  { label: '数据积累不足', value: 'INSUFFICIENT_DATA' },
  { label: '数据缺失', value: 'MISSING' },
])

const filters = reactive({
  page: 1,
  pageSize: 20,
  stockCode: props.initialStockCode,
  status: '',
  qualityStatus: '',
  dateRange: [],
})
const items = ref([])
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')
const drawerVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref(null)

const relatedGroups = computed(() => Object.entries(detail.value?.related || {})
  .map(([key, groupItems]) => ({ key, items: Array.isArray(groupItems) ? groupItems : [] })))

onMounted(async () => {
  await load()
  if (props.detailLoader && props.initialDetailId) {
    await openDetail({ fields: { id: props.initialDetailId } })
  }
})

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await props.loader({
      page: filters.page,
      pageSize: filters.pageSize,
      stockCode: filters.stockCode,
      status: filters.status,
      qualityStatus: filters.qualityStatus,
      dateFrom: filters.dateRange?.[0],
      dateTo: filters.dateRange?.[1],
    })
    items.value = result?.items || []
    total.value = Number(result?.total || 0)
    filters.page = Number(result?.page || filters.page)
    filters.pageSize = Number(result?.pageSize || filters.pageSize)
  } catch (error) {
    items.value = []
    total.value = 0
    errorMessage.value = error.message || `${props.title}加载失败`
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  filters.page = 1
  load()
}

function resetFilters() {
  filters.page = 1
  filters.stockCode = ''
  filters.status = ''
  filters.qualityStatus = ''
  filters.dateRange = []
  load()
}

function handlePageSize() {
  filters.page = 1
  load()
}

async function openDetail(item) {
  if (!props.detailLoader || !item?.fields?.id) return
  drawerVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    detail.value = await props.detailLoader(item.fields.id)
  } catch (error) {
    detailError.value = error.message || '研究证据详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

function formatCell(column, value) {
  if (column.kind === 'ratio') return formatRatio(value)
  if (column.kind === 'boolean') return Number(value) === 1 || value === true ? '是' : '否'
  if (column.kind === 'horizon') return value ? `T+${value}` : '-'
  if (column.kind === 'score') {
    const number = Number(value)
    return Number.isFinite(number) ? number.toFixed(column.digits ?? 2) : '-'
  }
  return formatResearchValue(column.key, value)
}

function confidenceTagType(value) {
  const level = String(value || '').toUpperCase()
  if (level === 'HIGH') return 'success'
  if (level === 'LOW') return 'warning'
  return 'info'
}

function visibleEntries(fields = {}) {
  return Object.entries(fields)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      value,
      json: typeof value === 'object' || /Json$|Snapshot$|Fingerprint$|Manifest$/i.test(key),
    }))
}

function relatedLabel(key) {
  return {
    factors: '样本因子',
    labels: '真实标签',
    labelCosts: '交易成本证据',
    predictions: '分周期预测',
    items: '数据集明细',
    strategies: '关联策略',
    folds: '时间折叠',
    baselines: '基准对照',
    daily: '每日净值',
    trades: '交易明细',
    positions: '持仓明细',
    shadowEvaluations: '影子评估',
    governanceEvents: '治理事件',
    steps: '流水线步骤',
  }[key] || key
}

function relatedItemTitle(item, index) {
  const fields = item?.fields || {}
  const identity = fields.factorName || fields.stockCode || fields.stepKey || fields.tradeDate || fields.versionNo
  return identity ? `${index + 1}. ${formatResearchValue('title', identity)}` : `证据 ${index + 1}`
}

defineExpose({ load })
</script>

<style scoped>
.cell-wrap {
  display: inline-block;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: normal;
}

.cell-message {
  display: -webkit-box;
  line-height: 1.45;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
