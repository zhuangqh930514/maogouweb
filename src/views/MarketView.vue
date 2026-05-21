<template>
  <div class="page">
    <div class="section-grid grid-4">
      <MetricCard
        v-for="item in marketIndexes"
        :key="item.code"
        :title="item.name"
        :value="item.value.toLocaleString('zh-CN')"
        :change="item.change"
        :percent="item.percent"
        :trend="item.trend"
      />
    </div>

    <div class="section-grid grid-main-side">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">核心指数分时 / K线联动分析</h2>
            <p class="surface-subtitle">展示上证指数、深证成指、创业板指、科创板指走势</p>
          </div>
          <el-segmented v-model="mode" :options="['分时', '日K', '周K', '月K']" />
        </div>
        <div class="surface-body">
          <EChart :option="mode === '分时' ? multiIndexOption(marketIndexes) : klineOption()" height="430px" />
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">行业热力图</h2>
            <p class="surface-subtitle">按涨跌幅和资金活跃度快速识别板块强弱</p>
          </div>
        </div>
        <div class="surface-body heatmap">
          <div
            v-for="sector in sectorHeatmap"
            :key="sector[0]"
            class="sector-cell"
            :class="sector[1] >= 0 ? 'is-up' : 'is-down'"
          >
            <span>{{ sector[0] }}</span>
            <strong>{{ sector[1] >= 0 ? '+' : '' }}{{ sector[1].toFixed(1) }}%</strong>
          </div>
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">指数成分与资金概览</h2>
          <p class="surface-subtitle">用于后端大盘实时监控接口返回结构对齐</p>
        </div>
      </div>
      <div class="surface-body">
        <el-table :data="indexRows" class="compact-table" row-key="name">
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="point" label="最新点位" width="150" />
          <el-table-column label="涨跌幅" width="130">
            <template #default="{ row }">
              <span :class="row.percent >= 0 ? 'up' : 'down'">
                {{ row.percent >= 0 ? '+' : '' }}{{ row.percent.toFixed(2) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="成交额" width="150" />
          <el-table-column prop="flow" label="主力净流入" width="160">
            <template #default="{ row }">
              <span :class="row.flow.startsWith('+') ? 'up' : 'down'">{{ row.flow }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" min-width="160" />
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import EChart from '../components/EChart.vue'
import MetricCard from '../components/MetricCard.vue'
import { klineOption, multiIndexOption } from '../services/chartOptions'
import { marketIndexes, sectorHeatmap } from '../services/mockData'

const mode = ref('分时')
const indexRows = [
  { name: '上证50', point: '2,461.18', percent: 0.72, amount: '1,120亿', flow: '+28.6亿', status: '权重稳定' },
  { name: '沪深300', point: '3,842.51', percent: 0.95, amount: '2,980亿', flow: '+51.2亿', status: '放量上行' },
  { name: '中证500', point: '5,602.44', percent: -0.18, amount: '1,640亿', flow: '-8.3亿', status: '震荡整理' },
  { name: '科创50', point: '889.26', percent: 0.58, amount: '418亿', flow: '+6.9亿', status: '科技修复' },
]
</script>

<style scoped>
.heatmap {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.sector-cell {
  min-height: 78px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
}

.sector-cell span {
  font-size: 13px;
  font-weight: 700;
}

.sector-cell strong {
  font-size: 18px;
  line-height: 24px;
}

.sector-cell.is-up {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #dc2626;
}

.sector-cell.is-down {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #16a34a;
}
</style>
