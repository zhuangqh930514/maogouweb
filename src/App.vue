<template>
  <router-view v-if="isAuthLayout" />
  <ShellLayout v-else />
</template>

<script setup>
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import ShellLayout from './components/ShellLayout.vue'

const route = useRoute()
const isAuthLayout = computed(() => route.meta.layout === 'auth')

watchEffect(() => {
  document.body.classList.toggle('auth-body', isAuthLayout.value)
})
</script>
