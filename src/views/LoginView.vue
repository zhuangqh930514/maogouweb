<template>
  <main class="auth-page">
    <section class="auth-hero" aria-label="猫狗智投品牌区">
      <div class="hero-topline">
        <span class="signal-dot"></span>
        <span>A股实时行情在线</span>
      </div>

      <div class="logo-stage">
        <img class="auth-logo" src="/maogou-logo.png" alt="猫狗智投" />
      </div>

      <div class="hero-copy">
        <h1>猫狗智投</h1>
        <p>行情、持仓与本地 AI 决策分析集中在一个投研工作台。</p>
      </div>

      <div class="hero-metrics">
        <div v-for="item in metrics" :key="item.label" class="metric-tile">
          <span>{{ item.label }}</span>
          <strong :class="item.tone">{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <section class="auth-panel" aria-label="登录表单">
      <div class="panel-heading">
        <el-tag class="tag-blue" effect="plain">本地模型可用</el-tag>
        <h2>登录账户</h2>
        <p>进入猫狗智投工作台</p>
      </div>

      <el-form class="auth-form" :model="form" label-position="top">
        <el-form-item label="手机号 / 邮箱">
          <el-input v-model="form.account" size="large" placeholder="请输入手机号或邮箱">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="登录密码">
          <el-input v-model="form.password" size="large" type="password" show-password placeholder="请输入密码">
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <div class="form-row">
          <el-checkbox v-model="form.remember">保持登录</el-checkbox>
          <el-button link type="primary">忘记密码</el-button>
        </div>

        <el-button class="primary-action" type="primary" size="large" @click="login">
          登录猫狗智投
        </el-button>

        <div class="auth-switch">
          <span>还没有账户？</span>
          <el-button link type="primary" @click="$router.push('/register')">立即注册</el-button>
        </div>
      </el-form>
    </section>
  </main>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'

const router = useRouter()
const form = reactive({
  account: 'demo@maogou.ai',
  password: 'maogou123',
  remember: true,
})

const metrics = [
  { label: '上证指数', value: '+0.84%', tone: 'up' },
  { label: 'AI 评分', value: '86', tone: 'score' },
  { label: '风险状态', value: '稳健', tone: 'safe' },
]

function login() {
  ElMessage.success('已模拟登录')
  router.push('/')
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(430px, 0.72fr);
  background:
    radial-gradient(circle at 18% 18%, rgba(37, 99, 235, 0.2), transparent 34%),
    linear-gradient(135deg, #0f1b33 0%, #142747 48%, #f3f6fb 48%, #f3f6fb 100%);
}

.auth-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 76px;
  color: #fff;
  overflow: hidden;
}

.auth-hero::after {
  content: "";
  position: absolute;
  inset: auto -140px -180px auto;
  width: 420px;
  height: 420px;
  border: 1px solid rgba(147, 164, 199, 0.28);
  border-radius: 50%;
}

.hero-topline {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border: 1px solid rgba(191, 219, 254, 0.28);
  border-radius: 8px;
  background: rgba(19, 35, 64, 0.76);
  color: #dbeafe;
  font-size: 13px;
  font-weight: 700;
}

.signal-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #16a34a;
}

.logo-stage {
  width: 276px;
  height: 276px;
  display: grid;
  place-items: center;
  margin-top: 42px;
  border: 1px solid rgba(191, 219, 254, 0.24);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 28px 70px -36px rgba(37, 99, 235, 0.92);
}

.auth-logo {
  width: 238px;
  height: 238px;
  object-fit: contain;
}

.hero-copy {
  max-width: 560px;
  margin-top: 36px;
}

.hero-copy h1 {
  margin: 0;
  font-size: 54px;
  line-height: 66px;
  font-weight: 900;
}

.hero-copy p {
  margin: 14px 0 0;
  max-width: 520px;
  color: #c7d2fe;
  font-size: 17px;
  line-height: 28px;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 146px));
  gap: 14px;
  margin-top: 42px;
}

.metric-tile {
  border: 1px solid rgba(147, 164, 199, 0.28);
  border-radius: 8px;
  padding: 16px;
  background: rgba(19, 35, 64, 0.82);
}

.metric-tile span {
  display: block;
  color: #93a4c7;
  font-size: 12px;
  line-height: 18px;
}

.metric-tile strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  line-height: 30px;
}

.metric-tile .score {
  color: #60a5fa;
}

.metric-tile .safe {
  color: #22c55e;
}

.auth-panel {
  align-self: center;
  width: min(430px, calc(100% - 64px));
  justify-self: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 34px;
  box-shadow: 0 28px 64px -42px rgba(15, 23, 42, 0.36);
}

.panel-heading h2 {
  margin: 20px 0 0;
  color: #111827;
  font-size: 28px;
  line-height: 36px;
  font-weight: 900;
}

.panel-heading p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 22px;
}

.auth-form {
  margin-top: 28px;
}

.form-row,
.auth-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.primary-action {
  width: 100%;
  margin-top: 20px;
}

.auth-switch {
  justify-content: center;
  margin-top: 22px;
  color: #6b7280;
  font-size: 14px;
}

@media (max-width: 1180px) {
  .auth-page {
    grid-template-columns: 1fr;
    background: #f3f6fb;
  }

  .auth-hero {
    min-height: auto;
    padding: 42px 48px;
    background: #0f1b33;
  }

  .auth-panel {
    margin: 34px 0;
  }
}
</style>
