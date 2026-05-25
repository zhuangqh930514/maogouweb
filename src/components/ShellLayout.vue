<template>
  <el-container class="shell">
    <el-aside class="sidebar" width="236px">
      <div class="brand">
        <img class="brand-logo" src="/maogou-logo.png" alt="猫狗智投" />
        <div>
          <div class="brand-title">猫狗智投</div>
          <div class="brand-subtitle">A股行情 + 本地模型决策</div>
        </div>
      </div>

      <el-menu
        class="nav-menu"
        :default-active="route.path"
        background-color="transparent"
        text-color="#BAC7E0"
        active-text-color="#FFFFFF"
        router
      >
        <el-menu-item index="/">
          <el-icon><DataBoard /></el-icon>
          <span>资讯首页</span>
        </el-menu-item>
        <el-menu-item index="/market">
          <el-icon><TrendCharts /></el-icon>
          <span>大盘数据</span>
        </el-menu-item>
        <el-menu-item index="/watchlist">
          <el-icon><Star /></el-icon>
          <span>自选股</span>
        </el-menu-item>
        <el-menu-item index="/portfolio">
          <el-icon><Wallet /></el-icon>
          <span>持仓记录</span>
        </el-menu-item>
        <el-menu-item index="/reports">
          <el-icon><DocumentChecked /></el-icon>
          <span>AI 分析报告</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>模型配置中心</span>
        </el-menu-item>
        <el-menu-item index="/chat">
          <el-icon><ChatLineRound /></el-icon>
          <span>猫狗畅聊</span>
        </el-menu-item>
      </el-menu>

      <div class="model-card">
        <div class="model-label">本地模型状态</div>
        <div class="model-status">
          <span class="status-dot"></span>
          <span>qwen3.6 / OpenAI API</span>
        </div>
        <div class="model-url">http://localhost:11434/v1</div>
      </div>
    </el-aside>

    <el-container>
      <el-header class="topbar" height="76px">
        <div>
          <h1>{{ route.meta.title }}</h1>
          <div class="market-clock">{{ marketClockText }}</div>
        </div>
        <div class="topbar-actions">
          <el-button :icon="Setting">设置</el-button>
          <el-dropdown trigger="click" @command="handleUserCommand">
            <el-button :icon="User">{{ currentUser?.displayName || currentUser?.username || '账户' }}</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  {{ currentUser?.email || currentUser?.phone || '已登录' }}
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChatLineRound,
  DataBoard,
  DocumentChecked,
  Setting,
  Star,
  TrendCharts,
  User,
  Wallet,
} from '@element-plus/icons-vue'
import { fetchCurrentUser, getStoredUser, logout } from '../services/auth'

const route = useRoute()
const router = useRouter()
const currentUser = ref(getStoredUser())
const now = ref(new Date())
let clockTimer = null

const marketClockText = computed(() => {
  const current = now.value
  const dayText = isTradeDay(current) ? '交易日' : '非交易日'
  const statusText = isMarketOpen(current) ? 'A股盘中实时' : marketStatus(current)
  return `${dayText} ${formatDateTime(current)} | ${statusText}`
})

onMounted(async () => {
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
  try {
    currentUser.value = await fetchCurrentUser()
  } catch {
    currentUser.value = getStoredUser()
  }
})

onUnmounted(() => {
  if (clockTimer) {
    window.clearInterval(clockTimer)
  }
})

function handleUserCommand(command) {
  if (command === 'logout') {
    logout()
    router.push('/login')
  }
}

function isTradeDay(date) {
  const day = date.getDay()
  return day >= 1 && day <= 5
}

function isMarketOpen(date) {
  if (!isTradeDay(date)) {
    return false
  }
  const minutes = date.getHours() * 60 + date.getMinutes()
  return (minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30) || (minutes >= 13 * 60 && minutes <= 15 * 60)
}

function marketStatus(date) {
  if (!isTradeDay(date)) {
    return 'A股休市'
  }
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (minutes < 9 * 60 + 30) {
    return 'A股未开盘'
  }
  if (minutes > 11 * 60 + 30 && minutes < 13 * 60) {
    return 'A股午间休市'
  }
  if (minutes > 15 * 60) {
    return 'A股已收盘'
  }
  return 'A股休市'
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
</script>

<style scoped>
.shell {
  min-height: 100vh;
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  background: #0f1b33;
  color: #fff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
  padding: 0 8px;
}

.brand-logo {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border-radius: 12px;
  background: #fff;
  object-fit: cover;
  box-shadow: 0 10px 22px -14px rgba(37, 99, 235, 0.7);
}

.brand-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 24px;
}

.brand-subtitle {
  color: #93a4c7;
  font-size: 12px;
  line-height: 18px;
}

.nav-menu {
  border-right: 0;
}

.nav-menu :deep(.el-menu-item) {
  height: 40px;
  margin: 6px 0;
  border-radius: 8px;
  color: #bac7e0;
}

.nav-menu :deep(.el-menu-item.is-active) {
  background: #1d4ed8;
  color: #fff;
  font-weight: 700;
}

.nav-menu :deep(.el-menu-item:hover) {
  background: rgba(37, 99, 235, 0.18);
}

.model-card {
  margin-top: auto;
  padding: 18px 16px;
  border: 1px solid #294266;
  border-radius: 8px;
  background: #132340;
}

.model-label {
  color: #93a4c7;
  font-size: 12px;
  line-height: 18px;
}

.model-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #16a34a;
}

.model-url {
  margin-top: 12px;
  color: #8fa2c9;
  font-size: 11px;
  line-height: 18px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.topbar h1 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  font-weight: 800;
  line-height: 30px;
}

.market-clock {
  margin-top: 3px;
  color: #6b7280;
  font-size: 13px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main {
  padding: 24px 28px 40px;
  background: #f3f6fb;
}
</style>
