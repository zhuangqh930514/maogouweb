<template>
  <div class="page">
    <div class="section-grid grid-4">
      <MetricCard title="总资产" :value="formatMoney(totalAsset)" :percent="1.86" :trend="[0, 860, 420, 2380, 5460, 8210, totalProfit]" />
      <MetricCard title="持仓市值" :value="formatMoney(totalMarketValue)" :percent="0.72" :trend="[150000, 168000, 172000, 181000, totalMarketValue]" />
      <MetricCard title="浮动盈亏" :value="`${totalProfit >= 0 ? '+' : ''}${formatMoney(totalProfit)}`" :percent="profitRate" :trend="[0, 2400, 1800, 6420, totalProfit]" />
      <MetricCard title="今日盈亏" value="+3,420" :percent="1.86" :trend="[0, 580, 1120, 2460, 3420]" />
    </div>

    <div class="section-grid portfolio-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">当前持仓</h2>
            <p class="surface-subtitle">按实时价自动计算市值、成本和浮动盈亏</p>
          </div>
          <el-button type="primary" :icon="Plus">记录买入</el-button>
        </div>
        <div class="surface-body">
          <el-table :data="positionRows" class="compact-table" row-key="code">
            <el-table-column label="股票" min-width="130">
              <template #default="{ row }">
                <strong>{{ row.name }}</strong>
                <div class="muted mono">{{ row.code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="买入价" width="110">
              <template #default="{ row }">{{ row.buyPrice.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="90" />
            <el-table-column label="现价" width="110">
              <template #default="{ row }">{{ row.currentPrice.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="市值" width="120">
              <template #default="{ row }">{{ formatMoney(row.marketValue) }}</template>
            </el-table-column>
            <el-table-column label="浮动盈亏" width="130">
              <template #default="{ row }">
                <span :class="row.profit >= 0 ? 'up' : 'down'">
                  {{ row.profit >= 0 ? '+' : '' }}{{ formatMoney(row.profit) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">买入记录表单</h2>
            <p class="surface-subtitle">记录真实买入操作，后端可保存到交易记录表</p>
          </div>
        </div>
        <div class="surface-body">
          <el-form :model="tradeForm" label-position="top">
            <el-form-item label="股票代码">
              <el-input v-model="tradeForm.code" placeholder="600519" />
            </el-form-item>
            <div class="form-grid">
              <el-form-item label="买入价格">
                <el-input-number v-model="tradeForm.price" :min="0" :precision="2" controls-position="right" />
              </el-form-item>
              <el-form-item label="买入数量">
                <el-input-number v-model="tradeForm.quantity" :min="100" :step="100" controls-position="right" />
              </el-form-item>
            </div>
            <el-form-item label="买入时间">
              <el-date-picker v-model="tradeForm.time" type="datetime" placeholder="选择时间" />
            </el-form-item>
            <el-button type="primary" class="save-button" @click="saveTrade">保存买入记录</el-button>
          </el-form>
          <p class="form-hint">保存后系统会按当前实时价重算浮动盈亏，并对同一股票多笔买入做成本聚合。</p>
        </div>
      </section>
    </div>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">组合收益走势</h2>
          <p class="surface-subtitle">近 30 日收益曲线，可扩展为和沪深300、上证指数对比</p>
        </div>
      </div>
      <div class="surface-body">
        <EChart :option="profitOption()" height="260px" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import EChart from '../components/EChart.vue'
import MetricCard from '../components/MetricCard.vue'
import { profitOption } from '../services/chartOptions'
import { formatMoney, getCurrentPrice, positions } from '../services/mockData'

const positionRows = computed(() =>
  positions.map((item) => {
    const currentPrice = getCurrentPrice(item.code)
    const cost = item.buyPrice * item.quantity
    const marketValue = currentPrice * item.quantity
    return {
      ...item,
      currentPrice,
      cost,
      marketValue,
      profit: marketValue - cost,
    }
  }),
)

const totalMarketValue = computed(() => positionRows.value.reduce((sum, item) => sum + item.marketValue, 0))
const totalCost = computed(() => positionRows.value.reduce((sum, item) => sum + item.cost, 0))
const totalProfit = computed(() => totalMarketValue.value - totalCost.value)
const totalAsset = computed(() => totalMarketValue.value + 71490)
const profitRate = computed(() => (totalProfit.value / totalCost.value) * 100)

const tradeForm = reactive({
  code: '600519',
  price: 1590.4,
  quantity: 100,
  time: new Date('2026-05-21 10:18:00'),
})

function saveTrade() {
  ElMessage.success('已模拟保存买入记录')
}
</script>

<style scoped>
.portfolio-layout {
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.75fr);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.save-button {
  width: 100%;
}

.form-hint {
  margin: 18px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 22px;
}
</style>
