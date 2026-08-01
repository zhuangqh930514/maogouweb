<template>
  <section class="not-found-page" aria-labelledby="not-found-title">
    <div class="not-found-mark" aria-hidden="true">404</div>
    <h1 id="not-found-title">页面不存在</h1>
    <p>这个地址没有对应的猫狗智投页面。</p>
    <div class="not-found-actions">
      <el-button type="primary" :icon="House" @click="goHome">返回首页</el-button>
      <el-button :icon="Back" @click="goBack">返回上一页</el-button>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Back, House } from '@element-plus/icons-vue'

const router = useRouter()

function goHome() {
  router.push('/')
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.not-found-page {
  min-height: 62vh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 14px;
  padding: 48px 24px;
  text-align: center;
}

.not-found-mark {
  color: var(--mg-accent, #d7a84f);
  font-size: 72px;
  font-weight: 800;
  line-height: 1;
}

.not-found-page h1,
.not-found-page p {
  margin: 0;
}

.not-found-page p {
  color: var(--mg-muted, #8b97a8);
}

.not-found-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
</style>
