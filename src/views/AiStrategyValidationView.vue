<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">策略验证</h2>
          <p class="surface-subtitle">把选股排序、策略实验、回测、模型评测和策略版本放在同一个验证工作台</p>
        </div>
      </div>
      <div class="surface-body">
        <el-tabs v-model="activeTab" class="merged-tabs">
          <el-tab-pane label="选股实验" name="picker" />
          <el-tab-pane label="策略实验" name="lab" />
          <el-tab-pane label="回测中心" name="backtests" />
          <el-tab-pane label="模型评测" name="evals" />
          <el-tab-pane label="策略版本" name="versions" />
        </el-tabs>
      </div>
    </section>

    <component :is="activeComponent" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AiBacktestView from './AiBacktestView.vue'
import AiModelEvalsView from './AiModelEvalsView.vue'
import AiStockPickerLabView from './AiStockPickerLabView.vue'
import AiStrategyEvolutionView from './AiStrategyEvolutionView.vue'
import AiStrategyLabView from './AiStrategyLabView.vue'

const activeTab = ref('picker')

const activeComponent = computed(() => {
  const components = {
    picker: AiStockPickerLabView,
    lab: AiStrategyLabView,
    backtests: AiBacktestView,
    evals: AiModelEvalsView,
    versions: AiStrategyEvolutionView,
  }
  return components[activeTab.value] || AiStockPickerLabView
})
</script>

<style scoped>
.merged-tabs {
  --el-color-primary: #2563eb;
}
</style>
