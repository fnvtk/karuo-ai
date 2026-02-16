import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { ElMessage, ElLoading } from 'element-plus'
import { useUserStore } from '@/store'
import type { ApiResponse, RequestConfig } from '@/types/api'

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config: any) => {
    const userStore = useUserStore()
    
    // 添加 token
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }

    // 显示 loading
    if (config.showLoading !== false) {
      config.loadingInstance = ElLoading.service({
        lock: true,
        text: '加载中...',
        background: 'rgba(0, 0, 0, 0.7)'
      })
    }

    return config
  },
  (error: AxiosError) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const config = response.config as any
    
    // 关闭 loading
    if (config.loadingInstance) {
      config.loadingInstance.close()
    }

    const res = response.data

    // 根据业务状态码处理
    if (res.code === 200 || res.code === 0) {
      return res
    } else {
      // 业务错误
      if (config.showError !== false) {
        ElMessage.error(res.message || '请求失败')
      }
      return Promise.reject(new Error(res.message || '请求失败'))
    }
  },
  (error: AxiosError) => {
    const config = error.config as any
    
    // 关闭 loading
    if (config?.loadingInstance) {
      config.loadingInstance.close()
    }

    // HTTP 错误处理
    if (error.response) {
      const status = error.response.status
      const userStore = useUserStore()

      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          userStore.clearUser()
          // 可以在这里跳转到登录页
          // router.push('/login')
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          ElMessage.error('请求错误，未找到该资源')
          break
        case 500:
          ElMessage.error('服务器错误')
          break
        case 502:
          ElMessage.error('网关错误')
          break
        case 503:
          ElMessage.error('服务不可用')
          break
        case 504:
          ElMessage.error('网关超时')
          break
        default:
          ElMessage.error(`请求失败: ${error.response.statusText}`)
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接')
    } else {
      ElMessage.error('请求配置错误')
    }

    return Promise.reject(error)
  }
)

// 封装请求方法
class Request {
  /**
   * GET 请求
   */
  get<T = any>(url: string, params?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return service.request({
      url,
      method: 'GET',
      params,
      ...config
    })
  }

  /**
   * POST 请求
   */
  post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return service.request({
      url,
      method: 'POST',
      data,
      ...config
    })
  }

  /**
   * PUT 请求
   */
  put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return service.request({
      url,
      method: 'PUT',
      data,
      ...config
    })
  }

  /**
   * DELETE 请求
   */
  delete<T = any>(url: string, params?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return service.request({
      url,
      method: 'DELETE',
      params,
      ...config
    })
  }

  /**
   * PATCH 请求
   */
  patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return service.request({
      url,
      method: 'PATCH',
      data,
      ...config
    })
  }

  /**
   * 通用请求方法
   */
  request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    return service.request(config)
  }
}

// 导出请求实例
export const request = new Request()

// 导出 axios 实例（用于特殊需求）
export default service

