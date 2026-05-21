<template>
  <svg class="mini-trend" viewBox="0 0 180 46" preserveAspectRatio="none" aria-hidden="true">
    <polyline
      fill="none"
      :stroke="positive ? '#dc2626' : '#16a34a'"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      :points="points"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  positive: { type: Boolean, default: true },
})

const points = computed(() => {
  const data = props.data.length ? props.data : [1, 2, 1.5, 3, 2.6, 4]
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  return data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 176 + 2
      const y = 42 - ((value - min) / span) * 36
      return `${x},${y}`
    })
    .join(' ')
})
</script>

<style scoped>
.mini-trend {
  width: 100%;
  height: 46px;
  margin-top: 14px;
}
</style>
