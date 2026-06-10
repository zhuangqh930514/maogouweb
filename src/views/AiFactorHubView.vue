<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">因子中心</h2>
          <p class="surface-subtitle">统一查看因子定义、命中统计、历史胜率、收益和权重变化</p>
        </div>
      </div>
      <div class="surface-body">
        <el-tabs v-model="activeTab" class="merged-tabs">
          <el-tab-pane label="因子工厂" name="factory" />
          <el-tab-pane label="因子学习" name="learning" />
        </el-tabs>
      </div>
    </section>

    <component :is="activeComponent" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AiFactorCenterView from './AiFactorCenterView.vue'
import AiFactorFactoryView from './AiFactorFactoryView.vue'

const activeTab = ref('factory')

const activeComponent = computed(() => activeTab.value === 'learning' ? AiFactorCenterView : AiFactorFactoryView)
</script>

<style scoped>
.merged-tabs {
  --el-color-primary: #2563eb;
}
</style>
