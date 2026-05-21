import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import MarketView from '../views/MarketView.vue'
import WatchlistView from '../views/WatchlistView.vue'
import PortfolioView from '../views/PortfolioView.vue'
import ReportsView from '../views/ReportsView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: '资讯首页与大盘实时看板' } },
  { path: '/market', name: 'market', component: MarketView, meta: { title: '大盘数据' } },
  { path: '/watchlist', name: 'watchlist', component: WatchlistView, meta: { title: '自选股管理' } },
  { path: '/portfolio', name: 'portfolio', component: PortfolioView, meta: { title: '持仓记录' } },
  { path: '/reports', name: 'reports', component: ReportsView, meta: { title: 'AI 分析报告' } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { title: '模型配置中心' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
