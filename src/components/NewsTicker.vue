<template>
  <div class="ticker">
    <div class="ticker-track">
      <button
        v-for="item in items"
        :key="`${item.time}-${item.title}`"
        class="ticker-item"
        type="button"
        @click="emit('select', item)"
      >
        {{ item.time }} {{ item.title }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
})

const emit = defineEmits(['select'])
</script>

<style scoped>
.ticker {
  min-height: 48px;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
  padding: 0 20px;
  background: #0f172a;
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

.ticker-item {
  border: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  white-space: nowrap;
  background: transparent;
  cursor: pointer;
}

.ticker-item:hover {
  color: #bfdbfe;
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
