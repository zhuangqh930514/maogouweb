<template>
  <div ref="chartRef" class="chart" :style="{ height }"></div>
</template>

<script setup>
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '320px' },
})

const chartRef = ref(null)
let chart
let observer

function render() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption(props.option, true)
}

onMounted(() => {
  render()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(chartRef.value)
})

watch(
  () => props.option,
  () => render(),
  { deep: true },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>

<style scoped>
.chart {
  width: 100%;
}
</style>
