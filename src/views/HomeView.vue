<template>
  <div class="page">
    <NewsTicker :items="newsItems" />

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
            <h2 class="surface-title">沪深核心指数实时分时</h2>
            <p class="surface-subtitle">ECharts 分时走势图，后续接入 AkShare / 新浪财经实时数据</p>
          </div>
          <el-segmented v-model="chartMode" :options="['分时图', 'K线图']" />
        </div>
        <div class="surface-body">
          <EChart :option="chartMode === '分时图' ? lineOption('上证指数') : klineOption()" height="320px" />
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">财经快讯</h2>
            <p class="surface-subtitle">后台定时拉取，首页消息列表展示</p>
          </div>
          <el-tag class="tag-blue" effect="plain">AkShare</el-tag>
        </div>
        <div class="surface-body news-list">
          <div v-for="item in newsItems" :key="`${item.time}-${item.title}`" class="news-row">
            <span class="news-dot"></span>
            <span class="news-time">{{ item.time }}</span>
            <div>
              <div class="news-title">{{ item.title }}</div>
              <div class="news-source">{{ item.source }}</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="section-grid grid-main-side">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">自选股与持仓盈亏</h2>
            <p class="surface-subtitle">实时价驱动持仓浮动盈亏计算</p>
          </div>
          <el-button type="primary" :icon="Plus">添加自选</el-button>
        </div>
        <div class="surface-body">
          <el-table :data="watchStocks.slice(0, 4)" class="compact-table" row-key="code">
            <el-table-column prop="name" label="股票" min-width="120">
              <template #default="{ row }">
                <strong>{{ row.name }}</strong>
                <div class="muted mono">{{ row.code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="现价" width="110">
              <template #default="{ row }">
                <span class="mono">{{ row.price.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="涨跌幅" width="110">
              <template #default="{ row }">
                <span :class="row.percent >= 0 ? 'up' : 'down'" class="mono">
                  {{ row.percent >= 0 ? '+' : '' }}{{ row.percent.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="advice" label="AI建议" min-width="140">
              <template #default="{ row }">
                <el-tag class="tag-blue" effect="plain">{{ row.advice }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">AI 智能分析摘要</h2>
            <p class="surface-subtitle">qwen3.6 结构化报告</p>
          </div>
          <el-tag class="tag-red" effect="plain">评分 86</el-tag>
        </div>
        <div class="surface-body report-summary">
          <h3>中芯国际 688981</h3>
          <p>短线放量突破，半导体板块共振增强。当前趋势偏强，但 90 元上方有前高压力。</p>
          <AiReportBlock title="建议买卖点" text="回踩 86.8-87.5 区间分批观察，止损 84.5。" tone="green" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import AiReportBlock from '../components/AiReportBlock.vue'
import EChart from '../components/EChart.vue'
import MetricCard from '../components/MetricCard.vue'
import NewsTicker from '../components/NewsTicker.vue'
import { klineOption, lineOption } from '../services/chartOptions'
import { marketIndexes, newsItems, watchStocks } from '../services/mockData'

const chartMode = ref('分时图')
</script>

<style scoped>
.news-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.news-row {
  display: grid;
  grid-template-columns: 8px 44px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eef2f7;
}

.news-row:last-child {
  border-bottom: 0;
}

.news-dot {
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 999px;
  background: #2563eb;
}

.news-time {
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  line-height: 22px;
}

.news-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
}

.news-source {
  color: #9ca3af;
  font-size: 12px;
  line-height: 18px;
}

.report-summary h3 {
  margin: 0 0 10px;
  font-size: 22px;
  line-height: 30px;
}

.report-summary p {
  margin: 0 0 18px;
  color: #4b5563;
  line-height: 24px;
}
</style>
