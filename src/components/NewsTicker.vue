<template>
  <div class="ticker">
    <div class="ticker-label">滚动资讯</div>
    <div class="ticker-track">
      <span v-for="item in items" :key="`${item.time}-${item.title}`">
        {{ item.time }} {{ item.title }}
      </span>
    </div>
    <el-tag class="tag-blue" effect="plain" round>实时更新</el-tag>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
})
</script>

<style scoped>
.ticker {
  min-height: 48px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  overflow: hidden;
  border-radius: 8px;
  padding: 0 20px;
  background: #0f172a;
}

.ticker-label {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 700;
}

.ticker-track {
  display: flex;
  gap: 36px;
  min-width: 0;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  animation: scroll-news 28s linear infinite;
}

@keyframes scroll-news {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-40%);
  }
}
</style>
