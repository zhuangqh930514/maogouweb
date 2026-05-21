<template>
  <el-container class="shell">
    <el-aside class="sidebar" width="236px">
      <div class="brand">
        <div class="brand-mark">AI</div>
        <div>
          <div class="brand-title">AI 投研终端</div>
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
          <div class="market-clock">交易日 2026-05-21 14:56:32 | A股盘中实时</div>
        </div>
        <div class="topbar-actions">
          <el-input v-model="keyword" class="stock-search" placeholder="搜索股票代码 / 名称" clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" :icon="Plus">添加自选</el-button>
          <el-button :icon="Setting">设置</el-button>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  DataBoard,
  DocumentChecked,
  Plus,
  Search,
  Setting,
  Star,
  TrendCharts,
  Wallet,
} from '@element-plus/icons-vue'

const route = useRoute()
const keyword = ref('')
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

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0;
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

.stock-search {
  width: 238px;
}

.main {
  padding: 24px 28px 40px;
  background: #f3f6fb;
}
</style>
