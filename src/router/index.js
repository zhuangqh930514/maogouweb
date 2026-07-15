import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '../services/auth'

const HomeView = () => import('../views/HomeView.vue')
const MarketView = () => import('../views/MarketView.vue')
const WatchlistView = () => import('../views/WatchlistView.vue')
const PortfolioView = () => import('../views/PortfolioView.vue')
const ReportsView = () => import('../views/ReportsView.vue')
const ResearchDailyReportView = () => import('../views/ResearchDailyReportView.vue')
const ResearchLabView = () => import('../views/research-lab/ResearchLabView.vue')
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
  { path: '/research-daily-report', redirect: '/research-daily-reports' },
  { path: '/research-daily-reports', name: 'researchDailyReports', component: ResearchDailyReportView, meta: { title: '投研日报' } },
  { path: '/reports', name: 'reports', component: ReportsView, meta: { title: '分析报告' } },
  { path: '/research-lab', name: 'researchLab', component: ResearchLabView, meta: { title: '研究实验室' } },
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
