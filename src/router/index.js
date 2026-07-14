import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '../services/auth'

const HomeView = () => import('../views/HomeView.vue')
const MarketView = () => import('../views/MarketView.vue')
const WatchlistView = () => import('../views/WatchlistView.vue')
const PortfolioView = () => import('../views/PortfolioView.vue')
const ReportsView = () => import('../views/ReportsView.vue')
const ResearchDailyReportView = () => import('../views/ResearchDailyReportView.vue')
const AiLearningEvolutionView = () => import('../views/AiLearningEvolutionView.vue')
const AiFactorHubView = () => import('../views/AiFactorHubView.vue')
const AiStrategyValidationView = () => import('../views/AiStrategyValidationView.vue')
const AiLearningDashboardView = () => import('../views/AiLearningDashboardView.vue')
const AiSamplesView = () => import('../views/AiSamplesView.vue')
const AiEvolutionDashboardView = () => import('../views/AiEvolutionDashboardView.vue')
const AiReviewCenterView = () => import('../views/AiReviewCenterView.vue')
const AiFactorCenterView = () => import('../views/AiFactorCenterView.vue')
const AiFactorFactoryView = () => import('../views/AiFactorFactoryView.vue')
const AiStockPickerLabView = () => import('../views/AiStockPickerLabView.vue')
const AiStrategyEvolutionView = () => import('../views/AiStrategyEvolutionView.vue')
const AiStrategyLabView = () => import('../views/AiStrategyLabView.vue')
const AiBacktestView = () => import('../views/AiBacktestView.vue')
const AiModelEvalsView = () => import('../views/AiModelEvalsView.vue')
const SettingsView = () => import('../views/SettingsView.vue')
const AutomationTasksView = () => import('../views/AutomationTasksView.vue')
const PromptTemplatesView = () => import('../views/PromptTemplatesView.vue')
const ChatView = () => import('../views/ChatView.vue')
const LoginView = () => import('../views/LoginView.vue')
const RegisterView = () => import('../views/RegisterView.vue')

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录猫狗智投', layout: 'auth', public: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: '注册猫狗智投', layout: 'auth', public: true } },
  { path: '/', name: 'home', component: HomeView, meta: { title: '资讯首页' } },
  { path: '/market', name: 'market', component: MarketView, meta: { title: '大盘数据' } },
  { path: '/watchlist', name: 'watchlist', component: WatchlistView, meta: { title: '自选股' } },
  { path: '/portfolio', name: 'portfolio', component: PortfolioView, meta: { title: '持仓记录' } },
  { path: '/daily-insight', redirect: '/research-daily-reports' },
  { path: '/research-daily-reports', name: 'researchDailyReports', component: ResearchDailyReportView, meta: { title: '投研日报' } },
  { path: '/reports', name: 'reports', component: ReportsView, meta: { title: '分析报告' } },
  { path: '/ai-learning-evolution', name: 'aiLearningEvolution', component: AiLearningEvolutionView, meta: { title: '研究实验室' } },
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
