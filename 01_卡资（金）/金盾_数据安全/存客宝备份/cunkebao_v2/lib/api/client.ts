/**
 * API客户端 - 基于存客宝接口标准
 */
import { API_CONFIG, STORAGE_KEYS } from "./config"

// 基础响应接口
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  timestamp?: number
}

// 分页参数接口
export interface PaginationParams {
  page: number
  pageSize: number
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 请求配置接口
interface RequestConfig {
  headers?: Record<string, string>
  timeout?: number
  retries?: number
}

/**
 * API客户端类
 */
class ApiClient {
  private baseURL: string
  private timeout: number
  private retryCount: number

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL
    this.timeout = API_CONFIG.TIMEOUT
    this.retryCount = API_CONFIG.RETRY_COUNT
  }

  /**
   * 获取认证头
   */
  private getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  /**
   * 获取存储的Token
   */
  private getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(STORAGE_KEYS.TOKEN)
  }

  /**
   * 设置Token
   */
  private setToken(token: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.TOKEN, token)
  }

  /**
   * 清除Token
   */
  private clearToken(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
  }

  /**
   * 处理响应
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get("content-type")
    let data: any

    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    // 如果响应不是标准格式，包装成标准格式
    if (typeof data !== "object" || !("code" in data)) {
      data = {
        code: response.ok ? API_CONFIG.ERROR_CODES.SUCCESS : response.status,
        message: response.ok ? "请求成功" : response.statusText,
        data: response.ok ? data : null,
      }
    }

    // 处理认证失败
    if (data.code === API_CONFIG.ERROR_CODES.UNAUTHORIZED) {
      this.clearToken()
      // 可以在这里触发重新登录逻辑
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }

    return data
  }

  /**
   * 发送请求
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith("http") ? url : `${this.baseURL}${url}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.getAuthHeaders(),
      ...config.headers,
    }

    const requestConfig: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(config.timeout || this.timeout),
    }

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      requestConfig.body = JSON.stringify(data)
    }

    let lastError: Error
    const maxRetries = config.retries ?? this.retryCount

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(fullUrl, requestConfig)
        return await this.handleResponse<T>(response)
      } catch (error) {
        lastError = error as Error

        // 如果是最后一次尝试，或者是认证错误，不重试
        if (attempt === maxRetries || error instanceof TypeError) {
          break
        }

        // 等待一段时间后重试
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    // 所有重试都失败了
    throw lastError || new Error("请求失败")
  }

  /**
   * GET请求
   */
  async get<T>(url: string, params?: Record<string, any>, config?: RequestConfig): Promise<ApiResponse<T>> {
    let fullUrl = url
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      fullUrl += `?${searchParams.toString()}`
    }
    return this.request<T>("GET", fullUrl, undefined, config)
  }

  /**
   * POST请求
   */
  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>("POST", url, data, config)
  }

  /**
   * PUT请求
   */
  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", url, data, config)
  }

  /**
   * PATCH请求
   */
  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", url, data, config)
  }

  /**
   * DELETE请求
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", url, undefined, config)
  }

  /**
   * 上传文件
   */
  async upload<T>(url: string, file: File, config?: RequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append("file", file)

    const headers = {
      ...this.getAuthHeaders(),
      ...config?.headers,
    }
    // 不设置Content-Type，让浏览器自动设置multipart/form-data

    const requestConfig: RequestInit = {
      method: "POST",
      headers,
      body: formData,
      signal: AbortSignal.timeout(config?.timeout || this.timeout),
    }

    const fullUrl = url.startsWith("http") ? url : `${this.baseURL}${url}`
    const response = await fetch(fullUrl, requestConfig)
    return await this.handleResponse<T>(response)
  }
}

// 导出单例实例
export const apiClient = new ApiClient()

// 导出类型
export type { ApiResponse, PaginationParams, PaginatedResponse }
