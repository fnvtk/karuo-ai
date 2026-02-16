// 认证相关API接口
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://ckbapi.quwanzhi.com"

// 用户信息类型
export interface UserInfo {
  id: string
  username: string
  email?: string
  phone?: string
  avatar?: string
  role: string
  status: "active" | "inactive" | "banned"
  createdAt: string
  lastLoginAt?: string
}

// 登录参数
export interface LoginParams {
  username: string
  password: string
  remember?: boolean
}

// 登录响应
export interface LoginResponse {
  success: boolean
  message: string
  data?: {
    token: string
    user: UserInfo
    expiresIn: number
  }
}

// 统一的API请求客户端
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const token = getToken()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...((options.headers as Record<string, string>) || {}),
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    console.log("发送认证API请求:", url)

    const response = await fetch(url, {
      ...options,
      headers,
      mode: "cors",
    })

    console.log("认证API响应状态:", response.status, response.statusText)

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthData()
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("服务器返回了非JSON格式的数据")
    }

    const data = await response.json()
    console.log("认证API响应数据:", data)

    if (data.code && data.code !== 200 && data.code !== 0) {
      throw new Error(data.message || "请求失败")
    }

    return data.data || data
  } catch (error) {
    console.error("认证API请求失败:", error)
    throw error
  }
}

/**
 * 用户登录
 */
export async function login(params: LoginParams): Promise<LoginResponse> {
  try {
    const response = await apiRequest<LoginResponse>(`${API_BASE_URL}/v1/auth/login`, {
      method: "POST",
      body: JSON.stringify(params),
    })

    if (response.success && response.data) {
      // 保存认证信息
      if (typeof window !== "undefined") {
        localStorage.setItem("ckb_token", response.data.token)
        localStorage.setItem("ckb_user", JSON.stringify(response.data.user))
        if (params.remember) {
          localStorage.setItem("ckb_remember", "true")
        }
      }
    }

    return response
  } catch (error) {
    console.error("登录失败:", error)
    throw error
  }
}

/**
 * 密码登录
 */
export async function loginWithPassword(username: string, password: string): Promise<LoginResponse> {
  return login({ username, password })
}

/**
 * 获取用户信息
 */
export async function getUserInfo(): Promise<UserInfo> {
  return apiRequest<UserInfo>(`${API_BASE_URL}/v1/auth/user`)
}

/**
 * 检查登录状态
 */
export async function checkLoginStatus(): Promise<{ isLoggedIn: boolean; user?: UserInfo }> {
  try {
    const token = getToken()
    if (!token) {
      return { isLoggedIn: false }
    }

    const user = await getUserInfo()
    return { isLoggedIn: true, user }
  } catch (error) {
    console.error("检查登录状态失败:", error)
    clearAuthData()
    return { isLoggedIn: false }
  }
}

/**
 * 获取当前用户
 */
export function getCurrentUser(): UserInfo | null {
  if (typeof window === "undefined") return null

  try {
    const userStr = localStorage.getItem("ckb_user")
    return userStr ? JSON.parse(userStr) : null
  } catch (error) {
    console.error("获取当前用户失败:", error)
    return null
  }
}

/**
 * 获取Token
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("ckb_token")
}

/**
 * 清除认证数据
 */
export function clearAuthData(): void {
  if (typeof window === "undefined") return

  localStorage.removeItem("ckb_token")
  localStorage.removeItem("ckb_user")
  localStorage.removeItem("ckb_remember")
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest(`${API_BASE_URL}/v1/auth/logout`, {
      method: "POST",
    })
  } catch (error) {
    console.error("登出请求失败:", error)
  } finally {
    clearAuthData()
  }
}

/**
 * 刷新Token
 */
export async function refreshToken(): Promise<string | null> {
  try {
    const response = await apiRequest<{ token: string }>(`${API_BASE_URL}/v1/auth/refresh`, {
      method: "POST",
    })

    if (response.token) {
      if (typeof window !== "undefined") {
        localStorage.setItem("ckb_token", response.token)
      }
      return response.token
    }

    return null
  } catch (error) {
    console.error("刷新Token失败:", error)
    clearAuthData()
    return null
  }
}

// 认证API类
export class AuthAPI {
  static async login(params: LoginParams): Promise<LoginResponse> {
    return login(params)
  }

  static async getUserInfo(): Promise<UserInfo> {
    return getUserInfo()
  }

  static async checkLoginStatus(): Promise<{ isLoggedIn: boolean; user?: UserInfo }> {
    return checkLoginStatus()
  }

  static getCurrentUser(): UserInfo | null {
    return getCurrentUser()
  }

  static getToken(): string | null {
    return getToken()
  }

  static clearAuthData(): void {
    clearAuthData()
  }

  static async logout(): Promise<void> {
    return logout()
  }

  static async refreshToken(): Promise<string | null> {
    return refreshToken()
  }
}

// 添加authApi实例导出,供其他模块使用
export const authApi = AuthAPI

// 默认导出
export default AuthAPI
</merged_code
