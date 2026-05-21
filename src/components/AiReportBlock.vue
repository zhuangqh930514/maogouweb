<template>
  <div class="report-block">
    <div class="block-icon" :class="tone"></div>
    <div>
      <div class="block-title">{{ title }}</div>
      <div class="block-text">{{ text }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  text: { type: String, required: true },
  tone: { type: String, default: 'blue' },
})
</script>

<style scoped>
.report-block {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.block-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #dbeafe;
}

.block-icon.yellow {
  background: #fef3c7;
}

.block-icon.green {
  background: #dcfce7;
}

.block-title {
  font-size: 13px;
  font-weight: 800;
  line-height: 20px;
}

.block-text {
  margin-top: 4px;
  color: #4b5563;
  font-size: 13px;
  line-height: 21px;
}
</style>
