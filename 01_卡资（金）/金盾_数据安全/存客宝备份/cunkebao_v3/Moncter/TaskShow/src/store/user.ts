import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 用户 token
  const token = ref<string | null>(null)

  // 初始化 token（从 localStorage 读取）
  const initToken = () => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      token.value = storedToken
    }
  }

  // 设置 token
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  // 清除用户信息
  const clearUser = () => {
    token.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    initToken,
    setToken,
    clearUser
  }
})

