"use server"

import { loginWithPassword } from "@/lib/api/auth"

export async function authenticate(account: string, password: string) {
  try {
    const response = await loginWithPassword({
      account,
      password,
      typeid: 1,
    })

    if (response.code === 200 && response.data) {
      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
      }
    } else {
      return {
        error: response.message || "登录失败",
      }
    }
  } catch (error) {
    console.error("认证失败:", error)
    return {
      error: error instanceof Error ? error.message : "登录失败，请重试",
    }
  }
}
