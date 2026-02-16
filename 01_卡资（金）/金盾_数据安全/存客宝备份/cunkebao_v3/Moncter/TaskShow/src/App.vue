<template>
  <router-view />
</template>

<script setup lang="ts">
// App 根组件
import { onMounted } from 'vue'
import { useUserStore } from '@/store'

const userStore = useUserStore()

onMounted(() => {
  // 初始化 token
  userStore.initToken()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  width: 100%;
  min-height: 100vh;
}
</style>

