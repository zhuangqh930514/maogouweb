<template>
  <main class="auth-page register-page">
    <section class="auth-panel" aria-label="注册表单">
      <div class="panel-heading">
        <el-tag class="tag-blue" effect="plain">创建账户</el-tag>
        <h2>注册猫狗智投</h2>
        <p>开通个人投研工作台</p>
      </div>

      <el-form class="auth-form" :model="form" label-position="top" @keyup.enter="register">
        <el-form-item label="用户名">
          <el-input v-model="form.name" size="large" placeholder="请输入用户名">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="手机号 / 邮箱">
          <el-input v-model="form.account" size="large" placeholder="用于登录和通知">
            <template #prefix>
              <el-icon><Message /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="密码">
            <el-input v-model="form.password" size="large" type="password" show-password placeholder="至少 8 位" />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input v-model="form.confirm" size="large" type="password" show-password placeholder="再次输入" />
          </el-form-item>
        </div>
        <el-form-item label="风险偏好">
          <el-segmented v-model="form.risk" :options="['稳健', '均衡', '进取']" />
        </el-form-item>

        <el-button class="primary-action" type="primary" size="large" :loading="loading" @click="register">
          创建账户
        </el-button>

        <div class="auth-switch">
          <span>已有账户？</span>
          <el-button link type="primary" @click="$router.push('/login')">返回登录</el-button>
        </div>
      </el-form>
    </section>

    <section class="auth-hero" aria-label="猫狗智投注册品牌区">
      <div class="logo-stage">
        <img class="auth-logo" src="/maogou-logo.png" alt="猫狗智投" />
      </div>
      <div class="hero-copy">
        <h1>猫狗智投</h1>
      </div>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Message, User } from '@element-plus/icons-vue'
import { register as registerApi } from '../services/auth'

const router = useRouter()
const loading = ref(false)
const form = reactive({
  name: '',
  account: '',
  password: '',
  confirm: '',
  risk: '均衡',
})

async function register() {
  if (!form.name || !form.account || !form.password || !form.confirm) {
    ElMessage.warning('请完整填写注册信息')
    return
  }
  if (form.password !== form.confirm) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await registerApi({
      username: form.name,
      account: form.account,
      password: form.password,
      confirmPassword: form.confirm,
      riskPreference: form.risk,
    })
    ElMessage.success('注册成功，已登录')
    router.push('/')
  } catch (error) {
    ElMessage.error(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(430px, 0.74fr) minmax(0, 1.06fr);
  background:
    radial-gradient(circle at 82% 22%, rgba(37, 99, 235, 0.18), transparent 30%),
    linear-gradient(45deg, #f3f6fb 0%, #f3f6fb 48%, #0f1b33 48%, #142747 100%);
}

.auth-panel {
  align-self: center;
  width: min(472px, calc(100% - 64px));
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.primary-action {
  width: 100%;
  margin-top: 10px;
}

.auth-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
  color: #6b7280;
  font-size: 14px;
}

.auth-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 64px 78px;
  color: #fff;
  overflow: hidden;
}

.logo-stage {
  width: 292px;
  height: 292px;
  display: grid;
  place-items: center;
  transform: translateX(72px);
  border: 1px solid rgba(191, 219, 254, 0.24);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 28px 70px -36px rgba(37, 99, 235, 0.92);
}

.auth-logo {
  width: 252px;
  height: 252px;
  object-fit: contain;
}

.hero-copy {
  margin-top: 38px;
  text-align: center;
  transform: translateX(72px);
}

.hero-copy h1 {
  margin: 0;
  font-size: 54px;
  line-height: 66px;
  font-weight: 900;
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

  .logo-stage,
  .hero-copy {
    transform: none;
  }

  .auth-panel {
    margin: 34px 0;
  }
}
</style>
