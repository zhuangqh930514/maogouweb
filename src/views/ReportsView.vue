<template>
  <div class="page">
    <section class="surface toolbar-surface">
      <div class="surface-body reports-toolbar">
        <div>
          <h2 class="surface-title">AI 分析任务与报告检索</h2>
          <p class="surface-subtitle">定时任务生成结构化报告，支持人工立即触发</p>
        </div>
        <el-segmented v-model="filter" :options="['全部报告', '今日生成', '高风险', '建议买入', '建议减仓']" />
        <el-button type="primary" :icon="Cpu">立即分析自选股</el-button>
      </div>
    </section>

    <div class="section-grid reports-layout">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">报告列表</h2>
            <p class="surface-subtitle">按生成时间倒序展示</p>
          </div>
        </div>
        <div class="surface-body report-list">
          <button
            v-for="report in aiReports"
            :key="report.id"
            class="report-item"
            :class="{ active: selected.id === report.id }"
            @click="selected = report"
          >
            <span>
              <strong>{{ report.stock }}</strong>
              <em>{{ report.advice }}</em>
            </span>
            <span class="report-score" :class="report.score >= 75 ? 'up' : 'muted'">{{ report.score }}</span>
            <small>{{ report.generatedAt.slice(11, 16) }}</small>
          </button>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">{{ selected.stock }} {{ selected.code }} | 结构化分析报告</h2>
            <p class="surface-subtitle">生成时间：{{ selected.generatedAt }} | 数据范围：近 60 日 K线 + 实时行情</p>
          </div>
          <el-tag :class="selected.score >= 75 ? 'tag-red' : 'tag-blue'" effect="plain">综合评分 {{ selected.score }}</el-tag>
        </div>
        <div class="surface-body report-detail">
          <AiReportBlock title="技术面分析" :text="selected.technicalAnalysis" />
          <AiReportBlock title="风险提示" :text="selected.riskWarning" tone="yellow" />
          <AiReportBlock title="建议买卖点" :text="selected.buySellPoints" tone="green" />
          <AiReportBlock title="Prompt 数据摘要" :text="selected.promptSummary" />
          <div class="report-actions">
            <el-button :icon="Refresh">重新生成</el-button>
            <el-button type="primary" :icon="DocumentChecked">保存为历史报告</el-button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Cpu, DocumentChecked, Refresh } from '@element-plus/icons-vue'
import AiReportBlock from '../components/AiReportBlock.vue'
import { aiReports } from '../services/mockData'

const filter = ref('全部报告')
const selected = ref(aiReports[0])
</script>

<style scoped>
.reports-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  align-items: center;
  gap: 18px;
}

.reports-layout {
  grid-template-columns: 440px minmax(0, 1fr);
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px;
  align-items: start;
  gap: 12px;
  min-height: 92px;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 18px;
  text-align: left;
  cursor: pointer;
}

.report-item.active {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.report-item strong,
.report-item em {
  display: block;
  font-style: normal;
}

.report-item strong {
  font-size: 16px;
}

.report-item em {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
}

.report-score {
  font-size: 24px;
  font-weight: 800;
  text-align: right;
}

.report-item small {
  position: absolute;
  right: 18px;
  bottom: 14px;
  color: #9ca3af;
}

.report-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
</style>
