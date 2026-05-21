<template>
  <div class="metric-card surface">
    <div class="metric-head">
      <div>
        <div class="metric-title">{{ title }}</div>
        <div class="metric-value mono">{{ value }}</div>
      </div>
      <el-tag :class="positive ? 'tag-red' : 'tag-green'" effect="plain" round>
        {{ changeText }}
      </el-tag>
    </div>
    <MiniTrend :data="trend" :positive="positive" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MiniTrend from './MiniTrend.vue'

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], required: true },
  change: { type: Number, default: 0 },
  percent: { type: Number, default: 0 },
  trend: { type: Array, default: () => [] },
})

const positive = computed(() => props.percent >= 0)
const changeText = computed(() => `${props.percent >= 0 ? '+' : ''}${props.percent.toFixed(2)}%`)
</script>

<style scoped>
.metric-card {
  min-height: 132px;
  padding: 18px;
}

.metric-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.metric-title {
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
}

.metric-value {
  margin-top: 8px;
  color: #111827;
  font-size: 26px;
  font-weight: 800;
  line-height: 32px;
}
</style>
