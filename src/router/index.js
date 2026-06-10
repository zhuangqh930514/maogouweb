import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import MarketView from '../views/MarketView.vue'
import WatchlistView from '../views/WatchlistView.vue'
import PortfolioView from '../views/PortfolioView.vue'
import ReportsView from '../views/ReportsView.vue'
import AiLearningEvolutionView from '../views/AiLearningEvolutionView.vue'
import AiFactorHubView from '../views/AiFactorHubView.vue'
import AiStrategyValidationView from '../views/AiStrategyValidationView.vue'
import AiLearningDashboardView from '../views/AiLearningDashboardView.vue'
import AiSamplesView from '../views/AiSamplesView.vue'
import AiEvolutionDashboardView from '../views/AiEvolutionDashboardView.vue'
import AiReviewCenterView from '../views/AiReviewCenterView.vue'
import AiFactorCenterView from '../views/AiFactorCenterView.vue'
import AiFactorFactoryView from '../views/AiFactorFactoryView.vue'
import AiStockPickerLabView from '../views/AiStockPickerLabView.vue'
import AiStrategyEvolutionView from '../views/AiStrategyEvolutionView.vue'
import AiStrategyLabView from '../views/AiStrategyLabView.vue'
import AiBacktestView from '../views/AiBacktestView.vue'
import AiModelEvalsView from '../views/AiModelEvalsView.vue'
import SettingsView from '../views/SettingsView.vue'
import AutomationTasksView from '../views/AutomationTasksView.vue'
import PromptTemplatesView from '../views/PromptTemplatesView.vue'
import ChatView from '../views/ChatView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import { isAuthenticated } from '../services/auth'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录猫狗智投', layout: 'auth', public: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: '注册猫狗智投', layout: 'auth', public: true } },
  { path: '/', name: 'home', component: HomeView, meta: { title: '资讯首页' } },
  { path: '/market', name: 'market', component: MarketView, meta: { title: '大盘数据' } },
  { path: '/watchlist', name: 'watchlist', component: WatchlistView, meta: { title: '自选股' } },
  { path: '/portfolio', name: 'portfolio', component: PortfolioView, meta: { title: '持仓记录' } },
  { path: '/reports', name: 'reports', component: ReportsView, meta: { title: '分析报告' } },
  { path: '/ai-learning-evolution', name: 'aiLearningEvolution', component: AiLearningEvolutionView, meta: { title: '学习进化' } },
  { path: '/ai-factor-hub', name: 'aiFactorHub', component: AiFactorHubView, meta: { title: '因子中心' } },
  { path: '/ai-strategy-validation', name: 'aiStrategyValidation', component: AiStrategyValidationView, meta: { title: '策略验证' } },
  { path: '/ai-learning', name: 'aiLearning', component: AiLearningDashboardView, meta: { title: 'AI 学习总览' } },
  { path: '/ai-samples', name: 'aiSamples', component: AiSamplesView, meta: { title: '数据样本中心' } },
  { path: '/ai-evolution', name: 'aiEvolution', component: AiEvolutionDashboardView, meta: { title: 'AI 进化总览' } },
  { path: '/ai-reviews', name: 'aiReviews', component: AiReviewCenterView, meta: { title: '复盘验证' } },
  { path: '/ai-factors', name: 'aiFactors', component: AiFactorCenterView, meta: { title: '因子学习' } },
  { path: '/ai-factor-factory', name: 'aiFactorFactory', component: AiFactorFactoryView, meta: { title: '因子工厂' } },
  { path: '/ai-stock-picker-lab', name: 'aiStockPickerLab', component: AiStockPickerLabView, meta: { title: '选股实验室' } },
  { path: '/ai-strategies', name: 'aiStrategies', component: AiStrategyEvolutionView, meta: { title: '策略进化' } },
  { path: '/ai-strategy-lab', name: 'aiStrategyLab', component: AiStrategyLabView, meta: { title: '策略实验室' } },
  { path: '/ai-backtests', name: 'aiBacktests', component: AiBacktestView, meta: { title: '回测中心' } },
  { path: '/ai-model-evals', name: 'aiModelEvals', component: AiModelEvalsView, meta: { title: '模型评测中心' } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { title: '模型配置中心' } },
  { path: '/prompt-templates', name: 'promptTemplates', component: PromptTemplatesView, meta: { title: '提示词管理' } },
  { path: '/automation-tasks', name: 'automationTasks', component: AutomationTasksView, meta: { title: '自动化任务' } },
  { path: '/chat', name: 'chat', component: ChatView, meta: { title: '猫狗投研助手' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || '猫狗智投'} - 猫狗智投`
  const loggedIn = isAuthenticated()
  if (!to.meta.public && !loggedIn) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }
  return true
})

export default router
