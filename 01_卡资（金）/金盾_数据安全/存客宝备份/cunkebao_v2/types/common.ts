// API响应格式
export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

// 分页响应格式
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 通用查询参数
export interface QueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  dateRange?: {
    start: string
    end: string
  }
}

// 通用状态枚举
export enum Status {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  DRAFT = "draft",
}

// 通用基础实体
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}
