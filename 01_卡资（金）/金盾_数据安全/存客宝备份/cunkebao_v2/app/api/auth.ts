// API请求工具函数
import { toast } from "@/components/ui/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.example.com"

// 带有认证的请求函数
export async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token")

  // 合并headers
  let headers = { ...options.headers }

  // 如果有token，添加到请求头
  if (token) {
    headers = {
      ...headers,
      Token: `${token}`,
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    // 检查token是否过期（仅当有token时）
    if (token && (data.code === 401 || data.code === 403)) {
      // 清除token
      localStorage.removeItem("token")

      // 暂时不重定向到登录页
      // if (typeof window !== "undefined") {
      //   window.location.href = "/login"
      // }

      console.warn("登录已过期")
    }

    return data
  } catch (error) {
    console.error("API请求错误:", error)
    toast({
      variant: "destructive",
      title: "请求失败",
      description: error instanceof Error ? error.message : "网络错误，请稍后重试",
    })
    throw error
  }
}

// 不需要认证的请求函数
export async function publicFetch(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, options)
    return await response.json()
  } catch (error) {
    console.error("API请求错误:", error)
    toast({
      variant: "destructive",
      title: "请求失败",
      description: error instanceof Error ? error.message : "网络错误，请稍后重试",
    })
    throw error
  }
}
