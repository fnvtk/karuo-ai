// API 响应类型定义
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 请求配置类型
export interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  params?: any
  headers?: Record<string, string>
  timeout?: number
  showLoading?: boolean
  showError?: boolean
}

// 分页请求参数
export interface PageParams {
  page: number
  pageSize: number
}

// 分页响应数据
export interface PageResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

