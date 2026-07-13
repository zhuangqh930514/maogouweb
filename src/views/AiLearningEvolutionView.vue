<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">研究实验室</h2>
          <p class="surface-subtitle">集中查看学习、样本、复盘、因子和策略验证，普通使用无需逐项执行</p>
        </div>
      </div>
      <div class="surface-body">
        <el-tabs v-model="activeTab" class="merged-tabs">
          <el-tab-pane label="学习总览" name="learning" />
          <el-tab-pane label="进化总览" name="evolution" />
          <el-tab-pane label="复盘验证" name="reviews" />
          <el-tab-pane label="样本诊断" name="samples" />
          <el-tab-pane label="因子研究" name="factors" />
          <el-tab-pane label="策略验证" name="strategies" />
        </el-tabs>
      </div>
    </section>

    <component :is="activeComponent" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AiEvolutionDashboardView from './AiEvolutionDashboardView.vue'
import AiLearningDashboardView from './AiLearningDashboardView.vue'
import AiReviewCenterView from './AiReviewCenterView.vue'
import AiSamplesView from './AiSamplesView.vue'
import AiFactorHubView from './AiFactorHubView.vue'
import AiStrategyValidationView from './AiStrategyValidationView.vue'

const activeTab = ref('learning')

const activeComponent = computed(() => {
  const components = {
    learning: AiLearningDashboardView,
    evolution: AiEvolutionDashboardView,
    reviews: AiReviewCenterView,
    samples: AiSamplesView,
    factors: AiFactorHubView,
    strategies: AiStrategyValidationView,
  }
  return components[activeTab.value] || AiLearningDashboardView
})
</script>

<style scoped>
.merged-tabs {
  --el-color-primary: #2563eb;
}
</style>
