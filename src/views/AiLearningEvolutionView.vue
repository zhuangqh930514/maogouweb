<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">学习进化</h2>
          <p class="surface-subtitle">把每日分析、T+N 复盘、因子权重和策略版本串成一条可验证的学习闭环</p>
        </div>
      </div>
      <div class="surface-body">
        <el-tabs v-model="activeTab" class="merged-tabs">
          <el-tab-pane label="学习总览" name="learning" />
          <el-tab-pane label="进化总览" name="evolution" />
          <el-tab-pane label="复盘验证" name="reviews" />
          <el-tab-pane label="样本诊断" name="samples" />
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

const activeTab = ref('learning')

const activeComponent = computed(() => {
  const components = {
    learning: AiLearningDashboardView,
    evolution: AiEvolutionDashboardView,
    reviews: AiReviewCenterView,
    samples: AiSamplesView,
  }
  return components[activeTab.value] || AiLearningDashboardView
})
</script>

<style scoped>
.merged-tabs {
  --el-color-primary: #2563eb;
}
</style>
