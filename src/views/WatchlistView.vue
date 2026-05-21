<template>
  <div class="page">
    <section class="surface toolbar-surface">
      <div class="surface-body watch-toolbar">
        <div>
          <h2 class="surface-title">自选股分组与快速添加</h2>
          <p class="surface-subtitle">输入股票代码手动添加，支持后续扩展批量导入</p>
        </div>
        <el-input v-model="newCode" placeholder="输入股票代码，如 600519" clearable />
        <el-button type="primary" :icon="Plus" @click="addStock">添加股票</el-button>
        <el-button :icon="Upload">批量导入</el-button>
      </div>
      <div class="watch-tabs">
        <el-segmented v-model="group" :options="['全部', 'AI重点', '高波动', '价值股', '已持仓']" />
      </div>
    </section>

    <div class="section-grid watch-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">自选股列表</h2>
            <p class="surface-subtitle">价格、涨跌幅、量比和 AI 评分集中展示</p>
          </div>
        </div>
        <div class="surface-body">
          <el-table :data="filteredStocks" class="compact-table" row-key="code" highlight-current-row @row-click="selected = $event">
            <el-table-column label="股票" min-width="150">
              <template #default="{ row }">
                <strong>{{ row.name }}</strong>
                <div class="muted mono">{{ row.code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="最新价" width="110">
              <template #default="{ row }">
                <span class="mono">{{ row.price.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="涨跌幅" width="110">
              <template #default="{ row }">
                <span :class="row.percent >= 0 ? 'up' : 'down'">
                  {{ row.percent >= 0 ? '+' : '' }}{{ row.percent.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="volumeRatio" label="量比" width="90" />
            <el-table-column label="AI评分" width="110">
              <template #default="{ row }">
                <el-tag :class="row.aiScore >= 75 ? 'tag-red' : 'tag-blue'" effect="plain">{{ row.aiScore }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default>
                <el-button link type="primary">详情</el-button>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">个股详情预览</h2>
            <p class="surface-subtitle">实时走势、K线、基础财务数据和 AI 建议</p>
          </div>
          <el-tag class="tag-blue" effect="plain">AI评分 {{ selected.aiScore }}</el-tag>
        </div>
        <div class="surface-body detail-panel">
          <div class="stock-heading">
            <div>
              <h3>{{ selected.name }} <span>{{ selected.code }}</span></h3>
              <div class="stock-price" :class="selected.percent >= 0 ? 'up' : 'down'">
                {{ selected.price.toFixed(2) }}
                {{ selected.percent >= 0 ? '+' : '' }}{{ selected.percent.toFixed(2) }}%
              </div>
            </div>
            <el-tag class="tag-blue" effect="plain">{{ selected.advice }}</el-tag>
          </div>

          <el-tabs v-model="detailTab">
            <el-tab-pane label="K线图" name="kline">
              <EChart :option="klineOption()" height="260px" />
            </el-tab-pane>
            <el-tab-pane label="分时图" name="line">
              <EChart :option="lineOption(selected.name, selectedTrend)" height="260px" />
            </el-tab-pane>
            <el-tab-pane label="基础财务" name="finance">
              <div class="finance-grid">
                <div v-for="item in financeItems" :key="item.label" class="finance-item">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>

          <AiReportBlock title="AI建议" :text="`当前策略：${selected.advice}。回踩关键均线区间后再确认买点，避免追高。`" tone="green" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Upload } from '@element-plus/icons-vue'
import AiReportBlock from '../components/AiReportBlock.vue'
import EChart from '../components/EChart.vue'
import { klineOption, lineOption } from '../services/chartOptions'
import { watchStocks } from '../services/mockData'

const group = ref('全部')
const detailTab = ref('kline')
const newCode = ref('')
const selected = ref(watchStocks[2])

const filteredStocks = computed(() => {
  if (group.value === 'AI重点') return watchStocks.filter((item) => item.aiScore >= 78)
  if (group.value === '高波动') return watchStocks.filter((item) => item.volumeRatio >= 1.8)
  if (group.value === '价值股') return watchStocks.filter((item) => item.pe > 0 && item.pe < 25)
  if (group.value === '已持仓') return watchStocks.filter((item) => ['600519', '300750', '688981', '600036'].includes(item.code))
  return watchStocks
})

const selectedTrend = computed(() => [selected.value.price - 2, selected.value.price - 1, selected.value.price + 1.6, selected.value.price - 0.8, selected.value.price + 2.1, selected.value.price + 0.8])
const financeItems = computed(() => [
  { label: 'PE(TTM)', value: selected.value.pe || '亏损' },
  { label: 'PB', value: selected.value.pb },
  { label: '营收同比', value: `${selected.value.revenueGrowth >= 0 ? '+' : ''}${selected.value.revenueGrowth}%` },
  { label: '净利同比', value: `${selected.value.profitGrowth >= 0 ? '+' : ''}${selected.value.profitGrowth}%` },
])

function addStock() {
  ElMessage.success(newCode.value ? `已模拟添加 ${newCode.value}` : '请输入股票代码')
}
</script>

<style scoped>
.toolbar-surface .surface-body {
  padding-bottom: 14px;
}

.watch-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 260px auto auto;
  align-items: center;
  gap: 14px;
}

.watch-tabs {
  padding: 0 24px 20px;
}

.watch-layout {
  grid-template-columns: minmax(0, 1.45fr) minmax(420px, 0.9fr);
}

.stock-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.stock-heading h3 {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
}

.stock-heading h3 span {
  color: #6b7280;
  font-size: 14px;
}

.stock-price {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 800;
  line-height: 34px;
}

.finance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 10px 0 16px;
}

.finance-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.finance-item span {
  color: #6b7280;
  font-size: 12px;
}

.finance-item strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
}
</style>
