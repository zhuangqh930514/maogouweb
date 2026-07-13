<template>
  <div ref="chartRef" class="chart" :style="{ height }"></div>
</template>

<script setup>
import * as echarts from 'echarts/core'
import { BarChart, CandlestickChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

echarts.use([
  BarChart,
  CandlestickChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '320px' },
})

const chartRef = ref(null)
let chart
let observer

function render() {
  if (!chartRef.value) return
  if (chartRef.value.clientWidth <= 0 || chartRef.value.clientHeight <= 0) return
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption(props.option, true)
}

onMounted(() => {
  observer = new ResizeObserver(() => {
    if (!chartRef.value || chartRef.value.clientWidth <= 0 || chartRef.value.clientHeight <= 0) return
    if (chart) chart.resize()
    else render()
  })
  observer.observe(chartRef.value)
  render()
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
