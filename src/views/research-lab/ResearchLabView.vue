<template>
  <div class="page research-lab-page">
    <section class="surface research-lab-heading">
      <div>
        <h2 class="surface-title">研究实验室</h2>
        <p class="surface-subtitle">{{ scopeText }}</p>
      </div>
      <el-tag :type="canOperate ? 'warning' : 'info'" effect="plain">
        {{ canOperate ? '研究运维权限' : '只读研究证据' }}
      </el-tag>
    </section>

    <nav ref="tabNav" class="research-tabs" role="tablist" aria-label="研究实验室模块">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.name"
        :class="{ active: activeTab === tab.name }"
        @click="selectTab(tab.name)"
      >
        <component :is="tab.icon" aria-hidden="true" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <ResearchOverviewPanel
      v-if="activeTab === 'overview'"
      :loading="overviewLoading"
      :overview="overview"
      :error-message="overviewError"
      @retry="loadOverview"
    />
    <ResearchOperationsOverviewPanel
      v-else-if="activeTab === 'operations' && canOperate"
      :loading="operationsLoading"
      :overview="operationsOverview"
      :error-message="operationsError"
      :window-days="operationsWindowDays"
      @retry="loadOperationsOverview"
      @window-change="changeOperationsWindow"
    />
    <ResearchSamplesPanel v-else-if="activeTab === 'samples'" />
    <ResearchFactorsPanel v-else-if="activeTab === 'factors'" />
    <ResearchExperimentsPanel v-else-if="activeTab === 'experiments'" />
    <ResearchModelsPanel v-else-if="activeTab === 'models'" />
    <ResearchGovernancePanel v-else-if="activeTab === 'governance'" :can-operate="canOperate" />
    <ResearchRunsPanel v-else :can-operate="canOperate" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Box,
  DataAnalysis,
  Files,
  Histogram,
  Operation,
  SetUp,
  Timer,
  WarningFilled,
} from '@element-plus/icons-vue'
import { fetchCurrentUser, getStoredUser } from '../../services/auth'
import { fetchResearchOperationsOverview, fetchResearchOverview } from '../../services/researchLab'
import ResearchExperimentsPanel from './ResearchExperimentsPanel.vue'
import ResearchFactorsPanel from './ResearchFactorsPanel.vue'
import ResearchGovernancePanel from './ResearchGovernancePanel.vue'
import ResearchModelsPanel from './ResearchModelsPanel.vue'
import ResearchOverviewPanel from './ResearchOverviewPanel.vue'
import ResearchOperationsOverviewPanel from './ResearchOperationsOverviewPanel.vue'
import ResearchRunsPanel from './ResearchRunsPanel.vue'
import ResearchSamplesPanel from './ResearchSamplesPanel.vue'
import './researchLab.css'

const baseTabs = Object.freeze([
  { name: 'overview', label: '总览', icon: DataAnalysis },
  { name: 'samples', label: '样本与标签', icon: Files },
  { name: 'factors', label: '因子研究', icon: Histogram },
  { name: 'experiments', label: '实验与回测', icon: Operation },
  { name: 'models', label: '模型训练', icon: Box },
  { name: 'governance', label: '策略治理', icon: SetUp },
  { name: 'runs', label: '运行记录', icon: Timer },
])
const operationsTab = Object.freeze({ name: 'operations', label: '运行与告警', icon: WarningFilled })
const allTabNames = new Set([...baseTabs, operationsTab].map((tab) => tab.name))
const route = useRoute()
const router = useRouter()
const user = ref(getStoredUser())
const initialTab = allTabNames.has(String(route.query.tab || '')) ? String(route.query.tab) : 'overview'
const activeTab = ref(initialTab)
const overview = ref(null)
const overviewLoading = ref(false)
const overviewError = ref('')
const operationsOverview = ref(null)
const operationsLoading = ref(false)
const operationsError = ref('')
const operationsWindowDays = ref(14)
const tabNav = ref(null)

const role = computed(() => String(user.value?.systemRole || 'USER').toUpperCase())
const canOperate = computed(() => ['OPERATOR', 'ADMIN'].includes(role.value))
const tabs = computed(() => canOperate.value ? [...baseTabs, operationsTab] : baseTabs)
const scopeText = computed(() => {
  const tradeDate = overview.value?.latestPipeline?.tradeDate
  return tradeDate ? `最新全局研究交易日 ${tradeDate}` : '尚无已完成的全局研究批次'
})

onMounted(async () => {
  try {
    user.value = await fetchCurrentUser()
  } catch {
    user.value = getStoredUser()
  }
  if (!canOperate.value && activeTab.value === 'operations') {
    selectTab('overview')
  }
  loadOverview()
  if (canOperate.value && activeTab.value === 'operations') loadOperationsOverview()
  await nextTick()
  scrollActiveTab()
})

function selectTab(name) {
  if (!tabs.value.some((tab) => tab.name === name) || name === activeTab.value) return
  activeTab.value = name
  router.replace({ query: { ...route.query, tab: name } })
  if (name === 'overview' && !overview.value) loadOverview()
  if (name === 'operations' && !operationsOverview.value) loadOperationsOverview()
  nextTick(scrollActiveTab)
}

function scrollActiveTab() {
  tabNav.value?.querySelector('button.active')?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
}

async function loadOverview() {
  overviewLoading.value = true
  overviewError.value = ''
  try {
    overview.value = await fetchResearchOverview()
  } catch (error) {
    overviewError.value = error.message || '研究总览加载失败'
  } finally {
    overviewLoading.value = false
  }
}

async function loadOperationsOverview() {
  if (!canOperate.value) return
  operationsLoading.value = true
  operationsError.value = ''
  try {
    operationsOverview.value = await fetchResearchOperationsOverview(operationsWindowDays.value)
  } catch (error) {
    operationsError.value = error.message || '运行与告警加载失败'
  } finally {
    operationsLoading.value = false
  }
}

async function changeOperationsWindow(windowDays) {
  operationsWindowDays.value = windowDays
  await loadOperationsOverview()
}
</script>
